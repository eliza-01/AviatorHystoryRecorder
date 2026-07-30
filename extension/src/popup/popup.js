const elements = {
  version: document.querySelector("#version"),
  enabled: document.querySelector("#enabled"),
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  strategyTenPlusX348Enabled: document.querySelector(
    "#strategyTenPlusX348Enabled"
  ),
  strategyTenPlusX348StopStep: document.querySelector(
    "#strategyTenPlusX348StopStep"
  ),
  strategyStopDetails: document.querySelector("#strategyStopDetails"),
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

const STRATEGY_TARGET = 3.48;
const STRATEGY_INITIAL_BET = 0.2;
const STRATEGY_MIN_PROFIT = 0.2;
const STRATEGY_BET_STEP = 0.01;

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

populateStopOptions();

const settingsElements = [
  elements.enabled,
  elements.apiBaseUrl,
  elements.strategyTenPlusX348Enabled,
  elements.strategyTenPlusX348StopStep,
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

elements.strategyTenPlusX348Enabled.addEventListener(
  "change",
  syncStrategyFields
);
elements.strategyTenPlusX348StopStep.addEventListener(
  "change",
  renderSelectedStopDetails
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
window.addEventListener("unload", () => clearInterval(refreshTimer));

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
    strategy
  } = response;

  elements.version.textContent = `v${version || "?"}`;
  if (!settingsDirty && !isEditingSettings()) {
    elements.enabled.checked = Boolean(settings.enabled);
    elements.apiBaseUrl.value = settings.apiBaseUrl || "";
    elements.strategyTenPlusX348Enabled.checked = Boolean(
      settings.strategyTenPlusX348Enabled
    );
    elements.strategyTenPlusX348StopStep.value = String(
      settings.strategyTenPlusX348StopStep || 0
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
    syncStrategyFields();
    syncPreparationFields();
    syncReloadFields();
  }

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

function renderStrategyStatus(strategy, settings) {
  const enabled = Boolean(settings?.strategyTenPlusX348Enabled);
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
  const stop = Number(settings.strategyTenPlusX348StopStep || 0);
  const stopDetails = getStopStepDetails(stop);
  const stopSuffix = stopDetails
    ? ` · стоп: шаг ${stopDetails.step}, ставка ${formatMoney(
        stopDetails.bet
      )}, общий минус ${formatMoney(stopDetails.cumulativeLoss)}`
    : " · без стопа";

  if (stage === "error") {
    elements.strategyStatus.textContent =
      `${strategy.message || "Ошибка стратегии"}: ${
        strategy.error || "проверьте интерфейс"
      }${stopSuffix}`;
    elements.strategyStatus.classList.add("error");
    return;
  }

  if (strategy.awaitingResult) {
    elements.strategyStatus.textContent =
      `Шаг ${strategy.step}: ставка ${formatNumber(
        strategy.activeBet || strategy.nextBet || 0.2
      )}, накопленный минус ${formatNumber(
        strategy.cumulativeLoss || 0
      )}${stopSuffix}`;
    elements.strategyStatus.classList.add("ok");
    return;
  }

  if (["arming", "betting"].includes(stage)) {
    elements.strategyStatus.textContent = `${
      strategy.message || "Подготовка ставки"
    }${stopSuffix}`;
    return;
  }

  elements.strategyStatus.textContent =
    `${strategy.message || `Ожидание сигнала: ${Math.min(streak, 10)}/10`}` +
    stopSuffix;
}

function renderPreparationStatus(preparation, settings) {
  const strategyEnabled = Boolean(settings?.strategyTenPlusX348Enabled);
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

async function save() {
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
    elements.strategyTenPlusX348StopStep.value
  );

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

  if (strategyStopStep === null) {
    setStatus("Стоп должен быть выбран из списка шагов", true);
    elements.strategyTenPlusX348StopStep.focus();
    return false;
  }

  const strategyEnabled = elements.strategyTenPlusX348Enabled.checked;
  elements.pageAutoReloadSeconds.value = String(reloadSeconds);
  elements.preparationBet.value = formatNumber(preparationBet);
  elements.preparationCashout.value = formatNumber(preparationCashout);

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      enabled: elements.enabled.checked,
      apiBaseUrl: elements.apiBaseUrl.value,
      strategyTenPlusX348Enabled: strategyEnabled,
      strategyTenPlusX348StopStep: strategyStopStep,
      preparationEnabled: strategyEnabled
        ? false
        : elements.preparationEnabled.checked,
      preparationBet,
      preparationCashout,
      pageAutoReloadEnabled: elements.pageAutoReloadEnabled.checked,
      pageAutoReloadSeconds: reloadSeconds
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

function populateStopOptions() {
  const unlimited = document.createElement("option");
  unlimited.value = "0";
  unlimited.textContent = "Без стопа";
  elements.strategyTenPlusX348StopStep.append(unlimited);

  for (let step = 1; step <= 100; step += 1) {
    const details = getStopStepDetails(step);
    const option = document.createElement("option");
    option.value = String(step);
    option.textContent =
      `Шаг ${step} — ставка ${formatMoney(details.bet)} · ` +
      `общий минус ${formatMoney(details.cumulativeLoss)}`;
    elements.strategyTenPlusX348StopStep.append(option);
  }

  renderSelectedStopDetails();
}

function renderSelectedStopDetails() {
  const stopStep = normalizeStopStep(
    elements.strategyTenPlusX348StopStep.value
  );
  const details = getStopStepDetails(stopStep);

  if (!details) {
    elements.strategyStopDetails.textContent =
      "Без ограничения числа повышений. Расчёт от стартовой ставки 0,20.";
    return;
  }

  elements.strategyStopDetails.textContent =
    `Шаг ${details.step}: ставка ${formatMoney(details.bet)}; ` +
    `общий потенциальный минус после проигрыша — ${formatMoney(
      details.cumulativeLoss
    )}. Расчёт от стартовой ставки 0,20.`;
}

function getStopStepDetails(stepValue) {
  const step = Number(stepValue);
  if (!Number.isFinite(step) || step <= 0) {
    return null;
  }

  let cumulativeLoss = 0;
  let bet = STRATEGY_INITIAL_BET;

  for (let currentStep = 1; currentStep <= Math.round(step); currentStep += 1) {
    cumulativeLoss = roundToCent(cumulativeLoss + bet);
    if (currentStep === Math.round(step)) {
      return {
        step: currentStep,
        bet,
        cumulativeLoss
      };
    }

    bet = calculateRecoveryBet(cumulativeLoss);
  }

  return null;
}

function calculateRecoveryBet(cumulativeLoss) {
  const raw =
    (cumulativeLoss + STRATEGY_MIN_PROFIT) / (STRATEGY_TARGET - 1);
  return Math.max(
    STRATEGY_INITIAL_BET,
    ceilToStep(raw, STRATEGY_BET_STEP)
  );
}

function ceilToStep(value, step) {
  return Number((Math.ceil((value - 1e-10) / step) * step).toFixed(2));
}

function roundToCent(value) {
  return Number(Number(value).toFixed(2));
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
  const strategyEnabled = elements.strategyTenPlusX348Enabled.checked;
  elements.strategyTenPlusX348StopStep.disabled = !strategyEnabled;
  elements.preparationEnabled.disabled = strategyEnabled;

  if (strategyEnabled) {
    elements.preparationEnabled.checked = false;
  }

  renderSelectedStopDetails();
  syncPreparationFields();
}

function syncPreparationFields() {
  const strategyEnabled = elements.strategyTenPlusX348Enabled.checked;
  const disabled = strategyEnabled || !elements.preparationEnabled.checked;
  elements.preparationEnabled.disabled = strategyEnabled;
  elements.preparationBet.disabled = disabled;
  elements.preparationCashout.disabled = disabled;
}

function syncReloadFields() {
  elements.pageAutoReloadSeconds.disabled =
    !elements.pageAutoReloadEnabled.checked;
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
  return settingsElements.includes(document.activeElement);
}
