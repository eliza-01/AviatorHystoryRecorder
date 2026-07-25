import { STORAGE_KEYS } from "./constants.js";

const DEFAULT_STATS = Object.freeze({
  acceptedResults: 0,
  duplicateResults: 0,
  acceptedSamples: 0,
  lastResultAt: null,
  lastFlushAt: null,
  lastError: null
});

export async function getStats() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.stats);
  return {
    ...DEFAULT_STATS,
    ...(stored[STORAGE_KEYS.stats] || {})
  };
}

export async function updateStats(partial) {
  const current = await getStats();
  const next = {
    ...current,
    ...partial
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.stats]: next });
  return next;
}
