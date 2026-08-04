import assert from 'node:assert/strict';
import {
  normalizeBadgeOffsetPx,
  normalizeBadgeOpacityPercent,
  normalizeX512StartingDeposit
} from '../extension/src/background/settings-service.js';

assert.equal(normalizeBadgeOffsetPx(-5, 10), 0);
assert.equal(normalizeBadgeOffsetPx(12.6, 10), 13);
assert.equal(normalizeBadgeOffsetPx(20000, 10), 10000);
assert.equal(normalizeBadgeOffsetPx('bad', 10), 10);

assert.equal(normalizeBadgeOpacityPercent(0), 10);
assert.equal(normalizeBadgeOpacityPercent(75.4), 75);
assert.equal(normalizeBadgeOpacityPercent(120), 100);
assert.equal(normalizeBadgeOpacityPercent('bad'), 100);

assert.equal(normalizeX512StartingDeposit(1), 14);
assert.equal(normalizeX512StartingDeposit(14), 14);
assert.equal(normalizeX512StartingDeposit(15), 28);
assert.equal(normalizeX512StartingDeposit(28), 28);
assert.equal(normalizeX512StartingDeposit(29), 42);


globalThis.chrome = {
  storage: {
    local: {
      data: {},
      async get(key) {
        return { [key]: this.data[key] };
      },
      async set(value) {
        Object.assign(this.data, value);
      }
    }
  }
};

const { saveSettings, getSettings } = await import(
  '../extension/src/background/settings-service.js'
);
const saved = await saveSettings({
  badgeOffsetTopPx: 41.8,
  badgeOffsetLeftPx: -5,
  badgeOpacityPercent: 72.6
});
assert.equal(saved.badgeOffsetTopPx, 42);
assert.equal(saved.badgeOffsetLeftPx, 0);
assert.equal(saved.badgeOpacityPercent, 73);
const loaded = await getSettings();
assert.equal(loaded.badgeOffsetTopPx, 42);
assert.equal(loaded.badgeOffsetLeftPx, 0);
assert.equal(loaded.badgeOpacityPercent, 73);


const strategySaved = await saveSettings({
  strategyTenPlusX340Enabled: true,
  strategyFifteenPlusX512Enabled: true,
  strategyFifteenPlusX512StartingDeposit: 15
});
assert.equal(strategySaved.strategyTenPlusX340Enabled, false);
assert.equal(strategySaved.strategyFifteenPlusX512Enabled, true);
assert.equal(strategySaved.strategyFifteenPlusX512StartingDeposit, 28);

console.log('badge-settings.test.mjs: ok');
