import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

const MIN_AUTO_RELOAD_SECONDS = 5;
const MAX_AUTO_RELOAD_SECONDS = 86_400;
const MIN_PREPARATION_BET = 0.01;
const MAX_PREPARATION_BET = 999_999_999;
const MIN_PREPARATION_CASHOUT = 1.01;
const MAX_PREPARATION_CASHOUT = 1_000_000;
const MAX_STRATEGY_STOP_STEP = 100;
const MAX_STRATEGY_SERIES_LENGTH = 10;
const MIN_BADGE_OFFSET_PX = 0;
const MAX_BADGE_OFFSET_PX = 10_000;
const MIN_BADGE_OPACITY_PERCENT = 10;
const MAX_BADGE_OPACITY_PERCENT = 100;

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const migrated = migrateLegacyStrategySettings(
    stored[STORAGE_KEYS.settings] || {}
  );
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...migrated
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

export function normalizeTelegramChatId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const numeric = normalized.startsWith("-")
    ? normalized.slice(1)
    : normalized;
  return /^\d{1,20}$/.test(numeric) ? normalized : "";
}

export function normalizeStrategySeriesLength(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.strategyTenPlusX340NotifySeriesLength;
  }

  return Math.min(
    MAX_STRATEGY_SERIES_LENGTH,
    Math.max(1, Math.round(parsed))
  );
}


export function normalizeBadgeOffsetPx(value, fallback = 10) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    MAX_BADGE_OFFSET_PX,
    Math.max(MIN_BADGE_OFFSET_PX, Math.round(parsed))
  );
}

export function normalizeBadgeOpacityPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.badgeOpacityPercent;
  }

  return Math.min(
    MAX_BADGE_OPACITY_PERCENT,
    Math.max(MIN_BADGE_OPACITY_PERCENT, Math.round(parsed))
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
  settings.badgeOffsetTopPx = normalizeBadgeOffsetPx(
    settings.badgeOffsetTopPx,
    DEFAULT_SETTINGS.badgeOffsetTopPx
  );
  settings.badgeOffsetLeftPx = normalizeBadgeOffsetPx(
    settings.badgeOffsetLeftPx,
    DEFAULT_SETTINGS.badgeOffsetLeftPx
  );
  settings.badgeOpacityPercent = normalizeBadgeOpacityPercent(
    settings.badgeOpacityPercent
  );
  settings.telegramChatId = normalizeTelegramChatId(settings.telegramChatId);
  settings.strategyTenPlusX340Enabled = Boolean(
    settings.strategyTenPlusX340Enabled
  );
  settings.strategyTenPlusX340StopStep = normalizeStrategyStopStep(
    settings.strategyTenPlusX340StopStep
  );
  settings.strategyTenPlusX340ReinvestmentEnabled = Boolean(
    settings.strategyTenPlusX340ReinvestmentEnabled
  );
  if (settings.strategyTenPlusX340StopStep <= 0) {
    settings.strategyTenPlusX340ReinvestmentEnabled = false;
  }
  settings.strategyTenPlusX340NotifySeriesEnabled = Boolean(
    settings.strategyTenPlusX340NotifySeriesEnabled
  );
  settings.strategyTenPlusX340NotifySeriesLength =
    normalizeStrategySeriesLength(
      settings.strategyTenPlusX340NotifySeriesLength
    );
  settings.preparationEnabled = Boolean(settings.preparationEnabled);
  settings.preparationBet = normalizePreparationBet(settings.preparationBet);
  settings.preparationCashout = normalizePreparationCashout(
    settings.preparationCashout
  );
  settings.apiBaseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);

  delete settings.strategyTenPlusX348Enabled;
  delete settings.strategyTenPlusX348StopStep;
  delete settings.strategyTenPlusX348ReinvestmentEnabled;
  delete settings.strategyTenPlusX348NotifySeriesEnabled;
  delete settings.strategyTenPlusX348NotifySeriesLength;

  // Активная стратегия полностью управляет первым блоком ставки.
  if (settings.strategyTenPlusX340Enabled) {
    settings.preparationEnabled = false;
  }

  return settings;
}

function migrateLegacyStrategySettings(value) {
  const settings = { ...(value || {}) };

  // Переносим только безопасные пользовательские настройки. Стоп новой
  // стратегии намеренно получает рекомендованное значение 12, а старое
  // состояние x3.48 не продолжается под новым множителем.
  if (
    !Object.prototype.hasOwnProperty.call(settings, "strategyTenPlusX340Enabled") &&
    Object.prototype.hasOwnProperty.call(settings, "strategyTenPlusX348Enabled")
  ) {
    settings.strategyTenPlusX340Enabled = Boolean(
      settings.strategyTenPlusX348Enabled
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      settings,
      "strategyTenPlusX340NotifySeriesEnabled"
    ) &&
    Object.prototype.hasOwnProperty.call(
      settings,
      "strategyTenPlusX348NotifySeriesEnabled"
    )
  ) {
    settings.strategyTenPlusX340NotifySeriesEnabled = Boolean(
      settings.strategyTenPlusX348NotifySeriesEnabled
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      settings,
      "strategyTenPlusX340NotifySeriesLength"
    ) &&
    Object.prototype.hasOwnProperty.call(
      settings,
      "strategyTenPlusX348NotifySeriesLength"
    )
  ) {
    settings.strategyTenPlusX340NotifySeriesLength =
      settings.strategyTenPlusX348NotifySeriesLength;
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
