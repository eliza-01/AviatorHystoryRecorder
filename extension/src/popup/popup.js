const elements = {
  version: document.querySelector("#version"),
  enabled: document.querySelector("#enabled"),
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
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

let refreshTimer = null;
let settingsDirty = false;

const settingsElements = [
  elements.enabled,
  elements.apiBaseUrl
];

for (const element of settingsElements) {
  element.addEventListener("input", markSettingsDirty);
  element.addEventListener("change", markSettingsDirty);
}

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
  const { version, settings, stats, queues, collector } = response;
  elements.version.textContent = `v${version || "?"}`;
  if (!settingsDirty && !isEditingSettings()) {
    elements.enabled.checked = Boolean(settings.enabled);
    elements.apiBaseUrl.value = settings.apiBaseUrl || "";
  }
  elements.resultQueueSize.textContent = String(queues.resultQueueSize || 0);
  elements.sampleQueueSize.textContent = String(queues.sampleQueueSize || 0);
  elements.acceptedResults.textContent = String(stats.acceptedResults || 0);
  elements.duplicateResults.textContent = String(stats.duplicateResults || 0);

  elements.framesSeen.textContent = String(collector?.framesSeen || 0);
  elements.historyFound.textContent = collector?.historyFound ? "найден" : "не найден";
  elements.historyFound.classList.toggle("ok-text", Boolean(collector?.historyFound));
  elements.historySize.textContent = String(collector?.historySize || 0);
  elements.collectorStage.textContent =
    STAGE_LABELS[collector?.stage] || collector?.stage || "—";
  elements.collectorObservedAt.textContent = formatTime(collector?.observedAt);
  elements.collectorFrameUrl.textContent = collector?.frameUrl || "";
}

async function save() {
  setStatus("Сохранение…");
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      enabled: elements.enabled.checked,
      apiBaseUrl: elements.apiBaseUrl.value
    }
  });

  if (!response?.ok) {
    setStatus(response?.error || "Ошибка сохранения", true);
    return false;
  }

  settingsDirty = false;
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

function markSettingsDirty() {
  settingsDirty = true;
}

function isEditingSettings() {
  return settingsElements.includes(document.activeElement);
}
