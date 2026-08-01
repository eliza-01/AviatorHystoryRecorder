import {
  sendTelegramStrategyNotification,
  testApiConnection
} from "./api-client.js";
import { STORAGE_KEYS } from "./constants.js";
import { flushQueues } from "./flush-service.js";
import {
  normalizeCapturedResults,
  normalizeDiagnosticSample
} from "./normalization-service.js";
import {
  enqueueResults,
  enqueueSamples,
  getQueueSizes
} from "./queue-service.js";
import {
  getSettings,
  normalizeStrategyStopStep,
  saveSettings
} from "./settings-service.js";
import { getStats } from "./stats-service.js";
import { isAviatorTabUrl } from "./url-service.js";

const FLUSH_ALARM = "flush-aviator-queues";
const COLLECTOR_FRAME_TTL_MS = 10 * 60 * 1000;
const PREPARATION_FRAME_TTL_MS = 10 * 60 * 1000;
const STRATEGY_STATE_TTL_MS = 24 * 60 * 60 * 1000;
const STRATEGY_CONTROLLER_TTL_MS = 2 * 60 * 1000;
const STRATEGY_ID = "ten-plus-x340";
const strategyControllerLocks = new Map();

chrome.runtime.onInstalled.addListener(async (details) => {
  // Записываем мигрированные настройки x3.40 и удаляем устаревшие поля x3.48.
  await saveSettings({});
  const keys = [
    STORAGE_KEYS.collectorFrames,
    STORAGE_KEYS.preparationFrames,
    STORAGE_KEYS.strategyControllers
  ];

  // Состояние x3.48 несовместимо с новой целью и прогрессией x3.40.
  // Для последующих обновлений снова сохраняем активный цикл.
  const migratingFromX348 =
    details.reason === "update" &&
    isVersionBefore(details.previousVersion, "1.9.0");
  const migratingReinvestmentFormula =
    details.reason === "update" &&
    isVersionBefore(details.previousVersion, "1.9.1");
  if (
    details.reason === "install" ||
    migratingFromX348 ||
    migratingReinvestmentFormula
  ) {
    keys.push(STORAGE_KEYS.strategyStates);
  }
  if (details.reason === "install") {
    keys.push(STORAGE_KEYS.telegramStatus);
  }

  await chrome.storage.local.remove(keys);
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
});

function isVersionBefore(value, minimum) {
  const parse = (item) =>
    String(item || "0")
      .split(".")
      .slice(0, 3)
      .map((part) => Math.max(0, Number.parseInt(part, 10) || 0));
  const left = parse(value);
  const right = parse(minimum);
  for (let index = 0; index < 3; index += 1) {
    if ((left[index] || 0) !== (right[index] || 0)) {
      return (left[index] || 0) < (right[index] || 0);
    }
  }
  return false;
}

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
  void flushQueues();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    void flushQueues();
  }
});

