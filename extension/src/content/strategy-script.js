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
  let controllerToken = null;
  let controllerClaimPromise = null;
  let signalInterfacePrepared = false;
  let signalPreparationPromise = null;

  start();

  function start() {
    window.addEventListener("message", onWindowMessage, false);
    window.addEventListener("pagehide", () => {
      void releaseControllerOwnership();
    }, { once: true });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.settings) {
        void reloadConfiguration();
      }
    });

    void reloadConfiguration();
  }

  async function reloadConfiguration() {
    const sequence = ++configurationSequence;
    const previousSettings = settings;
    const previousSignature = previousSettings
      ? buildConfigSignature(previousSettings)
      : null;

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

      const nextSettings = {
        enabled: Boolean(response.strategyTenPlusX348Enabled),
        stopStep: normalizeStopStep(response.strategyTenPlusX348StopStep),
        telegramConfigured: Boolean(response.telegramConfigured),
        notifySeriesEnabled: Boolean(
          response.strategyTenPlusX348NotifySeriesEnabled
        ),
        notifySeriesLength: normalizeSeriesLength(
          response.strategyTenPlusX348NotifySeriesLength
        )
      };
      const signature = buildConfigSignature(nextSettings);
      const criticalConfigurationChanged = Boolean(
        previousSettings &&
          (previousSettings.enabled !== nextSettings.enabled ||
            previousSignature !== signature)
      );
      settings = nextSettings;

      if (!settings.enabled) {
        state = null;
        signalInterfacePrepared = false;
        cancelBridgeRequest();
        await releaseControllerOwnership();
        return;
      }

      // Изменение Telegram, интервала обновления или других некритичных
      // настроек не должно перезагружать состояние и отменять текущий шаг.
      if (previousSettings && !criticalConfigurationChanged && state) {
        return;
      }

      if (criticalConfigurationChanged) {
        cancelBridgeRequest();
        await releaseControllerOwnership();
      }

      const saved = response.strategyState;
      state = isCompatibleState(saved, signature)
        ? normalizeState(saved, signature)
        : createInitialState(signature);
      // Готовность интерфейса относится только к текущему документу/iframe.
      signalInterfacePrepared = false;
      state.signalInterfacePrepared = false;

      if (latestSnapshot) {
        if (controllerToken) {
          enqueueSnapshot(latestSnapshot);
        } else {
          void acceptStrategySnapshot(latestSnapshot);
        }
      }
    } catch (error) {
      if (!settings?.enabled || !latestSnapshot) {
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

      void acceptStrategySnapshot(snapshot);
      return;
    }

    if (
      event.source !== window ||
      message?.channel !== INTERFACE_CHANNEL ||
      message.source !== BRIDGE_SOURCE ||
      (message.controllerSource &&
        message.controllerSource !== CONTROLLER_SOURCE)
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

  async function acceptStrategySnapshot(snapshot) {
    if (!isEligibleStrategySnapshot(snapshot)) {
      return;
    }

    const ownership = await claimControllerOwnership(snapshot);
    if (!ownership) {
      return;
    }

    latestSnapshot = snapshot;
    enqueueSnapshot(snapshot);
  }

  function isEligibleStrategySnapshot(snapshot) {
    if (!snapshot || snapshot.selectorKind === "stats-dropdown-copy") {
      return false;
    }

    const hasBetControls = Boolean(
      document.querySelector("app-bet-controls > .controls > app-bet-control")
    );
    return (
      snapshot.selectorKind === "stats-payouts-wrapper" ||
      (snapshot.selectorKind === "generic-payouts-block" && hasBetControls)
    );
  }

  async function claimControllerOwnership(snapshot) {
    if (controllerClaimPromise) {
      return controllerClaimPromise;
    }

    controllerClaimPromise = (async () => {
      try {
        const hasBetControls = Boolean(
          document.querySelector("app-bet-controls > .controls > app-bet-control")
        );
        const score =
          (snapshot.selectorKind === "stats-payouts-wrapper" ? 1_000 : 200) +
          (hasBetControls ? 500 : 0) +
          Math.min(100, Number(snapshot.historySize || snapshot.values.length || 0));
        const response = await chrome.runtime.sendMessage({
          type: "CLAIM_STRATEGY_CONTROLLER",
          pageUrl: location.href,
          frameUrl: location.href,
          score
        });

        if (!response?.ok || !response.owner || !response.controllerToken) {
          controllerToken = null;
          cancelBridgeRequest();
          return false;
        }

        controllerToken = String(response.controllerToken);
        return true;
      } catch {
        controllerToken = null;
        return false;
      } finally {
        controllerClaimPromise = null;
      }
    })();

    return controllerClaimPromise;
  }

  async function verifyControllerOwnership() {
    if (!controllerToken) {
      throw new Error("Не выбран основной iframe стратегии");
    }

    const response = await chrome.runtime.sendMessage({
      type: "VERIFY_STRATEGY_CONTROLLER",
      pageUrl: location.href,
      frameUrl: location.href,
      controllerToken
    });
    if (!response?.ok || !response.owner) {
      controllerToken = null;
      cancelBridgeRequest();
      throw new Error("Управление стратегией передано другому iframe");
    }
    controllerToken = String(response.controllerToken || controllerToken);
  }

  async function releaseControllerOwnership() {
    const token = controllerToken;
    controllerToken = null;
    cancelBridgeRequest();
    if (!token) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "RELEASE_STRATEGY_CONTROLLER",
        pageUrl: location.href,
        frameUrl: location.href,
        controllerToken: token
      });
    } catch {
      // Контекст расширения мог быть уже выгружен.
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
      if (
        state.stage === "waiting" &&
        state.consecutiveLosses >= AUTO_RELOAD_PAUSE_AT &&
        state.consecutiveLosses < SIGNAL_LENGTH
      ) {
        await ensureSignalInterfacePrepared();
      }
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
      state.stage = "waiting-reset";
      state.autoReloadPaused = true;
      state.message =
        `Серия ${streak}/10 уже шла при запуске. ` +
        "Ставки пропущены для безопасности; ждём результат выше 3.48";
      await persistState();
      return;
    }

    await persistState();
    if (streak >= AUTO_RELOAD_PAUSE_AT) {
      await ensureSignalInterfacePrepared();
    }
  }

  async function processRound(round, hasFollowingRound) {
    state.lastProcessedRoundId = round.roundId;
    state.lastMultiplier = round.multiplier;
    state.error = null;

    if (state.stage === "error") {
      return false;
    }

    if (state.stage === "waiting-reset" && !state.awaitingResult) {
      if (round.multiplier > TARGET) {
        state.stage = "waiting";
        state.consecutiveLosses = 0;
        state.autoReloadPaused = false;
        state.message = "Предыдущая серия сброшена. Ожидание нового сигнала: 0/10";
        signalInterfacePrepared = false;
      } else {
        state.consecutiveLosses += 1;
        state.autoReloadPaused = true;
        state.message =
          `Пропускаем уже начавшуюся серию: ${state.consecutiveLosses} результатов ≤ 3.48. ` +
          "Ждём её сброса";
      }
      await persistState();
      return true;
    }

    if (state.awaitingResult) {
      if (round.multiplier > TARGET) {
        const notification = finishProfitableCycle(round.multiplier);
        queueStrategyNotification(
          "profit",
          notification,
          `profit:${round.roundId}:${notification.step}`
        );
        await persistState();
        return true;
      }

      state.cumulativeLoss = roundToCent(
        state.cumulativeLoss + Number(state.activeBet || 0)
      );
      state.awaitingResult = false;
      state.activeBet = null;

      if (settings.stopStep > 0 && state.step >= settings.stopStep) {
        const notification = finishStoppedCycle();
        queueStrategyNotification(
          "stop",
          notification,
          `stop:${round.roundId}:${notification.step}`
        );
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

    if (["preparing", "arming", "betting"].includes(state.stage)) {
      await enterDesynchronizationError(
        "Получен результат до подтверждения размещения ставки"
      );
      return false;
    }

    if (round.multiplier > TARGET) {
      state.consecutiveLosses = 0;
      state.autoReloadPaused = false;
      state.stage = "waiting";
      state.message = "Ожидание сигнала: 0/10";
      signalInterfacePrepared = false;
      await persistState();
      return true;
    }

    state.consecutiveLosses += 1;
    state.autoReloadPaused =
      state.consecutiveLosses >= AUTO_RELOAD_PAUSE_AT;
    state.stage = "waiting";
    state.message = `Ожидание сигнала: ${Math.min(
      state.consecutiveLosses,
      SIGNAL_LENGTH
    )}/${SIGNAL_LENGTH}`;

    if (!hasFollowingRound) {
      maybeQueueSeriesNotificationForRound(round);
    }

    if (state.consecutiveLosses >= SIGNAL_LENGTH) {
      if (hasFollowingRound) {
        state.stage = "waiting-reset";
        state.autoReloadPaused = true;
        state.message =
          "Сигнал 10/10 обнаружен с опозданием после уже прошедшего раунда. " +
          "Ставки пропущены; ждём сброса серии";
        await persistState();
        return true;
      }

      beginBettingCycle();
      await persistState();
      await ensureNextBetPlaced();
      return true;
    }

    await persistState();
    if (
      !hasFollowingRound &&
      state.consecutiveLosses >= AUTO_RELOAD_PAUSE_AT
    ) {
      await ensureSignalInterfacePrepared();
    }
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
    state.signalInterfacePrepared = Boolean(signalInterfacePrepared);
    state.signalPreparationError = null;
    state.message = signalInterfacePrepared
      ? "Сигнал 10/10. Интерфейс готов, размещаем первую ставку"
      : "Сигнал 10/10. Подготовка первой ставки";
  }

  async function ensureSignalInterfacePrepared() {
    if (
      !settings?.enabled ||
      !state ||
      state.awaitingResult ||
      state.consecutiveLosses < AUTO_RELOAD_PAUSE_AT ||
      state.consecutiveLosses >= SIGNAL_LENGTH ||
      signalInterfacePrepared
    ) {
      return;
    }

    if (signalPreparationPromise) {
      return signalPreparationPromise;
    }

    signalPreparationPromise = (async () => {
      state.stage = "preparing";
      state.autoReloadPaused = true;
      state.signalInterfacePrepared = false;
      state.signalPreparationError = null;
      state.message =
        `Серия ${state.consecutiveLosses}/10. ` +
        "Автообновление остановлено, готовим интерфейс к ставке 0.20";
      await persistState();

      try {
        await prepareInterfaceOnly(INITIAL_BET);
        signalInterfacePrepared = true;
        state.signalInterfacePrepared = true;
        state.signalPreparationError = null;
        state.stage = "waiting";
        state.message =
          `Интерфейс готов: ставка 0.20, авто кешаут 3.48. ` +
          `Ожидание сигнала: ${state.consecutiveLosses}/10`;
        await persistState();
      } catch (error) {
        signalInterfacePrepared = false;
        state.signalInterfacePrepared = false;
        state.signalPreparationError =
          error instanceof Error ? error.message : String(error);
        state.stage = "waiting";
        state.autoReloadPaused = true;
        state.message =
          `Не удалось заранее подготовить интерфейс на ${state.consecutiveLosses}/10. ` +
          "Перед ставкой будет выполнена повторная проверка";
        await persistState();
      } finally {
        signalPreparationPromise = null;
      }
    })();

    return signalPreparationPromise;
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
      signalInterfacePrepared = false;
      state.signalInterfacePrepared = false;
      state.signalPreparationError = null;
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
    const completedStep = Math.max(1, Number(state.step || 1));
    const drawdown = roundToCent(state.cumulativeLoss);
    const pnl = Number(
      (activeBet * (TARGET - 1) - state.cumulativeLoss).toFixed(4)
    );
    const notification = {
      step: completedStep,
      drawdown,
      profit: Math.max(0, pnl),
      multiplier: Number(multiplier),
      bet: activeBet
    };

    state.completedCycles += 1;
    state.lastCyclePnl = pnl;
    state.stage = "waiting";
    state.consecutiveLosses = 0;
    state.step = 0;
    state.cumulativeLoss = 0;
    state.nextBet = INITIAL_BET;
    state.activeBet = null;
    state.awaitingResult = false;
    signalInterfacePrepared = false;
    state.signalInterfacePrepared = false;
    state.signalPreparationError = null;
    state.autoReloadPaused = false;
    state.message = `Цикл закрыт: +${pnl.toFixed(2)} при ${multiplier.toFixed(2)}x`;
    return notification;
  }

  function finishStoppedCycle() {
    const completedStep = Math.max(1, Number(state.step || 1));
    const drawdown = roundToCent(state.cumulativeLoss);
    const loss = drawdown;
    const pnl = Number((-loss).toFixed(4));
    const notification = {
      step: completedStep,
      drawdown,
      loss
    };

    state.stoppedCycles += 1;
    state.lastCyclePnl = pnl;
    state.stage = "waiting";
    state.consecutiveLosses = 0;
    state.step = 0;
    state.cumulativeLoss = 0;
    state.nextBet = INITIAL_BET;
    state.activeBet = null;
    state.awaitingResult = false;
    signalInterfacePrepared = false;
    state.signalInterfacePrepared = false;
    state.signalPreparationError = null;
    state.autoReloadPaused = false;
    state.message = `Достигнут стоп. Результат цикла: ${pnl.toFixed(2)}`;
    return notification;
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

  function prepareInterfaceOnly(bet) {
    return requestInterfaceAction("PREPARE", bet);
  }

  function prepareAndPlaceBet(bet) {
    return requestInterfaceAction("PREPARE_AND_BET", bet);
  }

  async function requestInterfaceAction(type, bet) {
    cancelBridgeRequest();
    await verifyControllerOwnership();
    await waitForBridge();
    await verifyControllerOwnership();

    const requestId = createRequestId(
      type === "PREPARE" ? "strategy-prepare" : "strategy-bet"
    );
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (currentBridgeRequest?.requestId === requestId) {
          currentBridgeRequest = null;
        }
        reject(
          new Error(
            type === "PREPARE"
              ? "Предварительная подготовка интерфейса превысила лимит времени"
              : "Подготовка и размещение ставки превысили лимит времени"
          )
        );
      }, ACTION_TIMEOUT_MS);

      currentBridgeRequest = {
        requestId,
        type,
        resolve: (result) => {
          clearTimeout(timeout);
          if (currentBridgeRequest?.requestId === requestId) {
            currentBridgeRequest = null;
          }
          if (!result.ok) {
            reject(new Error(result.error || "Интерфейс не выполнил действие"));
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

      sendInterfaceMessage(type, requestId, {
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
          (event.data?.controllerSource &&
            event.data.controllerSource !== CONTROLLER_SOURCE) ||
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
    if (!settings?.enabled || !state || !controllerToken) {
      return false;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_STRATEGY_STATE",
        pageUrl: location.href,
        frameUrl: location.href,
        controllerToken,
        state
      });

      if (!response?.ok) {
        if (response?.reason === "not-strategy-controller") {
          controllerToken = null;
          cancelBridgeRequest();
        }
        return false;
      }

      if (response.state) {
        state = normalizeState(response.state, state.configSignature);
      }
      return true;
    } catch {
      // После обновления расширения старый content script теряет контекст.
      return false;
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
      signalInterfacePrepared: false,
      signalPreparationError: null,
      lastSeriesNotificationRoundId: null,
      lastNotificationReason: null,
      lastNotificationAt: null,
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
      signalInterfacePrepared: Boolean(source.signalInterfacePrepared),
      signalPreparationError: source.signalPreparationError
        ? String(source.signalPreparationError)
        : null,
      lastSeriesNotificationRoundId: source.lastSeriesNotificationRoundId
        ? String(source.lastSeriesNotificationRoundId)
        : null,
      lastNotificationReason: ["series", "profit", "stop"].includes(
        source.lastNotificationReason
      )
        ? source.lastNotificationReason
        : null,
      lastNotificationAt: source.lastNotificationAt
        ? String(source.lastNotificationAt)
        : null,
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

    return {
      values,
      ids,
      reason: value.reason || null,
      selectorKind: String(value.selectorKind || "unknown"),
      historySize: Math.max(0, Number(value.historySize || values.length))
    };
  }


  function maybeQueueSeriesNotificationForRound(round) {
    if (
      !settings?.telegramConfigured ||
      !settings.notifySeriesEnabled ||
      !round?.roundId
    ) {
      return false;
    }

    const seriesLength = normalizeSeriesLength(settings.notifySeriesLength);
    if (state.consecutiveLosses !== seriesLength) {
      return false;
    }

    if (state.lastSeriesNotificationRoundId === round.roundId) {
      return false;
    }

    state.lastSeriesNotificationRoundId = round.roundId;
    queueStrategyNotification(
      "series",
      {
        seriesLength,
        currentStreak: state.consecutiveLosses
      },
      `series:${round.roundId}:${seriesLength}`
    );
    return true;
  }

  function queueStrategyNotification(reason, payload, notificationKey) {
    if (!settings?.telegramConfigured || !controllerToken) {
      return;
    }

    state.lastNotificationReason = reason;
    state.lastNotificationAt = new Date().toISOString();

    void chrome.runtime
      .sendMessage({
        type: "SEND_STRATEGY_NOTIFICATION",
        pageUrl: location.href,
        frameUrl: location.href,
        controllerToken,
        notificationKey,
        notification: { reason, ...payload }
      })
      .then((response) => {
        if (!response?.ok) {
          console.warn(
            "Aviator Telegram notification failed:",
            response?.error || "unknown error"
          );
        }
      })
      .catch((error) => {
        console.warn("Aviator Telegram notification failed:", error);
      });
  }

  function buildConfigSignature(value) {
    return `${STRATEGY_ID}|${normalizeStopStep(value?.stopStep)}`;
  }

  function normalizeSeriesLength(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? Math.min(SIGNAL_LENGTH, Math.max(1, Math.round(parsed)))
      : 8;
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
