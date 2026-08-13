const elements = {
  version: document.querySelector("#version"),
  enabled: document.querySelector("#enabled"),
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  telegramChatId: document.querySelector("#telegramChatId"),
  telegramStatus: document.querySelector("#telegramStatus"),
  strategyTenPlusX340Enabled: document.querySelector(
    "#strategyTenPlusX340Enabled"
  ),
  strategyTenPlusX340StopStep: document.querySelector(
    "#strategyTenPlusX340StopStep"
  ),
  strategyTenPlusX340ReinvestmentEnabled: document.querySelector(
    "#strategyTenPlusX340ReinvestmentEnabled"
  ),
  strategyStopDetails: document.querySelector("#strategyStopDetails"),
  strategyReinvestmentNote: document.querySelector(
    "#strategyReinvestmentNote"
  ),
  strategyTenPlusX340NotifySeriesEnabled: document.querySelector(
    "#strategyTenPlusX340NotifySeriesEnabled"
  ),
  strategyTenPlusX340NotifySeriesLength: document.querySelector(
    "#strategyTenPlusX340NotifySeriesLength"
  ),
  strategyDescription: document.querySelector("#strategyDescription"),
  strategyDescriptionDialog: document.querySelector(
    "#strategyDescriptionDialog"
  ),
  strategyDescriptionClose: document.querySelector(
    "#strategyDescriptionClose"
  ),
  strategyStatusX340: document.querySelector("#strategyStatusX340"),
  strategyStatisticsX340: document.querySelector("#strategyStatisticsX340"),
  strategyResetStatisticsX340: document.querySelector("#strategyResetStatisticsX340"),
  strategyFifteenPlusX512Enabled: document.querySelector(
    "#strategyFifteenPlusX512Enabled"
  ),
  strategyFifteenPlusX512StartingDeposit: document.querySelector(
    "#strategyFifteenPlusX512StartingDeposit"
  ),
  strategyFifteenPlusX512DepositNote: document.querySelector(
    "#strategyFifteenPlusX512DepositNote"
  ),
  strategyFifteenPlusX512ReinvestmentEnabled: document.querySelector(
    "#strategyFifteenPlusX512ReinvestmentEnabled"
  ),
  strategyFifteenPlusX512ReinvestmentNote: document.querySelector(
    "#strategyFifteenPlusX512ReinvestmentNote"
  ),
  strategyFifteenPlusX512StopDetails: document.querySelector(
    "#strategyFifteenPlusX512StopDetails"
  ),
  strategyFifteenPlusX512NotifySeriesEnabled: document.querySelector(
    "#strategyFifteenPlusX512NotifySeriesEnabled"
  ),
  strategyFifteenPlusX512NotifySeriesLength: document.querySelector(
    "#strategyFifteenPlusX512NotifySeriesLength"
  ),
  strategyFifteenPlusX512Description: document.querySelector(
    "#strategyFifteenPlusX512Description"
  ),
  strategyFifteenPlusX512DescriptionDialog: document.querySelector(
    "#strategyFifteenPlusX512DescriptionDialog"
  ),
  strategyFifteenPlusX512DescriptionClose: document.querySelector(
    "#strategyFifteenPlusX512DescriptionClose"
  ),
  strategyStatusX512: document.querySelector("#strategyStatusX512"),
  strategyStatisticsX512: document.querySelector("#strategyStatisticsX512"),
  strategyResetStatisticsX512: document.querySelector("#strategyResetStatisticsX512"),
  strategyTwentyPlusX512Enabled: document.querySelector(
    "#strategyTwentyPlusX512Enabled"
  ),
  strategyTwentyPlusX512StartingDeposit: document.querySelector(
    "#strategyTwentyPlusX512StartingDeposit"
  ),
  strategyTwentyPlusX512ApplyDeposit: document.querySelector(
    "#strategyTwentyPlusX512ApplyDeposit"
  ),
  strategyTwentyPlusX512DepositNote: document.querySelector(
    "#strategyTwentyPlusX512DepositNote"
  ),
  strategyTwentyPlusX512StopDetails: document.querySelector(
    "#strategyTwentyPlusX512StopDetails"
  ),
  strategyTwentyPlusX512Steps: document.querySelector(
    "#strategyTwentyPlusX512Steps"
  ),
  strategyTwentyPlusX512NotifySeriesEnabled: document.querySelector(
    "#strategyTwentyPlusX512NotifySeriesEnabled"
  ),
  strategyTwentyPlusX512NotifySeriesLength: document.querySelector(
    "#strategyTwentyPlusX512NotifySeriesLength"
  ),
  strategyTwentyPlusX512Description: document.querySelector(
    "#strategyTwentyPlusX512Description"
  ),
  strategyTwentyPlusX512DescriptionDialog: document.querySelector(
    "#strategyTwentyPlusX512DescriptionDialog"
  ),
  strategyTwentyPlusX512DescriptionClose: document.querySelector(
    "#strategyTwentyPlusX512DescriptionClose"
  ),
  strategyStatusX512Twenty: document.querySelector("#strategyStatusX512Twenty"),
  strategyStatisticsX512Twenty: document.querySelector("#strategyStatisticsX512Twenty"),
  strategyResetStatisticsX512Twenty: document.querySelector("#strategyResetStatisticsX512Twenty"),
  strategyFortyThreePlusX1436Enabled: document.querySelector(
    "#strategyFortyThreePlusX1436Enabled"
  ),
  strategyFortyThreePlusX1436StartingDeposit: document.querySelector(
    "#strategyFortyThreePlusX1436StartingDeposit"
  ),
  strategyFortyThreePlusX1436ApplyDeposit: document.querySelector(
    "#strategyFortyThreePlusX1436ApplyDeposit"
  ),
  strategyFortyThreePlusX1436DepositNote: document.querySelector(
    "#strategyFortyThreePlusX1436DepositNote"
  ),
  strategyFortyThreePlusX1436StopDetails: document.querySelector(
    "#strategyFortyThreePlusX1436StopDetails"
  ),
  strategyFortyThreePlusX1436Steps: document.querySelector(
    "#strategyFortyThreePlusX1436Steps"
  ),
  strategyFortyThreePlusX1436NotifySeriesEnabled: document.querySelector(
    "#strategyFortyThreePlusX1436NotifySeriesEnabled"
  ),
  strategyFortyThreePlusX1436NotifySeriesLength: document.querySelector(
    "#strategyFortyThreePlusX1436NotifySeriesLength"
  ),
  strategyFortyThreePlusX1436Description: document.querySelector(
    "#strategyFortyThreePlusX1436Description"
  ),
  strategyFortyThreePlusX1436DescriptionDialog: document.querySelector(
    "#strategyFortyThreePlusX1436DescriptionDialog"
  ),
  strategyFortyThreePlusX1436DescriptionClose: document.querySelector(
    "#strategyFortyThreePlusX1436DescriptionClose"
  ),
  strategyFortyThreePlusX1436Historical: document.querySelector(
    "#strategyFortyThreePlusX1436Historical"
  ),
  strategyFortyThreePlusX1436HistoricalDialog: document.querySelector(
    "#strategyFortyThreePlusX1436HistoricalDialog"
  ),
  strategyFortyThreePlusX1436HistoricalClose: document.querySelector(
    "#strategyFortyThreePlusX1436HistoricalClose"
  ),
  strategyStatusX1436: document.querySelector("#strategyStatusX1436"),
  strategyStatisticsX1436: document.querySelector("#strategyStatisticsX1436"),
  strategyResetStatisticsX1436: document.querySelector("#strategyResetStatisticsX1436"),
  preparationEnabled: document.querySelector("#preparationEnabled"),
  preparationBet: document.querySelector("#preparationBet"),
  preparationCashout: document.querySelector("#preparationCashout"),
  preparationStatus: document.querySelector("#preparationStatus"),
  pageAutoReloadEnabled: document.querySelector("#pageAutoReloadEnabled"),
  pageAutoReloadSeconds: document.querySelector("#pageAutoReloadSeconds"),
  badgeOffsetTopPx: document.querySelector("#badgeOffsetTopPx"),
  badgeOffsetLeftPx: document.querySelector("#badgeOffsetLeftPx"),
  badgeOpacityPercent: document.querySelector("#badgeOpacityPercent"),
  save: document.querySelector("#save"),
  test: document.querySelector("#test"),
  flush: document.querySelector("#flush"),
  resetDom: document.querySelector("#resetDom"),
  framesSeen: document.querySelector("#framesSeen"),
  historyFound: document.querySelector("#historyFound"),
  historySize: document.querySelector("#historySize"),
  collectorStage: document.querySelector("#collectorStage"),
  collectorObservedAt: document.querySelector("#collectorObservedAt"),
  collectorFrameUrl: document.querySelector("#collectorFrameUrl"),
  resultQueueSize: document.querySelector("#resultQueueSize"),
  sampleQueueSize: document.querySelector("#sampleQueueSize"),
  acceptedResults: document.querySelector("#acceptedResults"),
  duplicateResults: document.querySelector("#duplicateResults"),
  status: document.querySelector("#status")
};

const STAGE_LABELS = {
  "not-injected": "не запущен",
  injected: "внедрён в кадр",
  searching: "поиск блока",
  "history-found": "блок найден",
  "initial-saved": "начальная история отправлена",
  "initial-rejected": "API отклонил начальную историю",
  unchanged: "изменений нет",
  "resynced-without-send": "история синхронизирована",
  "aligned-no-new-prefix": "список перестроен без новых",
  "new-results-saved": "новый результат отправлен",
  "new-results-rejected": "новый результат отклонён",
  "runtime-message-error": "ошибка связи с расширением",
  "collector-error": "ошибка DOM-сборщика"
};

