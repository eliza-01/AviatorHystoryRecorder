import {
  MAX_RESULT_QUEUE_SIZE,
  MAX_SAMPLE_QUEUE_SIZE,
  STORAGE_KEYS
} from "./constants.js";

let queueLock = Promise.resolve();

function withQueueLock(operation) {
  const next = queueLock.then(operation, operation);
  queueLock = next.catch(() => undefined);
  return next;
}

async function append(storageKey, values, maxSize) {
  return withQueueLock(async () => {
    const stored = await chrome.storage.local.get(storageKey);
    const current = Array.isArray(stored[storageKey]) ? stored[storageKey] : [];
    const next = [...current, ...values].slice(-maxSize);
    await chrome.storage.local.set({ [storageKey]: next });
    return next.length;
  });
}

async function take(storageKey, limit) {
  return withQueueLock(async () => {
    const stored = await chrome.storage.local.get(storageKey);
    const current = Array.isArray(stored[storageKey]) ? stored[storageKey] : [];
    return current.slice(0, limit);
  });
}

async function removeFirst(storageKey, count) {
  return withQueueLock(async () => {
    const stored = await chrome.storage.local.get(storageKey);
    const current = Array.isArray(stored[storageKey]) ? stored[storageKey] : [];
    const next = current.slice(count);
    await chrome.storage.local.set({ [storageKey]: next });
    return next.length;
  });
}

export function enqueueResults(values) {
  return append(STORAGE_KEYS.resultQueue, values, MAX_RESULT_QUEUE_SIZE);
}

export function enqueueSamples(values) {
  return append(STORAGE_KEYS.sampleQueue, values, MAX_SAMPLE_QUEUE_SIZE);
}

export function takeResults(limit) {
  return take(STORAGE_KEYS.resultQueue, limit);
}

export function takeSamples(limit) {
  return take(STORAGE_KEYS.sampleQueue, limit);
}

export function removeResults(count) {
  return removeFirst(STORAGE_KEYS.resultQueue, count);
}

export function removeSamples(count) {
  return removeFirst(STORAGE_KEYS.sampleQueue, count);
}

export async function getQueueSizes() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.resultQueue,
    STORAGE_KEYS.sampleQueue
  ]);
  return {
    resultQueueSize: Array.isArray(stored[STORAGE_KEYS.resultQueue])
      ? stored[STORAGE_KEYS.resultQueue].length
      : 0,
    sampleQueueSize: Array.isArray(stored[STORAGE_KEYS.sampleQueue])
      ? stored[STORAGE_KEYS.sampleQueue].length
      : 0
  };
}
