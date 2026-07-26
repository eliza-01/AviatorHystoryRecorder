(() => {
  "use strict";

  const DOM_STATE_KEY = "aviatorDomHistoryStateV5";
  const PARSER_NAME = "aviator-payouts-polling-v5";
  const SCAN_INTERVAL_MS = 400;
  const REQUIRED_STABLE_SCANS = 2;
  const MIN_HISTORY_ITEMS = 5;
  const MAX_HISTORY_ITEMS = 100;
  const MIN_RELIABLE_OVERLAP = 4;
  const STATUS_INTERVAL_MS = 3000;
  const MIN_AUTO_RELOAD_SECONDS = 5;
  const MAX_AUTO_RELOAD_SECONDS = 86_400;

  let persistedState = null;
  let persistedStateLoaded = false;
  let processChain = Promise.resolve();
  let lastObservedSignature = null;
  let stableScanCount = 0;
  let lastProcessedSignature = null;
  let lastStatusSignature = null;
  let lastStatusSentAt = 0;
  let scannerStarted = false;
  let pageAutoReloadTimer = null;
  let topPageReady = document.readyState === "complete";

  start();

  function start() {
    startPageAutoReloadController();

    reportStatus({
      stage: "injected",
      historyFound: false,
      historySize: 0
    }, true);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startScanner, { once: true });
    } else {
      startScanner();
    }
  }

  function startPageAutoReloadController() {
    if (window.top !== window) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.settings || !topPageReady) {
        return;
      }
      void configurePageAutoReload();
    });

    if (topPageReady) {
      void configurePageAutoReload();
      return;
    }

    window.addEventListener(
      "load",
      () => {
        topPageReady = true;
        void configurePageAutoReload();
      },
      { once: true }
    );
  }

  async function configurePageAutoReload() {
    clearTimeout(pageAutoReloadTimer);
    pageAutoReloadTimer = null;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_CAPTURE_STATE",
        pageUrl: location.href
      });

      if (!response?.ok || !response.pageAutoReloadEnabled) {
        return;
      }

      const seconds = clampInteger(
        response.pageAutoReloadSeconds,
        MIN_AUTO_RELOAD_SECONDS,
        MAX_AUTO_RELOAD_SECONDS,
        60
      );

      pageAutoReloadTimer = setTimeout(() => {
        location.reload();
      }, seconds * 1000);
    } catch {
      // После перезагрузки расширения старый content script теряет контекст.
    }
  }

  function clampInteger(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
  }

  function startScanner() {
    if (scannerStarted) {
      return;
    }
    scannerStarted = true;

    scan();
    setInterval(scan, SCAN_INTERVAL_MS);
  }

  function scan() {
    const candidate = findHistoryCandidate();
    if (!candidate) {
      lastObservedSignature = null;
      stableScanCount = 0;
      reportStatus({
        stage: "searching",
        historyFound: false,
        historySize: 0
      });
      return;
    }

    const { block, values, selectorKind } = candidate;
    const signature = values.map(formatMultiplier).join("|");

    reportStatus({
      stage: "history-found",
      historyFound: true,
      historySize: values.length,
      firstValue: values[0] ?? null,
      selectorKind,
      block: describeElement(block)
    });

    if (signature !== lastObservedSignature) {
      lastObservedSignature = signature;
      stableScanCount = 1;
      return;
    }

    stableScanCount += 1;
    if (
      stableScanCount < REQUIRED_STABLE_SCANS ||
      signature === lastProcessedSignature
    ) {
      return;
    }

    lastProcessedSignature = signature;
    processChain = processChain
      .then(() => processSnapshot(values, signature, selectorKind))
      .catch((error) => {
        reportStatus({
          stage: "collector-error",
          historyFound: true,
          historySize: values.length,
          error: error instanceof Error ? error.message : String(error)
        }, true);
      });
  }

  function findHistoryCandidate() {
    const blocks = Array.from(document.querySelectorAll(".payouts-block"));
    let best = null;

    for (const block of blocks) {
      if (!(block instanceof HTMLElement)) {
        continue;
      }

      const values = readDirectPayoutValues(block);
      if (values.length < MIN_HISTORY_ITEMS) {
        continue;
      }

      const insideStats = Boolean(block.closest(".stats"));
      const insideWrapper = Boolean(block.parentElement?.classList.contains("payouts-wrapper"));
      const insideDropdown = Boolean(block.closest("app-stats-dropdown"));

      // Основной горизонтальный список находится внутри .stats/.payouts-wrapper.
      // Раскрывающийся app-stats-dropdown содержит его копию и получает штраф.
      const score =
        values.length +
        (insideStats ? 200 : 0) +
        (insideWrapper ? 100 : 0) -
        (insideDropdown ? 80 : 0);

      const selectorKind = insideWrapper
        ? "stats-payouts-wrapper"
        : insideDropdown
          ? "stats-dropdown-copy"
          : "generic-payouts-block";

      if (!best || score > best.score) {
        best = { block, values, score, selectorKind };
      }
    }

    return best;
  }

  function readDirectPayoutValues(block) {
    return Array.from(block.children)
      .filter(
        (element) =>
          element instanceof HTMLElement &&
          element.classList.contains("payout")
      )
      .map((element) => parseMultiplier(element.textContent))
      .filter((value) => value !== null)
      .slice(0, MAX_HISTORY_ITEMS);
  }

  async function processSnapshot(values, signature, selectorKind) {
    await loadPersistedState();

    if (!isValidState(persistedState)) {
      const ids = await createIds(values);
      const accepted = await emitResults(
        values,
        ids,
        values.length,
        "initial",
        selectorKind
      );

      if (accepted === values.length) {
        await storeState(values, ids);
        reportStatus({
          stage: "initial-saved",
          historyFound: true,
          historySize: values.length,
          detectedNew: values.length,
          accepted
        }, true);
      } else {
        lastProcessedSignature = null;
        reportStatus({
          stage: "initial-rejected",
          historyFound: true,
          historySize: values.length,
          detectedNew: values.length,
          accepted
        }, true);
      }
      return;
    }

    const previousValues = persistedState.values;
    const previousIds = persistedState.ids;

    if (arraysEqual(values, previousValues)) {
      reportStatus({
        stage: "unchanged",
        historyFound: true,
        historySize: values.length,
        detectedNew: 0
      });
      return;
    }

    const alignment = findBestAlignment(values, previousValues);
    if (!alignment) {
      // После долгого простоя весь экран истории может смениться. Считаем его
      // новой базовой точкой, но не отправляем 30 потенциальных дублей.
      const ids = await createIds(values);
      await storeState(values, ids);
      reportStatus({
        stage: "resynced-without-send",
        historyFound: true,
        historySize: values.length,
        detectedNew: 0
      }, true);
      return;
    }

    const insertedCount = alignment.currentOffset;
    const ids = await mergeIds(values, previousIds, alignment);

    if (insertedCount === 0) {
      await storeState(values, ids);
      reportStatus({
        stage: "aligned-no-new-prefix",
        historyFound: true,
        historySize: values.length,
        detectedNew: 0
      });
      return;
    }

    const newValues = values.slice(0, insertedCount);
    const newIds = ids.slice(0, insertedCount);
    const accepted = await emitResults(
      newValues,
      newIds,
      values.length,
      "prepend",
      selectorKind
    );

    if (accepted !== newValues.length) {
      lastProcessedSignature = null;
      reportStatus({
        stage: "new-results-rejected",
        historyFound: true,
        historySize: values.length,
        detectedNew: newValues.length,
        accepted
      }, true);
      return;
    }

    await storeState(values, ids);
    reportStatus({
      stage: "new-results-saved",
      historyFound: true,
      historySize: values.length,
      detectedNew: newValues.length,
      accepted,
      newestValues: newValues.slice(0, 5)
    }, true);
  }

  function findBestAlignment(current, previous) {
    let best = null;

    for (let currentOffset = 0; currentOffset < current.length; currentOffset += 1) {
      for (let previousOffset = 0; previousOffset < previous.length; previousOffset += 1) {
        let length = 0;
        while (
          currentOffset + length < current.length &&
          previousOffset + length < previous.length &&
          current[currentOffset + length] === previous[previousOffset + length]
        ) {
          length += 1;
        }

        const available = Math.min(
          current.length - currentOffset,
          previous.length - previousOffset
        );
        const required = Math.min(MIN_RELIABLE_OVERLAP, available);

        if (length < required) {
          continue;
        }

        // Для добавления новых результатов нужен префикс текущего списка,
        // совпавший с началом предыдущего. Остальные совпадения оставляем
        // только как запасной вариант для восстановления после частичного DOM.
        const priority = previousOffset === 0 ? 1 : 0;

        if (
          !best ||
          priority > best.priority ||
          (priority === best.priority && length > best.length) ||
          (priority === best.priority &&
            length === best.length &&
            currentOffset < best.currentOffset)
        ) {
          best = {
            currentOffset,
            previousOffset,
            length,
            priority
          };
        }
      }
    }

    if (!best || best.previousOffset !== 0) {
      return null;
    }

    return best;
  }

  async function mergeIds(values, previousIds, alignment) {
    const ids = new Array(values.length);

    for (let index = 0; index < alignment.length; index += 1) {
      ids[alignment.currentOffset + index] =
        previousIds[alignment.previousOffset + index];
    }

    const missingIndexes = [];
    for (let index = 0; index < ids.length; index += 1) {
      if (!ids[index]) {
        missingIndexes.push(index);
      }
    }

    const generated = await Promise.all(
      missingIndexes.map((index) => createRoundId(values, index))
    );

    missingIndexes.forEach((index, generatedIndex) => {
      ids[index] = generated[generatedIndex];
    });

    return ids;
  }

  function createIds(values) {
    return Promise.all(values.map((_, index) => createRoundId(values, index)));
  }

  async function createRoundId(values, index) {
    const context = values
      .slice(index, index + 16)
      .map(formatMultiplier)
      .join("|");
    const digest = await sha256Hex(`aviator-dom-v5|${context}`);
    return `dom-v5:${digest.slice(0, 40)}`;
  }

  async function emitResults(values, ids, fullHistorySize, reason, selectorKind) {
    if (values.length === 0) {
      return 0;
    }

    const capturedAt = Date.now();
    const newestFirst = values.map((multiplier, index) => ({
      multiplier,
      roundId: ids[index],
      happenedAt:
        reason === "prepend"
          ? new Date(capturedAt - index * 1000).toISOString()
          : null,
      source: "dom",
      confidence: 1,
      metadata: {
        parser: PARSER_NAME,
        final: true,
        reason,
        selectorKind,
        historyPosition: index,
        historySize: fullHistorySize
      }
    }));

    // В истории первый элемент самый новый. В API отправляем старый -> новый,
    // чтобы порядок вставки соответствовал реальному порядку раундов.
    const results = newestFirst.reverse();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CAPTURE_RESULTS",
        results,
        pageUrl: topLevelUrlHint(),
        frameUrl: location.href
      });
      return Number(response?.accepted || 0);
    } catch (error) {
      reportStatus({
        stage: "runtime-message-error",
        historyFound: true,
        historySize: fullHistorySize,
        error: error instanceof Error ? error.message : String(error)
      }, true);
      return 0;
    }
  }

  async function loadPersistedState() {
    if (persistedStateLoaded) {
      return;
    }

    const stored = await chrome.storage.local.get(DOM_STATE_KEY);
    persistedState = stored[DOM_STATE_KEY] || null;
    persistedStateLoaded = true;
  }

  async function storeState(values, ids) {
    persistedState = {
      version: 5,
      values,
      ids,
      updatedAt: new Date().toISOString()
    };
    persistedStateLoaded = true;
    await chrome.storage.local.set({ [DOM_STATE_KEY]: persistedState });
  }

  function isValidState(state) {
    return Boolean(
      state &&
        state.version === 5 &&
        Array.isArray(state.values) &&
        Array.isArray(state.ids) &&
        state.values.length >= MIN_HISTORY_ITEMS &&
        state.values.length === state.ids.length
    );
  }

  function parseMultiplier(rawValue) {
    const normalized = normalizeLocalizedNumber(rawValue);

    if (normalized === null || !/^\d{1,9}(?:\.\d{1,4})?$/.test(normalized)) {
      return null;
    }

    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 1 || value > 1_000_000) {
      return null;
    }

    return Number(value.toFixed(2));
  }

  function normalizeLocalizedNumber(rawValue) {
    let value = String(rawValue ?? "")
      .trim()
      .replace(/[xх]$/i, "")
      .replace(/[\s\u00a0\u202f'’]/g, "");

    if (!value || !/^\d[\d.,]*$/.test(value)) {
      return null;
    }

    const commaCount = (value.match(/,/g) || []).length;
    const dotCount = (value.match(/\./g) || []).length;

    if (commaCount > 0 && dotCount > 0) {
      // Последний разделитель — десятичный, остальные — разделители тысяч.
      // 2,391.46 -> 2391.46; 2.391,46 -> 2391.46.
      if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
        value = value.replace(/\./g, "").replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else if (commaCount > 0) {
      if (/^\d{1,3}(?:,\d{3})+$/.test(value)) {
        value = value.replace(/,/g, "");
      } else if (commaCount === 1) {
        value = value.replace(",", ".");
      } else {
        return null;
      }
    } else if (dotCount > 1) {
      if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
        value = value.replace(/\./g, "");
      } else {
        return null;
      }
    }

    return value;
  }

  function formatMultiplier(value) {
    return Number(value).toFixed(2);
  }

  function arraysEqual(left, right) {
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }

  function describeElement(element) {
    const className =
      typeof element.className === "string" ? element.className : "";
    return `${element.tagName.toLowerCase()}#${element.id || ""}.${className}`
      .replace(/\s+/g, " ")
      .slice(0, 250);
  }

  function topLevelUrlHint() {
    try {
      return window.top.location.href;
    } catch {
      return document.referrer || location.href;
    }
  }

  function reportStatus(partial, force = false) {
    const status = {
      ...partial,
      frameUrl: safeFrameUrl(),
      documentReadyState: document.readyState,
      observedAt: new Date().toISOString()
    };
    const signature = JSON.stringify({
      stage: status.stage,
      historyFound: status.historyFound,
      historySize: status.historySize,
      firstValue: status.firstValue,
      detectedNew: status.detectedNew,
      accepted: status.accepted,
      error: status.error
    });
    const now = Date.now();

    if (
      !force &&
      signature === lastStatusSignature &&
      now - lastStatusSentAt < STATUS_INTERVAL_MS
    ) {
      return;
    }

    lastStatusSignature = signature;
    lastStatusSentAt = now;

    try {
      void chrome.runtime.sendMessage({
        type: "COLLECTOR_STATUS",
        status,
        pageUrl: topLevelUrlHint()
      });
    } catch {
      // Контекст расширения мог быть перезагружен — вкладка будет перезапущена.
    }
  }

  function safeFrameUrl() {
    try {
      const url = new URL(location.href);
      return `${url.origin}${url.pathname}`;
    } catch {
      return String(location.href).split("?")[0].slice(0, 500);
    }
  }

  async function sha256Hex(value) {
    try {
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
    } catch {
      return fallbackHash(value);
    }
  }

  function fallbackHash(value) {
    let hashA = 0x811c9dc5;
    let hashB = 0x9e3779b9;

    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      hashA ^= code;
      hashA = Math.imul(hashA, 0x01000193);
      hashB ^= code + index;
      hashB = Math.imul(hashB, 0x85ebca6b);
    }

    const partA = (hashA >>> 0).toString(16).padStart(8, "0");
    const partB = (hashB >>> 0).toString(16).padStart(8, "0");
    return `${partA}${partB}${partB}${partA}${partA}`;
  }
})();
