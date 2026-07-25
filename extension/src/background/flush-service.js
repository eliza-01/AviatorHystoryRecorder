import {
  RESULT_BATCH_SIZE,
  SAMPLE_BATCH_SIZE
} from "./constants.js";
import { sendResultBatch, sendSampleBatch } from "./api-client.js";
import {
  removeResults,
  removeSamples,
  takeResults,
  takeSamples
} from "./queue-service.js";
import { updateStats } from "./stats-service.js";

let flushPromise = null;

export function flushQueues() {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = doFlush().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

async function doFlush() {
  try {
    const resultBatch = await takeResults(RESULT_BATCH_SIZE);
    if (resultBatch.length > 0) {
      const response = await sendResultBatch(resultBatch);
      await removeResults(resultBatch.length);
      await updateStats({
        acceptedResults: await incrementStat("acceptedResults", response.accepted),
        duplicateResults: await incrementStat(
          "duplicateResults",
          response.duplicates
        ),
        lastResultAt: new Date().toISOString(),
        lastError: null
      });
    }

    const sampleBatch = await takeSamples(SAMPLE_BATCH_SIZE);
    if (sampleBatch.length > 0) {
      const response = await sendSampleBatch(sampleBatch);
      await removeSamples(sampleBatch.length);
      await updateStats({
        acceptedSamples: await incrementStat("acceptedSamples", response.accepted),
        lastError: null
      });
    }

    await updateStats({
      lastFlushAt: new Date().toISOString(),
      lastError: null
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStats({ lastError: message });
    return { ok: false, error: message };
  }
}

async function incrementStat(name, delta) {
  const stored = await chrome.storage.local.get("stats");
  const current = Number(stored.stats?.[name] || 0);
  return current + Number(delta || 0);
}