const STRATEGY_ID = "ten-plus-x340";
const STRATEGY_FORMULA_VERSION = "deposit-v2";
const STRATEGY_TARGET = 3.40;
const STRATEGY_INITIAL_BET = 0.2;
const STRATEGY_REINVESTMENT_BET_INCREMENT = 0.01;
const STRATEGY_BET_STEP = 0.01;
const X512_STRATEGY_ID = "fifteen-plus-x512";
const X512_STRATEGY_TARGET = 5.12;
const X512_STRATEGY_SIGNAL_LENGTH = 15;
const X512_STRATEGY_STOP_STEP = 16;
const X512_STRATEGY_MINIMUM_DEPOSIT = 14;
const X512_STRATEGY_REINVESTMENT_STEP = 0.70;
const X512_20_STRATEGY_ID = "twenty-plus-x512";
const X512_20_STRATEGY_TARGET = 5.12;
const X512_20_STRATEGY_SIGNAL_LENGTH = 20;
const X512_20_STRATEGY_PAUSE_AT = 18;
const X512_20_STRATEGY_STOP_STEP = 11;
const X512_20_STRATEGY_MINIMUM_DEPOSIT = 13.41;
const X512_20_STOP_RESERVE_MULTIPLIER = 3;
const X512_20_MAXIMUM_DEPOSIT = 10_000_000;
const X1436_STRATEGY_ID = "forty-three-plus-x1436";
const X1436_STRATEGY_TARGET = 14.36;
const X1436_STRATEGY_SIGNAL_LENGTH = 43;
const X1436_STRATEGY_PAUSE_AT = 41;
const X1436_STRATEGY_STOP_STEP = 18;
const X1436_STRATEGY_MINIMUM_DEPOSIT = 25;
const X1436_BASE_FULL_STOP = 3.85;
const X1436_STOP_RESERVE_MULTIPLIER =
  X1436_STRATEGY_MINIMUM_DEPOSIT / X1436_BASE_FULL_STOP;
const X1436_MAXIMUM_DEPOSIT = 10_000_000;
const BADGE_SETTINGS_AUTOSAVE_DELAY_MS = 80;

const PREPARATION_STAGE_LABELS = {
  "not-started": "Ожидание загрузки игры",
  disabled: "Подготовка выключена",
  "waiting-game": "Ожидание интерфейса Aviator…",
  "switching-auto": "Переключение на «Авто»…",
  "enabling-cashout": "Включение авто кешаута…",
  "setting-cashout": "Установка кэшаута…",
  "setting-bet": "Установка ставки…",
  completed: "Интерфейс игры подготовлен",
  error: "Ошибка подготовки"
};

let refreshTimer = null;
let settingsDirty = false;
let currentStrategyState = null;
let badgeSettingsAutosaveTimer = null;
let badgeSettingsAutosaveSequence = 0;
let appliedX512TwentyStartingDeposit = X512_20_STRATEGY_MINIMUM_DEPOSIT;
let appliedX1436StartingDeposit = X1436_STRATEGY_MINIMUM_DEPOSIT;

populateStopOptions();

const settingsElements = [
  elements.enabled,
  elements.apiBaseUrl,
  elements.telegramChatId,
  elements.strategyTenPlusX340Enabled,
  elements.strategyTenPlusX340StopStep,
  elements.strategyTenPlusX340ReinvestmentEnabled,
  elements.strategyTenPlusX340NotifySeriesEnabled,
  elements.strategyTenPlusX340NotifySeriesLength,
  elements.strategyFifteenPlusX512Enabled,
  elements.strategyFifteenPlusX512StartingDeposit,
  elements.strategyFifteenPlusX512ReinvestmentEnabled,
  elements.strategyFifteenPlusX512NotifySeriesEnabled,
  elements.strategyFifteenPlusX512NotifySeriesLength,
  elements.strategyTwentyPlusX512Enabled,
  elements.strategyTwentyPlusX512NotifySeriesEnabled,
  elements.strategyTwentyPlusX512NotifySeriesLength,
  elements.strategyFortyThreePlusX1436Enabled,
  elements.strategyFortyThreePlusX1436NotifySeriesEnabled,
  elements.strategyFortyThreePlusX1436NotifySeriesLength,
  elements.preparationEnabled,
  elements.preparationBet,
  elements.preparationCashout,
  elements.pageAutoReloadEnabled,
  elements.pageAutoReloadSeconds
];

for (const element of settingsElements) {
  element.addEventListener("input", markSettingsDirty);
  element.addEventListener("change", markSettingsDirty);
}

const badgeSettingsElements = [
  elements.badgeOffsetTopPx,
  elements.badgeOffsetLeftPx,
  elements.badgeOpacityPercent
];

for (const element of badgeSettingsElements) {
  element.addEventListener("input", scheduleBadgeSettingsAutosave);
  element.addEventListener("change", scheduleBadgeSettingsAutosave);
}

elements.strategyTenPlusX340Enabled.addEventListener(
  "change",
  () => handleStrategyToggle("x340")
);
elements.strategyTenPlusX340StopStep.addEventListener(
  "change",
  refreshStrategyCalculations
);
elements.strategyTenPlusX340ReinvestmentEnabled.addEventListener(
  "change",
  refreshStrategyCalculations
);
elements.strategyTenPlusX340NotifySeriesEnabled.addEventListener(
  "change",
  syncStrategyNotificationFields
);
elements.strategyFifteenPlusX512Enabled.addEventListener(
  "change",
  () => handleStrategyToggle("x512")
);
elements.strategyFifteenPlusX512StartingDeposit.addEventListener(
  "change",
  refreshX512Calculations
);
elements.strategyFifteenPlusX512ReinvestmentEnabled.addEventListener(
  "change",
  refreshX512Calculations
);
elements.strategyFifteenPlusX512NotifySeriesEnabled.addEventListener(
  "change",
  syncStrategyNotificationFields
);
elements.strategyTwentyPlusX512Enabled.addEventListener(
  "change",
  () => handleStrategyToggle("x51220")
);
elements.strategyTwentyPlusX512NotifySeriesEnabled.addEventListener(
  "change",
  syncStrategyNotificationFields
);
elements.strategyTwentyPlusX512StartingDeposit.addEventListener(
  "input",
  renderX512TwentyDepositDraft
);
elements.strategyTwentyPlusX512StartingDeposit.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void applyX512TwentyStartingDeposit();
    }
  }
);
elements.strategyTwentyPlusX512ApplyDeposit.addEventListener(
  "click",
  () => void applyX512TwentyStartingDeposit()
);
elements.strategyFortyThreePlusX1436Enabled.addEventListener(
  "change",
  () => handleStrategyToggle("x1436")
);
elements.strategyFortyThreePlusX1436NotifySeriesEnabled.addEventListener(
  "change",
  syncStrategyNotificationFields
);
elements.strategyFortyThreePlusX1436StartingDeposit.addEventListener(
  "input",
  renderX1436DepositDraft
);
elements.strategyFortyThreePlusX1436StartingDeposit.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void applyX1436StartingDeposit();
    }
  }
);
elements.strategyFortyThreePlusX1436ApplyDeposit.addEventListener(
  "click",
  () => void applyX1436StartingDeposit()
);
elements.preparationEnabled.addEventListener("change", syncPreparationFields);
elements.pageAutoReloadEnabled.addEventListener("change", syncReloadFields);
elements.strategyDescription.addEventListener("click", openStrategyDescription);
elements.strategyDescriptionClose.addEventListener(
  "click",
  closeStrategyDescription
);
elements.strategyDescriptionDialog.addEventListener("click", (event) => {
  if (event.target === elements.strategyDescriptionDialog) {
    closeStrategyDescription();
  }
});
elements.strategyFifteenPlusX512Description.addEventListener(
  "click",
  openX512StrategyDescription
);
elements.strategyFifteenPlusX512DescriptionClose.addEventListener(
  "click",
  closeX512StrategyDescription
);
elements.strategyFifteenPlusX512DescriptionDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === elements.strategyFifteenPlusX512DescriptionDialog) {
      closeX512StrategyDescription();
    }
  }
);
elements.strategyResetStatisticsX340.addEventListener("click", () => {
  void resetPersistentStrategyStatistics(STRATEGY_ID);
});
elements.strategyResetStatisticsX512.addEventListener("click", () => {
  void resetPersistentStrategyStatistics(X512_STRATEGY_ID);
});
elements.strategyTwentyPlusX512Description.addEventListener(
  "click",
  openX512TwentyStrategyDescription
);
elements.strategyTwentyPlusX512DescriptionClose.addEventListener(
  "click",
  closeX512TwentyStrategyDescription
);
elements.strategyTwentyPlusX512DescriptionDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === elements.strategyTwentyPlusX512DescriptionDialog) {
      closeX512TwentyStrategyDescription();
    }
  }
);
elements.strategyResetStatisticsX512Twenty.addEventListener("click", () => {
  void resetPersistentStrategyStatistics(X512_20_STRATEGY_ID);
});
elements.strategyFortyThreePlusX1436Description.addEventListener(
  "click",
  openX1436StrategyDescription
);
elements.strategyFortyThreePlusX1436DescriptionClose.addEventListener(
  "click",
  closeX1436StrategyDescription
);
elements.strategyFortyThreePlusX1436DescriptionDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === elements.strategyFortyThreePlusX1436DescriptionDialog) {
      closeX1436StrategyDescription();
    }
  }
);
elements.strategyFortyThreePlusX1436Historical.addEventListener(
  "click",
  openX1436HistoricalData
);
elements.strategyFortyThreePlusX1436HistoricalClose.addEventListener(
  "click",
  closeX1436HistoricalData
);
elements.strategyFortyThreePlusX1436HistoricalDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === elements.strategyFortyThreePlusX1436HistoricalDialog) {
      closeX1436HistoricalData();
    }
  }
);
elements.strategyResetStatisticsX1436.addEventListener("click", () => {
  void resetPersistentStrategyStatistics(X1436_STRATEGY_ID);
});
for (const toggle of document.querySelectorAll(".strategy-summary-toggle")) {
  toggle.addEventListener("click", (event) => event.stopPropagation());
  toggle.addEventListener("keydown", (event) => event.stopPropagation());
}
elements.save.addEventListener("click", save);
elements.test.addEventListener("click", testConnection);
elements.flush.addEventListener("click", flush);
elements.resetDom.addEventListener("click", resetDomState);

void load();
refreshTimer = setInterval(() => void load(false), 1500);
window.addEventListener("unload", () => {
  clearInterval(refreshTimer);
  clearTimeout(badgeSettingsAutosaveTimer);
});

async function load(showLoading = true) {
  if (showLoading) {
    setStatus("Загрузка…");
  }

  const response = await chrome.runtime.sendMessage({ type: "GET_POPUP_STATE" });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось получить состояние", true);
    return;
  }

  render(response);
  if (response.collector?.error) {
    setStatus(response.collector.error, true);
  } else if (response.stats?.lastError) {
    setStatus(response.stats.lastError, true);
  } else if (showLoading) {
    setStatus("Готово", false, true);
  }
}

