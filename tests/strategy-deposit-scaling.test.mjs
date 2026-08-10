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
