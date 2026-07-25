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

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  await chrome.storage.local.remove(STORAGE_KEYS.collectorFrames);
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

    case "GET_POPUP_STATE":
      return getPopupState();

    case "SAVE_SETTINGS":
      return {
        ok: true,
        settings: await saveSettings(message.settings || {})
      };

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
  return {
    ok: true,
    enabled: Boolean(settings.enabled && isAviatorTabUrl(topUrl)),
    diagnosticsEnabled: Boolean(settings.diagnosticsEnabled)
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
  const [settings, stats, queues, collectorStored] = await Promise.all([
    getSettings(),
    getStats(),
    getQueueSizes(),
    chrome.storage.local.get(STORAGE_KEYS.collectorFrames)
  ]);

  return {
    ok: true,
    version: chrome.runtime.getManifest().version,
    settings,
    stats,
    queues,
    collector: summarizeCollectorFrames(
      collectorStored[STORAGE_KEYS.collectorFrames]
    )
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
