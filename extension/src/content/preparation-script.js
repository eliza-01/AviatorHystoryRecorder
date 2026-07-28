(() => {
  "use strict";

  const GAME_HOST_PATTERN = /(^|\.)spribegaming\.com$/i;
  const CHANNEL = "aviator-preparation-v2";
  const CONTROLLER_SOURCE = "aviator-preparation-controller";
  const BRIDGE_SOURCE = "aviator-preparation-page-bridge";
  const START_DELAY_MS = 250;
  const BRIDGE_TIMEOUT_MS = 8_000;
  const PREPARATION_TIMEOUT_MS = 75_000;

  let runSequence = 0;
  let startTimer = null;
  let completedSignature = null;
  let currentRequest = null;

  start();

  function start() {
    if (!GAME_HOST_PATTERN.test(location.hostname)) {
      return;
    }

    window.addEventListener("message", onBridgeMessage, false);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.settings) {
        schedulePreparation(true);
      }
    });

    if (document.readyState === "complete") {
      schedulePreparation();
      return;
    }

    window.addEventListener("load", () => schedulePreparation(), { once: true });
  }

  function schedulePreparation(force = false) {
    clearTimeout(startTimer);
    cancelCurrentRequest();

    const sequence = ++runSequence;
    startTimer = setTimeout(() => {
      void prepareGame(sequence, force);
    }, START_DELAY_MS);
  }

  async function prepareGame(sequence, force) {
    try {
      const settings = await getPreparationSettings();
      ensureCurrentRun(sequence);

      if (!settings.enabled) {
        completedSignature = null;
        sendBridgeMessage("CANCEL");
        await reportStatus("disabled");
        return;
      }

      const signature = `${settings.bet}|${settings.cashout}`;
      if (!force && completedSignature === signature) {
        return;
      }

      await waitForBridge(sequence);
      ensureCurrentRun(sequence);

      const result = await requestPreparation(settings, sequence);
      ensureCurrentRun(sequence);

      if (!result.ok) {
        throw new Error(result.error || "Подготовка интерфейса не выполнена");
      }

      completedSignature = signature;
      await reportStatus("completed", settings);
    } catch (error) {
      if (error?.name === "PreparationCancelledError") {
        return;
      }

      await reportStatus("error", null, error);
    }
  }

  async function getPreparationSettings() {
    const response = await chrome.runtime.sendMessage({
      type: "GET_CAPTURE_STATE",
      pageUrl: location.href
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Не удалось получить настройки подготовки");
    }

    return {
      enabled: Boolean(response.preparationEnabled),
      bet: normalizePositiveNumber(response.preparationBet, 1),
      cashout: normalizePositiveNumber(response.preparationCashout, 2)
    };
  }

  function waitForBridge(sequence) {
    const requestId = createRequestId("bridge");

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let timer = null;

      const cleanup = () => {
        clearInterval(timer);
        window.removeEventListener("message", listener, false);
      };

      const listener = (event) => {
        if (!isBridgeMessage(event, "BRIDGE_READY", requestId)) {
          return;
        }
        cleanup();
        resolve();
      };

      window.addEventListener("message", listener, false);
      sendBridgeMessage("PING", requestId);

      timer = setInterval(() => {
        try {
          ensureCurrentRun(sequence);
        } catch (error) {
          cleanup();
          reject(error);
          return;
        }

        if (Date.now() - startedAt >= BRIDGE_TIMEOUT_MS) {
          cleanup();
          reject(new Error("Не подключился обработчик интерфейса игры"));
          return;
        }

        sendBridgeMessage("PING", requestId);
      }, 200);
    });
  }

  function requestPreparation(settings, sequence) {
    cancelCurrentRequest();

    const requestId = createRequestId("prepare");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (currentRequest?.requestId === requestId) {
          currentRequest = null;
        }
        reject(new Error("Подготовка интерфейса Aviator превысила лимит времени"));
      }, PREPARATION_TIMEOUT_MS);

      currentRequest = {
        requestId,
        sequence,
        settings,
        resolve: (result) => {
          clearTimeout(timeout);
          if (currentRequest?.requestId === requestId) {
            currentRequest = null;
          }
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          if (currentRequest?.requestId === requestId) {
            currentRequest = null;
          }
          reject(error);
        }
      };

      sendBridgeMessage("PREPARE", requestId, { settings });
    });
  }

  function onBridgeMessage(event) {
    if (
      event.source !== window ||
      !event.data ||
      event.data.channel !== CHANNEL ||
      event.data.source !== BRIDGE_SOURCE
    ) {
      return;
    }

    const request = currentRequest;
    if (!request || event.data.requestId !== request.requestId) {
      return;
    }

    try {
      ensureCurrentRun(request.sequence);
    } catch (error) {
      request.reject(error);
      return;
    }

    if (event.data.type === "PREPARE_STAGE") {
      void reportStatus(event.data.stage, request.settings);
      return;
    }

    if (event.data.type === "PREPARE_RESULT") {
      request.resolve({
        ok: Boolean(event.data.ok),
        stage: event.data.stage,
        error: event.data.error || null
      });
    }
  }

  function cancelCurrentRequest() {
    if (!currentRequest) {
      return;
    }

    const request = currentRequest;
    currentRequest = null;
    sendBridgeMessage("CANCEL", request.requestId);

    const error = new Error("Подготовка отменена новой конфигурацией");
    error.name = "PreparationCancelledError";
    request.reject(error);
  }

  function sendBridgeMessage(type, requestId = null, payload = {}) {
    window.postMessage(
      {
        channel: CHANNEL,
        source: CONTROLLER_SOURCE,
        type,
        requestId,
        ...payload
      },
      "*"
    );
  }

  function isBridgeMessage(event, type, requestId) {
    return Boolean(
      event.source === window &&
        event.data &&
        event.data.channel === CHANNEL &&
        event.data.source === BRIDGE_SOURCE &&
        event.data.type === type &&
        event.data.requestId === requestId
    );
  }

  function ensureCurrentRun(sequence) {
    if (sequence !== runSequence) {
      const error = new Error("Подготовка отменена новой конфигурацией");
      error.name = "PreparationCancelledError";
      throw error;
    }
  }

  function createRequestId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function normalizePositiveNumber(value, fallback) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  async function reportStatus(stage, settings = null, error = null) {
    try {
      await chrome.runtime.sendMessage({
        type: "PREPARATION_STATUS",
        pageUrl: location.href,
        frameUrl: location.href,
        status: {
          stage,
          bet: settings?.bet ?? null,
          cashout: settings?.cashout ?? null,
          error: error instanceof Error ? error.message : error ? String(error) : null,
          observedAt: new Date().toISOString()
        }
      });
    } catch {
      // После обновления расширения старый content script теряет контекст.
    }
  }
})();