chrome.tabs?.onRemoved?.addListener((tabId) => {
  void cleanupClosedTabRuntimeState(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "GET_CAPTURE_STATE":
      return getCaptureState(sender, message);

    case "CAPTURE_RESULTS":
      return captureResults(sender, message);

    case "CAPTURE_SAMPLE":
      return captureSample(sender, message);

    case "COLLECTOR_STATUS":
      return saveCollectorStatus(sender, message);

    case "PREPARATION_STATUS":
      return savePreparationStatus(sender, message);

    case "GET_STRATEGY_STATE":
      return getStrategyState(sender, message);

    case "CLAIM_STRATEGY_CONTROLLER":
      return claimStrategyController(sender, message);

    case "VERIFY_STRATEGY_CONTROLLER":
      return verifyStrategyController(sender, message);

    case "RELEASE_STRATEGY_CONTROLLER":
      return releaseStrategyController(sender, message);

    case "SAVE_STRATEGY_STATE":
      return saveStrategyState(sender, message);

    case "SEND_STRATEGY_NOTIFICATION":
      return sendStrategyNotification(sender, message);

    case "GET_POPUP_STATE":
      return getPopupState();

    case "SAVE_SETTINGS":
      return saveExtensionSettings(message.settings || {});

    case "TEST_CONNECTION":
      return {
        ok: true,
        health: await testApiConnection()
      };

    case "FLUSH_NOW":
      return flushQueues();

    case "RESET_DOM_STATE":
      await chrome.storage.local.remove([
        "aviatorDomHistoryStateV5",
        "aviatorDomHistoryStatesV6"
      ]);
      return { ok: true };

    default:
      return { ok: false, error: "Unknown message type" };
  }
}

async function getCaptureState(sender, message) {
  const settings = await getSettings();
  const topUrl = sender.tab?.url || message.pageUrl || "";
  const aviatorTab = isAviatorTabUrl(topUrl);
  const strategyState = await getStrategyStateForTab(sender.tab?.id, topUrl);

  return {
    ok: true,
    aviatorTab,
    enabled: Boolean(settings.enabled && aviatorTab),
    diagnosticsEnabled: Boolean(settings.diagnosticsEnabled),
    pageAutoReloadEnabled: Boolean(
      settings.pageAutoReloadEnabled && aviatorTab
    ),
    pageAutoReloadSeconds: Number(settings.pageAutoReloadSeconds),
    preparationEnabled: Boolean(
      settings.preparationEnabled && aviatorTab
    ),
    preparationBet: Number(settings.preparationBet),
    preparationCashout: Number(settings.preparationCashout),
    strategyTenPlusX340Enabled: Boolean(
      settings.strategyTenPlusX340Enabled && aviatorTab
    ),
    strategyTenPlusX340StopStep: Number(
      settings.strategyTenPlusX340StopStep || 0
    ),
    strategyTenPlusX340ReinvestmentEnabled: Boolean(
      settings.strategyTenPlusX340ReinvestmentEnabled
    ),
    telegramConfigured: Boolean(settings.telegramChatId),
    strategyTenPlusX340NotifySeriesEnabled: Boolean(
      settings.strategyTenPlusX340NotifySeriesEnabled
    ),
    strategyTenPlusX340NotifySeriesLength: Number(
      settings.strategyTenPlusX340NotifySeriesLength || 8
    ),
    strategyState
  };
}

async function captureResults(sender, message) {
  const settings = await getSettings();
  const topUrl = sender.tab?.url || message.pageUrl || "";

  if (!settings.enabled) {
    return {
      ok: true,
      accepted: 0,
      queued: 0,
      reason: "collection-disabled"
    };
  }

  if (!isAviatorTabUrl(topUrl)) {
    return {
      ok: true,
      accepted: 0,
      queued: 0,
      reason: "top-tab-is-not-aviator"
    };
  }

  const normalized = normalizeCapturedResults(
    Array.isArray(message.results) ? message.results : [],
    sender,
    message
  );

  if (normalized.length === 0) {
    return {
      ok: true,
      accepted: 0,
      queued: 0,
      reason: "normalization-rejected"
    };
  }

  const queueSize = await enqueueResults(normalized);
  void flushQueues();
  return {
    ok: true,
    accepted: normalized.length,
    queued: normalized.length,
    queueSize
  };
}

async function captureSample(sender, message) {
  const settings = await getSettings();
  if (
    !settings.enabled ||
    !settings.diagnosticsEnabled ||
    !isAviatorTabUrl(sender.tab?.url || message.pageUrl)
  ) {
    return { ok: true, accepted: 0, queued: 0 };
  }

  const normalized = normalizeDiagnosticSample(message.sample, sender, message);
  if (!normalized) {
    return { ok: true, accepted: 0, queued: 0 };
  }

  const queueSize = await enqueueSamples([normalized]);
  void flushQueues();
  return { ok: true, accepted: 1, queued: 1, queueSize };
}

async function saveCollectorStatus(sender, message) {
  const topUrl = sender.tab?.url || message.pageUrl || "";
  if (!isAviatorTabUrl(topUrl)) {
    return { ok: true, ignored: true };
  }

  const stored = await chrome.storage.local.get(STORAGE_KEYS.collectorFrames);
  const current =
    stored[STORAGE_KEYS.collectorFrames] &&
    typeof stored[STORAGE_KEYS.collectorFrames] === "object"
      ? stored[STORAGE_KEYS.collectorFrames]
      : {};

  const now = Date.now();
  const cleaned = {};
  for (const [key, value] of Object.entries(current)) {
    const observedAt = Date.parse(value?.observedAt || "");
    if (Number.isFinite(observedAt) && now - observedAt < COLLECTOR_FRAME_TTL_MS) {
      cleaned[key] = value;
    }
  }

  const tabId = sender.tab?.id ?? "unknown-tab";
  const frameId = sender.frameId ?? "unknown-frame";
  cleaned[`${tabId}:${frameId}`] = {
    ...(message.status || {}),
    tabId,
    frameId,
    topUrl: sanitizeStatusUrl(topUrl),
    observedAt: message.status?.observedAt || new Date().toISOString()
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.collectorFrames]: cleaned
  });

  return { ok: true };
}

