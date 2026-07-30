import { testApiConnection } from "./api-client.js";
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
import { getSettings, saveSettings } from "./settings-service.js";
import { getStats } from "./stats-service.js";
import { isAviatorTabUrl } from "./url-service.js";

const FLUSH_ALARM = "flush-aviator-queues";
const COLLECTOR_FRAME_TTL_MS = 10 * 60 * 1000;
const PREPARATION_FRAME_TTL_MS = 10 * 60 * 1000;
const STRATEGY_STATE_TTL_MS = 24 * 60 * 60 * 1000;
const STRATEGY_ID = "ten-plus-x348";

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  await chrome.storage.local.remove([
    STORAGE_KEYS.collectorFrames,
    STORAGE_KEYS.preparationFrames,
    STORAGE_KEYS.strategyStates
  ]);
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
  void flushQueues();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    void flushQueues();
  }
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

    case "SAVE_STRATEGY_STATE":
      return saveStrategyState(sender, message);

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
      await chrome.storage.local.remove("aviatorDomHistoryStateV5");
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
    strategyTenPlusX348Enabled: Boolean(
      settings.strategyTenPlusX348Enabled && aviatorTab
    ),
    strategyTenPlusX348StopStep: Number(
      settings.strategyTenPlusX348StopStep || 0
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
    strategyStored
  ] = await Promise.all([
    getSettings(),
    getStats(),
    getQueueSizes(),
    chrome.storage.local.get(STORAGE_KEYS.collectorFrames),
    chrome.storage.local.get(STORAGE_KEYS.preparationFrames),
    chrome.storage.local.get(STORAGE_KEYS.strategyStates)
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
    )
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


async function saveExtensionSettings(partialSettings) {
  const previous = await getSettings();
  const settings = await saveSettings(partialSettings);

  const strategyConfigurationChanged =
    previous.strategyTenPlusX348Enabled !==
      settings.strategyTenPlusX348Enabled ||
    previous.strategyTenPlusX348StopStep !==
      settings.strategyTenPlusX348StopStep;

  if (strategyConfigurationChanged) {
    await chrome.storage.local.remove(STORAGE_KEYS.strategyStates);
  }

  return { ok: true, settings };
}

async function getStrategyState(sender) {
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

  if (!settings.strategyTenPlusX348Enabled) {
    return { ok: true, ignored: true, reason: "strategy-disabled" };
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
}

function cleanStrategyStates(value) {
  const current = value && typeof value === "object" ? value : {};
  const now = Date.now();
  const cleaned = {};

  for (const [key, state] of Object.entries(current)) {
    const observedAt = Date.parse(state?.observedAt || "");
    if (Number.isFinite(observedAt) && now - observedAt < STRATEGY_STATE_TTL_MS) {
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

  return {
    version: 1,
    strategyId: STRATEGY_ID,
    stage: String(state.stage || "waiting").slice(0, 64),
    initialized: Boolean(state.initialized),
    consecutiveLosses: Math.max(0, Math.round(number(state.consecutiveLosses))),
    step: Math.max(0, Math.round(number(state.step))),
    cumulativeLoss: Math.max(0, Number(number(state.cumulativeLoss).toFixed(2))),
    nextBet: Math.max(0.2, Number(number(state.nextBet, 0.2).toFixed(2))),
    activeBet:
      state.activeBet === null || state.activeBet === undefined
        ? null
        : Math.max(0.2, Number(number(state.activeBet, 0.2).toFixed(2))),
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
