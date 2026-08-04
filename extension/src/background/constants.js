export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  diagnosticsEnabled: false,
  apiBaseUrl: "http://localhost:8010",
  pageAutoReloadEnabled: false,
  pageAutoReloadSeconds: 60,
  badgeOffsetTopPx: 10,
  badgeOffsetLeftPx: 10,
  badgeOpacityPercent: 100,
  preparationEnabled: false,
  preparationBet: 1,
  preparationCashout: 2,
  telegramChatId: "",
  strategyTenPlusX340Enabled: false,
  strategyTenPlusX340StopStep: 12,
  strategyTenPlusX340ReinvestmentEnabled: false,
  strategyTenPlusX340NotifySeriesEnabled: false,
  strategyTenPlusX340NotifySeriesLength: 8,
  strategyFifteenPlusX512Enabled: false,
  strategyFifteenPlusX512ReinvestmentEnabled: false,
  strategyFifteenPlusX512StartingDeposit: 14,
  strategyFifteenPlusX512NotifySeriesEnabled: false,
  strategyFifteenPlusX512NotifySeriesLength: 13
});

export const STORAGE_KEYS = Object.freeze({
  settings: "settings",
  resultQueue: "resultQueue",
  sampleQueue: "sampleQueue",
  stats: "stats",
  collectorFrames: "collectorFrames",
  preparationFrames: "preparationFrames",
  strategyStates: "strategyStates",
  strategyControllers: "strategyControllers",
  telegramStatus: "telegramStatus"
});

export const MAX_RESULT_QUEUE_SIZE = 5000;
export const MAX_SAMPLE_QUEUE_SIZE = 1000;
export const RESULT_BATCH_SIZE = 200;
export const SAMPLE_BATCH_SIZE = 100;