async function getPopupState() {
  const [
    settings,
    stats,
    queues,
    collectorStored,
    preparationStored,
    strategyStored,
    telegramStored
  ] = await Promise.all([
    getSettings(),
    getStats(),
    getQueueSizes(),
    chrome.storage.local.get(STORAGE_KEYS.collectorFrames),
    chrome.storage.local.get(STORAGE_KEYS.preparationFrames),
    chrome.storage.local.get(STORAGE_KEYS.strategyStates),
    chrome.storage.local.get(STORAGE_KEYS.telegramStatus)
  ]);

  return {
    ok: true,
    version: chrome.runtime.getManifest().version,
    settings,
    stats,
    queues,
    collector: summarizeCollectorFrames(
      collectorStored[STORAGE_KEYS.collectorFrames]
    ),
    preparation: summarizePreparationFrames(
      preparationStored[STORAGE_KEYS.preparationFrames]
    ),
    strategy: summarizeStrategyStates(
      strategyStored[STORAGE_KEYS.strategyStates]
    ),
    telegram: telegramStored[STORAGE_KEYS.telegramStatus] || null
  };
}

async function savePreparationStatus(sender, message) {
  const topUrl = sender.tab?.url || message.pageUrl || "";
  if (!isAviatorTabUrl(topUrl)) {
    return { ok: true, ignored: true };
  }

  const stored = await chrome.storage.local.get(STORAGE_KEYS.preparationFrames);
  const current =
    stored[STORAGE_KEYS.preparationFrames] &&
    typeof stored[STORAGE_KEYS.preparationFrames] === "object"
      ? stored[STORAGE_KEYS.preparationFrames]
      : {};

  const now = Date.now();
  const cleaned = {};
  for (const [key, value] of Object.entries(current)) {
    const observedAt = Date.parse(value?.observedAt || "");
    if (
      Number.isFinite(observedAt) &&
      now - observedAt < PREPARATION_FRAME_TTL_MS
    ) {
      cleaned[key] = value;
    }
  }

  const tabId = sender.tab?.id ?? "unknown-tab";
  const frameId = sender.frameId ?? "unknown-frame";
  cleaned[`${tabId}:${frameId}`] = {
    ...(message.status || {}),
    tabId,
    frameId,
    topUrl: sanitizeStatusUrl(topUrl),
    frameUrl: sanitizeStatusUrl(sender.url || message.frameUrl || ""),
    observedAt: message.status?.observedAt || new Date().toISOString()
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.preparationFrames]: cleaned
  });

  return { ok: true };
}


async function cleanupClosedTabRuntimeState(tabId) {
  if (tabId === null || tabId === undefined) {
    return;
  }

  await withStrategyControllerLock(tabId, async () => {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.strategyStates,
      STORAGE_KEYS.strategyControllers,
      STORAGE_KEYS.collectorFrames,
      STORAGE_KEYS.preparationFrames
    ]);
    const tabKey = String(tabId);
    const states = cleanStrategyStates(stored[STORAGE_KEYS.strategyStates]);
    const controllers = cleanStrategyControllers(
      stored[STORAGE_KEYS.strategyControllers]
    );
    const collectorFrames = filterFrameStatusForOtherTabs(
      stored[STORAGE_KEYS.collectorFrames],
      tabKey
    );
    const preparationFrames = filterFrameStatusForOtherTabs(
      stored[STORAGE_KEYS.preparationFrames],
      tabKey
    );

    delete states[tabKey];
    delete controllers[tabKey];
    await chrome.storage.local.set({
      [STORAGE_KEYS.strategyStates]: states,
      [STORAGE_KEYS.strategyControllers]: controllers,
      [STORAGE_KEYS.collectorFrames]: collectorFrames,
      [STORAGE_KEYS.preparationFrames]: preparationFrames
    });
  });
}

function filterFrameStatusForOtherTabs(value, closedTabKey) {
  const current = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    Object.entries(current).filter(([key, item]) => {
      const itemTabId = item?.tabId;
      if (itemTabId !== null && itemTabId !== undefined) {
        return String(itemTabId) !== closedTabKey;
      }
      return !String(key).startsWith(`${closedTabKey}:`);
    })
  );
}

