const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(
  'extension/src/popup/popup.html',
  'utf8'
);
const popupJs = fs.readFileSync(
  'extension/src/popup/popup.js',
  'utf8'
);

const cards = [...html.matchAll(/<details\s+class="[^"]*strategy-card[^"]*"[^>]*>/g)];
assert.equal(cards.length, 2, 'must render two strategy spoiler cards');
for (const [tag] of cards) {
  assert.ok(!/\sopen(?:\s|=|>)/.test(tag), 'strategy spoilers must be closed by default');
}

assert.match(
  html,
  /<summary class="strategy-card-summary">[\s\S]*?id="strategyTenPlusX340Enabled"[\s\S]*?<\/summary>/,
  'x3.40 enable toggle must remain in collapsed summary'
);
assert.match(
  html,
  /<summary class="strategy-card-summary">[\s\S]*?id="strategyFifteenPlusX512Enabled"[\s\S]*?<\/summary>/,
  'x5.12 enable toggle must remain in collapsed summary'
);
assert.match(html, /15\+ - x5\.12/);
assert.match(html, /id="strategyFifteenPlusX512StartingDeposit"[\s\S]*?min="14"[\s\S]*?step="14"/);
assert.match(html, /Фиксированный стоп: 16 шагов/);
assert.match(html, /id="strategyStatisticsX340"/);
assert.match(html, /id="strategyStatisticsX512"/);
assert.match(html, /id="strategyResetStatisticsX340"/);
assert.match(html, /id="strategyResetStatisticsX512"/);
assert.match(popupJs, /X512_STRATEGY_TARGET = 5\.12/);
assert.match(popupJs, /X512_STRATEGY_SIGNAL_LENGTH = 15/);
assert.match(popupJs, /X512_STRATEGY_STOP_STEP = 16/);
assert.match(popupJs, /elements\.strategyFifteenPlusX512Enabled\.checked = false/);
assert.match(popupJs, /elements\.strategyTenPlusX340Enabled\.checked = false/);
assert.match(popupJs, /RESET_STRATEGY_STATISTICS/);
assert.match(popupJs, /renderPersistentStrategyStatistics/);

console.log('strategy-popup-spoilers.test.cjs: ok');