function render(response) {
  const {
    version,
    settings,
    stats,
    queues,
    collector,
    preparation,
    strategy,
    telegram,
    strategyStatistics
  } = response;

  elements.version.textContent = `v${version || "?"}`;
  currentStrategyState = strategy || null;
  if (!settingsDirty && !isEditingSettings()) {
    elements.enabled.checked = Boolean(settings.enabled);
    elements.apiBaseUrl.value = settings.apiBaseUrl || "";
    elements.telegramChatId.value = settings.telegramChatId || "";
    elements.strategyTenPlusX340Enabled.checked = Boolean(
      settings.strategyTenPlusX340Enabled
    );
    elements.strategyTenPlusX340ReinvestmentEnabled.checked = Boolean(
      settings.strategyTenPlusX340ReinvestmentEnabled
    );
    populateStopOptions(
      getDisplayedInitialBet(settings, strategy),
      settings.strategyTenPlusX340StopStep
    );
    elements.strategyTenPlusX340NotifySeriesEnabled.checked = Boolean(
      settings.strategyTenPlusX340NotifySeriesEnabled
    );
    elements.strategyTenPlusX340NotifySeriesLength.value = String(
      settings.strategyTenPlusX340NotifySeriesLength || 8
    );
    elements.strategyFifteenPlusX512Enabled.checked = Boolean(
      settings.strategyFifteenPlusX512Enabled
    );
    elements.strategyFifteenPlusX512StartingDeposit.value = String(
      settings.strategyFifteenPlusX512StartingDeposit || X512_STRATEGY_MINIMUM_DEPOSIT
    );
    elements.strategyFifteenPlusX512ReinvestmentEnabled.checked = Boolean(
      settings.strategyFifteenPlusX512ReinvestmentEnabled
    );
    elements.strategyFifteenPlusX512NotifySeriesEnabled.checked = Boolean(
      settings.strategyFifteenPlusX512NotifySeriesEnabled
    );
    elements.strategyFifteenPlusX512NotifySeriesLength.value = String(
      settings.strategyFifteenPlusX512NotifySeriesLength || 13
    );
    renderX512Calculations(settings, strategy);
    elements.strategyTwentyPlusX512Enabled.checked = Boolean(
      settings.strategyTwentyPlusX512Enabled
    );
    appliedX512TwentyStartingDeposit = normalizeX512TwentyStartingDeposit(
      settings.strategyTwentyPlusX512StartingDeposit
    ) || X512_20_STRATEGY_MINIMUM_DEPOSIT;
    elements.strategyTwentyPlusX512StartingDeposit.value = formatMoneyInput(
      appliedX512TwentyStartingDeposit
    );
    elements.strategyTwentyPlusX512NotifySeriesEnabled.checked = Boolean(
      settings.strategyTwentyPlusX512NotifySeriesEnabled
    );
    elements.strategyTwentyPlusX512NotifySeriesLength.value = String(
      settings.strategyTwentyPlusX512NotifySeriesLength || X512_20_STRATEGY_PAUSE_AT
    );
    renderX512TwentyCalculations(appliedX512TwentyStartingDeposit);
    elements.strategyFortyThreePlusX1436Enabled.checked = Boolean(
      settings.strategyFortyThreePlusX1436Enabled
    );
    appliedX1436StartingDeposit = normalizeX1436StartingDeposit(
      settings.strategyFortyThreePlusX1436StartingDeposit
    ) || X1436_STRATEGY_MINIMUM_DEPOSIT;
    elements.strategyFortyThreePlusX1436StartingDeposit.value = formatMoneyInput(
      appliedX1436StartingDeposit
    );
    elements.strategyFortyThreePlusX1436NotifySeriesEnabled.checked = Boolean(
      settings.strategyFortyThreePlusX1436NotifySeriesEnabled
    );
    elements.strategyFortyThreePlusX1436NotifySeriesLength.value = String(
      settings.strategyFortyThreePlusX1436NotifySeriesLength || X1436_STRATEGY_PAUSE_AT
    );
    renderX1436Calculations(appliedX1436StartingDeposit);
    elements.preparationEnabled.checked = Boolean(settings.preparationEnabled);
    elements.preparationBet.value = String(settings.preparationBet ?? 1);
    elements.preparationCashout.value = String(settings.preparationCashout ?? 2);
    elements.pageAutoReloadEnabled.checked = Boolean(
      settings.pageAutoReloadEnabled
    );
    elements.pageAutoReloadSeconds.value = String(
      settings.pageAutoReloadSeconds || 60
    );
    elements.badgeOffsetTopPx.value = String(
      settings.badgeOffsetTopPx ?? 10
    );
    elements.badgeOffsetLeftPx.value = String(
      settings.badgeOffsetLeftPx ?? 10
    );
    elements.badgeOpacityPercent.value = String(
      settings.badgeOpacityPercent ?? 100
    );
    syncStrategyFields();
    syncX512StrategyFields();
    syncX512TwentyStrategyFields();
    syncX1436StrategyFields();
    syncPreparationFields();
    syncReloadFields();
  }

  renderTelegramStatus(telegram, settings);
  renderStrategyStatuses(strategy, settings);
  renderPersistentStrategyStatistics(strategyStatistics);
  renderPreparationStatus(preparation, settings);

  elements.resultQueueSize.textContent = String(queues.resultQueueSize || 0);
  elements.sampleQueueSize.textContent = String(queues.sampleQueueSize || 0);
  elements.acceptedResults.textContent = String(stats.acceptedResults || 0);
  elements.duplicateResults.textContent = String(stats.duplicateResults || 0);

  elements.framesSeen.textContent = String(collector?.framesSeen || 0);
  elements.historyFound.textContent = collector?.historyFound
    ? "найден"
    : "не найден";
  elements.historyFound.classList.toggle(
    "ok-text",
    Boolean(collector?.historyFound)
  );
  elements.historySize.textContent = String(collector?.historySize || 0);
  elements.collectorStage.textContent =
    STAGE_LABELS[collector?.stage] || collector?.stage || "—";
  elements.collectorObservedAt.textContent = formatTime(collector?.observedAt);
  elements.collectorFrameUrl.textContent = collector?.frameUrl || "";
}


function renderTelegramStatus(telegram, settings) {
  elements.telegramStatus.classList.remove("ok", "error");

  if (!settings?.telegramChatId) {
    elements.telegramStatus.textContent =
      "Укажите ID чата и сначала запустите диалог с ботом в Telegram.";
    return;
  }

  if (telegram?.pending === true) {
    elements.telegramStatus.textContent = "Telegram-уведомление отправляется…";
    return;
  }

  if (telegram?.ok === false) {
    elements.telegramStatus.textContent =
      `Последняя отправка не удалась: ${telegram.error || "неизвестная ошибка"}`;
    elements.telegramStatus.classList.add("error");
    return;
  }

  if (telegram?.ok === true) {
    const labels = {
      series: "уведомление о серии",
      profit: "уведомление о прибыли",
      stop: "уведомление о стопе"
    };
    elements.telegramStatus.textContent =
      `Отправлено: ${labels[telegram.reason] || "Telegram-уведомление"} · ` +
      formatTime(telegram.observedAt);
    elements.telegramStatus.classList.add("ok");
    return;
  }

  elements.telegramStatus.textContent =
    "Telegram ID сохранён. Уведомления о прибыли и стопе включены.";
  elements.telegramStatus.classList.add("ok");
}

function renderStrategyStatuses(strategy, settings) {
  renderSingleStrategyStatus({
    element: elements.strategyStatusX340,
    enabled: Boolean(settings?.strategyTenPlusX340Enabled),
    strategy,
    strategyId: STRATEGY_ID,
    name: "10+ - x3.40",
    target: STRATEGY_TARGET,
    signalLength: 10,
    stopStep: Number(settings?.strategyTenPlusX340StopStep || 0),
    reinvestmentEnabled: Boolean(
      settings?.strategyTenPlusX340ReinvestmentEnabled
    ),
    minimumDeposit: getMinimumStartingDeposit(
      settings?.strategyTenPlusX340StopStep
    ),
    startingDeposit: getMinimumStartingDeposit(
      settings?.strategyTenPlusX340StopStep
    ),
    reinvestmentStep: getReinvestmentBalanceStep(
      settings?.strategyTenPlusX340StopStep
    ),
    displayedInitialBet: getDisplayedInitialBet(settings, strategy)
  });

  const x512StartingDeposit = normalizeX512StartingDeposit(
    settings?.strategyFifteenPlusX512StartingDeposit
  );
  renderSingleStrategyStatus({
    element: elements.strategyStatusX512,
    enabled: Boolean(settings?.strategyFifteenPlusX512Enabled),
    strategy,
    strategyId: X512_STRATEGY_ID,
    name: "15+ - x5.12",
    target: X512_STRATEGY_TARGET,
    signalLength: X512_STRATEGY_SIGNAL_LENGTH,
    stopStep: X512_STRATEGY_STOP_STEP,
    reinvestmentEnabled: Boolean(
      settings?.strategyFifteenPlusX512ReinvestmentEnabled
    ),
    minimumDeposit: X512_STRATEGY_MINIMUM_DEPOSIT,
    startingDeposit: x512StartingDeposit,
    reinvestmentStep: X512_STRATEGY_REINVESTMENT_STEP,
    displayedInitialBet: getX512DisplayedInitialBet(settings, strategy)
  });

  const x512TwentyStartingDeposit = normalizeX512TwentyStartingDeposit(
    settings?.strategyTwentyPlusX512StartingDeposit
  ) || X512_20_STRATEGY_MINIMUM_DEPOSIT;
  renderSingleStrategyStatus({
    element: elements.strategyStatusX512Twenty,
    enabled: Boolean(settings?.strategyTwentyPlusX512Enabled),
    strategy,
    strategyId: X512_20_STRATEGY_ID,
    name: "20+ - x5.12",
    target: X512_20_STRATEGY_TARGET,
    signalLength: X512_20_STRATEGY_SIGNAL_LENGTH,
    stopStep: X512_20_STRATEGY_STOP_STEP,
    reinvestmentEnabled: false,
    minimumDeposit: X512_20_STRATEGY_MINIMUM_DEPOSIT,
    startingDeposit: x512TwentyStartingDeposit,
    reinvestmentStep: 0,
    displayedInitialBet: getX512TwentyInitialBet(x512TwentyStartingDeposit)
  });

  const x1436StartingDeposit = normalizeX1436StartingDeposit(
    settings?.strategyFortyThreePlusX1436StartingDeposit
  ) || X1436_STRATEGY_MINIMUM_DEPOSIT;
  renderSingleStrategyStatus({
    element: elements.strategyStatusX1436,
    enabled: Boolean(settings?.strategyFortyThreePlusX1436Enabled),
    strategy,
    strategyId: X1436_STRATEGY_ID,
    name: "43+ - x14.36",
    target: X1436_STRATEGY_TARGET,
    signalLength: X1436_STRATEGY_SIGNAL_LENGTH,
    stopStep: X1436_STRATEGY_STOP_STEP,
    reinvestmentEnabled: false,
    minimumDeposit: X1436_STRATEGY_MINIMUM_DEPOSIT,
    startingDeposit: x1436StartingDeposit,
    reinvestmentStep: 0,
    displayedInitialBet: getX1436InitialBet(x1436StartingDeposit)
  });
}