async function saveExtensionSettings(partialSettings) {
  const previous = await getSettings();
  const requestedEnabled = Object.prototype.hasOwnProperty.call(
    partialSettings,
    "strategyTenPlusX340Enabled"
  )
    ? Boolean(partialSettings.strategyTenPlusX340Enabled)
    : previous.strategyTenPlusX340Enabled;
  const requestedStopStep = Object.prototype.hasOwnProperty.call(
    partialSettings,
    "strategyTenPlusX340StopStep"
  )
    ? normalizeStrategyStopStep(partialSettings.strategyTenPlusX340StopStep)
    : previous.strategyTenPlusX340StopStep;
  const requestedReinvestmentEnabled = Object.prototype.hasOwnProperty.call(
    partialSettings,
    "strategyTenPlusX340ReinvestmentEnabled"
  )
    ? Boolean(partialSettings.strategyTenPlusX340ReinvestmentEnabled)
    : previous.strategyTenPlusX340ReinvestmentEnabled;
  const criticalChangeRequested =
    requestedEnabled !== previous.strategyTenPlusX340Enabled ||
    requestedStopStep !== previous.strategyTenPlusX340StopStep ||
    requestedReinvestmentEnabled !==
      previous.strategyTenPlusX340ReinvestmentEnabled;

  if (criticalChangeRequested) {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyStates);
    const activeState = Object.values(
      cleanStrategyStates(stored[STORAGE_KEYS.strategyStates])
    ).find((state) => {
      const observedAt = Date.parse(state?.observedAt || "");
      return (
        isStrategyStateActive(state) &&
        Number.isFinite(observedAt) &&
        Date.now() - observedAt < 15 * 60 * 1000
      );
    });
    if (activeState) {
      return {
        ok: false,
        error:
          "Нельзя выключить стратегию, изменить стоп или реинвестирование во время размещённой/размещаемой ставки. " +
          "Дождитесь результата текущего шага."
      };
    }
  }

  const settings = await saveSettings(partialSettings);
  const strategyConfigurationChanged =
    previous.strategyTenPlusX340Enabled !==
      settings.strategyTenPlusX340Enabled ||
    previous.strategyTenPlusX340StopStep !==
      settings.strategyTenPlusX340StopStep ||
    previous.strategyTenPlusX340ReinvestmentEnabled !==
      settings.strategyTenPlusX340ReinvestmentEnabled;

  if (strategyConfigurationChanged) {
    await chrome.storage.local.remove([
      STORAGE_KEYS.strategyStates,
      STORAGE_KEYS.strategyControllers
    ]);
  }

  if (previous.telegramChatId !== settings.telegramChatId) {
    await chrome.storage.local.remove(STORAGE_KEYS.telegramStatus);
  }

  return { ok: true, settings };
}


