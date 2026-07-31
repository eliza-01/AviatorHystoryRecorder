(() => {
  "use strict";

  const LEGACY_DOM_STATE_KEY = "aviatorDomHistoryStateV5";
  const DOM_STATE_KEY = "aviatorDomHistoryStatesV6";
  const DOM_STATE_SCOPE = buildDomStateScope();
  const PARSER_NAME = "aviator-payouts-polling-v5";
  const SCAN_INTERVAL_MS = 400;
  const REQUIRED_STABLE_SCANS = 2;
  const MIN_HISTORY_ITEMS = 5;
  const MAX_HISTORY_ITEMS = 100;
  const MIN_RELIABLE_OVERLAP = 4;
  const STATUS_INTERVAL_MS = 3000;
  const MIN_AUTO_RELOAD_SECONDS = 5;
  const MAX_AUTO_RELOAD_SECONDS = 86_400;
  const STRATEGY_HISTORY_CHANNEL = "aviator-strategy-history-v1";
  const STRATEGY_HISTORY_SOURCE = "aviator-history-scanner";

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
  let pageAutoReloadProgressTimer = null;
  let pageAutoReloadDeadline = null;
  let pageAutoReloadDurationMs = 0;
  let pageAutoReloadEnabled = false;
  let pageAutoReloadSeconds = 60;
  let pageAutoReloadBadgeHost = null;
  let pageAutoReloadBadgeButton = null;
  let pageAutoReloadBadgeText = null;
  let pageAutoReloadBadgeProgress = null;
  let pageAutoReloadBadgeBusy = false;
  let pageAutoReloadBadgeError = null;
  let pageAutoReloadBadgePointerHandler = null;
  let pageAutoReloadBadgeKeyboardHandler = null;
  let pageAutoReloadSuspendedByStrategy = false;
  let strategyEnabled = false;
  let strategyRuntimeState = null;
  let strategyBadgeHost = null;
  let strategyBadgeText = null;
  let strategyBadgeProgress = null;
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
      if (areaName !== "local" || !topPageReady) {
        return;
      }

      if (changes.settings) {
        void configurePageAutoReload();
        return;
      }

      if (changes.strategyStates) {
        void refreshStrategyRuntimeStatus();
      }
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

  async function refreshStrategyRuntimeStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_CAPTURE_STATE",
        pageUrl: location.href
      });

      if (!response?.ok || !response.aviatorTab) {
        removeStrategyBadge();
        return;
      }

      const previousSuspended = pageAutoReloadSuspendedByStrategy;
      strategyEnabled = Boolean(response.strategyTenPlusX348Enabled);
      strategyRuntimeState = response.strategyState || null;
      pageAutoReloadSuspendedByStrategy = Boolean(
        strategyEnabled && strategyRuntimeState?.autoReloadPaused
      );

      updateStrategyBadge();
      updatePageAutoReloadBadge();

      if (previousSuspended !== pageAutoReloadSuspendedByStrategy) {
        await configurePageAutoReload();
      }
    } catch {
      // Старый content script мог потерять контекст после обновления расширения.
    }
  }

  async function configurePageAutoReload() {
    clearTimeout(pageAutoReloadTimer);
    pageAutoReloadTimer = null;
    stopPageAutoReloadProgress();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_CAPTURE_STATE",
        pageUrl: location.href
      });

      if (!response?.ok || !response.aviatorTab) {
        removePageAutoReloadBadge();
        removeStrategyBadge();
        return;
      }

      pageAutoReloadSeconds = clampInteger(
        response.pageAutoReloadSeconds,
        MIN_AUTO_RELOAD_SECONDS,
        MAX_AUTO_RELOAD_SECONDS,
        60
      );
      pageAutoReloadEnabled = Boolean(response.pageAutoReloadEnabled);
      strategyEnabled = Boolean(response.strategyTenPlusX348Enabled);
      strategyRuntimeState = response.strategyState || null;
      pageAutoReloadSuspendedByStrategy = Boolean(
        strategyEnabled && strategyRuntimeState?.autoReloadPaused
      );
      pageAutoReloadBadgeError = null;

      ensurePageAutoReloadBadge();
      updateStrategyBadge();

      if (!pageAutoReloadEnabled || pageAutoReloadSuspendedByStrategy) {
        updatePageAutoReloadBadge();
        return;
      }

      pageAutoReloadDurationMs = pageAutoReloadSeconds * 1000;
      pageAutoReloadDeadline = Date.now() + pageAutoReloadDurationMs;
      updatePageAutoReloadBadge();

      pageAutoReloadProgressTimer = setInterval(
        updatePageAutoReloadBadge,
        250
      );

      pageAutoReloadTimer = setTimeout(() => {
        location.reload();
      }, pageAutoReloadDurationMs);
    } catch {
      // После перезагрузки расширения старый content script теряет контекст.
      removePageAutoReloadBadge();
    }
  }

  function ensurePageAutoReloadBadge() {
    if (pageAutoReloadBadgeHost?.isConnected) {
      return;
    }

    const host = document.createElement("div");
    host.id = "aviator-extension-auto-reload-badge";
    host.style.cssText = [
      "position:fixed",
      "top:10px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:2147483647",
      "display:block",
      "max-width:calc(100vw - 20px)",
      "pointer-events:auto"
    ].join(";");

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      button {
        position: relative;
        box-sizing: border-box;
        min-width: 250px;
        max-width: calc(100vw - 20px);
        overflow: hidden;
        padding: 9px 14px 11px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        background: rgba(20, 23, 28, 0.94);
        box-shadow: 0 5px 18px rgba(0, 0, 0, 0.32);
        color: #ffffff;
        font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        white-space: nowrap;
        cursor: pointer;
        touch-action: manipulation;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      button:hover {
        background: rgba(30, 34, 40, 0.97);
      }
      button:focus-visible {
        outline: 2px solid #ffffff;
        outline-offset: 2px;
      }
      button[data-enabled="true"] {
        border-color: rgba(55, 214, 116, 0.72);
      }
      button[data-enabled="false"] {
        border-color: rgba(255, 91, 91, 0.72);
      }
      button[data-busy="true"] {
        cursor: wait;
        opacity: 0.78;
      }
      button[data-error="true"] {
        border-color: rgba(255, 184, 77, 0.9);
      }
      .text {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .progress-track {
        position: absolute;
        right: 8px;
        bottom: 4px;
        left: 8px;
        height: 3px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.22);
      }
      .progress-value {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: #37d674;
        opacity: 1;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform 220ms linear;
      }
      button[data-enabled="false"] .progress-value {
        background: #ff5b5b;
      }
      @media (max-width: 360px) {
        button {
          min-width: 0;
          width: calc(100vw - 20px);
          font-size: 12px;
        }
      }
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-live", "polite");

    const text = document.createElement("span");
    text.className = "text";

    const progressTrack = document.createElement("span");
    progressTrack.className = "progress-track";
    progressTrack.setAttribute("aria-hidden", "true");

    const progress = document.createElement("span");
    progress.className = "progress-value";
    progressTrack.append(progress);
    button.append(text, progressTrack);
    shadow.append(style, button);

    pageAutoReloadBadgePointerHandler = (event) => {
      if (
        event.button !== 0 ||
        !isPageAutoReloadBadgeEvent(event, host)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      void togglePageAutoReloadFromBadge();
    };

    pageAutoReloadBadgeKeyboardHandler = (event) => {
      if (
        event.detail !== 0 ||
        !isPageAutoReloadBadgeEvent(event, host)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      void togglePageAutoReloadFromBadge();
    };

    window.addEventListener(
      "pointerdown",
      pageAutoReloadBadgePointerHandler,
      true
    );
    window.addEventListener(
      "click",
      pageAutoReloadBadgeKeyboardHandler,
      true
    );

    pageAutoReloadBadgeHost = host;
    pageAutoReloadBadgeButton = button;
    pageAutoReloadBadgeText = text;
    pageAutoReloadBadgeProgress = progress;

    (document.documentElement || document).append(host);
    updatePageAutoReloadBadge();
  }

  function isPageAutoReloadBadgeEvent(event, host) {
    if (!host?.isConnected) {
      return false;
    }

    const path =
      typeof event.composedPath === "function"
        ? event.composedPath()
        : [];

    return event.target === host || path.includes(host);
  }

  function removePageAutoReloadBadge() {
    stopPageAutoReloadProgress();

    if (pageAutoReloadBadgePointerHandler) {
      window.removeEventListener(
        "pointerdown",
        pageAutoReloadBadgePointerHandler,
        true
      );
    }
    if (pageAutoReloadBadgeKeyboardHandler) {
      window.removeEventListener(
        "click",
        pageAutoReloadBadgeKeyboardHandler,
        true
      );
    }

    pageAutoReloadBadgePointerHandler = null;
    pageAutoReloadBadgeKeyboardHandler = null;
    pageAutoReloadBadgeHost?.remove();
    pageAutoReloadBadgeHost = null;
    pageAutoReloadBadgeButton = null;
    pageAutoReloadBadgeText = null;
    pageAutoReloadBadgeProgress = null;
    pageAutoReloadBadgeError = null;
  }

  function stopPageAutoReloadProgress() {
    clearInterval(pageAutoReloadProgressTimer);
    pageAutoReloadProgressTimer = null;
    pageAutoReloadDeadline = null;
    pageAutoReloadDurationMs = 0;
  }

  function updatePageAutoReloadBadge() {
    if (
      !pageAutoReloadBadgeButton ||
      !pageAutoReloadBadgeText ||
      !pageAutoReloadBadgeProgress
    ) {
      return;
    }

    pageAutoReloadBadgeButton.dataset.enabled = String(pageAutoReloadEnabled);
    pageAutoReloadBadgeButton.dataset.busy = String(pageAutoReloadBadgeBusy);
    pageAutoReloadBadgeButton.dataset.error = String(
      Boolean(pageAutoReloadBadgeError)
    );
    pageAutoReloadBadgeButton.setAttribute(
      "aria-pressed",
      String(pageAutoReloadEnabled)
    );

    if (pageAutoReloadBadgeError) {
      pageAutoReloadBadgeText.textContent = pageAutoReloadBadgeError;
      pageAutoReloadBadgeProgress.style.transform = "scaleX(0)";
      pageAutoReloadBadgeButton.title = "Нажмите, чтобы повторить";
      return;
    }

    if (pageAutoReloadBadgeBusy) {
      pageAutoReloadBadgeText.textContent = "Изменение автообновления…";
      pageAutoReloadBadgeButton.title = "Сохранение настройки";
      return;
    }

    if (!pageAutoReloadEnabled) {
      pageAutoReloadBadgeText.textContent = "Автообновление выключено";
      pageAutoReloadBadgeProgress.style.transform = "scaleX(0)";
      pageAutoReloadBadgeButton.title = "Нажмите, чтобы включить";
      return;
    }

    if (pageAutoReloadSuspendedByStrategy) {
      pageAutoReloadBadgeText.textContent =
        "Автообновление приостановлено стратегией";
      pageAutoReloadBadgeProgress.style.transform = "scaleX(0)";
      pageAutoReloadBadgeButton.title =
        "Возобновится после сброса сигнала, прибыли или стопа";
      return;
    }

    const remainingMs = pageAutoReloadDeadline
      ? Math.max(0, pageAutoReloadDeadline - Date.now())
      : pageAutoReloadSeconds * 1000;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const ratio = pageAutoReloadDurationMs
      ? remainingMs / pageAutoReloadDurationMs
      : 1;

    pageAutoReloadBadgeText.textContent =
      `Автообновление включено · ${remainingSeconds} сек`;
    pageAutoReloadBadgeProgress.style.transform =
      `scaleX(${Math.max(0, Math.min(1, ratio)).toFixed(4)})`;
    pageAutoReloadBadgeButton.title = "Нажмите, чтобы выключить";
  }

  async function togglePageAutoReloadFromBadge() {
    if (pageAutoReloadSuspendedByStrategy) {
      updatePageAutoReloadBadge();
      return;
    }

    if (pageAutoReloadBadgeBusy) {
      return;
    }

    const previousEnabled = pageAutoReloadEnabled;
    const targetEnabled = !previousEnabled;

    pageAutoReloadBadgeBusy = true;
    pageAutoReloadBadgeError = null;
    pageAutoReloadEnabled = targetEnabled;
    updatePageAutoReloadBadge();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_SETTINGS",
        settings: {
          pageAutoReloadEnabled: targetEnabled
        }
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Не удалось сохранить настройку");
      }

      pageAutoReloadEnabled = Boolean(
        response.settings?.pageAutoReloadEnabled
      );
      pageAutoReloadBadgeBusy = false;
      await configurePageAutoReload();
    } catch {
      pageAutoReloadEnabled = previousEnabled;
      pageAutoReloadBadgeBusy = false;
      pageAutoReloadBadgeError = "Не удалось изменить автообновление";
      updatePageAutoReloadBadge();

      setTimeout(() => {
        pageAutoReloadBadgeError = null;
        updatePageAutoReloadBadge();
      }, 2500);
    }
  }

  function updateStrategyBadge() {
    if (!strategyEnabled) {
      removeStrategyBadge();
      return;
    }

    ensureStrategyBadge();
    if (!strategyBadgeText || !strategyBadgeProgress) {
      return;
    }

    const state = strategyRuntimeState || {};
    const streak = Math.max(0, Number(state.consecutiveLosses || 0));
    const progress = Math.max(0, Math.min(1, streak / 10));
    const stage = String(state.stage || "waiting");

    if (stage === "error") {
      strategyBadgeText.textContent = `10+ - x3.48 · ошибка: ${
        state.error || "проверьте интерфейс"
      }`;
    } else if (state.awaitingResult) {
      strategyBadgeText.textContent =
        `10+ - x3.48 · шаг ${state.step || 1} · ставка ${formatBadgeNumber(
          state.activeBet || state.nextBet || 0.2
        )} · ждём результат`;
    } else if (["preparing", "arming", "betting", "waiting-reset"].includes(stage)) {
      strategyBadgeText.textContent =
        `10+ - x3.48 · ${state.message || "подготовка ставки"}`;
    } else {
      strategyBadgeText.textContent =
        `10+ - x3.48 · серия ${Math.min(streak, 10)}/10`;
    }

    strategyBadgeProgress.style.transform = `scaleX(${progress.toFixed(4)})`;
  }

  function ensureStrategyBadge() {
    if (strategyBadgeHost?.isConnected) {
      return;
    }

    const host = document.createElement("div");
    host.id = "aviator-extension-strategy-badge";
    host.style.cssText = [
      "position:fixed",
      "top:54px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:2147483646",
      "display:block",
      "max-width:calc(100vw - 20px)",
      "pointer-events:none"
    ].join(";");

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      .badge {
        position: relative;
        box-sizing: border-box;
        min-width: 250px;
        max-width: calc(100vw - 20px);
        overflow: hidden;
        padding: 8px 14px 11px;
        border: 1px solid rgba(119, 179, 255, 0.72);
        border-radius: 999px;
        background: rgba(20, 23, 28, 0.94);
        box-shadow: 0 5px 18px rgba(0, 0, 0, 0.32);
        color: #ffffff;
        font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        white-space: nowrap;
        text-overflow: ellipsis;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .text {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .progress-track {
        position: absolute;
        right: 8px;
        bottom: 4px;
        left: 8px;
        height: 3px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
      }
      .progress-value {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: #77b3ff;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform 180ms linear;
      }
      @media (max-width: 360px) {
        .badge { min-width: 0; width: calc(100vw - 20px); }
      }
    `;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.setAttribute("aria-live", "polite");

    const text = document.createElement("span");
    text.className = "text";
    const track = document.createElement("span");
    track.className = "progress-track";
    const progress = document.createElement("span");
    progress.className = "progress-value";
    track.append(progress);
    badge.append(text, track);
    shadow.append(style, badge);

    strategyBadgeHost = host;
    strategyBadgeText = text;
    strategyBadgeProgress = progress;
    (document.documentElement || document).append(host);
  }

  function removeStrategyBadge() {
    strategyBadgeHost?.remove();
    strategyBadgeHost = null;
    strategyBadgeText = null;
    strategyBadgeProgress = null;
    strategyRuntimeState = null;
    pageAutoReloadSuspendedByStrategy = false;
  }

  function formatBadgeNumber(value) {
    return Number(value || 0).toFixed(2);
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

      // Раскрывающийся список содержит визуальную копию истории. Он не должен
      // участвовать ни в сохранении DOM-состояния, ни в управлении стратегией.
      if (insideDropdown) {
        continue;
      }

      // Основной горизонтальный список находится внутри .stats/.payouts-wrapper.
      // Раскрывающийся app-stats-dropdown содержит его копию и получает штраф.
      const score =
        values.length +
        (insideStats ? 200 : 0) +
        (insideWrapper ? 100 : 0) -
        (insideDropdown ? 80 : 0);

      const selectorKind = insideDropdown
        ? "stats-dropdown-copy"
        : insideWrapper
          ? "stats-payouts-wrapper"
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
      notifyStrategySnapshot(values, ids, "initial", selectorKind);
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
      notifyStrategySnapshot(values, previousIds, "unchanged", selectorKind);
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
      notifyStrategySnapshot(values, ids, "resync", selectorKind);
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
    notifyStrategySnapshot(
      values,
      ids,
      insertedCount > 0 ? "prepend" : "aligned",
      selectorKind
    );

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

  function notifyStrategySnapshot(values, ids, reason, selectorKind) {
    if (
      !Array.isArray(values) ||
      !Array.isArray(ids) ||
      values.length !== ids.length ||
      selectorKind === "stats-dropdown-copy"
    ) {
      return;
    }

    window.postMessage(
      {
        channel: STRATEGY_HISTORY_CHANNEL,
        source: STRATEGY_HISTORY_SOURCE,
        type: "SNAPSHOT",
        snapshot: {
          values: values.slice(),
          ids: ids.slice(),
          reason,
          selectorKind: selectorKind || "unknown",
          historySize: values.length,
          observedAt: new Date().toISOString()
        }
      },
      "*"
    );
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

    const stored = await chrome.storage.local.get([
      DOM_STATE_KEY,
      LEGACY_DOM_STATE_KEY
    ]);
    const scopedStates =
      stored[DOM_STATE_KEY] && typeof stored[DOM_STATE_KEY] === "object"
        ? stored[DOM_STATE_KEY]
        : {};
    persistedState =
      scopedStates[DOM_STATE_SCOPE] || stored[LEGACY_DOM_STATE_KEY] || null;
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

    const stored = await chrome.storage.local.get(DOM_STATE_KEY);
    const current =
      stored[DOM_STATE_KEY] && typeof stored[DOM_STATE_KEY] === "object"
        ? stored[DOM_STATE_KEY]
        : {};
    const entries = Object.entries(current)
      .filter(([, value]) => isValidState(value))
      .sort(
        (left, right) =>
          Date.parse(right[1]?.updatedAt || "") -
          Date.parse(left[1]?.updatedAt || "")
      )
      .slice(0, 19);
    const next = Object.fromEntries(entries);
    next[DOM_STATE_SCOPE] = persistedState;

    await chrome.storage.local.set({ [DOM_STATE_KEY]: next });
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

  function buildDomStateScope() {
    const value = `${location.origin}${location.pathname}|${document.referrer || ""}`;
    return fallbackHash(value).slice(0, 24);
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
