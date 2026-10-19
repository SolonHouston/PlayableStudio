const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sceneOne = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8');
const sceneTwo = fs.readFileSync(path.join(root, 'src', 'scene2-play.js'), 'utf8');
const sceneThree = fs.readFileSync(path.join(root, 'src', 'scene3-play.js'), 'utf8');

assert.match(sceneOne,
  /function stageClear\(\) \{[\s\S]*?game\.status = 'next';[\s\S]*?window\.location\.assign\('scene2-play\.html'\);[\s\S]*?\n  \}/,
  'scene one portal navigates directly to the playable scene two page');
assert.match(sceneTwo,
  /function stageClear\(\) \{[\s\S]*?state\.status = 'cleared';[\s\S]*?window\.location\.assign\('scene3-play\.html'\);[\s\S]*?\n  \}/,
  'scene two portal navigates directly to the playable scene three page');
assert.match(sceneThree,
  /function win\(\) \{[\s\S]*?state\.status = 'won';[\s\S]*?ui\.result\.hidden = false;[\s\S]*?\n  \}/,
  'scene three portal remains the final completion result');
for (const file of ['scene2-play.html', 'scene3-play.html'])
  assert(fs.existsSync(path.join(root, 'src', file)), `${file} exists`);

console.log('scene-transitions: PASS (scene 1 -> scene 2 -> scene 3, final result retained)');