async function claimStrategyController(sender, message) {
  const settings = await getSettings();
  const tabId = sender.tab?.id;
  const topUrl = sender.tab?.url || message.pageUrl || "";

  if (
    tabId === null ||
    tabId === undefined ||
    !isAviatorTabUrl(topUrl) ||
    !settings.strategyTenPlusX340Enabled
  ) {
    return { ok: true, owner: false, reason: "strategy-unavailable" };
  }

  const frameId = sender.frameId ?? 0;
  const score = Math.min(10_000, Math.max(0, Math.round(Number(message.score) || 0)));

  return withStrategyControllerLock(tabId, async () => {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.strategyControllers,
      STORAGE_KEYS.strategyStates
    ]);
    const controllers = cleanStrategyControllers(
      stored[STORAGE_KEYS.strategyControllers]
    );
    const states = cleanStrategyStates(stored[STORAGE_KEYS.strategyStates]);
    const key = String(tabId);
    const current = controllers[key] || null;
    const currentState = states[key] || null;
    const now = Date.now();
    const expectedTopUrl = sanitizeStatusUrl(topUrl);
    const currentAge = current
      ? now - Date.parse(current.lastSeenAt || current.claimedAt || "")
      : Number.POSITIVE_INFINITY;
    const currentStale = !Number.isFinite(currentAge) || currentAge > STRATEGY_CONTROLLER_TTL_MS;
    const sameFrame = Boolean(
      current &&
        current.frameId === frameId &&
        (!current.topUrl || current.topUrl === expectedTopUrl)
    );
    const currentStateActive = isStrategyStateActive(currentState);
    const canReplace = Boolean(
      !current ||
        currentStale ||
        current.topUrl !== expectedTopUrl ||
        (!currentStateActive && score > Number(current.score || 0))
    );

    if (sameFrame) {
      const refreshed = {
        ...current,
        score: Math.max(Number(current.score || 0), score),
        frameUrl: sanitizeStatusUrl(sender.url || message.frameUrl || ""),
        lastSeenAt: new Date().toISOString()
      };
      controllers[key] = refreshed;
      await chrome.storage.local.set({
        [STORAGE_KEYS.strategyControllers]: controllers
      });
      return {
        ok: true,
        owner: true,
        controllerToken: refreshed.token,
        ownerFrameId: frameId
      };
    }

    if (!canReplace) {
      return {
        ok: true,
        owner: false,
        ownerFrameId: current.frameId,
        reason: currentStateActive ? "active-owner-exists" : "better-owner-exists"
      };
    }

    const controller = {
      tabId,
      frameId,
      token: createControllerToken(),
      score,
      topUrl: expectedTopUrl,
      frameUrl: sanitizeStatusUrl(sender.url || message.frameUrl || ""),
      claimedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };
    controllers[key] = controller;
    await chrome.storage.local.set({
      [STORAGE_KEYS.strategyControllers]: controllers
    });

    return {
      ok: true,
      owner: true,
      controllerToken: controller.token,
      ownerFrameId: frameId
    };
  });
}

async function verifyStrategyController(sender, message) {
  const tabId = sender.tab?.id;
  if (tabId === null || tabId === undefined) {
    return { ok: true, owner: false, reason: "missing-tab" };
  }

  return withStrategyControllerLock(tabId, async () => {
    const result = await verifyStrategyControllerUnlocked(sender, message, true);
    return { ok: true, ...result };
  });
}

async function releaseStrategyController(sender, message) {
  const tabId = sender.tab?.id;
  if (tabId === null || tabId === undefined) {
    return { ok: true, released: false };
  }

  return withStrategyControllerLock(tabId, async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyControllers);
    const controllers = cleanStrategyControllers(
      stored[STORAGE_KEYS.strategyControllers]
    );
    const key = String(tabId);
    const current = controllers[key];
    const token = String(message.controllerToken || "");
    const frameId = sender.frameId ?? 0;

    if (!current || current.frameId !== frameId || current.token !== token) {
      return { ok: true, released: false };
    }

    delete controllers[key];
    await chrome.storage.local.set({
      [STORAGE_KEYS.strategyControllers]: controllers
    });
    return { ok: true, released: true };
  });
}

async function verifyStrategyControllerUnlocked(sender, message, refresh) {
  const tabId = sender.tab?.id;
  const topUrl = sender.tab?.url || message.pageUrl || "";
  const frameId = sender.frameId ?? 0;
  const token = String(message.controllerToken || "");
  const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyControllers);
  const controllers = cleanStrategyControllers(
    stored[STORAGE_KEYS.strategyControllers]
  );
  const key = String(tabId);
  const current = controllers[key] || null;
  const expectedTopUrl = sanitizeStatusUrl(topUrl);

  if (
    !current ||
    current.frameId !== frameId ||
    current.token !== token ||
    (current.topUrl && expectedTopUrl && current.topUrl !== expectedTopUrl)
  ) {
    return {
      owner: false,
      ownerFrameId: current?.frameId ?? null,
      reason: "controller-mismatch"
    };
  }

  if (refresh) {
    current.lastSeenAt = new Date().toISOString();
    current.frameUrl = sanitizeStatusUrl(sender.url || message.frameUrl || "");
    controllers[key] = current;
    await chrome.storage.local.set({
      [STORAGE_KEYS.strategyControllers]: controllers
    });
  }

  return {
    owner: true,
    controllerToken: current.token,
    ownerFrameId: current.frameId
  };
}

function cleanStrategyControllers(value) {
  const current = value && typeof value === "object" ? value : {};
  const now = Date.now();
  const cleaned = {};

  for (const [key, controller] of Object.entries(current)) {
    const lastSeenAt = Date.parse(
      controller?.lastSeenAt || controller?.claimedAt || ""
    );
    if (
      Number.isFinite(lastSeenAt) &&
      now - lastSeenAt < STRATEGY_CONTROLLER_TTL_MS * 3 &&
      controller?.token
    ) {
      cleaned[key] = controller;
    }
  }

  return cleaned;
}

