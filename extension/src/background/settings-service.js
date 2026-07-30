import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

const MIN_AUTO_RELOAD_SECONDS = 5;
const MAX_AUTO_RELOAD_SECONDS = 86_400;
const MIN_PREPARATION_BET = 0.01;
const MAX_PREPARATION_BET = 999_999_999;
const MIN_PREPARATION_CASHOUT = 1.01;
const MAX_PREPARATION_CASHOUT = 1_000_000;
const MAX_STRATEGY_STOP_STEP = 100;

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

export function normalizePreparationBet(value) {
  return normalizeDecimal(
    value,
    MIN_PREPARATION_BET,
    MAX_PREPARATION_BET,
    DEFAULT_SETTINGS.preparationBet
  );
}

export function normalizePreparationCashout(value) {
  return normalizeDecimal(
    value,
    MIN_PREPARATION_CASHOUT,
    MAX_PREPARATION_CASHOUT,
    DEFAULT_SETTINGS.preparationCashout
  );
}

export function normalizeStrategyStopStep(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(MAX_STRATEGY_STOP_STEP, Math.max(1, Math.round(parsed)));
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
  settings.strategyTenPlusX348Enabled = Boolean(
    settings.strategyTenPlusX348Enabled
  );
  settings.strategyTenPlusX348StopStep = normalizeStrategyStopStep(
    settings.strategyTenPlusX348StopStep
  );
  settings.preparationEnabled = Boolean(settings.preparationEnabled);
  settings.preparationBet = normalizePreparationBet(settings.preparationBet);
  settings.preparationCashout = normalizePreparationCashout(
    settings.preparationCashout
  );
  settings.apiBaseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);

  // Активная стратегия полностью управляет первым блоком ставки.
  if (settings.strategyTenPlusX348Enabled) {
    settings.preparationEnabled = false;
  }

  return settings;
}

function normalizeDecimal(value, minimum, maximum, fallback) {
  const parsed = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Number(Math.min(maximum, Math.max(minimum, parsed)).toFixed(2));
}