function renderSingleStrategyStatus({
  element,
  enabled,
  strategy,
  strategyId,
  name,
  target,
  signalLength,
  stopStep,
  reinvestmentEnabled,
  minimumDeposit,
  startingDeposit,
  reinvestmentStep,
  displayedInitialBet
}) {
  element.classList.remove("ok", "error");
  if (!enabled) {
    element.textContent = "Стратегия выключена";
    return;
  }

  const state = strategy?.strategyId === strategyId ? strategy : null;
  if (!state) {
    element.textContent =
      "Стратегия включена. Ожидание вкладки Aviator и истории результатов.";
    return;
  }

  const stage = String(state.stage || "waiting");
  const streak = Math.max(0, Number(state.consecutiveLosses || 0));
  const stopDetails = getStrategyStopStepDetails(
    stopStep,
    displayedInitialBet,
    target
  );
  const stopSuffix = stopDetails
    ? ` · стоп: шаг ${stopDetails.step}, ставка ${formatMoney(
        stopDetails.bet
      )}, общий минус ${formatMoney(stopDetails.cumulativeLoss)}`
    : " · без стопа";
  const reinvestmentSuffix = reinvestmentEnabled
    ? ` · реинвест: баланс ${formatMoney(
        state.strategyBalance ?? startingDeposit
      )}, старт ${formatMoney(startingDeposit)}, минимум ${formatMoney(
        minimumDeposit
      )}, шаг ${formatMoney(reinvestmentStep)}, база ${formatMoney(
        displayedInitialBet
      )}`
    : ` · стартовый депозит ${formatMoney(startingDeposit)} · реинвест выключен`;

  if (stage === "error") {
    element.textContent =
      `${state.message || "Ошибка стратегии"}: ${
        state.error || "проверьте интерфейс"
      }${stopSuffix}${reinvestmentSuffix}`;
    element.classList.add("error");
    return;
  }

  if (state.awaitingResult) {
    element.textContent =
      `Шаг ${state.step}: ставка ${formatNumber(
        state.activeBet || state.nextBet || 0.2
      )}, накопленный минус ${formatNumber(
        state.cumulativeLoss || 0
      )}${stopSuffix}${reinvestmentSuffix}`;
    element.classList.add("ok");
    return;
  }

  if (["preparing", "arming", "betting", "waiting-reset"].includes(stage)) {
    element.textContent = `${state.message || `${name}: подготовка ставки`}${stopSuffix}${reinvestmentSuffix}`;
    return;
  }

  element.textContent =
    `${state.message || `Ожидание сигнала: ${Math.min(streak, signalLength)}/${signalLength}`}` +
    stopSuffix + reinvestmentSuffix;
}

function renderPersistentStrategyStatistics(statisticsByStrategy) {
  const source =
    statisticsByStrategy && typeof statisticsByStrategy === "object"
      ? statisticsByStrategy
      : {};
  renderSinglePersistentStatistics(
    elements.strategyStatisticsX340,
    source[STRATEGY_ID]
  );
  renderSinglePersistentStatistics(
    elements.strategyStatisticsX512,
    source[X512_STRATEGY_ID]
  );
  renderSinglePersistentStatistics(
    elements.strategyStatisticsX512Twenty,
    source[X512_20_STRATEGY_ID]
  );
  renderSinglePersistentStatistics(
    elements.strategyStatisticsX1436,
    source[X1436_STRATEGY_ID]
  );
}

function renderSinglePersistentStatistics(element, statistics) {
  if (!statistics) {
    element.textContent = "Нет данных. Отсчёт начнётся при запуске стратегии.";
    return;
  }

  const totalPnl = Number(statistics.totalPnl || 0);
  const pnlPrefix = totalPnl > 0 ? "+" : "";
  element.textContent =
    `Старт: ${formatDateTime(statistics.startedAt)} · ` +
    `Депозит: ${formatNumber(statistics.startingDeposit || 0)} · ` +
    `Прибыль: ${pnlPrefix}${formatNumber(totalPnl)} · ` +
    `Выигрышных циклов: ${Math.max(0, Number(statistics.completedCycles || 0))} · ` +
    `Стопов: ${Math.max(0, Number(statistics.stoppedCycles || 0))}`;
}

async function resetPersistentStrategyStatistics(strategyId) {
  if (settingsDirty) {
    setStatus("Сначала сохраните изменённые настройки", true);
    return;
  }

  const confirmed = window.confirm(
    "Сбросить постоянную статистику этой стратегии и начать новый отсчёт?"
  );
  if (!confirmed) {
    return;
  }

  setStatus("Сброс статистики…");
  const response = await chrome.runtime.sendMessage({
    type: "RESET_STRATEGY_STATISTICS",
    strategyId
  });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось сбросить статистику", true);
    return;
  }

  setStatus("Статистика сброшена", false, true);
  await load(false);
}

function formatDateTime(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderPreparationStatus(preparation, settings) {
  const strategyEnabled = Boolean(
    settings?.strategyTenPlusX340Enabled ||
    settings?.strategyFifteenPlusX512Enabled ||
    settings?.strategyTwentyPlusX512Enabled ||
    settings?.strategyFortyThreePlusX1436Enabled
  );
  if (strategyEnabled) {
    elements.preparationStatus.textContent =
      "Недоступна: интерфейсом управляет активная стратегия";
    elements.preparationStatus.classList.remove("ok", "error");
    return;
  }

  const enabled = Boolean(settings?.preparationEnabled);
  const stage = enabled ? preparation?.stage || "not-started" : "disabled";
  const label = PREPARATION_STAGE_LABELS[stage] || stage;
  const suffix =
    stage === "completed" && preparation?.bet && preparation?.cashout
      ? `: ставка ${formatNumber(preparation.bet)}, кэшаут ${formatNumber(
          preparation.cashout
        )}x`
      : "";

  const preparationError = enabled ? preparation?.error : null;
  elements.preparationStatus.textContent = preparationError
    ? `${label}: ${preparationError}`
    : `${label}${suffix}`;
  elements.preparationStatus.classList.toggle("ok", stage === "completed");
  elements.preparationStatus.classList.toggle(
    "error",
    stage === "error" || Boolean(preparationError)
  );
}

function scheduleBadgeSettingsAutosave() {
  clearTimeout(badgeSettingsAutosaveTimer);
  badgeSettingsAutosaveTimer = setTimeout(() => {
    void saveBadgeSettingsImmediately();
  }, BADGE_SETTINGS_AUTOSAVE_DELAY_MS);
}

async function saveBadgeSettingsImmediately() {
  const badgeOffsetTopPx = normalizeBadgeOffset(
    elements.badgeOffsetTopPx.value
  );
  const badgeOffsetLeftPx = normalizeBadgeOffset(
    elements.badgeOffsetLeftPx.value
  );
  const badgeOpacityPercent = normalizeBadgeOpacity(
    elements.badgeOpacityPercent.value
  );

  if (
    badgeOffsetTopPx === null ||
    badgeOffsetLeftPx === null ||
    badgeOpacityPercent === null
  ) {
    setStatus(
      "Проверьте отступы 0–10000 px и прозрачность 10–100%",
      true
    );
    return;
  }

  const sequence = ++badgeSettingsAutosaveSequence;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        badgeOffsetTopPx,
        badgeOffsetLeftPx,
        badgeOpacityPercent
      }
    });

    if (sequence !== badgeSettingsAutosaveSequence) {
      return;
    }

    if (!response?.ok) {
      setStatus(response?.error || "Не удалось сохранить положение баджей", true);
      return;
    }

    elements.badgeOffsetTopPx.value = String(
      response.settings?.badgeOffsetTopPx ?? badgeOffsetTopPx
    );
    elements.badgeOffsetLeftPx.value = String(
      response.settings?.badgeOffsetLeftPx ?? badgeOffsetLeftPx
    );
    elements.badgeOpacityPercent.value = String(
      response.settings?.badgeOpacityPercent ?? badgeOpacityPercent
    );
    setStatus("Баджи обновлены и сохранены", false, true);
  } catch {
    if (sequence === badgeSettingsAutosaveSequence) {
      setStatus("Не удалось сохранить положение баджей", true);
    }
  }
}

