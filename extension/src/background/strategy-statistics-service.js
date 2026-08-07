import { STORAGE_KEYS } from "./constants.js";
import { isKnownStrategyId } from "./strategy-config.js";

const MAX_HISTORY_ITEMS = 1000;
const STATISTICS_VERSION = 1;
let statisticsLock = Promise.resolve();

function withStatisticsLock(operation) {
  const next = statisticsLock.then(operation, operation);
  statisticsLock = next.catch(() => undefined);
  return next;
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((finiteNumber(value) + Number.EPSILON) * factor) / factor;
}

function normalizeIsoTimestamp(value, fallback = null) {
  const parsed = Date.parse(String(value || ""));
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }
  return fallback || new Date().toISOString();
}

function createSessionId(strategyId) {
  const randomPart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${strategyId}-${randomPart}`.slice(0, 120);
}

function normalizeHistoryItem(value) {
  const source = value && typeof value === "object" ? value : {};
  const outcome = source.outcome === "stop" ? "stop" : "profit";
  return {
    eventKey: String(source.eventKey || "").slice(0, 64),
    roundId: source.roundId ? String(source.roundId).slice(0, 160) : null,
    outcome,
    pnl: round(source.pnl),
    step: Math.max(1, Math.round(finiteNumber(source.step, 1))),
    drawdown: Math.max(0, round(source.drawdown, 2)),
    bet:
      source.bet === null || source.bet === undefined
        ? null
        : Math.max(0, round(source.bet, 2)),
    multiplier:
      source.multiplier === null || source.multiplier === undefined
        ? null
        : Math.max(0, round(source.multiplier, 2)),
    occurredAt: normalizeIsoTimestamp(source.occurredAt),
  };
}

function normalizeStatistics(value, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  const strategyId = String(source.strategyId || fallback.strategyId || "");
  if (!isKnownStrategyId(strategyId)) {
    return null;
  }

  const startingDeposit = Math.max(
    0,
    round(source.startingDeposit ?? fallback.startingDeposit ?? 0, 4)
  );
  const history = Array.isArray(source.history)
    ? source.history
        .map(normalizeHistoryItem)
        .filter((item) => item.eventKey)
        .slice(-MAX_HISTORY_ITEMS)
    : [];

  return {
    version: STATISTICS_VERSION,
    sessionId: String(
      source.sessionId || fallback.sessionId || createSessionId(strategyId)
    ).slice(0, 120),
    strategyId,
    strategyName: String(
      source.strategyName || fallback.strategyName || strategyId
    ).slice(0, 80),
    startedAt: normalizeIsoTimestamp(
      source.startedAt,
      fallback.startedAt || new Date().toISOString()
    ),
    startingDeposit,
    totalPnl: round(source.totalPnl ?? fallback.totalPnl ?? 0),
    completedCycles: Math.max(
      0,
      Math.round(finiteNumber(source.completedCycles ?? fallback.completedCycles))
    ),
    stoppedCycles: Math.max(
      0,
      Math.round(finiteNumber(source.stoppedCycles ?? fallback.stoppedCycles))
    ),
    history,
    lastEventKey:
      source.lastEventKey || history.at(-1)?.eventKey
        ? String(source.lastEventKey || history.at(-1)?.eventKey).slice(0, 64)
        : null,
    updatedAt: normalizeIsoTimestamp(
      source.updatedAt,
      fallback.updatedAt || new Date().toISOString()
    ),
  };
}

async function readAllUnlocked() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.strategyStatistics);
  const source =
    stored[STORAGE_KEYS.strategyStatistics] &&
    typeof stored[STORAGE_KEYS.strategyStatistics] === "object"
      ? stored[STORAGE_KEYS.strategyStatistics]
      : {};
  const normalized = {};
  for (const [strategyId, value] of Object.entries(source)) {
    const statistics = normalizeStatistics(value, { strategyId });
    if (statistics) {
      normalized[strategyId] = statistics;
    }
  }
  return normalized;
}

async function writeAllUnlocked(value) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.strategyStatistics]: value,
  });
}

export async function getAllStrategyStatistics() {
  return withStatisticsLock(() => readAllUnlocked());
}

export async function ensureStrategyStatistics({
  strategyId,
  strategyName,
  startingDeposit,
  startedAt = null,
  legacyTotalPnl = 0,
  legacyCompletedCycles = 0,
  legacyStoppedCycles = 0,
} = {}) {
  return withStatisticsLock(async () => {
    if (!isKnownStrategyId(strategyId)) {
      throw new Error("Неизвестная стратегия статистики");
    }

    const all = await readAllUnlocked();
    if (all[strategyId]) {
      return all[strategyId];
    }

    const statistics = normalizeStatistics(null, {
      strategyId,
      strategyName,
      startingDeposit,
      startedAt: normalizeIsoTimestamp(startedAt),
      totalPnl: legacyTotalPnl,
      completedCycles: legacyCompletedCycles,
      stoppedCycles: legacyStoppedCycles,
    });
    all[strategyId] = statistics;
    await writeAllUnlocked(all);
    return statistics;
  });
}

export async function recordStrategyCycle({
  strategyId,
  strategyName,
  startingDeposit,
  eventKey,
  roundId = null,
  outcome,
  pnl,
  step,
  drawdown = 0,
  bet = null,
  multiplier = null,
  occurredAt = null,
} = {}) {
  return withStatisticsLock(async () => {
    if (!isKnownStrategyId(strategyId)) {
      throw new Error("Неизвестная стратегия статистики");
    }
    if (!eventKey) {
      throw new Error("Для цикла не указан eventKey");
    }

    const all = await readAllUnlocked();
    let statistics = all[strategyId];
    if (!statistics) {
      statistics = normalizeStatistics(null, {
        strategyId,
        strategyName,
        startingDeposit,
      });
    }

    const normalizedEventKey = String(eventKey).slice(0, 64);
    const duplicate = statistics.history.some(
      (item) => item.eventKey === normalizedEventKey
    );
    if (duplicate) {
      return { statistics, duplicate: true };
    }

    const item = normalizeHistoryItem({
      eventKey: normalizedEventKey,
      roundId,
      outcome,
      pnl,
      step,
      drawdown,
      bet,
      multiplier,
      occurredAt,
    });

    statistics = {
      ...statistics,
      strategyName: String(strategyName || statistics.strategyName).slice(0, 80),
      totalPnl: round(statistics.totalPnl + item.pnl),
      completedCycles:
        statistics.completedCycles + (item.outcome === "profit" ? 1 : 0),
      stoppedCycles:
        statistics.stoppedCycles + (item.outcome === "stop" ? 1 : 0),
      history: [...statistics.history, item].slice(-MAX_HISTORY_ITEMS),
      lastEventKey: item.eventKey,
      updatedAt: new Date().toISOString(),
    };

    all[strategyId] = statistics;
    await writeAllUnlocked(all);
    return { statistics, duplicate: false };
  });
}

export async function resetStrategyStatistics({
  strategyId,
  strategyName,
  startingDeposit,
} = {}) {
  return withStatisticsLock(async () => {
    if (!isKnownStrategyId(strategyId)) {
      throw new Error("Неизвестная стратегия статистики");
    }

    const all = await readAllUnlocked();
    const statistics = normalizeStatistics(null, {
      strategyId,
      strategyName,
      startingDeposit,
      startedAt: new Date().toISOString(),
      totalPnl: 0,
      completedCycles: 0,
      stoppedCycles: 0,
      sessionId: createSessionId(strategyId),
    });
    all[strategyId] = statistics;
    await writeAllUnlocked(all);
    return statistics;
  });
}
