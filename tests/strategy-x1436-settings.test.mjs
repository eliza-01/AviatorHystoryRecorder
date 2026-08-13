import assert from "node:assert/strict";

let storedSettings = {
  strategyTenPlusX340Enabled: true,
  strategyFifteenPlusX512Enabled: true,
  strategyTwentyPlusX512Enabled: true,
  strategyFortyThreePlusX1436Enabled: true,
  strategyFortyThreePlusX1436StartingDeposit: 24,
  strategyFortyThreePlusX1436NotifySeriesEnabled: true,
  strategyFortyThreePlusX1436NotifySeriesLength: 99
};

globalThis.chrome = {
  storage: {
    local: {
      async get() {
        return { settings: storedSettings };
      },
      async set(value) {
        storedSettings = value.settings;
      }
    }
  }
};

const { getSettings, saveSettings } = await import(
  "../extension/src/background/settings-service.js"
);
const { getActiveStrategyConfig } = await import(
  "../extension/src/background/strategy-config.js"
);

const sanitized = await getSettings();
assert.equal(sanitized.strategyFortyThreePlusX1436Enabled, true);
assert.equal(sanitized.strategyTwentyPlusX512Enabled, false);
assert.equal(sanitized.strategyFifteenPlusX512Enabled, false);
assert.equal(sanitized.strategyTenPlusX340Enabled, false);
assert.equal(sanitized.strategyFortyThreePlusX1436StartingDeposit, 25);
assert.equal(sanitized.strategyFortyThreePlusX1436NotifySeriesLength, 43);

const active = getActiveStrategyConfig(sanitized);
assert.equal(active.id, "forty-three-plus-x1436");
assert.equal(active.target, 14.36);
assert.equal(active.signalLength, 43);
assert.equal(active.pauseAt, 41);
assert.equal(active.stopStep, 18);
assert.equal(active.startingDeposit, 25);
assert.equal(active.initialBet, 0.20);

const saved = await saveSettings({
  strategyFortyThreePlusX1436StartingDeposit: 50
});
assert.equal(saved.strategyFortyThreePlusX1436StartingDeposit, 50);
assert.equal(getActiveStrategyConfig(saved).initialBet, 0.40);

console.log("strategy x14.36 settings tests passed");
