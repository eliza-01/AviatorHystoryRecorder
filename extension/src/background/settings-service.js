import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

const MIN_AUTO_RELOAD_SECONDS = 5;
const MAX_AUTO_RELOAD_SECONDS = 86_400;

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEYS.settings] || {})
  });
}

export async function saveSettings(partialSettings) {
  const current = await getSettings();
  const next = sanitizeSettings({
    ...current,
    ...partialSettings,
    apiBaseUrl: normalizeApiBaseUrl(
      partialSettings.apiBaseUrl ?? current.apiBaseUrl
    )
  });

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: next
  });

  return next;
}

export function normalizeApiBaseUrl(value) {
  return String(value || DEFAULT_SETTINGS.apiBaseUrl)
    .trim()
    .replace(/\/+$/, "");
}

export function normalizeAutoReloadSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.pageAutoReloadSeconds;
  }

  return Math.min(
    MAX_AUTO_RELOAD_SECONDS,
    Math.max(MIN_AUTO_RELOAD_SECONDS, Math.round(parsed))
  );
}

function sanitizeSettings(value) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(value || {})
  };

  delete settings.apiKey;
  settings.enabled = Boolean(settings.enabled);
  settings.diagnosticsEnabled = Boolean(settings.diagnosticsEnabled);
  settings.pageAutoReloadEnabled = Boolean(settings.pageAutoReloadEnabled);
  settings.pageAutoReloadSeconds = normalizeAutoReloadSeconds(
    settings.pageAutoReloadSeconds
  );
  settings.apiBaseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);

  return settings;
}
