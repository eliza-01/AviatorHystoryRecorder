import assert from "node:assert/strict";

const storage = {};
globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        if (Array.isArray(key)) {
          return Object.fromEntries(key.map((item) => [item, storage[item]]));
        }
        return { [key]: storage[key] };
      },
      async set(values) {
        Object.assign(storage, structuredClone(values));
      }
    }
  }
};

const {
  ensureStrategyStatistics,
  getAllStrategyStatistics,
  recordStrategyCycle,
  resetStrategyStatistics
} = await import("../extension/src/background/strategy-statistics-service.js");

const first = await ensureStrategyStatistics({
  strategyId: "fifteen-plus-x512",
  strategyName: "15+ - x5.12",
  startingDeposit: 14,
  startedAt: "2026-08-07T10:00:00.000Z",
  legacyTotalPnl: 1.4,
  legacyCompletedCycles: 7,
  legacyStoppedCycles: 1
});
assert.equal(first.totalPnl, 1.4);
assert.equal(first.completedCycles, 7);
assert.equal(first.stoppedCycles, 1);

const profit = await recordStrategyCycle({
  strategyId: "fifteen-plus-x512",
  strategyName: "15+ - x5.12",
  startingDeposit: 14,
  eventKey: "a".repeat(64),
  roundId: "round-profit",
  outcome: "profit",
  pnl: 0.824,
  step: 1,
  drawdown: 0,
  bet: 0.2,
  multiplier: 6.2,
  occurredAt: "2026-08-07T11:00:00.000Z"
});
assert.equal(profit.statistics.totalPnl, 2.224);
assert.equal(profit.statistics.completedCycles, 8);

const duplicate = await recordStrategyCycle({
  strategyId: "fifteen-plus-x512",
  strategyName: "15+ - x5.12",
  startingDeposit: 14,
  eventKey: "a".repeat(64),
  roundId: "round-profit",
  outcome: "profit",
  pnl: 0.824,
  step: 1
});
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.statistics.totalPnl, 2.224);

const stop = await recordStrategyCycle({
  strategyId: "fifteen-plus-x512",
  strategyName: "15+ - x5.12",
  startingDeposit: 14,
  eventKey: "b".repeat(64),
  roundId: "round-stop",
  outcome: "stop",
  pnl: -13.7,
  step: 16,
  drawdown: 13.7,
  occurredAt: "2026-08-07T12:00:00.000Z"
});
assert.equal(stop.statistics.totalPnl, -11.476);
assert.equal(stop.statistics.stoppedCycles, 2);

const afterRestart = await getAllStrategyStatistics();
assert.equal(afterRestart["fifteen-plus-x512"].totalPnl, -11.476);
assert.equal(afterRestart["fifteen-plus-x512"].history.length, 2);

const previousSessionId = afterRestart["fifteen-plus-x512"].sessionId;
const reset = await resetStrategyStatistics({
  strategyId: "fifteen-plus-x512",
  strategyName: "15+ - x5.12",
  startingDeposit: 28
});
assert.notEqual(reset.sessionId, previousSessionId);
assert.equal(reset.startingDeposit, 28);
assert.equal(reset.totalPnl, 0);
assert.equal(reset.history.length, 0);

console.log("strategy statistics persistence tests passed");
