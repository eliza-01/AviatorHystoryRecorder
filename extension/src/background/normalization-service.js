import { sanitizeStoredUrl } from "./url-service.js";

const ALLOWED_SOURCES = new Set([
  "websocket",
  "fetch",
  "xhr",
  "dom",
  "unknown"
]);

export function normalizeCapturedResults(items, sender, message) {
  const pageUrl = sanitizeStoredUrl(sender.tab?.url || message.pageUrl);
  const frameUrl = sanitizeStoredUrl(sender.url || message.frameUrl);

  return items
    .map((item) => normalizeResult(item, pageUrl, frameUrl))
    .filter(Boolean);
}

function normalizeResult(item, pageUrl, frameUrl) {
  const multiplier = Number(item?.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 9999999999) {
    return null;
  }

  return {
    event_id: crypto.randomUUID(),
    game_key: "aviator_pm_by",
    round_id: normalizeRoundId(item.roundId),
    multiplier: Number(multiplier.toFixed(2)),
    happened_at: normalizeDate(item.happenedAt),
    captured_at: new Date().toISOString(),
    source: ALLOWED_SOURCES.has(item.source) ? item.source : "unknown",
    page_url: pageUrl,
    frame_url: frameUrl,
    confidence: clamp(Number(item.confidence ?? 0.5), 0, 1),
    metadata: sanitizeMetadata(item.metadata)
  };
}

export function normalizeDiagnosticSample(item, sender, message) {
  const payload = String(item?.payloadSample || "").trim();
  if (!payload) {
    return null;
  }

  return {
    event_id: crypto.randomUUID(),
    game_key: "aviator_pm_by",
    transport: ["websocket", "fetch", "xhr"].includes(item.transport)
      ? item.transport
      : "unknown",
    direction: ["in", "out", "response"].includes(item.direction)
      ? item.direction
      : "unknown",
    frame_url: sanitizeStoredUrl(sender.url || message.frameUrl),
    endpoint_url: sanitizeStoredUrl(item.endpointUrl),
    payload_sample: payload.slice(0, 8000),
    captured_at: new Date().toISOString()
  };
}

function normalizeRoundId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).slice(0, 128);
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const safe = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, 30)) {
    if (/token|auth|cookie|session|jwt/i.test(key)) {
      continue;
    }

    if (["string", "number", "boolean"].includes(typeof rawValue)) {
      safe[String(key).slice(0, 80)] =
        typeof rawValue === "string" ? rawValue.slice(0, 500) : rawValue;
    }
  }
  return safe;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
