export const STRATEGY_IDS = Object.freeze({
  tenPlusX340: "ten-plus-x340",
  fifteenPlusX512: "fifteen-plus-x512",
  twentyPlusX512: "twenty-plus-x512",
  fortyThreePlusX1436: "forty-three-plus-x1436"
});

export const STRATEGY_BET_STEP = 0.01;
export const STOP_RESERVE_MULTIPLIER = 3;
export const X1436_MINIMUM_DEPOSIT = 25;
export const X1436_BASE_FULL_STOP = 3.85;
export const X1436_STOP_RESERVE_MULTIPLIER =
  X1436_MINIMUM_DEPOSIT / X1436_BASE_FULL_STOP;

export const STRATEGY_DEFINITIONS = Object.freeze({
  [STRATEGY_IDS.tenPlusX340]: Object.freeze({
    id: STRATEGY_IDS.tenPlusX340,
    name: "10+ - x3.40",
    target: 3.40,
    signalLength: 10,
    pauseAt: 8,
    initialBet: 0.20,
    enabledKey: "strategyTenPlusX340Enabled",
    stopStepKey: "strategyTenPlusX340StopStep",
    reinvestmentEnabledKey: "strategyTenPlusX340ReinvestmentEnabled",
    notifySeriesEnabledKey: "strategyTenPlusX340NotifySeriesEnabled",
    notifySeriesLengthKey: "strategyTenPlusX340NotifySeriesLength"
  }),
  [STRATEGY_IDS.fifteenPlusX512]: Object.freeze({
    id: STRATEGY_IDS.fifteenPlusX512,
    name: "15+ - x5.12",
    target: 5.12,
    signalLength: 15,
    pauseAt: 13,
    initialBet: 0.20,
    fixedStopStep: 16,
    minimumDeposit: 14,
    enabledKey: "strategyFifteenPlusX512Enabled",
    reinvestmentEnabledKey: "strategyFifteenPlusX512ReinvestmentEnabled",
    startingDepositKey: "strategyFifteenPlusX512StartingDeposit",
    notifySeriesEnabledKey: "strategyFifteenPlusX512NotifySeriesEnabled",
    notifySeriesLengthKey: "strategyFifteenPlusX512NotifySeriesLength"
  }),
  [STRATEGY_IDS.twentyPlusX512]: Object.freeze({
    id: STRATEGY_IDS.twentyPlusX512,
    name: "20+ - x5.12",
    target: 5.12,
    signalLength: 20,
    pauseAt: 18,
    initialBet: 0.20,
    fixedStopStep: 11,
    minimumDeposit: 13.41,
    stopReserveMultiplier: STOP_RESERVE_MULTIPLIER,
    depositScaledInitialBet: true,
    enabledKey: "strategyTwentyPlusX512Enabled",
    startingDepositKey: "strategyTwentyPlusX512StartingDeposit",
    notifySeriesEnabledKey: "strategyTwentyPlusX512NotifySeriesEnabled",
    notifySeriesLengthKey: "strategyTwentyPlusX512NotifySeriesLength"
  }),
  [STRATEGY_IDS.fortyThreePlusX1436]: Object.freeze({
    id: STRATEGY_IDS.fortyThreePlusX1436,
    name: "43+ - x14.36",
    target: 14.36,
    signalLength: 43,
    pauseAt: 41,
    initialBet: 0.20,
    fixedStopStep: 18,
    minimumDeposit: X1436_MINIMUM_DEPOSIT,
    stopReserveMultiplier: X1436_STOP_RESERVE_MULTIPLIER,
    depositScaledInitialBet: true,
    enabledKey: "strategyFortyThreePlusX1436Enabled",
    startingDepositKey: "strategyFortyThreePlusX1436StartingDeposit",
    notifySeriesEnabledKey: "strategyFortyThreePlusX1436NotifySeriesEnabled",
    notifySeriesLengthKey: "strategyFortyThreePlusX1436NotifySeriesLength"
  })
});

export function getActiveStrategyConfig(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const x1436FortyThree = STRATEGY_DEFINITIONS[STRATEGY_IDS.fortyThreePlusX1436];
  const x512Twenty = STRATEGY_DEFINITIONS[STRATEGY_IDS.twentyPlusX512];
  const x512Fifteen = STRATEGY_DEFINITIONS[STRATEGY_IDS.fifteenPlusX512];
  const x340 = STRATEGY_DEFINITIONS[STRATEGY_IDS.tenPlusX340];

  // sanitizeSettings устраняет конфликт. При старом/ручном хранилище
  // приоритет получает самая новая стратегия.
  if (source[x1436FortyThree.enabledKey]) {
    return buildRuntimeConfig(x1436FortyThree, source);
  }
  if (source[x512Twenty.enabledKey]) {
    return buildRuntimeConfig(x512Twenty, source);
  }
  if (source[x512Fifteen.enabledKey]) {
    return buildRuntimeConfig(x512Fifteen, source);
  }
  if (source[x340.enabledKey]) {
    return buildRuntimeConfig(x340, source);
  }
  return null;
}