async function save() {
  clearTimeout(badgeSettingsAutosaveTimer);
  setStatus("Сохранение…");
  const reloadSeconds = normalizeReloadSeconds(
    elements.pageAutoReloadSeconds.value
  );
  const preparationBet = normalizeDecimal(
    elements.preparationBet.value,
    0.01,
    999_999_999
  );
  const preparationCashout = normalizeDecimal(
    elements.preparationCashout.value,
    1.01,
    1_000_000
  );
  const strategyStopStep = normalizeStopStep(
    elements.strategyTenPlusX340StopStep.value
  );
  const telegramChatId = normalizeTelegramChatId(
    elements.telegramChatId.value
  );
  const seriesLength = normalizeSeriesLength(
    elements.strategyTenPlusX340NotifySeriesLength.value,
    10
  );
  const x512SeriesLength = normalizeSeriesLength(
    elements.strategyFifteenPlusX512NotifySeriesLength.value,
    X512_STRATEGY_SIGNAL_LENGTH
  );
  const x512TwentySeriesLength = normalizeSeriesLength(
    elements.strategyTwentyPlusX512NotifySeriesLength.value,
    X512_20_STRATEGY_SIGNAL_LENGTH
  );
  const x1436SeriesLength = normalizeSeriesLength(
    elements.strategyFortyThreePlusX1436NotifySeriesLength.value,
    X1436_STRATEGY_SIGNAL_LENGTH
  );
  const x512StartingDeposit = normalizeX512StartingDeposit(
    elements.strategyFifteenPlusX512StartingDeposit.value
  );
  const badgeOffsetTopPx = normalizeBadgeOffset(
    elements.badgeOffsetTopPx.value
  );
  const badgeOffsetLeftPx = normalizeBadgeOffset(
    elements.badgeOffsetLeftPx.value
  );
  const badgeOpacityPercent = normalizeBadgeOpacity(
    elements.badgeOpacityPercent.value
  );

  if (badgeOffsetTopPx === null) {
    setStatus("Отступ сверху должен быть от 0 до 10000 px", true);
    elements.badgeOffsetTopPx.focus();
    return false;
  }

  if (badgeOffsetLeftPx === null) {
    setStatus("Отступ слева должен быть от 0 до 10000 px", true);
    elements.badgeOffsetLeftPx.focus();
    return false;
  }

  if (badgeOpacityPercent === null) {
    setStatus("Прозрачность должна быть от 10 до 100%", true);
    elements.badgeOpacityPercent.focus();
    return false;
  }

  if (reloadSeconds === null) {
    setStatus("Интервал обновления должен быть от 5 до 86400 секунд", true);
    elements.pageAutoReloadSeconds.focus();
    return false;
  }

  if (preparationBet === null) {
    setStatus("Ставка должна быть числом больше 0", true);
    elements.preparationBet.focus();
    return false;
  }

  if (preparationCashout === null) {
    setStatus("Кэшаут должен быть от 1.01 до 1000000", true);
    elements.preparationCashout.focus();
    return false;
  }

  if (telegramChatId === null) {
    setStatus("Telegram ID должен быть целым числом", true);
    elements.telegramChatId.focus();
    return false;
  }

  if (seriesLength === null) {
    setStatus("Длина серии x3.40 должна быть от 1 до 10", true);
    elements.strategyTenPlusX340NotifySeriesLength.focus();
    return false;
  }

  if (x512SeriesLength === null) {
    setStatus("Длина серии 15+ / x5.12 должна быть от 1 до 15", true);
    elements.strategyFifteenPlusX512NotifySeriesLength.focus();
    return false;
  }

  if (x512TwentySeriesLength === null) {
    setStatus("Длина серии 20+ / x5.12 должна быть от 1 до 20", true);
    elements.strategyTwentyPlusX512NotifySeriesLength.focus();
    return false;
  }

  if (x1436SeriesLength === null) {
    setStatus("Длина серии 43+ / x14.36 должна быть от 1 до 43", true);
    elements.strategyFortyThreePlusX1436NotifySeriesLength.focus();
    return false;
  }

  if (x512StartingDeposit === null) {
    setStatus("Стартовый депозит x5.12 должен быть кратен 14", true);
    elements.strategyFifteenPlusX512StartingDeposit.focus();
    return false;
  }

  if (strategyStopStep === null) {
    setStatus("Стоп должен быть выбран из списка шагов", true);
    elements.strategyTenPlusX340StopStep.focus();
    return false;
  }

  const strategyEnabled = elements.strategyTenPlusX340Enabled.checked;
  const x512StrategyEnabled =
    elements.strategyFifteenPlusX512Enabled.checked;
  const x512TwentyStrategyEnabled =
    elements.strategyTwentyPlusX512Enabled.checked;
  const x1436StrategyEnabled =
    elements.strategyFortyThreePlusX1436Enabled.checked;
  const reinvestmentEnabled =
    elements.strategyTenPlusX340ReinvestmentEnabled.checked;
  const x512ReinvestmentEnabled =
    elements.strategyFifteenPlusX512ReinvestmentEnabled.checked;
  const notifySeriesEnabled =
    elements.strategyTenPlusX340NotifySeriesEnabled.checked;
  const x512NotifySeriesEnabled =
    elements.strategyFifteenPlusX512NotifySeriesEnabled.checked;
  const x512TwentyNotifySeriesEnabled =
    elements.strategyTwentyPlusX512NotifySeriesEnabled.checked;
  const x1436NotifySeriesEnabled =
    elements.strategyFortyThreePlusX1436NotifySeriesEnabled.checked;

  if (
    [strategyEnabled, x512StrategyEnabled, x512TwentyStrategyEnabled, x1436StrategyEnabled]
      .filter(Boolean).length > 1
  ) {
    setStatus("Одновременно можно включить только одну стратегию", true);
    return false;
  }

  if (x512TwentyStrategyEnabled) {
    const draftDeposit = normalizeX512TwentyStartingDeposit(
      elements.strategyTwentyPlusX512StartingDeposit.value
    );
    if (
      draftDeposit === null ||
      Math.abs(draftDeposit - appliedX512TwentyStartingDeposit) >= 0.005
    ) {
      setStatus(
        "Для 20+ / x5.12 сначала примените стартовый депозит кнопкой OK",
        true
      );
      elements.strategyTwentyPlusX512StartingDeposit.focus();
      return false;
    }
  }

  if (x1436StrategyEnabled) {
    const draftDeposit = normalizeX1436StartingDeposit(
      elements.strategyFortyThreePlusX1436StartingDeposit.value
    );
    if (
      draftDeposit === null ||
      Math.abs(draftDeposit - appliedX1436StartingDeposit) >= 0.005
    ) {
      setStatus(
        "Для 43+ / x14.36 сначала примените стартовый депозит кнопкой OK",
        true
      );
      elements.strategyFortyThreePlusX1436StartingDeposit.focus();
      return false;
    }
  }

  if (reinvestmentEnabled && strategyStopStep <= 0) {
    setStatus(
      "Для реинвестирования выберите конечный шаг стопа",
      true
    );
    elements.strategyTenPlusX340StopStep.focus();
    return false;
  }

  if (
    (notifySeriesEnabled || x512NotifySeriesEnabled || x512TwentyNotifySeriesEnabled || x1436NotifySeriesEnabled) &&
    !telegramChatId
  ) {
    setStatus("Для уведомления о серии укажите Telegram ID", true);
    elements.telegramChatId.focus();
    return false;
  }
  elements.pageAutoReloadSeconds.value = String(reloadSeconds);
  elements.preparationBet.value = formatNumber(preparationBet);
  elements.preparationCashout.value = formatNumber(preparationCashout);
  elements.badgeOffsetTopPx.value = String(badgeOffsetTopPx);
  elements.badgeOffsetLeftPx.value = String(badgeOffsetLeftPx);
  elements.badgeOpacityPercent.value = String(badgeOpacityPercent);
  elements.strategyFifteenPlusX512StartingDeposit.value = String(
    x512StartingDeposit
  );

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      enabled: elements.enabled.checked,
      apiBaseUrl: elements.apiBaseUrl.value,
      telegramChatId,
      strategyTenPlusX340Enabled: strategyEnabled,
      strategyTenPlusX340StopStep: strategyStopStep,
      strategyTenPlusX340ReinvestmentEnabled: reinvestmentEnabled,
      strategyTenPlusX340NotifySeriesEnabled: notifySeriesEnabled,
      strategyTenPlusX340NotifySeriesLength: seriesLength,
      strategyFifteenPlusX512Enabled: x512StrategyEnabled,
      strategyFifteenPlusX512StartingDeposit: x512StartingDeposit,
      strategyFifteenPlusX512ReinvestmentEnabled: x512ReinvestmentEnabled,
      strategyFifteenPlusX512NotifySeriesEnabled: x512NotifySeriesEnabled,
      strategyFifteenPlusX512NotifySeriesLength: x512SeriesLength,
      strategyTwentyPlusX512Enabled: x512TwentyStrategyEnabled,
      strategyTwentyPlusX512StartingDeposit: appliedX512TwentyStartingDeposit,
      strategyTwentyPlusX512NotifySeriesEnabled: x512TwentyNotifySeriesEnabled,
      strategyTwentyPlusX512NotifySeriesLength: x512TwentySeriesLength,
      strategyFortyThreePlusX1436Enabled: x1436StrategyEnabled,
      strategyFortyThreePlusX1436StartingDeposit: appliedX1436StartingDeposit,
      strategyFortyThreePlusX1436NotifySeriesEnabled: x1436NotifySeriesEnabled,
      strategyFortyThreePlusX1436NotifySeriesLength: x1436SeriesLength,
      preparationEnabled:
        strategyEnabled || x512StrategyEnabled || x512TwentyStrategyEnabled || x1436StrategyEnabled
          ? false
          : elements.preparationEnabled.checked,
      preparationBet,
      preparationCashout,
      pageAutoReloadEnabled: elements.pageAutoReloadEnabled.checked,
      pageAutoReloadSeconds: reloadSeconds,
      badgeOffsetTopPx,
      badgeOffsetLeftPx,
      badgeOpacityPercent
    }
  });

  if (!response?.ok) {
    setStatus(response?.error || "Ошибка сохранения", true);
    return false;
  }

  settingsDirty = false;
  await load(false);
  setStatus("Настройки сохранены", false, true);
  return true;
}

async function testConnection() {
  setStatus("Проверка API…");
  const saved = await save();
  if (!saved) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: "TEST_CONNECTION" });
  if (!response?.ok) {
    setStatus(response?.error || "API недоступен", true);
    return;
  }
  setStatus("API и MySQL доступны", false, true);
}

async function flush() {
  setStatus("Отправка очереди…");
  const response = await chrome.runtime.sendMessage({ type: "FLUSH_NOW" });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось отправить очередь", true);
    return;
  }
  await load(false);
  setStatus("Очередь обработана", false, true);
}

async function resetDomState() {
  setStatus("Сброс DOM-базы…");
  const response = await chrome.runtime.sendMessage({ type: "RESET_DOM_STATE" });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось сбросить DOM-базу", true);
    return;
  }
  setStatus("DOM-база сброшена. Перезагрузите вкладку игры.", false, true);
}

function populateStopOptions(
  initialBet = STRATEGY_INITIAL_BET,
  selectedValue = elements.strategyTenPlusX340StopStep.value || "0"
) {
  elements.strategyTenPlusX340StopStep.replaceChildren();

  const unlimited = document.createElement("option");
  unlimited.value = "0";
  unlimited.textContent = "Без стопа";
  elements.strategyTenPlusX340StopStep.append(unlimited);

  for (let step = 1; step <= 100; step += 1) {
    const details = getStopStepDetails(step, initialBet);
    const option = document.createElement("option");
    option.value = String(step);
    option.textContent =
      `Шаг ${step} — ставка ${formatMoney(details.bet)} · ` +
      `общий минус ${formatMoney(details.cumulativeLoss)}`;
    elements.strategyTenPlusX340StopStep.append(option);
  }

  elements.strategyTenPlusX340StopStep.value = String(selectedValue || 0);
  if (!elements.strategyTenPlusX340StopStep.value) {
    elements.strategyTenPlusX340StopStep.value = "0";
  }
  renderSelectedStopDetails();
}


