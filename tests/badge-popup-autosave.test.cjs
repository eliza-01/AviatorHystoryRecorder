const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(
  __dirname,
  '..',
  'extension',
  'src',
  'popup',
  'popup.js'
);
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(source, /const BADGE_SETTINGS_AUTOSAVE_DELAY_MS = 80;/);
assert.match(source, /element\.addEventListener\("input", scheduleBadgeSettingsAutosave\)/);
assert.match(source, /element\.addEventListener\("change", scheduleBadgeSettingsAutosave\)/);
assert.match(source, /async function saveBadgeSettingsImmediately\(\)/);
assert.match(source, /type: "SAVE_SETTINGS"/);
assert.match(source, /badgeOffsetTopPx,/);
assert.match(source, /badgeOffsetLeftPx,/);
assert.match(source, /badgeOpacityPercent/);
assert.match(source, /badgeSettingsElements\.includes\(document\.activeElement\)/);

console.log('badge-popup-autosave.test.cjs: ok');
