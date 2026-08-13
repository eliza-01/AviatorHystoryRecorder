import assert from "node:assert/strict";

import {
  STRATEGY_DEFINITIONS,
  STRATEGY_IDS,
  calculateDepositScaledInitialBet,
  calculateFullStopLoss,
  calculateStrategyProgression,
  getActiveStrategyConfig
} from "../extension/src/background/strategy-config.js";

const definition = STRATEGY_DEFINITIONS[STRATEGY_IDS.twentyPlusX512];
assert.equal(definition.signalLength, 20);
assert.equal(definition.fixedStopStep, 11);
assert.equal(definition.minimumDeposit, 13.41);
assert.equal(definition.stopReserveMultiplier, 3);

const minimumBet = calculateDepositScaledInitialBet(definition, 13.41);
assert.equal(minimumBet, 0.20);
assert.equal(
  calculateFullStopLoss(definition.target, definition.fixedStopStep, minimumBet),
  4.47
);

const minimumProgression = calculateStrategyProgression(
  definition.target,
  definition.fixedStopStep,
  minimumBet
);
assert.deepEqual(
  minimumProgression.map((item) => item.bet),
  [0.20, 0.20, 0.20, 0.20, 0.25, 0.31, 0.38, 0.48, 0.59, 0.74, 0.92]
);
assert.ok(
  minimumProgression.every((item) => item.profitOnWin >= 0.20 - 1e-9),
  "each winning step must recover prior losses and earn at least the initial bet"
);

const scaledBet = calculateDepositScaledInitialBet(definition, 20);
assert.equal(scaledBet, 0.30);
const scaledStop = calculateFullStopLoss(
  definition.target,
  definition.fixedStopStep,
  scaledBet
);
assert.equal(scaledStop, 6.64);
assert.ok(scaledStop * 3 <= 20 + 1e-9);
const nextCentStop = calculateFullStopLoss(
  definition.target,
  definition.fixedStopStep,
  scaledBet + 0.01
);
assert.ok(nextCentStop * 3 > 20 + 1e-9);

const runtime = getActiveStrategyConfig({
  strategyTwentyPlusX512Enabled: true,
  strategyTwentyPlusX512StartingDeposit: 20,
  strategyTwentyPlusX512NotifySeriesEnabled: false,
  strategyTwentyPlusX512NotifySeriesLength: 18
});
assert.equal(runtime.id, "twenty-plus-x512");
assert.equal(runtime.initialBet, 0.30);
assert.equal(runtime.startingDeposit, 20);
assert.equal(runtime.stopStep, 11);
assert.equal(runtime.reinvestmentEnabled, false);

console.log("strategy deposit scaling tests passed");


const x1436Definition = STRATEGY_DEFINITIONS[STRATEGY_IDS.fortyThreePlusX1436];
assert.equal(x1436Definition.target, 14.36);
assert.equal(x1436Definition.signalLength, 43);
assert.equal(x1436Definition.fixedStopStep, 18);
assert.equal(x1436Definition.minimumDeposit, 25);

const x1436MinimumBet = calculateDepositScaledInitialBet(x1436Definition, 25);
assert.equal(x1436MinimumBet, 0.20);
assert.equal(
  calculateFullStopLoss(
    x1436Definition.target,
    x1436Definition.fixedStopStep,
    x1436MinimumBet
  ),
  3.85
);

for (const [deposit, expectedBet] of [[30, 0.24], [50, 0.40], [100, 0.80]]) {
  const bet = calculateDepositScaledInitialBet(x1436Definition, deposit);
  assert.equal(bet, expectedBet);
  const stopLoss = calculateFullStopLoss(
    x1436Definition.target,
    x1436Definition.fixedStopStep,
    bet
  );
  const stopBudget = deposit / x1436Definition.stopReserveMultiplier;
  assert.ok(stopLoss <= stopBudget + 1e-9);
  const nextCentStop = calculateFullStopLoss(
    x1436Definition.target,
    x1436Definition.fixedStopStep,
    bet + 0.01
  );
  assert.ok(nextCentStop > stopBudget + 1e-9);
}

const x1436Runtime = getActiveStrategyConfig({
  strategyFortyThreePlusX1436Enabled: true,
  strategyFortyThreePlusX1436StartingDeposit: 50,
  strategyFortyThreePlusX1436NotifySeriesEnabled: false,
  strategyFortyThreePlusX1436NotifySeriesLength: 41
});
assert.equal(x1436Runtime.id, "forty-three-plus-x1436");
assert.equal(x1436Runtime.initialBet, 0.40);
assert.equal(x1436Runtime.startingDeposit, 50);
assert.equal(x1436Runtime.stopStep, 18);
assert.equal(x1436Runtime.reinvestmentEnabled, false);
