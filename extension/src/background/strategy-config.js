export const STRATEGY_IDS = Object.freeze({
  tenPlusX340: "ten-plus-x340",
  fifteenPlusX512: "fifteen-plus-x512"
});

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
  })
});

export function getActiveStrategyConfig(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const x512 = STRATEGY_DEFINITIONS[STRATEGY_IDS.fifteenPlusX512];
  const x340 = STRATEGY_DEFINITIONS[STRATEGY_IDS.tenPlusX340];

  // Если из старого/ручного хранилища пришли два включённых тумблера,
  // приоритет получает новая стратегия. sanitizeSettings также устраняет конфликт.
  if (source[x512.enabledKey]) {
    return buildRuntimeConfig(x512, source);
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

function buildRuntimeConfig(definition, settings) {
  const stopStep = definition.fixedStopStep ?? Number(
    settings[definition.stopStepKey] || 0
  );
  const startingDeposit = definition.startingDepositKey
    ? Number(settings[definition.startingDepositKey] || definition.minimumDeposit)
    : null;

  return {
    id: definition.id,
    name: definition.name,
    target: definition.target,
    signalLength: definition.signalLength,
    pauseAt: definition.pauseAt,
    initialBet: definition.initialBet,
    stopStep,
    minimumDeposit: definition.minimumDeposit ?? null,
    startingDeposit,
    reinvestmentEnabled: Boolean(
      settings[definition.reinvestmentEnabledKey]
    ),
    notifySeriesEnabled: Boolean(
      settings[definition.notifySeriesEnabledKey]
    ),
    notifySeriesLength: Number(
      settings[definition.notifySeriesLengthKey] || definition.pauseAt
    )
  };
}
