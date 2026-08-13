import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

const MIN_AUTO_RELOAD_SECONDS = 5;
const MAX_AUTO_RELOAD_SECONDS = 86_400;
const MIN_PREPARATION_BET = 0.01;
const MAX_PREPARATION_BET = 999_999_999;
const MIN_PREPARATION_CASHOUT = 1.01;
const MAX_PREPARATION_CASHOUT = 1_000_000;
const MAX_STRATEGY_STOP_STEP = 100;
const MIN_BADGE_OFFSET_PX = 0;
const MAX_BADGE_OFFSET_PX = 10_000;
const MIN_BADGE_OPACITY_PERCENT = 10;
const MAX_BADGE_OPACITY_PERCENT = 100;
const X512_MINIMUM_DEPOSIT = 14;
const X512_MAXIMUM_DEPOSIT = 1_400_000;
const X512_20_MINIMUM_DEPOSIT = 13.41;
const X512_20_MAXIMUM_DEPOSIT = 10_000_000;
const X1436_MINIMUM_DEPOSIT = 25;
const X1436_MAXIMUM_DEPOSIT = 10_000_000;

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

export function normalizeStrategySeriesLength(
  value,
  maximum = 10,
  fallback = 8
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(1, Math.round(maximum)),
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

export function normalizeX512StartingDeposit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.strategyFifteenPlusX512StartingDeposit;
  }

  const bounded = Math.min(
    X512_MAXIMUM_DEPOSIT,
    Math.max(X512_MINIMUM_DEPOSIT, parsed)
  );

  // Округляем вверх, чтобы введённое значение никогда не уменьшало запас банка.
  return Math.ceil(bounded / X512_MINIMUM_DEPOSIT) * X512_MINIMUM_DEPOSIT;
}

export function normalizeTwentyPlusX512StartingDeposit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.strategyTwentyPlusX512StartingDeposit;
  }

  const bounded = Math.min(
    X512_20_MAXIMUM_DEPOSIT,
    Math.max(X512_20_MINIMUM_DEPOSIT, parsed)
  );
  return Math.round((bounded + Number.EPSILON) * 100) / 100;
}

export function normalizeFortyThreePlusX1436StartingDeposit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.strategyFortyThreePlusX1436StartingDeposit;
  }

  const bounded = Math.min(
    X1436_MAXIMUM_DEPOSIT,
    Math.max(X1436_MINIMUM_DEPOSIT, parsed)
  );
  return Math.round((bounded + Number.EPSILON) * 100) / 100;
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
      settings.strategyTenPlusX340NotifySeriesLength,
      10,
      DEFAULT_SETTINGS.strategyTenPlusX340NotifySeriesLength
    );

  settings.strategyFifteenPlusX512Enabled = Boolean(
    settings.strategyFifteenPlusX512Enabled
  );
  settings.strategyFifteenPlusX512ReinvestmentEnabled = Boolean(
    settings.strategyFifteenPlusX512ReinvestmentEnabled
  );
  settings.strategyFifteenPlusX512StartingDeposit = normalizeX512StartingDeposit(
    settings.strategyFifteenPlusX512StartingDeposit
  );
  settings.strategyFifteenPlusX512NotifySeriesEnabled = Boolean(
    settings.strategyFifteenPlusX512NotifySeriesEnabled
  );
  settings.strategyFifteenPlusX512NotifySeriesLength =
    normalizeStrategySeriesLength(
      settings.strategyFifteenPlusX512NotifySeriesLength,
      15,
      DEFAULT_SETTINGS.strategyFifteenPlusX512NotifySeriesLength
    );

  settings.strategyTwentyPlusX512Enabled = Boolean(
    settings.strategyTwentyPlusX512Enabled
  );
  settings.strategyTwentyPlusX512StartingDeposit =
    normalizeTwentyPlusX512StartingDeposit(
      settings.strategyTwentyPlusX512StartingDeposit
    );
  settings.strategyTwentyPlusX512NotifySeriesEnabled = Boolean(
    settings.strategyTwentyPlusX512NotifySeriesEnabled
  );
  settings.strategyTwentyPlusX512NotifySeriesLength =
    normalizeStrategySeriesLength(
      settings.strategyTwentyPlusX512NotifySeriesLength,
      20,
      DEFAULT_SETTINGS.strategyTwentyPlusX512NotifySeriesLength
    );

  settings.strategyFortyThreePlusX1436Enabled = Boolean(
    settings.strategyFortyThreePlusX1436Enabled
  );
  settings.strategyFortyThreePlusX1436StartingDeposit =
    normalizeFortyThreePlusX1436StartingDeposit(
      settings.strategyFortyThreePlusX1436StartingDeposit
    );
  settings.strategyFortyThreePlusX1436NotifySeriesEnabled = Boolean(
    settings.strategyFortyThreePlusX1436NotifySeriesEnabled
  );
  settings.strategyFortyThreePlusX1436NotifySeriesLength =
    normalizeStrategySeriesLength(
      settings.strategyFortyThreePlusX1436NotifySeriesLength,
      43,
      DEFAULT_SETTINGS.strategyFortyThreePlusX1436NotifySeriesLength
    );

  // Одновременно интерфейсом ставки может управлять только одна стратегия.
  // При конфликте приоритет получает 43+ - x14.36, затем 20+ - x5.12 и 15+ - x5.12.
  if (settings.strategyFortyThreePlusX1436Enabled) {
    settings.strategyTwentyPlusX512Enabled = false;
    settings.strategyFifteenPlusX512Enabled = false;
    settings.strategyTenPlusX340Enabled = false;
  } else if (settings.strategyTwentyPlusX512Enabled) {
    settings.strategyFifteenPlusX512Enabled = false;
    settings.strategyTenPlusX340Enabled = false;
  } else if (
    settings.strategyFifteenPlusX512Enabled &&
    settings.strategyTenPlusX340Enabled
  ) {
    settings.strategyTenPlusX340Enabled = false;
  }

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

  if (
    settings.strategyTenPlusX340Enabled ||
    settings.strategyFifteenPlusX512Enabled ||
    settings.strategyTwentyPlusX512Enabled ||
    settings.strategyFortyThreePlusX1436Enabled
  ) {
    settings.preparationEnabled = false;
  }

  return settings;
}

function migrateLegacyStrategySettings(value) {
  const settings = { ...(value || {}) };

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