function handleStrategyToggle(strategyKey) {
  if (strategyKey === "x340" && elements.strategyTenPlusX340Enabled.checked) {
    elements.strategyFifteenPlusX512Enabled.checked = false;
    elements.strategyTwentyPlusX512Enabled.checked = false;
    elements.strategyFortyThreePlusX1436Enabled.checked = false;
  }
  if (
    strategyKey === "x512" &&
    elements.strategyFifteenPlusX512Enabled.checked
  ) {
    elements.strategyTenPlusX340Enabled.checked = false;
    elements.strategyTwentyPlusX512Enabled.checked = false;
    elements.strategyFortyThreePlusX1436Enabled.checked = false;
  }
  if (
    strategyKey === "x51220" &&
    elements.strategyTwentyPlusX512Enabled.checked
  ) {
    elements.strategyTenPlusX340Enabled.checked = false;
    elements.strategyFifteenPlusX512Enabled.checked = false;
    elements.strategyFortyThreePlusX1436Enabled.checked = false;
  }
  if (
    strategyKey === "x1436" &&
    elements.strategyFortyThreePlusX1436Enabled.checked
  ) {
    elements.strategyTenPlusX340Enabled.checked = false;
    elements.strategyFifteenPlusX512Enabled.checked = false;
    elements.strategyTwentyPlusX512Enabled.checked = false;
  }

  syncStrategyFields();
  syncX512StrategyFields();
  syncX512TwentyStrategyFields();
  syncX1436StrategyFields();
  syncPreparationFields();
}

function renderX512TwentyDepositDraft() {
  const deposit = normalizeX512TwentyStartingDeposit(
    elements.strategyTwentyPlusX512StartingDeposit.value
  );
  if (deposit === null) {
    elements.strategyTwentyPlusX512DepositNote.textContent =
      `Минимальный депозит — ${formatMoney(X512_20_STRATEGY_MINIMUM_DEPOSIT)}. ` +
      "Введите корректное значение.";
    return;
  }

  const isPreview =
    Math.abs(deposit - appliedX512TwentyStartingDeposit) >= 0.005;
  renderX512TwentyCalculations(deposit, isPreview);
}

async function applyX512TwentyStartingDeposit() {
  const deposit = normalizeX512TwentyStartingDeposit(
    elements.strategyTwentyPlusX512StartingDeposit.value
  );
  if (deposit === null) {
    setStatus(
      `Стартовый депозит 20+ / x5.12 должен быть от ${formatMoney(
        X512_20_STRATEGY_MINIMUM_DEPOSIT
      )} до ${formatMoney(X512_20_MAXIMUM_DEPOSIT)}`,
      true
    );
    elements.strategyTwentyPlusX512StartingDeposit.focus();
    return;
  }

  setStatus("Применение стартового депозита…");
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      strategyTwentyPlusX512StartingDeposit: deposit
    }
  });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось применить стартовый депозит", true);
    return;
  }

  appliedX512TwentyStartingDeposit = normalizeX512TwentyStartingDeposit(
    response.settings?.strategyTwentyPlusX512StartingDeposit
  ) || deposit;
  elements.strategyTwentyPlusX512StartingDeposit.value = formatMoneyInput(
    appliedX512TwentyStartingDeposit
  );
  renderX512TwentyCalculations(appliedX512TwentyStartingDeposit);
  setStatus(
    `Депозит ${formatMoney(appliedX512TwentyStartingDeposit)} применён`,
    false,
    true
  );
}

function renderX512TwentyCalculations(
  startingDeposit = appliedX512TwentyStartingDeposit,
  isPreview = false
) {
  const deposit =
    normalizeX512TwentyStartingDeposit(startingDeposit) ||
    X512_20_STRATEGY_MINIMUM_DEPOSIT;
  const initialBet = getX512TwentyInitialBet(deposit);
  const progression = getStrategyProgression(
    X512_20_STRATEGY_STOP_STEP,
    initialBet,
    X512_20_STRATEGY_TARGET
  );
  const details = getStrategyStopStepDetails(
    X512_20_STRATEGY_STOP_STEP,
    initialBet,
    X512_20_STRATEGY_TARGET
  );
  const stopBudget = roundToFour(deposit / X512_20_STOP_RESERVE_MULTIPLIER);
  const requiredReserve = roundToFour(
    details.cumulativeLoss * X512_20_STOP_RESERVE_MULTIPLIER
  );
  const reserveRemainder = Math.max(0, roundToFour(deposit - requiredReserve));

  elements.strategyTwentyPlusX512StopDetails.textContent =
    `Стартовая ставка ${formatMoney(initialBet)} · ` +
    `полный стоп ${formatMoney(details.cumulativeLoss)} · ` +
    `лимит одного стопа ${formatMoney(stopBudget)} · ` +
    `3 стопа ${formatMoney(requiredReserve)} · ` +
    `остаток ${formatMoney(reserveRemainder)}.`;
  elements.strategyTwentyPlusX512DepositNote.textContent = isPreview
    ? `Предпросмотр для ${formatMoney(deposit)}. Расчёт обновлён автоматически; ` +
      `для применения нажмите OK. Сейчас применяется ${formatMoney(
        appliedX512TwentyStartingDeposit
      )}.`
    : `Применено ${formatMoney(deposit)}. Стартовая ставка выбирается с шагом 0.01 так, ` +
      "чтобы полный стоп не превышал 1/3 депозита.";

  const fragment = document.createDocumentFragment();
  let lossBeforeStep = 0;
  progression.forEach((bet, index) => {
    const row = document.createElement("tr");
    const cumulativeLoss = roundToCent(lossBeforeStep + bet);
    const profitOnWin = roundToFour(
      bet * (X512_20_STRATEGY_TARGET - 1) - lossBeforeStep
    );
    for (const value of [
      String(index + 1),
      formatMoney(bet),
      formatMoney(cumulativeLoss),
      `+${formatMoney(profitOnWin)}`
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    fragment.append(row);
    lossBeforeStep = cumulativeLoss;
  });
  elements.strategyTwentyPlusX512Steps.replaceChildren(fragment);
}

function getX512TwentyInitialBet(startingDeposit) {
  const deposit =
    normalizeX512TwentyStartingDeposit(startingDeposit) ||
    X512_20_STRATEGY_MINIMUM_DEPOSIT;
  const stopBudget = deposit / X512_20_STOP_RESERVE_MULTIPLIER;
  const minimumBetCents = Math.round(STRATEGY_INITIAL_BET * 100);
  let low = minimumBetCents;
  let high = Math.max(minimumBetCents, Math.floor((stopBudget + 1e-9) * 100));
  let best = minimumBetCents;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bet = mid / 100;
    const details = getStrategyStopStepDetails(
      X512_20_STRATEGY_STOP_STEP,
      bet,
      X512_20_STRATEGY_TARGET
    );
    if (details.cumulativeLoss <= stopBudget + 1e-9) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best / 100;
}

function normalizeX512TwentyStartingDeposit(value) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  if (
    !Number.isFinite(parsed) ||
    parsed < X512_20_STRATEGY_MINIMUM_DEPOSIT ||
    parsed > X512_20_MAXIMUM_DEPOSIT
  ) {
    return null;
  }
  return roundToCent(parsed);
}

function renderX1436DepositDraft() {
  const deposit = normalizeX1436StartingDeposit(
    elements.strategyFortyThreePlusX1436StartingDeposit.value
  );
  if (deposit === null) {
    elements.strategyFortyThreePlusX1436DepositNote.textContent =
      `Минимальный депозит — ${formatMoney(X1436_STRATEGY_MINIMUM_DEPOSIT)}. ` +
      `Допустимый диапазон: ${formatMoney(X1436_STRATEGY_MINIMUM_DEPOSIT)}–${formatMoney(X1436_MAXIMUM_DEPOSIT)}.`;
    return;
  }

  const isPreview =
    Math.abs(deposit - appliedX1436StartingDeposit) >= 0.005;
  renderX1436Calculations(deposit, isPreview);
}

async function applyX1436StartingDeposit() {
  const deposit = normalizeX1436StartingDeposit(
    elements.strategyFortyThreePlusX1436StartingDeposit.value
  );
  if (deposit === null) {
    setStatus(
      `Стартовый депозит 43+ / x14.36 должен быть от ${formatMoney(
        X1436_STRATEGY_MINIMUM_DEPOSIT
      )} до ${formatMoney(X1436_MAXIMUM_DEPOSIT)}`,
      true
    );
    elements.strategyFortyThreePlusX1436StartingDeposit.focus();
    return;
  }

  setStatus("Применение депозита…");
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      strategyFortyThreePlusX1436StartingDeposit: deposit
    }
  });
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось применить депозит", true);
    return;
  }

  appliedX1436StartingDeposit = normalizeX1436StartingDeposit(
    response.settings?.strategyFortyThreePlusX1436StartingDeposit
  ) || deposit;
  elements.strategyFortyThreePlusX1436StartingDeposit.value = formatMoneyInput(
    appliedX1436StartingDeposit
  );
  renderX1436Calculations(appliedX1436StartingDeposit);
  setStatus(
    `Депозит ${formatMoney(appliedX1436StartingDeposit)} применён`,
    false,
    true
  );
}

