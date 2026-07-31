const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('extension/src/content/strategy-script.js', 'utf8');

function delay(ms = 25) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeSnapshot(lossCount, prefix = 'r') {
  const values = [];
  const ids = [];
  for (let n = lossCount; n >= 1; n -= 1) {
    values.push(1.5);
    ids.push(`${prefix}${n}`);
  }
  values.push(5.0);
  ids.push(`${prefix}0`);
  return {
    values,
    ids,
    reason: 'prepend',
    selectorKind: 'stats-payouts-wrapper',
    historySize: values.length
  };
}

async function createRuntime({ initialState = null, owner = true, notifyLength = 8 } = {}) {
  const listeners = new Map();
  const storageChangeListeners = [];
  const actions = [];
  const notifications = [];
  let savedState = initialState;
  const runtimeSettings = {
    enabled: true,
    stopStep: 13,
    telegramConfigured: true,
    notifySeriesEnabled: true,
    notifySeriesLength: notifyLength
  };

  const window = {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((item) => item !== listener));
    },
    postMessage(message) {
      if (message.channel !== 'aviator-preparation-v2') return;
      if (message.type === 'PING') {
        queueMicrotask(() => emit('message', {
          source: window,
          data: {
            channel: 'aviator-preparation-v2',
            source: 'aviator-preparation-page-bridge',
            controllerSource: 'aviator-strategy-controller',
            type: 'BRIDGE_READY',
            requestId: message.requestId
          }
        }));
        return;
      }
      if (message.type === 'CANCEL') return;
      if (message.type === 'PREPARE' || message.type === 'PREPARE_AND_BET') {
        actions.push({ type: message.type, settings: message.settings });
        queueMicrotask(() => emit('message', {
          source: window,
          data: {
            channel: 'aviator-preparation-v2',
            source: 'aviator-preparation-page-bridge',
            controllerSource: 'aviator-strategy-controller',
            type: 'PREPARE_RESULT',
            requestId: message.requestId,
            ok: true
          }
        }));
      }
    }
  };

  function emit(type, event) {
    for (const listener of listeners.get(type) || []) listener(event);
  }

  const chrome = {
    storage: {
      onChanged: {
        addListener(listener) {
          storageChangeListeners.push(listener);
        }
      }
    },
    runtime: {
      async sendMessage(message) {
        switch (message.type) {
          case 'GET_CAPTURE_STATE':
            return {
              ok: true,
              strategyTenPlusX348Enabled: runtimeSettings.enabled,
              strategyTenPlusX348StopStep: runtimeSettings.stopStep,
              telegramConfigured: runtimeSettings.telegramConfigured,
              strategyTenPlusX348NotifySeriesEnabled: runtimeSettings.notifySeriesEnabled,
              strategyTenPlusX348NotifySeriesLength: runtimeSettings.notifySeriesLength,
              strategyState: savedState
            };
          case 'CLAIM_STRATEGY_CONTROLLER':
            return owner
              ? { ok: true, owner: true, controllerToken: 'owner-token' }
              : { ok: true, owner: false };
          case 'VERIFY_STRATEGY_CONTROLLER':
            return owner
              ? { ok: true, owner: true, controllerToken: 'owner-token' }
              : { ok: true, owner: false };
          case 'SAVE_STRATEGY_STATE':
            assert.strictEqual(message.controllerToken, 'owner-token');
            savedState = JSON.parse(JSON.stringify(message.state));
            return { ok: true, state: savedState };
          case 'SEND_STRATEGY_NOTIFICATION':
            notifications.push(message);
            return { ok: true };
          case 'RELEASE_STRATEGY_CONTROLLER':
            return { ok: true, released: true };
          default:
            throw new Error(`Unexpected message: ${message.type}`);
        }
      }
    }
  };

  const context = {
    window,
    chrome,
    location: { hostname: 'demo.spribegaming.com', href: 'https://demo.spribegaming.com/game' },
    document: {
      querySelector(selector) {
        return selector.includes('app-bet-controls') ? {} : null;
      }
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Promise,
    Error
  };

  vm.runInNewContext(source, context, { filename: 'strategy-script.js' });
  await delay();

  return {
    actions,
    notifications,
    getState: () => savedState,
    async updateNonCriticalSettings(patch) {
      Object.assign(runtimeSettings, patch);
      for (const listener of storageChangeListeners) {
        listener({ settings: { oldValue: {}, newValue: {} } }, 'local');
      }
      await delay(60);
    },
    async snapshot(snapshot) {
      emit('message', {
        source: window,
        data: {
          channel: 'aviator-strategy-history-v1',
          source: 'aviator-history-scanner',
          type: 'SNAPSHOT',
          snapshot
        }
      });
      await delay(60);
    }
  };
}

