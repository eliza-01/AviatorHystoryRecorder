const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class StyleMock {
  constructor() {
    this.cssText = '';
    this.values = new Map();
  }
  setProperty(name, value) {
    this.values.set(name, String(value));
  }
}

class ElementMock {
  constructor(tagName, registry) {
    this.tagName = String(tagName).toUpperCase();
    this.registry = registry;
    this.style = new StyleMock();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.isConnected = false;
    this.textContent = '';
    this.id = '';
    this.className = '';
    this.type = '';
    this.title = '';
  }
  attachShadow() {
    const shadow = new ElementMock('#shadow-root', this.registry);
    this.shadowRootMock = shadow;
    return shadow;
  }
  append(...items) {
    for (const item of items) {
      if (!item) continue;
      this.children.push(item);
      item.parentNode = this;
      item.isConnected = this.isConnected;
      if (item.id) this.registry.set(item.id, item);
    }
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  remove() {
    this.isConnected = false;
    if (this.id) this.registry.delete(this.id);
  }
}

function findByClass(node, className) {
  if (!node) return null;
  if (node.className === className) return node;
  for (const child of node.children || []) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

(async () => {
  const registry = new Map();
  const documentElement = new ElementMock('html', registry);
  documentElement.isConnected = true;
  documentElement.append = function (...items) {
    for (const item of items) {
      if (!item) continue;
      this.children.push(item);
      item.parentNode = this;
      item.isConnected = true;
      if (item.id) registry.set(item.id, item);
    }
  };

  const document = {
    readyState: 'complete',
    documentElement,
    body: documentElement,
    createElement: (tag) => new ElementMock(tag, registry),
    addEventListener() {},
    querySelectorAll() { return []; }
  };

  const windowListeners = new Map();
  const window = {
    innerWidth: 1200,
    top: null,
    location: { href: 'https://example.com/aviator' },
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener() {}
  };
  window.top = window;

  const captureState = {
    ok: true,
    aviatorTab: true,
    pageAutoReloadEnabled: false,
    pageAutoReloadSeconds: 60,
    badgeOffsetTopPx: 24,
    badgeOffsetLeftPx: 32,
    badgeOpacityPercent: 75,
    strategyTenPlusX340Enabled: true,
    strategyTenPlusX340StopStep: 12,
    strategyTenPlusX340ReinvestmentEnabled: true,
    strategyState: {
      stage: 'waiting',
      consecutiveLosses: 3,
      minimumDeposit: 20,
      strategyBalance: 25.75,
      autoReloadPaused: false
    }
  };

  let storageChangedListener = null;
  const chrome = {
    storage: {
      onChanged: {
        addListener(listener) { storageChangedListener = listener; }
      }
    },
    runtime: {
      async sendMessage(message) {
        if (message?.type === 'GET_CAPTURE_STATE') return captureState;
        return { ok: true };
      }
    }
  };

  const context = {
    console,
    window,
    document,
    chrome,
    location: window.location,
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    Date,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    URL
  };

  const sourcePath = path.join(__dirname, '..', 'extension', 'src', 'content', 'content-script.js');
  const code = fs.readFileSync(sourcePath, 'utf8');
  vm.runInNewContext(code, context, { filename: sourcePath });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const autoHost = registry.get('aviator-extension-auto-reload-badge');
  const strategyHost = registry.get('aviator-extension-strategy-badge');
  const balanceHost = registry.get('aviator-extension-balance-badge');
  assert.ok(autoHost, 'auto-reload badge should be created');
  assert.ok(strategyHost, 'strategy badge should be created');
  assert.ok(balanceHost, 'balance badge should be created');

  assert.equal(autoHost.style.top, '24px');
  assert.equal(strategyHost.style.top, '68px');
  assert.equal(balanceHost.style.top, '112px');
  for (const host of [autoHost, strategyHost, balanceHost]) {
    assert.equal(host.style.left, '32px');
    assert.equal(host.style.opacity, '0.75');
  }

  const balanceText = findByClass(balanceHost.shadowRootMock, 'text');
  assert.ok(balanceText, 'balance text should exist');
  assert.equal(
    balanceText.textContent,
    '💰 25.75 🏁 20.00 ✅ Реинвест'
  );

  captureState.strategyTenPlusX340ReinvestmentEnabled = false;
  captureState.strategyState.strategyBalance = 19.6;
  assert.ok(storageChangedListener, 'storage listener should be registered');
  storageChangedListener({ settings: { newValue: {} } }, 'local');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    balanceText.textContent,
    '💰 19.60 🏁 20.00 ❌ Реинвест'
  );

  console.log('badge-runtime.test.cjs: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
