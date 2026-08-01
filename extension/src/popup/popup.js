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
  strategyStatus: document.querySelector("#strategyStatus"),
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
  syncStrategyFields
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
    telegram
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
    syncPreparationFields();
    syncReloadFields();
  }

  renderTelegramStatus(telegram, settings);
  renderStrategyStatus(strategy, settings);
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

function renderStrategyStatus(strategy, settings) {
  const enabled = Boolean(settings?.strategyTenPlusX340Enabled);
  elements.strategyStatus.classList.remove("ok", "error");

  if (!enabled) {
    elements.strategyStatus.textContent = "Стратегия выключена";
    return;
  }

  if (!strategy) {
    elements.strategyStatus.textContent =
      "Стратегия включена. Ожидание вкладки Aviator и истории результатов.";
    return;
  }

  const stage = String(strategy.stage || "waiting");
  const streak = Math.max(0, Number(strategy.consecutiveLosses || 0));
  const stop = Number(settings.strategyTenPlusX340StopStep || 0);
  const displayedInitialBet = getDisplayedInitialBet(settings, strategy);
  const stopDetails = getStopStepDetails(stop, displayedInitialBet);
  const minimumDeposit = getMinimumStartingDeposit(stop);
  const reinvestmentStep = getReinvestmentBalanceStep(stop);
  const stopSuffix = stopDetails
    ? ` · стоп: шаг ${stopDetails.step}, ставка ${formatMoney(
        stopDetails.bet
      )}, общий минус ${formatMoney(stopDetails.cumulativeLoss)}`
    : " · без стопа";
  const reinvestmentSuffix = settings.strategyTenPlusX340ReinvestmentEnabled
    ? ` · реинвест: баланс ${formatMoney(
        strategy?.strategyBalance ?? minimumDeposit
      )}, минимум ${formatMoney(minimumDeposit)}, шаг ${formatMoney(
        reinvestmentStep
      )}, база ${formatMoney(displayedInitialBet)}`
    : " · реинвест выключен";

  if (stage === "error") {
    elements.strategyStatus.textContent =
      `${strategy.message || "Ошибка стратегии"}: ${
        strategy.error || "проверьте интерфейс"
      }${stopSuffix}${reinvestmentSuffix}`;
    elements.strategyStatus.classList.add("error");
    return;
  }

  if (strategy.awaitingResult) {
    elements.strategyStatus.textContent =
      `Шаг ${strategy.step}: ставка ${formatNumber(
        strategy.activeBet || strategy.nextBet || 0.2
      )}, накопленный минус ${formatNumber(
        strategy.cumulativeLoss || 0
      )}${stopSuffix}${reinvestmentSuffix}`;
    elements.strategyStatus.classList.add("ok");
    return;
  }

  if (["preparing", "arming", "betting", "waiting-reset"].includes(stage)) {
    elements.strategyStatus.textContent = `${
      strategy.message || "Подготовка ставки"
    }${stopSuffix}${reinvestmentSuffix}`;
    return;
  }

  elements.strategyStatus.textContent =
    `${strategy.message || `Ожидание сигнала: ${Math.min(streak, 10)}/10`}` +
    stopSuffix + reinvestmentSuffix;
}

function renderPreparationStatus(preparation, settings) {
  const strategyEnabled = Boolean(settings?.strategyTenPlusX340Enabled);
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
    elements.strategyTenPlusX340NotifySeriesLength.value
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
    setStatus("Длина серии должна быть от 1 до 10", true);
    elements.strategyTenPlusX340NotifySeriesLength.focus();
    return false;
  }

  if (strategyStopStep === null) {
    setStatus("Стоп должен быть выбран из списка шагов", true);
    elements.strategyTenPlusX340StopStep.focus();
    return false;
  }

  const strategyEnabled = elements.strategyTenPlusX340Enabled.checked;
  const reinvestmentEnabled =
    elements.strategyTenPlusX340ReinvestmentEnabled.checked;
  const notifySeriesEnabled =
    elements.strategyTenPlusX340NotifySeriesEnabled.checked;

  if (reinvestmentEnabled && strategyStopStep <= 0) {
    setStatus(
      "Для реинвестирования выберите конечный шаг стопа",
      true
    );
    elements.strategyTenPlusX340StopStep.focus();
    return false;
  }

  if (notifySeriesEnabled && !telegramChatId) {
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
      preparationEnabled: strategyEnabled
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
  const step = Number(stepValue);
  if (!Number.isFinite(step) || step <= 0) {
    return null;
  }

  let cumulativeLoss = 0;
  let bet = initialBet;

  for (let currentStep = 1; currentStep <= Math.round(step); currentStep += 1) {
    cumulativeLoss = roundToCent(cumulativeLoss + bet);
    if (currentStep === Math.round(step)) {
      return {
        step: currentStep,
        bet,
        cumulativeLoss
      };
    }

    bet = calculateRecoveryBet(cumulativeLoss, initialBet);
  }

  return null;
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
  const stopStep = normalizeStopStep(
    elements.strategyTenPlusX340StopStep.value
  );
  elements.strategyTenPlusX340StopStep.disabled = !strategyEnabled;
  elements.strategyTenPlusX340ReinvestmentEnabled.disabled =
    !strategyEnabled || stopStep <= 0;
  if (stopStep <= 0) {
    elements.strategyTenPlusX340ReinvestmentEnabled.checked = false;
  }
  elements.preparationEnabled.disabled = strategyEnabled;

  if (strategyEnabled) {
    elements.preparationEnabled.checked = false;
  }

  renderSelectedStopDetails();
  syncStrategyNotificationFields();
  syncPreparationFields();
}


function syncStrategyNotificationFields() {
  const strategyEnabled = elements.strategyTenPlusX340Enabled.checked;
  elements.strategyTenPlusX340NotifySeriesEnabled.disabled = !strategyEnabled;
  elements.strategyTenPlusX340NotifySeriesLength.disabled =
    !strategyEnabled ||
    !elements.strategyTenPlusX340NotifySeriesEnabled.checked;
}

function syncPreparationFields() {
  const strategyEnabled = elements.strategyTenPlusX340Enabled.checked;
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

function normalizeSeriesLength(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
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
    badgeSettingsElements.includes(document.activeElement)
  );
}
