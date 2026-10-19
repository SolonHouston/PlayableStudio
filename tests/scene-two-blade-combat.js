'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const elements = new Map();
const ctx = new Proxy({}, {get: () => () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, width: 324, height: 535, hidden: false, textContent: '', style: {},
    classList: {add() {}, remove() {}}, addEventListener() {},
    setPointerCapture() {}, getContext() { return ctx; },
    getBoundingClientRect() { return {left: 0, top: 0, width: 324, height: 535}; },
  });
  return elements.get(id);
}

const scope = {
  document: {getElementById: element},
  window: {addEventListener() {}},
  Audio: class {play() { return Promise.resolve(); }},
  Image: class {}, requestAnimationFrame() {}, console, Math,
};
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'scene2-play.js'), 'utf8')
  .replace(/  Promise\.all\(imageNames\.map\(loadImage\)\)[\s\S]*?\n\}\)\(\);\s*$/,
    '  window.__qa={reset,clashWithEnemyBlade,updateBladeCircle,bladeTip,BLADE_REFLOW_DELAY,state:()=>state};\n})();');
vm.runInNewContext(source, scope, {filename: 'scene2-play.js'});
const qa = scope.window.__qa;
assert(qa, 'scene two QA hooks load');
qa.reset();
const state = qa.state();

state.player.x = 100;
state.player.y = 100;
const sweepingBlade = {tier: 'green', angle: 0};
state.player.blades = [sweepingBlade];
const weakerEnemy = {x: 223, y: 100, blades: [
  {tier: 'white', angle: Math.PI},
  {tier: 'white', angle: Math.PI},
]};
const enemyX = weakerEnemy.x;
for (const enemyBlade of [...weakerEnemy.blades]) {
  const enemyTip = qa.bladeTip(weakerEnemy, enemyBlade, 62);
  assert(qa.clashWithEnemyBlade(weakerEnemy, enemyBlade, enemyTip, sweepingBlade));
}
assert.equal(state.player.blades.length, 1,
  'one higher-tier blade continues through multiple lower-tier blades');
assert.equal(weakerEnemy.blades.length, 0,
  'all contacted lower-tier blades shatter without a clash cooldown');
assert.equal(weakerEnemy.x, enemyX, 'blade clashes do not knock enemies away');

const sameTierPlayerBlade = {tier: 'green', angle: 0};
state.player.blades = [sameTierPlayerBlade,
  {tier: 'green', angle: 1.4}, {tier: 'green', angle: 3.7}];
const sameTierEnemyBlade = {tier: 'green', angle: Math.PI};
const sameTierEnemy = {x: 223, y: 100, blades: [sameTierEnemyBlade]};
assert(qa.clashWithEnemyBlade(sameTierEnemy, sameTierEnemyBlade,
  qa.bladeTip(sameTierEnemy, sameTierEnemyBlade, 62), sameTierPlayerBlade));
assert.equal(state.player.blades.length, 2);
assert.equal(sameTierEnemy.blades.length, 0,
  'same-tier collision shatters both actual blades');
assert(state.player.needsBladeReflow);
const angleBeforeDelay = state.player.blades[0].angle;
state.clock += qa.BLADE_REFLOW_DELAY - .01;
qa.updateBladeCircle(state.player, .01);
assert.equal(state.player.bladeReflow, false,
  'surviving blades keep their combat spacing during the disengage delay');
assert.notEqual(state.player.blades[0].angle, angleBeforeDelay,
  'surviving blades keep rotating clockwise during the delay');
state.clock += .02;
qa.updateBladeCircle(state.player, .02);
assert.equal(state.player.bladeReflow, true,
  'the ring starts gradual redistribution only after disengaging');

console.log('scene-two-blade-combat: PASS (continuous clash, no knockback, delayed reflow)');