function isStrategyStateActive(state) {
  return Boolean(
    state &&
      (state.awaitingResult ||
        ["arming", "betting"].includes(state.stage))
  );
}

function createControllerToken() {
  return `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
}

function withStrategyControllerLock(tabId, task) {
  const key = String(tabId);
  const previous = strategyControllerLocks.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  strategyControllerLocks.set(key, current);
  return current.finally(() => {
    if (strategyControllerLocks.get(key) === current) {
      strategyControllerLocks.delete(key);
    }
  });
}

async function sendStrategyNotification(sender, message) {
  const settings = await getSettings();
  const topUrl = sender.tab?.url || message.pageUrl || "";

  if (!isAviatorTabUrl(topUrl)) {
    return { ok: false, error: "Уведомление разрешено только из вкладки Aviator" };
  }

  if (!settings.strategyTenPlusX340Enabled) {
    return { ok: false, error: "Стратегия выключена" };
  }

  const ownership = await verifyStrategyController(sender, message);
  if (!ownership.owner) {
    return { ok: false, error: "Уведомление отклонено: iframe не управляет стратегией" };
  }

  if (!settings.telegramChatId) {
    return { ok: false, error: "Telegram ID не указан" };
  }

  const notification = sanitizeStrategyNotification(message.notification, settings);
  if (
    notification.reason === "series" &&
    !settings.strategyTenPlusX340NotifySeriesEnabled
  ) {
    return { ok: false, error: "Уведомления о серии выключены" };
  }

  const notificationKey = String(
    message.notificationKey || `${notification.reason}:${Date.now()}`
  ).slice(0, 300);
  const storedStatus = await chrome.storage.local.get(STORAGE_KEYS.telegramStatus);
  const previousStatus = storedStatus[STORAGE_KEYS.telegramStatus] || null;
  const previousAge = Date.now() - Date.parse(previousStatus?.observedAt || "");
  if (
    previousStatus?.notificationKey === notificationKey &&
    (previousStatus.ok === true ||
      (previousStatus.pending === true && Number.isFinite(previousAge) && previousAge < 30_000))
  ) {
    return { ok: true, duplicate: true };
  }

  const statusBase = {
    reason: notification.reason,
    notificationKey,
    observedAt: new Date().toISOString()
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.telegramStatus]: {
      ...statusBase,
      pending: true,
      ok: null,
      error: null
    }
  });

  try {
    const response = await sendTelegramStrategyNotification(notification);
    await chrome.storage.local.set({
      [STORAGE_KEYS.telegramStatus]: {
        ...statusBase,
        pending: false,
        ok: true,
        error: null
      }
    });
    return { ok: true, response };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    await chrome.storage.local.set({
      [STORAGE_KEYS.telegramStatus]: {
        ...statusBase,
        pending: false,
        ok: false,
        error: messageText.slice(0, 500)
      }
    });
    return { ok: false, error: messageText };
  }
}

function sanitizeStrategyNotification(value, settings) {
  const source = value && typeof value === "object" ? value : {};
  const reason = ["series", "profit", "stop"].includes(source.reason)
    ? source.reason
    : null;
  if (!reason) {
    throw new Error("Неизвестная причина Telegram-уведомления");
  }

  const number = (candidate, fallback = 0) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const payload = {
    chat_id: settings.telegramChatId,
    reason,
    strategy_name: "10+ - x3.40",
    target: 3.40,
    signal_length: 10
  };

  if (reason === "series") {
    payload.series_length = Math.min(
      10,
      Math.max(1, Math.round(number(source.seriesLength, 1)))
    );
    payload.current_streak = Math.max(
      payload.series_length,
      Math.round(number(source.currentStreak, payload.series_length))
    );
  } else if (reason === "profit") {
    payload.step = Math.max(1, Math.round(number(source.step, 1)));
    payload.drawdown = Math.max(0, number(source.drawdown));
    payload.profit = Math.max(0, number(source.profit));
    payload.multiplier = Math.max(0, number(source.multiplier));
    payload.bet = Math.max(0, number(source.bet));
  } else {
    payload.step = Math.max(1, Math.round(number(source.step, 1)));
    payload.drawdown = Math.max(0, number(source.drawdown));
    payload.loss = Math.max(0, number(source.loss));
  }

  return payload;
}

async function getStrategyState(sender, message) {
  return {
    ok: true,
    state: await getStrategyStateForTab(
      sender.tab?.id,
      sender.tab?.url || message.pageUrl || ""
    )
  };
}

async function getStrategyStateForTab(tabId, topUrl = "") {
  if (tabId === null || tabId === undefined) {
    return null;
  }

  const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyStates);
  const states = cleanStrategyStates(stored[STORAGE_KEYS.strategyStates]);
  const state = states[String(tabId)] || null;
  if (!state) {
    return null;
  }

  const expectedTopUrl = sanitizeStatusUrl(topUrl);
  return expectedTopUrl && state.topUrl && state.topUrl !== expectedTopUrl
    ? null
    : state;
}

async function saveStrategyState(sender, message) {
  const settings = await getSettings();
  const tabId = sender.tab?.id;
  const topUrl = sender.tab?.url || message.pageUrl || "";

  if (tabId === null || tabId === undefined || !isAviatorTabUrl(topUrl)) {
    return { ok: true, ignored: true };
  }

  if (!settings.strategyTenPlusX340Enabled) {
    return { ok: true, ignored: true, reason: "strategy-disabled" };
  }

  return withStrategyControllerLock(tabId, async () => {
    const ownership = await verifyStrategyControllerUnlocked(sender, message, true);
    if (!ownership.owner) {
      return {
        ok: false,
        ignored: true,
        reason: "not-strategy-controller",
        error: "Состояние отклонено: iframe не управляет стратегией"
      };
    }

    const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyStates);
    const states = cleanStrategyStates(stored[STORAGE_KEYS.strategyStates]);
    const state = sanitizeStrategyState(message.state, {
      tabId,
      frameId: sender.frameId ?? 0,
      topUrl,
      frameUrl: sender.url || message.frameUrl || ""
    });

    states[String(tabId)] = state;
    await chrome.storage.local.set({ [STORAGE_KEYS.strategyStates]: states });

    return { ok: true, state };
  });
}

function cleanStrategyStates(value) {
  const current = value && typeof value === "object" ? value : {};
  const now = Date.now();
  const cleaned = {};

  for (const [key, state] of Object.entries(current)) {
    const observedAt = Date.parse(state?.observedAt || "");
    if (
      Number.isFinite(observedAt) &&
      now - observedAt < STRATEGY_STATE_TTL_MS &&
      state?.version === 3 &&
      state?.strategyId === STRATEGY_ID
    ) {
      cleaned[key] = state;
    }
  }

  return cleaned;
}

function sanitizeStrategyState(value, context) {
  const state = value && typeof value === "object" ? value : {};
  const number = (candidate, fallback = 0) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const minimumDeposit = Math.max(
    0,
    Number(number(state.minimumDeposit, 0).toFixed(4))
  );
  const reinvestmentStep = Math.max(
    0,
    Number(number(state.reinvestmentStep, 0).toFixed(4))
  );
  const cycleInitialBet = Math.max(
    0.2,
    Number(number(state.cycleInitialBet, 0.2).toFixed(2))
  );

  return {
    version: 3,
    strategyId: STRATEGY_ID,
    stage: String(state.stage || "waiting").slice(0, 64),
    initialized: Boolean(state.initialized),
    consecutiveLosses: Math.max(0, Math.round(number(state.consecutiveLosses))),
    step: Math.max(0, Math.round(number(state.step))),
    cumulativeLoss: Math.max(0, Number(number(state.cumulativeLoss).toFixed(2))),
    minimumDeposit,
    reinvestmentStep,
    strategyBalance: Math.max(
      0,
      Number(number(state.strategyBalance, minimumDeposit).toFixed(4))
    ),
    cycleInitialBet,
    cycleTargetProfit: Math.max(
      cycleInitialBet,
      Number(number(state.cycleTargetProfit, cycleInitialBet).toFixed(2))
    ),
    nextBet: Math.max(
      cycleInitialBet,
      Number(number(state.nextBet, cycleInitialBet).toFixed(2))
    ),
    activeBet:
      state.activeBet === null || state.activeBet === undefined
        ? null
        : Math.max(
            cycleInitialBet,
            Number(number(state.activeBet, cycleInitialBet).toFixed(2))
          ),
    awaitingResult: Boolean(state.awaitingResult),
    autoReloadPaused: Boolean(state.autoReloadPaused),
    lastProcessedRoundId: state.lastProcessedRoundId
      ? String(state.lastProcessedRoundId).slice(0, 160)
      : null,
    lastMultiplier:
      state.lastMultiplier === null || state.lastMultiplier === undefined
        ? null
        : Number(number(state.lastMultiplier).toFixed(2)),
    lastCyclePnl:
      state.lastCyclePnl === null || state.lastCyclePnl === undefined
        ? null
        : Number(number(state.lastCyclePnl).toFixed(4)),
    completedCycles: Math.max(0, Math.round(number(state.completedCycles))),
    stoppedCycles: Math.max(0, Math.round(number(state.stoppedCycles))),
    error: state.error ? String(state.error).slice(0, 500) : null,
    message: state.message ? String(state.message).slice(0, 500) : null,
    signalInterfacePrepared: Boolean(state.signalInterfacePrepared),
    signalPreparationError: state.signalPreparationError
      ? String(state.signalPreparationError).slice(0, 500)
      : null,
    lastSeriesNotificationRoundId: state.lastSeriesNotificationRoundId
      ? String(state.lastSeriesNotificationRoundId).slice(0, 160)
      : null,
    lastNotificationReason: ["series", "profit", "stop"].includes(
      state.lastNotificationReason
    )
      ? state.lastNotificationReason
      : null,
    lastNotificationAt: state.lastNotificationAt
      ? String(state.lastNotificationAt).slice(0, 64)
      : null,
    configSignature: state.configSignature
      ? String(state.configSignature).slice(0, 100)
      : null,
    tabId: context.tabId,
    frameId: context.frameId,
    topUrl: sanitizeStatusUrl(context.topUrl),
    frameUrl: sanitizeStatusUrl(context.frameUrl),
    observedAt: new Date().toISOString()
  };
}

function summarizeStrategyStates(value) {
  const states = Object.values(cleanStrategyStates(value)).sort(
    (left, right) =>
      Date.parse(right?.observedAt || "") - Date.parse(left?.observedAt || "")
  );

  return states[0] || null;
}

function summarizePreparationFrames(value) {
  const frames = value && typeof value === "object" ? Object.values(value) : [];
  const recent = frames
    .filter((frame) => {
      const observedAt = Date.parse(frame?.observedAt || "");
      return (
        Number.isFinite(observedAt) &&
        Date.now() - observedAt < PREPARATION_FRAME_TTL_MS
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right?.observedAt || "") -
        Date.parse(left?.observedAt || "")
    );

  const best = recent[0] || null;

  return {
    stage: best?.stage || "not-started",
    error: best?.error || null,
    bet: best?.bet ?? null,
    cashout: best?.cashout ?? null,
    frameUrl: best?.frameUrl || null,
    observedAt: best?.observedAt || null
  };
}

function summarizeCollectorFrames(value) {
  const frames = value && typeof value === "object" ? Object.values(value) : [];
  const recent = frames
    .filter((frame) => {
      const observedAt = Date.parse(frame?.observedAt || "");
      return (
        Number.isFinite(observedAt) &&
        Date.now() - observedAt < COLLECTOR_FRAME_TTL_MS
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right?.observedAt || "") - Date.parse(left?.observedAt || "")
    );

  const withHistory = recent.filter((frame) => frame?.historyFound);
  const best =
    withHistory.sort(
      (left, right) => Number(right?.historySize || 0) - Number(left?.historySize || 0)
    )[0] || recent[0] || null;

  return {
    framesSeen: recent.length,
    historyFound: withHistory.length > 0,
    historyFrames: withHistory.length,
    stage: best?.stage || "not-injected",
    historySize: Number(best?.historySize || 0),
    firstValue: best?.firstValue ?? null,
    detectedNew: Number(best?.detectedNew || 0),
    accepted: Number(best?.accepted || 0),
    error: best?.error || null,
    frameUrl: best?.frameUrl || null,
    observedAt: best?.observedAt || null
  };
}

function sanitizeStatusUrl(value) {
  try {
    const parsed = new URL(String(value));
    return `${parsed.origin}${parsed.pathname}`.slice(0, 500);
  } catch {
    return String(value || "").split("?")[0].slice(0, 500);
  }
}