(async () => {
  const runtime = await createRuntime();
  await runtime.snapshot(makeSnapshot(7));
  assert.strictEqual(runtime.actions.length, 0, '7/10 must not prepare');

  await runtime.snapshot(makeSnapshot(8));
  assert.deepStrictEqual(runtime.actions.map((item) => item.type), ['PREPARE']);
  assert.strictEqual(runtime.getState().autoReloadPaused, true);
  assert.strictEqual(runtime.getState().signalInterfacePrepared, true);
  assert.strictEqual(runtime.notifications.length, 1);
  assert.strictEqual(runtime.notifications[0].notification.currentStreak, 8);

  await runtime.snapshot(makeSnapshot(9));
  assert.deepStrictEqual(runtime.actions.map((item) => item.type), ['PREPARE']);

  await runtime.snapshot(makeSnapshot(10));
  assert.deepStrictEqual(runtime.actions.map((item) => item.type), ['PREPARE', 'PREPARE_AND_BET']);
  assert.strictEqual(runtime.getState().awaitingResult, true);
  assert.strictEqual(runtime.getState().step, 1);
  assert.strictEqual(runtime.getState().activeBet, 0.2);

  await runtime.updateNonCriticalSettings({
    telegramConfigured: false,
    notifySeriesEnabled: false
  });
  assert.strictEqual(runtime.getState().awaitingResult, true,
    'unrelated settings must not reset an active bet');
  assert.strictEqual(runtime.getState().step, 1);
  assert.deepStrictEqual(runtime.actions.map((item) => item.type),
    ['PREPARE', 'PREPARE_AND_BET']);

  const win = makeSnapshot(10);
  win.values.unshift(5.11);
  win.ids.unshift('win11');
  await runtime.snapshot(win);
  assert.strictEqual(runtime.getState().awaitingResult, false);
  assert.strictEqual(runtime.getState().autoReloadPaused, false);
  assert.strictEqual(runtime.getState().completedCycles, 1);

  const progression = await createRuntime({ notifyLength: 10 });
  await progression.snapshot(makeSnapshot(9, 'p'));
  await progression.snapshot(makeSnapshot(10, 'p'));
  let loss = makeSnapshot(10, 'p');
  loss.values.unshift(1.2);
  loss.ids.unshift('p11');
  await progression.snapshot(loss);
  assert.strictEqual(progression.getState().step, 2);
  assert.strictEqual(progression.getState().activeBet, 0.2);
  assert.strictEqual(progression.getState().cumulativeLoss, 0.2);
  loss.values.unshift(1.3);
  loss.ids.unshift('p12');
  await progression.snapshot(loss);
  assert.strictEqual(progression.getState().step, 3);
  assert.strictEqual(progression.getState().activeBet, 0.25);
  assert.strictEqual(progression.getState().cumulativeLoss, 0.4);

  const delayedBatch = await createRuntime();
  await delayedBatch.snapshot(makeSnapshot(7, 'b'));
  await delayedBatch.snapshot(makeSnapshot(12, 'b'));
  assert.strictEqual(delayedBatch.actions.length, 0, 'late 10/10 inside a batch must not prepare or bet');
  assert.strictEqual(delayedBatch.notifications.length, 0, 'late thresholds must not notify');
  assert.strictEqual(delayedBatch.getState().stage, 'waiting-reset');

  const retrospective = await createRuntime();
  await retrospective.snapshot(makeSnapshot(12, 'x'));
  assert.strictEqual(retrospective.actions.length, 0, 'retrospective 12/10 must not bet');
  assert.strictEqual(retrospective.getState().stage, 'waiting-reset');
  assert.strictEqual(retrospective.getState().autoReloadPaused, true);

  const reset = makeSnapshot(12, 'x');
  reset.values.unshift(7.2);
  reset.ids.unshift('xreset');
  await retrospective.snapshot(reset);
  assert.strictEqual(retrospective.getState().stage, 'waiting');
  assert.strictEqual(retrospective.getState().consecutiveLosses, 0);
  assert.strictEqual(retrospective.getState().autoReloadPaused, false);

  const nonOwner = await createRuntime({ owner: false });
  await nonOwner.snapshot(makeSnapshot(10, 'z'));
  assert.strictEqual(nonOwner.actions.length, 0);
  assert.strictEqual(nonOwner.getState(), null);

  console.log('strategy runtime tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
