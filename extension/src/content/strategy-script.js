(() => {
  "use strict";

  const GAME_HOST_PATTERN = /(^|\.)spribegaming\.com$/i;
  const HISTORY_CHANNEL = "aviator-strategy-history-v1";
  const HISTORY_SOURCE = "aviator-history-scanner";
  const INTERFACE_CHANNEL = "aviator-preparation-v2";
  const CONTROLLER_SOURCE = "aviator-strategy-controller";
  const BRIDGE_SOURCE = "aviator-preparation-page-bridge";
  const STRATEGY_ID = "ten-plus-x348";
  const STRATEGY_NAME = "10+ - x3.48";
  const TARGET = 3.48;
  const SIGNAL_LENGTH = 10;
  const AUTO_RELOAD_PAUSE_AT = 8;
  const INITIAL_BET = 0.2;
  const MIN_PROFIT = 0.2;
  const BET_STEP = 0.01;
  const BRIDGE_TIMEOUT_MS = 8_000;
  const ACTION_TIMEOUT_MS = 80_000;

  if (!GAME_HOST_PATTERN.test(location.hostname)) {
    return;
  }

  let settings = null;
  let state = null;
  let latestSnapshot = null;
  let processChain = Promise.resolve();
  let currentBridgeRequest = null;
  let configurationSequence = 0;

  start();

  function start() {
    window.addEventListener("message", onWindowMessage, false);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.settings) {
        void reloadConfiguration();
      }
    });

    void reloadConfiguration();
  }

  async function reloadConfiguration() {
    const sequence = ++configurationSequence;
    cancelBridgeRequest();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_CAPTURE_STATE",
        pageUrl: location.href
      });

      if (sequence !== configurationSequence) {
        return;
      }
      if (!response?.ok) {
        throw new Error(response?.error || "Не удалось получить настройки стратегии");
      }

      settings = {
        enabled: Boolean(response.strategyTenPlusX348Enabled),
        stopStep: normalizeStopStep(response.strategyTenPlusX348StopStep)
      };

      if (!settings.enabled) {
        state = null;
        return;
      }

      const signature = buildConfigSignature(settings);
      const saved = response.strategyState;
      state = isCompatibleState(saved, signature)
        ? normalizeState(saved, signature)
        : createInitialState(signature);

      if (latestSnapshot) {
        enqueueSnapshot(latestSnapshot);
      }
    } catch (error) {
      if (!settings?.enabled) {
        return;
      }

      if (!latestSnapshot) {
        return;
      }

      state = state || createInitialState(buildConfigSignature(settings));
      state.stage = "error";
      state.error = error instanceof Error ? error.message : String(error);
      state.message = "Ошибка запуска стратегии";
      state.autoReloadPaused = true;
      await persistState();
    }
  }

  function onWindowMessage(event) {
    const message = event.data;
    if (
      event.source === window &&
      message?.channel === HISTORY_CHANNEL &&
      message.source === HISTORY_SOURCE &&
      message.type === "SNAPSHOT"
    ) {
      const snapshot = normalizeSnapshot(message.snapshot);
      if (!snapshot) {
        return;
      }

      latestSnapshot = snapshot;
      enqueueSnapshot(snapshot);
      return;
    }

    if (
      event.source !== window ||
      message?.channel !== INTERFACE_CHANNEL ||
      message.source !== BRIDGE_SOURCE
    ) {
      return;
    }

    const request = currentBridgeRequest;
    if (!request || message.requestId !== request.requestId) {
      return;
    }

    if (message.type === "PREPARE_STAGE") {
      if (state) {
        state.message = interfaceStageLabel(message.stage);
        void persistState();
      }
      return;
    }

    if (message.type === "PREPARE_RESULT") {
      request.resolve({
        ok: Boolean(message.ok),
        error: message.error || null
      });
    }
  }

  function enqueueSnapshot(snapshot) {
    processChain = processChain
      .then(async () => {
        if (!settings) {
          await reloadConfiguration();
        }
        if (!settings?.enabled || !state) {
          return;
        }
        await processSnapshot(snapshot);
      })
      .catch(async (error) => {
        if (!state || !settings?.enabled) {
          return;
        }
        state.stage = "error";
        state.error = error instanceof Error ? error.message : String(error);
        state.message = "Стратегия остановлена из-за ошибки";
        state.autoReloadPaused = true;
        await persistState();
      });
  }

  async function processSnapshot(snapshot) {
    const rounds = snapshot.values.map((multiplier, index) => ({
      multiplier,
      roundId: snapshot.ids[index]
    }));

    if (rounds.length === 0) {
      return;
    }

    if (!state.initialized) {
      await initializeFromSnapshot(rounds);
      return;
    }

    const previousIndex = rounds.findIndex(
      (round) => round.roundId === state.lastProcessedRoundId
    );

    if (previousIndex === 0) {
      return;
    }

    if (previousIndex < 0) {
      if (state.awaitingResult || ["arming", "betting"].includes(state.stage)) {
        await enterDesynchronizationError(
          "Не найден последний обработанный раунд во время активной ставки"
        );
        return;
      }

      await initializeFromSnapshot(rounds);
      return;
    }

    const newRounds = rounds.slice(0, previousIndex).reverse();
    if (
      newRounds.length > 1 &&
      (state.awaitingResult || ["arming", "betting"].includes(state.stage))
    ) {
      await enterDesynchronizationError(
        "Во время активной ставки пропущено несколько результатов"
      );
      return;
    }

    for (let index = 0; index < newRounds.length; index += 1) {
      const hasFollowingRound = index < newRounds.length - 1;
      const continued = await processRound(newRounds[index], hasFollowingRound);
      if (!continued) {
        return;
      }
    }
  }

  async function initializeFromSnapshot(rounds) {
    let streak = 0;
    for (const round of rounds) {
      if (round.multiplier <= TARGET) {
        streak += 1;
      } else {
        break;
      }
    }

    state = {
      ...createInitialState(buildConfigSignature(settings)),
      initialized: true,
      consecutiveLosses: streak,
      lastProcessedRoundId: rounds[0].roundId,
      lastMultiplier: rounds[0].multiplier,
      autoReloadPaused: streak >= AUTO_RELOAD_PAUSE_AT,
      message: `Ожидание сигнала: ${Math.min(streak, SIGNAL_LENGTH)}/${SIGNAL_LENGTH}`
    };

    if (streak >= SIGNAL_LENGTH) {
      beginBettingCycle();
      await persistState();
      await ensureNextBetPlaced();
      return;
    }

    await persistState();
  }

  async function processRound(round, hasFollowingRound) {
    state.lastProcessedRoundId = round.roundId;
    state.lastMultiplier = round.multiplier;
    state.error = null;

    if (state.awaitingResult) {
      if (round.multiplier > TARGET) {
        finishProfitableCycle(round.multiplier);
        await persistState();
        return true;
      }

      state.cumulativeLoss = roundToCent(
        state.cumulativeLoss + Number(state.activeBet || 0)
      );
      state.awaitingResult = false;
      state.activeBet = null;

      if (settings.stopStep > 0 && state.step >= settings.stopStep) {
        finishStoppedCycle();
        await persistState();
        return true;
      }

      state.nextBet = calculateRecoveryBet(state.cumulativeLoss);
      state.stage = "betting";
      state.autoReloadPaused = true;
      state.message = `Проигрыш. Подготовка шага ${state.step + 1}`;
      await persistState();

      if (hasFollowingRound) {
        await enterDesynchronizationError(
          "Следующий результат появился до размещения новой ставки"
        );
        return false;
      }

      await ensureNextBetPlaced();
      return true;
    }

    if (["arming", "betting"].includes(state.stage)) {
      await enterDesynchronizationError(
        "Получен результат до подтверждения размещения ставки"
      );
      return false;
    }

    if (round.multiplier <= TARGET) {
      state.consecutiveLosses += 1;
    } else {
      state.consecutiveLosses = 0;
    }

    state.autoReloadPaused =
      state.consecutiveLosses >= AUTO_RELOAD_PAUSE_AT;
    state.stage = "waiting";
    state.message = `Ожидание сигнала: ${Math.min(
      state.consecutiveLosses,
      SIGNAL_LENGTH
    )}/${SIGNAL_LENGTH}`;

    if (state.consecutiveLosses >= SIGNAL_LENGTH) {
      if (hasFollowingRound) {
        await enterDesynchronizationError(
          "Сигнал 10/10 обнаружен после уже прошедшего следующего раунда"
        );
        return false;
      }

      beginBettingCycle();
      await persistState();
      await ensureNextBetPlaced();
      return true;
    }

    await persistState();
    return true;
  }

  function beginBettingCycle() {
    state.stage = "betting";
    state.consecutiveLosses = SIGNAL_LENGTH;
    state.step = 0;
    state.cumulativeLoss = 0;
    state.nextBet = INITIAL_BET;
    state.activeBet = null;
    state.awaitingResult = false;
    state.autoReloadPaused = true;
    state.lastCyclePnl = null;
    state.message = "Сигнал 10/10. Подготовка первой ставки";
  }

  async function ensureNextBetPlaced() {
    if (!settings?.enabled || !state || state.awaitingResult) {
      return;
    }

    const bet = roundToCent(Math.max(INITIAL_BET, state.nextBet));
    state.stage = "arming";
    state.autoReloadPaused = true;
    state.message = `Проверка интерфейса перед ставкой ${formatMoney(bet)}`;
    await persistState();

    try {
      await prepareAndPlaceBet(bet);
      state.step += 1;
      state.activeBet = bet;
      state.nextBet = bet;
      state.awaitingResult = true;
      state.stage = "betting";
      state.error = null;
      state.message = `Шаг ${state.step}: поставлено ${formatMoney(bet)}, ждём результат`;
      await persistState();
    } catch (error) {
      state.stage = "error";
      state.error = error instanceof Error ? error.message : String(error);
      state.message = "Ставка не размещена. Требуется проверка интерфейса";
      state.autoReloadPaused = true;
      await persistState();
    }
  }

  function finishProfitableCycle(multiplier) {
    const activeBet = Number(state.activeBet || 0);
    const pnl = Number(
      (activeBet * (TARGET - 1) - state.cumulativeLoss).toFixed(4)
    );

    state.completedCycles += 1;
    state.lastCyclePnl = pnl;
    state.stage = "waiting";
    state.consecutiveLosses = 0;
    state.step = 0;
    state.cumulativeLoss = 0;
    state.nextBet = INITIAL_BET;
    state.activeBet = null;
    state.awaitingResult = false;
    state.autoReloadPaused = false;
    state.message = `Цикл закрыт: +${pnl.toFixed(2)} при ${multiplier.toFixed(2)}x`;
  }

  function finishStoppedCycle() {
    const pnl = Number((-state.cumulativeLoss).toFixed(4));
    state.stoppedCycles += 1;
    state.lastCyclePnl = pnl;
    state.stage = "waiting";
    state.consecutiveLosses = 0;
    state.step = 0;
    state.cumulativeLoss = 0;
    state.nextBet = INITIAL_BET;
    state.activeBet = null;
    state.awaitingResult = false;
    state.autoReloadPaused = false;
    state.message = `Достигнут стоп. Результат цикла: ${pnl.toFixed(2)}`;
  }

  async function enterDesynchronizationError(message) {
    state.stage = "error";
    state.error = message;
    state.message = "Стратегия остановлена для защиты от ошибочной ставки";
    state.autoReloadPaused = true;
    state.awaitingResult = false;
    state.activeBet = null;
    cancelBridgeRequest();
    await persistState();
  }

  function calculateRecoveryBet(cumulativeLoss) {
    const raw = (cumulativeLoss + MIN_PROFIT) / (TARGET - 1);
    return Math.max(INITIAL_BET, ceilToStep(raw, BET_STEP));
  }

  async function prepareAndPlaceBet(bet) {
    cancelBridgeRequest();
    await waitForBridge();

    const requestId = createRequestId("strategy-bet");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (currentBridgeRequest?.requestId === requestId) {
          currentBridgeRequest = null;
        }
        reject(new Error("Подготовка и размещение ставки превысили лимит времени"));
      }, ACTION_TIMEOUT_MS);

      currentBridgeRequest = {
        requestId,
        resolve: (result) => {
          clearTimeout(timeout);
          if (currentBridgeRequest?.requestId === requestId) {
            currentBridgeRequest = null;
          }
          if (!result.ok) {
            reject(new Error(result.error || "Интерфейс не принял ставку"));
            return;
          }
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          if (currentBridgeRequest?.requestId === requestId) {
            currentBridgeRequest = null;
          }
          reject(error);
        }
      };

      sendInterfaceMessage("PREPARE_AND_BET", requestId, {
        settings: {
          bet,
          cashout: TARGET
        }
      });
    });
  }

  function waitForBridge() {
    const requestId = createRequestId("strategy-bridge");

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let timer = null;

      const cleanup = () => {
        clearInterval(timer);
        window.removeEventListener("message", listener, false);
      };

      const listener = (event) => {
        if (
          event.source !== window ||
          event.data?.channel !== INTERFACE_CHANNEL ||
          event.data?.source !== BRIDGE_SOURCE ||
          event.data?.type !== "BRIDGE_READY" ||
          event.data?.requestId !== requestId
        ) {
          return;
        }
        cleanup();
        resolve();
      };

      window.addEventListener("message", listener, false);
      sendInterfaceMessage("PING", requestId);

      timer = setInterval(() => {
        if (Date.now() - startedAt >= BRIDGE_TIMEOUT_MS) {
          cleanup();
          reject(new Error("Не подключился обработчик интерфейса игры"));
          return;
        }
        sendInterfaceMessage("PING", requestId);
      }, 200);
    });
  }

  function cancelBridgeRequest() {
    if (!currentBridgeRequest) {
      return;
    }

    const request = currentBridgeRequest;
    currentBridgeRequest = null;
    sendInterfaceMessage("CANCEL", request.requestId);
    request.reject(new Error("Действие отменено новой конфигурацией"));
  }

  function sendInterfaceMessage(type, requestId = null, payload = {}) {
    window.postMessage(
      {
        channel: INTERFACE_CHANNEL,
        source: CONTROLLER_SOURCE,
        type,
        requestId,
        ...payload
      },
      "*"
    );
  }

  async function persistState() {
    if (!settings?.enabled || !state) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_STRATEGY_STATE",
        pageUrl: location.href,
        frameUrl: location.href,
        state
      });

      if (response?.ok && response.state) {
        state = normalizeState(response.state, state.configSignature);
      }
    } catch {
      // После обновления расширения старый content script теряет контекст.
    }
  }

  function createInitialState(configSignature) {
    return {
      version: 1,
      strategyId: STRATEGY_ID,
      stage: "waiting",
      initialized: false,
      consecutiveLosses: 0,
      step: 0,
      cumulativeLoss: 0,
      nextBet: INITIAL_BET,
      activeBet: null,
      awaitingResult: false,
      autoReloadPaused: false,
      lastProcessedRoundId: null,
      lastMultiplier: null,
      lastCyclePnl: null,
      completedCycles: 0,
      stoppedCycles: 0,
      error: null,
      message: "Ожидание истории результатов",
      configSignature
    };
  }

  function normalizeState(value, configSignature) {
    const initial = createInitialState(configSignature);
    const source = value && typeof value === "object" ? value : {};
    return {
      ...initial,
      ...source,
      initialized: Boolean(source.initialized),
      consecutiveLosses: Math.max(0, Number(source.consecutiveLosses || 0)),
      step: Math.max(0, Number(source.step || 0)),
      cumulativeLoss: Math.max(0, Number(source.cumulativeLoss || 0)),
      nextBet: Math.max(INITIAL_BET, Number(source.nextBet || INITIAL_BET)),
      activeBet:
        source.activeBet === null || source.activeBet === undefined
          ? null
          : Math.max(INITIAL_BET, Number(source.activeBet)),
      awaitingResult: Boolean(source.awaitingResult),
      autoReloadPaused: Boolean(source.autoReloadPaused),
      completedCycles: Math.max(0, Number(source.completedCycles || 0)),
      stoppedCycles: Math.max(0, Number(source.stoppedCycles || 0)),
      configSignature
    };
  }

  function isCompatibleState(value, signature) {
    return Boolean(
      value &&
        value.version === 1 &&
        value.strategyId === STRATEGY_ID &&
        value.configSignature === signature
    );
  }

  function normalizeSnapshot(value) {
    if (
      !value ||
      !Array.isArray(value.values) ||
      !Array.isArray(value.ids) ||
      value.values.length === 0 ||
      value.values.length !== value.ids.length
    ) {
      return null;
    }

    const values = value.values.map((item) => Number(item));
    const ids = value.ids.map((item) => String(item || ""));
    if (
      values.some((item) => !Number.isFinite(item)) ||
      ids.some((item) => !item)
    ) {
      return null;
    }

    return { values, ids, reason: value.reason || null };
  }

  function buildConfigSignature(value) {
    return `${STRATEGY_ID}|${normalizeStopStep(value?.stopStep)}`;
  }

  function normalizeStopStep(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.min(100, Math.max(1, Math.round(parsed)))
      : 0;
  }

  function ceilToStep(value, step) {
    return Number((Math.ceil((value - 1e-10) / step) * step).toFixed(2));
  }

  function roundToCent(value) {
    return Number(Number(value).toFixed(2));
  }

  function createRequestId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function formatMoney(value) {
    return Number(value).toFixed(2);
  }

  function interfaceStageLabel(stage) {
    const labels = {
      "waiting-game": "Ожидание интерфейса Aviator",
      "switching-auto": "Проверка вкладки «Авто»",
      "enabling-cashout": "Проверка авто кешаута",
      "setting-cashout": "Установка кэшаута 3.48",
      "setting-bet": "Установка размера ставки",
      "placing-bet": "Нажатие кнопки «Ставка»"
    };
    return labels[stage] || `${STRATEGY_NAME}: подготовка ставки`;
  }
})();
