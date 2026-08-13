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
assert.equal(cards.length, 4, 'must render four strategy spoiler cards');
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
assert.match(
  html,
  /<summary class="strategy-card-summary">[\s\S]*?id="strategyTwentyPlusX512Enabled"[\s\S]*?<\/summary>/,
  '20+ x5.12 enable toggle must remain in collapsed summary'
);
assert.match(html, /15\+ - x5\.12/);
assert.match(html, /id="strategyFifteenPlusX512StartingDeposit"[\s\S]*?min="14"[\s\S]*?step="14"/);
assert.match(html, /Фиксированный стоп: 16 шагов/);
assert.match(html, /id="strategyStatisticsX340"/);
assert.match(html, /id="strategyStatisticsX512"/);
assert.match(html, /20\+ - x5\.12/);
assert.match(html, /id="strategyTwentyPlusX512StartingDeposit"[\s\S]*?min="13\.41"[\s\S]*?step="0\.01"/);
assert.match(html, /id="strategyTwentyPlusX512ApplyDeposit"[^>]*>OK<\/button>/);
assert.match(html, /Фиксированный стоп: 11 шагов/);
assert.match(html, /id="strategyStatisticsX512Twenty"/);
assert.match(html, /id="strategyResetStatisticsX340"/);
assert.match(html, /id="strategyResetStatisticsX512"/);
assert.match(html, /id="strategyResetStatisticsX512Twenty"/);
assert.match(
  html,
  /<summary class="strategy-card-summary">[\s\S]*?id="strategyFortyThreePlusX1436Enabled"[\s\S]*?<\/summary>/,
  '43+ x14.36 enable toggle must remain in collapsed summary'
);
assert.match(html, /43\+ - x14\.36/);
assert.match(html, /id="strategyFortyThreePlusX1436StartingDeposit"[\s\S]*?min="25"[\s\S]*?step="0\.01"/);
assert.match(html, /Фиксированный стоп: 18 шагов/);
assert.match(html, /id="strategyFortyThreePlusX1436ApplyDeposit"[^>]*>OK<\/button>/);
assert.match(html, /id="strategyFortyThreePlusX1436Historical"[^>]*>[\s\S]*?Исторические данные/);
assert.match(html, /25\.07\.2026 21:17:25\.898 — 10\.08\.2026 23:14:02\.864/);
assert.match(html, /Итоговая прибыль:[\s\S]*?\+89,1464/);
assert.match(html, /Максимальная просадка:[\s\S]*?21,2776/);
assert.match(html, /id="strategyStatisticsX1436"/);
assert.match(html, /id="strategyResetStatisticsX1436"/);
assert.match(popupJs, /X512_STRATEGY_TARGET = 5\.12/);
assert.match(popupJs, /X512_STRATEGY_SIGNAL_LENGTH = 15/);
assert.match(popupJs, /X512_STRATEGY_STOP_STEP = 16/);
assert.match(popupJs, /X512_20_STRATEGY_SIGNAL_LENGTH = 20/);
assert.match(popupJs, /X512_20_STRATEGY_STOP_STEP = 11/);
assert.match(popupJs, /X512_20_STRATEGY_MINIMUM_DEPOSIT = 13\.41/);
assert.match(popupJs, /applyX512TwentyStartingDeposit/);
assert.match(popupJs, /X1436_STRATEGY_TARGET = 14\.36/);
assert.match(popupJs, /X1436_STRATEGY_SIGNAL_LENGTH = 43/);
assert.match(popupJs, /X1436_STRATEGY_STOP_STEP = 18/);
assert.match(popupJs, /X1436_STRATEGY_MINIMUM_DEPOSIT = 25/);
assert.match(popupJs, /applyX1436StartingDeposit/);
assert.match(popupJs, /openX1436HistoricalData/);
assert.match(
  popupJs,
  /renderX512TwentyCalculations\(deposit, isPreview\)/,
  'deposit draft must recalculate the 11-step preview before OK is applied'
);
assert.match(popupJs, /Предпросмотр для/);
assert.match(popupJs, /elements\.strategyFifteenPlusX512Enabled\.checked = false/);
assert.match(popupJs, /elements\.strategyTenPlusX340Enabled\.checked = false/);
assert.match(popupJs, /RESET_STRATEGY_STATISTICS/);
assert.match(popupJs, /renderPersistentStrategyStatistics/);

console.log('strategy-popup-spoilers.test.cjs: ok');