export function isKnownStrategyId(value) {
  return Object.prototype.hasOwnProperty.call(
    STRATEGY_DEFINITIONS,
    String(value || "")
  );
}

export function calculateStrategyProgression(
  target,
  stopStep,
  initialBet,
  betStep = STRATEGY_BET_STEP
) {
  const normalizedTarget = Number(target);
  const normalizedStop = Math.max(0, Math.round(Number(stopStep) || 0));
  const normalizedInitialBet = roundToCent(Math.max(betStep, Number(initialBet) || 0));
  if (normalizedTarget <= 1 || normalizedStop <= 0 || normalizedInitialBet <= 0) {
    return [];
  }

  const progression = [];
  let cumulativeLoss = 0;
  let bet = normalizedInitialBet;

  for (let step = 1; step <= normalizedStop; step += 1) {
    const lossBeforeStep = cumulativeLoss;
    const profitOnWin = roundToFour(
      bet * (normalizedTarget - 1) - lossBeforeStep
    );
    cumulativeLoss = roundToCent(cumulativeLoss + bet);
    progression.push({
      step,
      bet,
      cumulativeLoss,
      profitOnWin
    });

    if (step < normalizedStop) {
      const raw = (cumulativeLoss + normalizedInitialBet) / (normalizedTarget - 1);
      bet = Math.max(
        normalizedInitialBet,
        ceilToStep(raw, betStep)
      );
    }
  }

  return progression;
}

export function calculateFullStopLoss(target, stopStep, initialBet) {
  const progression = calculateStrategyProgression(target, stopStep, initialBet);
  return progression.length > 0
    ? progression.at(-1).cumulativeLoss
    : 0;
}

export function calculateDepositScaledInitialBet(definition, startingDeposit) {
  const source = definition && typeof definition === "object" ? definition : {};
  const minimumInitialBet = roundToCent(Math.max(STRATEGY_BET_STEP, Number(source.initialBet) || 0.20));
  if (!source.depositScaledInitialBet) {
    return minimumInitialBet;
  }

  const deposit = Math.max(0, Number(startingDeposit) || 0);
  const reserveMultiplier = Math.max(1, Number(source.stopReserveMultiplier) || STOP_RESERVE_MULTIPLIER);
  const stopBudget = deposit / reserveMultiplier;
  const minimumStopLoss = calculateFullStopLoss(
    source.target,
    source.fixedStopStep,
    minimumInitialBet
  );
  if (stopBudget + 1e-9 < minimumStopLoss) {
    return minimumInitialBet;
  }

  const minimumCents = Math.round(minimumInitialBet * 100);
  let low = minimumCents;
  let high = Math.max(minimumCents, Math.floor((stopBudget + 1e-9) * 100));
  let best = minimumCents;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = mid / 100;
    const stopLoss = calculateFullStopLoss(
      source.target,
      source.fixedStopStep,
      candidate
    );
    if (stopLoss <= stopBudget + 1e-9) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best / 100;
}

function buildRuntimeConfig(definition, settings) {
  const stopStep = definition.fixedStopStep ?? Number(
    settings[definition.stopStepKey] || 0
  );
  const startingDeposit = definition.startingDepositKey
    ? Number(settings[definition.startingDepositKey] || definition.minimumDeposit)
    : null;
  const initialBet = calculateDepositScaledInitialBet(
    definition,
    startingDeposit
  );

  return {
    id: definition.id,
    name: definition.name,
    target: definition.target,
    signalLength: definition.signalLength,
    pauseAt: definition.pauseAt,
    initialBet,
    stopStep,
    minimumDeposit: definition.minimumDeposit ?? null,
    startingDeposit,
    stopReserveMultiplier: definition.stopReserveMultiplier ?? null,
    reinvestmentEnabled: definition.reinvestmentEnabledKey
      ? Boolean(settings[definition.reinvestmentEnabledKey])
      : false,
    notifySeriesEnabled: Boolean(
      settings[definition.notifySeriesEnabledKey]
    ),
    notifySeriesLength: Number(
      settings[definition.notifySeriesLengthKey] || definition.pauseAt
    )
  };
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