function renderX1436Calculations(
  startingDeposit = appliedX1436StartingDeposit,
  isPreview = false
) {
  const deposit =
    normalizeX1436StartingDeposit(startingDeposit) ||
    X1436_STRATEGY_MINIMUM_DEPOSIT;
  const initialBet = getX1436InitialBet(deposit);
  const progression = getStrategyProgression(
    X1436_STRATEGY_STOP_STEP,
    initialBet,
    X1436_STRATEGY_TARGET
  );
  const details = getStrategyStopStepDetails(
    X1436_STRATEGY_STOP_STEP,
    initialBet,
    X1436_STRATEGY_TARGET
  );
  const stopBudget = roundToFour(deposit / X1436_STOP_RESERVE_MULTIPLIER);
  const riskPercent = roundToFour((details.cumulativeLoss / deposit) * 100);

  elements.strategyFortyThreePlusX1436StopDetails.textContent =
    `Стартовая ставка ${formatMoney(initialBet)} · ` +
    `полный стоп ${formatMoney(details.cumulativeLoss)} · ` +
    `лимит полного стопа ${formatMoney(stopBudget)} · ` +
    `риск стопа ${formatNumber(riskPercent)}% банка.`;
  elements.strategyFortyThreePlusX1436DepositNote.textContent = isPreview
    ? `Предпросмотр для ${formatMoney(deposit)}. Расчёт обновлён автоматически; ` +
      `для применения нажмите OK. Сейчас применяется ${formatMoney(
        appliedX1436StartingDeposit
      )}.`
    : `Применено ${formatMoney(deposit)}. При банке 25 базовая ставка 0.20; ` +
      "при увеличении банка ставка растёт с шагом 0.01 при сохранении базовой доли риска полного стопа.";

  const fragment = document.createDocumentFragment();
  let lossBeforeStep = 0;
  progression.forEach((bet, index) => {
    const row = document.createElement("tr");
    const cumulativeLoss = roundToCent(lossBeforeStep + bet);
    const profitOnWin = roundToFour(
      bet * (X1436_STRATEGY_TARGET - 1) - lossBeforeStep
    );
    for (const value of [
      String(index + 1),
      formatMoney(bet),
      formatMoney(cumulativeLoss),
      `+${formatMoney(profitOnWin)}`
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    fragment.append(row);
    lossBeforeStep = cumulativeLoss;
  });
  elements.strategyFortyThreePlusX1436Steps.replaceChildren(fragment);
}

function getX1436InitialBet(startingDeposit) {
  const deposit =
    normalizeX1436StartingDeposit(startingDeposit) ||
    X1436_STRATEGY_MINIMUM_DEPOSIT;
  const stopBudget = deposit / X1436_STOP_RESERVE_MULTIPLIER;
  const minimumBetCents = Math.round(STRATEGY_INITIAL_BET * 100);
  let low = minimumBetCents;
  let high = Math.max(minimumBetCents, Math.floor((stopBudget + 1e-9) * 100));
  let best = minimumBetCents;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bet = mid / 100;
    const details = getStrategyStopStepDetails(
      X1436_STRATEGY_STOP_STEP,
      bet,
      X1436_STRATEGY_TARGET
    );
    if (details.cumulativeLoss <= stopBudget + 1e-9) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best / 100;
}

function normalizeX1436StartingDeposit(value) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  if (
    !Number.isFinite(parsed) ||
    parsed < X1436_STRATEGY_MINIMUM_DEPOSIT ||
    parsed > X1436_MAXIMUM_DEPOSIT
  ) {
    return null;
  }
  return roundToCent(parsed);
}

function formatMoneyInput(value) {
  return Number(value).toFixed(2);
}

function refreshX512Calculations() {
  const deposit = normalizeX512StartingDeposit(
    elements.strategyFifteenPlusX512StartingDeposit.value
  );
  if (deposit !== null) {
    elements.strategyFifteenPlusX512StartingDeposit.value = String(deposit);
  }
  renderX512Calculations();
  syncX512StrategyFields();
}

function renderX512Calculations(settings = null, strategy = null) {
  const startingDeposit = normalizeX512StartingDeposit(
    settings
      ? settings.strategyFifteenPlusX512StartingDeposit
      : elements.strategyFifteenPlusX512StartingDeposit.value
  ) || X512_STRATEGY_MINIMUM_DEPOSIT;
  const initialBet = getX512DisplayedInitialBet(settings, strategy);
  const details = getStrategyStopStepDetails(
    X512_STRATEGY_STOP_STEP,
    initialBet,
    X512_STRATEGY_TARGET
  );
  const progression = getStrategyProgression(
    X512_STRATEGY_STOP_STEP,
    initialBet,
    X512_STRATEGY_TARGET
  );

  elements.strategyFifteenPlusX512StopDetails.textContent =
    `${progression.map(formatMoney).join(" · ")} · ` +
    `полный минус ${formatMoney(details.cumulativeLoss)}. ` +
    `Минимальный депозит при базе 0.20 — ${formatMoney(
      X512_STRATEGY_MINIMUM_DEPOSIT
    )}.`;
  elements.strategyFifteenPlusX512DepositNote.textContent =
    `Выбрано ${formatMoney(startingDeposit)} — ${Math.round(
      startingDeposit / X512_STRATEGY_MINIMUM_DEPOSIT
    )} полных резервов по ${formatMoney(X512_STRATEGY_MINIMUM_DEPOSIT)}. ` +
    "Без реинвестирования базовая ставка остаётся 0.20.";
  elements.strategyFifteenPlusX512ReinvestmentNote.textContent =
    elements.strategyFifteenPlusX512ReinvestmentEnabled.checked
      ? `За каждые полные +${formatMoney(
          X512_STRATEGY_REINVESTMENT_STEP
        )} сверх выбранного стартового депозита база следующего цикла растёт на 0.01. Текущая расчётная база — ${formatMoney(initialBet)}.`
      : "Реинвестирование выключено: базовая ставка каждого нового цикла — 0.20.";
}

function getX512DisplayedInitialBet(settings = null, strategy = null) {
  const reinvestmentEnabled = settings
    ? Boolean(settings.strategyFifteenPlusX512ReinvestmentEnabled)
    : Boolean(elements.strategyFifteenPlusX512ReinvestmentEnabled.checked);
  if (!reinvestmentEnabled) {
    return STRATEGY_INITIAL_BET;
  }

  const startingDeposit = normalizeX512StartingDeposit(
    settings
      ? settings.strategyFifteenPlusX512StartingDeposit
      : elements.strategyFifteenPlusX512StartingDeposit.value
  ) || X512_STRATEGY_MINIMUM_DEPOSIT;
  const state = strategy || currentStrategyState;
  const expectedSignature = buildX512StrategyConfigSignature(
    true,
    startingDeposit
  );
  const stateMatches =
    state?.strategyId === X512_STRATEGY_ID &&
    state?.configSignature === expectedSignature;
  const balance = Math.max(
    0,
    Number(stateMatches ? state?.strategyBalance ?? startingDeposit : startingDeposit)
  );
  const profit = Math.max(0, balance - startingDeposit);
  const levels = Math.floor(
    (profit + 1e-9) / X512_STRATEGY_REINVESTMENT_STEP
  );
  return roundToCent(
    STRATEGY_INITIAL_BET +
      levels * STRATEGY_REINVESTMENT_BET_INCREMENT
  );
}

function buildX512StrategyConfigSignature(
  reinvestmentEnabled,
  startingDeposit
) {
  return (
    `${X512_STRATEGY_ID}|${X512_STRATEGY_STOP_STEP}|` +
    `${Boolean(reinvestmentEnabled) ? 1 : 0}|` +
    `${normalizeX512StartingDeposit(startingDeposit)}|` +
    STRATEGY_FORMULA_VERSION
  );
}

function getStrategyProgression(step, initialBet, target) {
  const result = [];
  let cumulativeLoss = 0;
  let bet = initialBet;
  for (let currentStep = 1; currentStep <= step; currentStep += 1) {
    result.push(bet);
    cumulativeLoss = roundToCent(cumulativeLoss + bet);
    if (currentStep < step) {
      const raw = (cumulativeLoss + initialBet) / (target - 1);
      bet = Math.max(initialBet, ceilToStep(raw, STRATEGY_BET_STEP));
    }
  }
  return result;
}

function getStrategyStopStepDetails(stepValue, initialBet, target) {
  const progression = getStrategyProgression(
    Math.max(0, Math.round(Number(stepValue) || 0)),
    initialBet,
    target
  );
  if (progression.length === 0) {
    return null;
  }
  return {
    step: progression.length,
    bet: progression.at(-1),
    cumulativeLoss: roundToCent(
      progression.reduce((sum, bet) => sum + bet, 0)
    )
  };
}

function normalizeX512StartingDeposit(value) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < X512_STRATEGY_MINIMUM_DEPOSIT) {
    return null;
  }
  return Math.min(
    1_400_000,
    Math.ceil(parsed / X512_STRATEGY_MINIMUM_DEPOSIT) *
      X512_STRATEGY_MINIMUM_DEPOSIT
  );
}

function refreshStrategyCalculations() {
  const stopStep = normalizeStopStep(
    elements.strategyTenPlusX340StopStep.value
  );
  if (stopStep <= 0) {
    elements.strategyTenPlusX340ReinvestmentEnabled.checked = false;
  }

  const selectedValue = String(stopStep);
  populateStopOptions(getDisplayedInitialBet(), selectedValue);
  syncStrategyFields();
}

function renderSelectedStopDetails() {
  const stopStep = normalizeStopStep(
    elements.strategyTenPlusX340StopStep.value
  );
  const initialBet = getDisplayedInitialBet();
  const details = getStopStepDetails(stopStep, initialBet);
  const minimumDeposit = getMinimumStartingDeposit(stopStep);
  const reinvestmentStep = getReinvestmentBalanceStep(stopStep);

  if (!details) {
    elements.strategyStopDetails.textContent =
      `Без ограничения числа повышений. Текущая расчётная стартовая ставка — ${formatMoney(initialBet)}. ` +
      "Минимальный депозит не рассчитывается, реинвестирование недоступно.";
    renderReinvestmentNote(stopStep);
    return;
  }

  elements.strategyStopDetails.textContent =
    `Шаг ${details.step}: ставка ${formatMoney(details.bet)}; ` +
    `общий потенциальный минус после проигрыша — ${formatMoney(
      details.cumulativeLoss
    )}. Минимальный стартовый депозит — ${formatMoney(
      minimumDeposit
    )}; шаг реинвестирования — ${formatMoney(reinvestmentStep)}. ` +
    `Расчёт от стартовой ставки ${formatMoney(initialBet)}.`;
  renderReinvestmentNote(stopStep);
}

function renderReinvestmentNote(stopStep) {
  const minimumDeposit = getMinimumStartingDeposit(stopStep);
  const reinvestmentStep = getReinvestmentBalanceStep(stopStep);
  if (minimumDeposit <= 0 || reinvestmentStep <= 0) {
    elements.strategyReinvestmentNote.textContent =
      "Для реинвестирования сначала выберите конечный шаг стопа.";
    return;
  }

  elements.strategyReinvestmentNote.textContent =
    `Минимальный виртуальный депозит для выбранного стопа — ${formatMoney(
      minimumDeposit
    )}. За каждые полные +${formatMoney(
      reinvestmentStep
    )} к балансу стартовая ставка следующего цикла увеличивается на 0,01.`;
}

function getDisplayedInitialBet(settings = null, strategy = null) {
  const reinvestmentEnabled = settings
    ? Boolean(settings.strategyTenPlusX340ReinvestmentEnabled)
    : Boolean(elements.strategyTenPlusX340ReinvestmentEnabled.checked);
  if (!reinvestmentEnabled) {
    return STRATEGY_INITIAL_BET;
  }

  const stopStep = normalizeStopStep(
    settings
      ? settings.strategyTenPlusX340StopStep
      : elements.strategyTenPlusX340StopStep.value
  );
  const minimumDeposit = getMinimumStartingDeposit(stopStep);
  const reinvestmentStep = getReinvestmentBalanceStep(stopStep);
  if (minimumDeposit <= 0 || reinvestmentStep <= 0) {
    return STRATEGY_INITIAL_BET;
  }

  const state = strategy || currentStrategyState;
  const expectedSignature = buildStrategyConfigSignature(
    stopStep,
    true
  );
  const stateMatchesConfiguration =
    state?.configSignature === expectedSignature;
  const balance = Math.max(
    0,
    Number(
      stateMatchesConfiguration
        ? state?.strategyBalance ?? minimumDeposit
        : minimumDeposit
    )
  );
  const profit = Math.max(0, balance - minimumDeposit);
  const levels = Math.floor((profit + 1e-9) / reinvestmentStep);
  return roundToCent(
    STRATEGY_INITIAL_BET +
      levels * STRATEGY_REINVESTMENT_BET_INCREMENT
  );
}

