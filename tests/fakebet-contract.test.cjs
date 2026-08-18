const assert = require('node:assert/strict');
const fs = require('node:fs');

const constants = fs.readFileSync('extension/src/background/constants.js', 'utf8');
const settings = fs.readFileSync('extension/src/background/settings-service.js', 'utf8');
const popupHtml = fs.readFileSync('extension/src/popup/popup.html', 'utf8');
const popupJs = fs.readFileSync('extension/src/popup/popup.js', 'utf8');
const strategy = fs.readFileSync('extension/src/content/strategy-script.js', 'utf8');
const bridge = fs.readFileSync('extension/src/content/preparation-page-bridge.js', 'utf8');
const content = fs.readFileSync('extension/src/content/content-script.js', 'utf8');
const worker = fs.readFileSync('extension/src/background/service-worker.js', 'utf8');

assert.match(constants, /fakeBetEnabled: false/);
assert.match(settings, /settings\.fakeBetEnabled = Boolean\(settings\.fakeBetEnabled\)/);
assert.match(popupHtml, /id="fakeBetEnabled"/);
assert.match(popupJs, /fakeBetEnabled: elements\.fakeBetEnabled\.checked/);

assert.match(strategy, /FAKE_BET_MIN_RELOAD_MS = 10_000/);
assert.match(strategy, /strategySignalLength\(\) - Number\(state\.consecutiveLosses \|\| 0\) < 2/);
assert.match(strategy, /state\.stage !== "waiting"/);
assert.match(strategy, /state\.awaitingResult/);
assert.match(strategy, /GET_FAKEBET_RELOAD_WINDOW/);
assert.match(strategy, /requestInterfaceAction\("FAKE_BET"/);

assert.match(bridge, /"FAKE_BET"/);
assert.match(bridge, /await delay\(300, run\)/);
assert.match(bridge, /isCancelBetLabel/);
assert.match(bridge, /cancelled: true/);
assert.match(bridge, /bet-was-not-accepted/);

assert.match(content, /GET_PAGE_AUTO_RELOAD_STATUS/);
assert.match(content, /FAKE_BET_MIN_RELOAD_MS = 10_000/);
assert.match(content, /aviator-extension-fakebet-badge/);
assert.match(content, /🎭 Fakebet/);
assert.match(worker, /GET_FAKEBET_RELOAD_WINDOW/);
assert.match(worker, /frameId: 0/);

console.log('fakebet-contract.test.cjs: ok');
