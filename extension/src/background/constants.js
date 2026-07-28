export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  diagnosticsEnabled: false,
  apiBaseUrl: "http://localhost:8010",
  pageAutoReloadEnabled: false,
  pageAutoReloadSeconds: 60,
  preparationEnabled: false,
  preparationBet: 1,
  preparationCashout: 2
});

export const STORAGE_KEYS = Object.freeze({
  settings: "settings",
  resultQueue: "resultQueue",
  sampleQueue: "sampleQueue",
  stats: "stats",
  collectorFrames: "collectorFrames",
  preparationFrames: "preparationFrames"
});

export const MAX_RESULT_QUEUE_SIZE = 5000;
export const MAX_SAMPLE_QUEUE_SIZE = 1000;
export const RESULT_BATCH_SIZE = 200;
export const SAMPLE_BATCH_SIZE = 100;