function getMinimumStartingDeposit(stopStep) {
  const details = getStopStepDetails(stopStep, STRATEGY_INITIAL_BET);
  return details ? Math.ceil(details.cumulativeLoss - 1e-9) : 0;
}

function getReinvestmentBalanceStep(stopStep) {
  const minimumDeposit = getMinimumStartingDeposit(stopStep);
  return minimumDeposit > 0
    ? roundToFour(minimumDeposit / 20)
    : 0;
}

function buildStrategyConfigSignature(stopStep, reinvestmentEnabled) {
  return (
    `${STRATEGY_ID}|${normalizeStopStep(stopStep)}|` +
    `${Boolean(reinvestmentEnabled) ? 1 : 0}|` +
    STRATEGY_FORMULA_VERSION
  );
}

function getStopStepDetails(stepValue, initialBet = STRATEGY_INITIAL_BET) {
  return getStrategyStopStepDetails(
    stepValue,
    initialBet,
    STRATEGY_TARGET
  );
}

function calculateRecoveryBet(cumulativeLoss, initialBet = STRATEGY_INITIAL_BET) {
  const targetProfit = initialBet;
  const raw =
    (cumulativeLoss + targetProfit) / (STRATEGY_TARGET - 1);
  return Math.max(initialBet, ceilToStep(raw, STRATEGY_BET_STEP));
}

function ceilToStep(value, step) {
  return Number((Math.ceil((value - 1e-10) / step) * step).toFixed(2));
}

function roundToCent(value) {
  return Number(Number(value).toFixed(2));
}

function roundToFour(value) {
  return Number(Number(value).toFixed(4));
}

function formatMoney(value) {
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function openStrategyDescription() {
  if (typeof elements.strategyDescriptionDialog.showModal === "function") {
    elements.strategyDescriptionDialog.showModal();
  } else {
    elements.strategyDescriptionDialog.setAttribute("open", "");
  }
}

function closeStrategyDescription() {
  if (typeof elements.strategyDescriptionDialog.close === "function") {
    elements.strategyDescriptionDialog.close();
  } else {
    elements.strategyDescriptionDialog.removeAttribute("open");
  }
}

function openX512StrategyDescription() {
  if (
    typeof elements.strategyFifteenPlusX512DescriptionDialog.showModal ===
    "function"
  ) {
    elements.strategyFifteenPlusX512DescriptionDialog.showModal();
  } else {
    elements.strategyFifteenPlusX512DescriptionDialog.setAttribute("open", "");
  }
}

function closeX512StrategyDescription() {
  if (
    typeof elements.strategyFifteenPlusX512DescriptionDialog.close ===
    "function"
  ) {
    elements.strategyFifteenPlusX512DescriptionDialog.close();
  } else {
    elements.strategyFifteenPlusX512DescriptionDialog.removeAttribute("open");
  }
}

function openX512TwentyStrategyDescription() {
  if (
    typeof elements.strategyTwentyPlusX512DescriptionDialog.showModal ===
    "function"
  ) {
    elements.strategyTwentyPlusX512DescriptionDialog.showModal();
  } else {
    elements.strategyTwentyPlusX512DescriptionDialog.setAttribute("open", "");
  }
}

function closeX512TwentyStrategyDescription() {
  if (
    typeof elements.strategyTwentyPlusX512DescriptionDialog.close ===
    "function"
  ) {
    elements.strategyTwentyPlusX512DescriptionDialog.close();
  } else {
    elements.strategyTwentyPlusX512DescriptionDialog.removeAttribute("open");
  }
}

function openX1436StrategyDescription() {
  if (
    typeof elements.strategyFortyThreePlusX1436DescriptionDialog.showModal ===
    "function"
  ) {
    elements.strategyFortyThreePlusX1436DescriptionDialog.showModal();
  } else {
    elements.strategyFortyThreePlusX1436DescriptionDialog.setAttribute("open", "");
  }
}

function closeX1436StrategyDescription() {
  if (
    typeof elements.strategyFortyThreePlusX1436DescriptionDialog.close ===
    "function"
  ) {
    elements.strategyFortyThreePlusX1436DescriptionDialog.close();
  } else {
    elements.strategyFortyThreePlusX1436DescriptionDialog.removeAttribute("open");
  }
}

function openX1436HistoricalData() {
  if (
    typeof elements.strategyFortyThreePlusX1436HistoricalDialog.showModal ===
    "function"
  ) {
    elements.strategyFortyThreePlusX1436HistoricalDialog.showModal();
  } else {
    elements.strategyFortyThreePlusX1436HistoricalDialog.setAttribute("open", "");
  }
}

function closeX1436HistoricalData() {
  if (
    typeof elements.strategyFortyThreePlusX1436HistoricalDialog.close ===
    "function"
  ) {
    elements.strategyFortyThreePlusX1436HistoricalDialog.close();
  } else {
    elements.strategyFortyThreePlusX1436HistoricalDialog.removeAttribute("open");
  }
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function setStatus(message, error = false, ok = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", error);
  elements.status.classList.toggle("ok", ok);
}

function syncStrategyFields() {
  const strategyEnabled = elements.strategyTenPlusX340Enabled.checked;
  const anyStrategyEnabled = Boolean(
    strategyEnabled ||
    elements.strategyFifteenPlusX512Enabled.checked ||
    elements.strategyTwentyPlusX512Enabled.checked ||
    elements.strategyFortyThreePlusX1436Enabled.checked
  );
  const stopStep = normalizeStopStep(
    elements.strategyTenPlusX340StopStep.value
  );
  elements.strategyTenPlusX340StopStep.disabled = !strategyEnabled;
  elements.strategyTenPlusX340ReinvestmentEnabled.disabled =
    !strategyEnabled || stopStep <= 0;
  if (stopStep <= 0) {
    elements.strategyTenPlusX340ReinvestmentEnabled.checked = false;
  }
  elements.preparationEnabled.disabled = anyStrategyEnabled;

  if (anyStrategyEnabled) {
    elements.preparationEnabled.checked = false;
  }

  renderSelectedStopDetails();
  syncStrategyNotificationFields();
  syncPreparationFields();
}

function syncX512StrategyFields() {
  const enabled = elements.strategyFifteenPlusX512Enabled.checked;
  elements.strategyFifteenPlusX512StartingDeposit.disabled = !enabled;
  elements.strategyFifteenPlusX512ReinvestmentEnabled.disabled = !enabled;
  renderX512Calculations();
  syncStrategyNotificationFields();
}

function syncX512TwentyStrategyFields() {
  renderX512TwentyCalculations(appliedX512TwentyStartingDeposit);
  syncStrategyNotificationFields();
}

function syncX1436StrategyFields() {
  renderX1436Calculations(appliedX1436StartingDeposit);
  syncStrategyNotificationFields();
}


function syncStrategyNotificationFields() {
  const x340Enabled = elements.strategyTenPlusX340Enabled.checked;
  elements.strategyTenPlusX340NotifySeriesEnabled.disabled = !x340Enabled;
  elements.strategyTenPlusX340NotifySeriesLength.disabled =
    !x340Enabled ||
    !elements.strategyTenPlusX340NotifySeriesEnabled.checked;

  const x512Enabled = elements.strategyFifteenPlusX512Enabled.checked;
  elements.strategyFifteenPlusX512NotifySeriesEnabled.disabled = !x512Enabled;
  elements.strategyFifteenPlusX512NotifySeriesLength.disabled =
    !x512Enabled ||
    !elements.strategyFifteenPlusX512NotifySeriesEnabled.checked;

  const x512TwentyEnabled = elements.strategyTwentyPlusX512Enabled.checked;
  elements.strategyTwentyPlusX512NotifySeriesEnabled.disabled =
    !x512TwentyEnabled;
  elements.strategyTwentyPlusX512NotifySeriesLength.disabled =
    !x512TwentyEnabled ||
    !elements.strategyTwentyPlusX512NotifySeriesEnabled.checked;

  const x1436Enabled = elements.strategyFortyThreePlusX1436Enabled.checked;
  elements.strategyFortyThreePlusX1436NotifySeriesEnabled.disabled =
    !x1436Enabled;
  elements.strategyFortyThreePlusX1436NotifySeriesLength.disabled =
    !x1436Enabled ||
    !elements.strategyFortyThreePlusX1436NotifySeriesEnabled.checked;
}

function syncPreparationFields() {
  const strategyEnabled = Boolean(
    elements.strategyTenPlusX340Enabled.checked ||
    elements.strategyFifteenPlusX512Enabled.checked ||
    elements.strategyTwentyPlusX512Enabled.checked ||
    elements.strategyFortyThreePlusX1436Enabled.checked
  );
  const disabled = strategyEnabled || !elements.preparationEnabled.checked;
  elements.preparationEnabled.disabled = strategyEnabled;
  elements.preparationBet.disabled = disabled;
  elements.preparationCashout.disabled = disabled;
}

function syncReloadFields() {
  elements.pageAutoReloadSeconds.disabled =
    !elements.pageAutoReloadEnabled.checked;
}



function normalizeBadgeOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeBadgeOpacity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 10 || parsed > 100) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeTelegramChatId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const numeric = normalized.startsWith("-")
    ? normalized.slice(1)
    : normalized;
  return /^\d{1,20}$/.test(numeric) ? normalized : null;
}

function normalizeSeriesLength(value, maximum = 10) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > maximum) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeReloadSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 5 || parsed > 86400) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeStopStep(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }
  return parsed === 0 ? 0 : Math.round(parsed);
}

function normalizeDecimal(value, minimum, maximum) {
  const parsed = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return Number(parsed.toFixed(2));
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function markSettingsDirty() {
  settingsDirty = true;
}

function isEditingSettings() {
  return (
    settingsElements.includes(document.activeElement) ||
    badgeSettingsElements.includes(document.activeElement) ||
    document.activeElement === elements.strategyTwentyPlusX512StartingDeposit ||
    document.activeElement === elements.strategyFortyThreePlusX1436StartingDeposit
  );
}
