const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const elements = new Map();
const ctx = new Proxy({}, {get: () => () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    hidden: false, textContent: '', style: {},
    classList: {add() {}, remove() {}}, addEventListener() {},
    getBoundingClientRect() { return {width: 600, height: 1000}; },
    getContext() { return ctx; }
  });
  return elements.get(id);
}
const scope = {
  document: {getElementById: element},
  window: {devicePixelRatio: 1, addEventListener() {}, location: {assign(target) {this.target = target;}}},
  Image: class {constructor() {this.complete = true; this.naturalWidth = 100;}},
  requestAnimationFrame() {}, Math
};
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8')
  .replace(/\}\)\(\);\s*$/, 'window.__qa={reset,update,combat,clash,updateBladeCircle,muscleJoinPose,momoRingClash,directBladeHit,collectGreen,evolve,defeatSea,stageClear,playerBladeRadius,bladeHitsCage,cageHit,tickCageDamage,muscleCageBladeDamage,SEA_BLADE_RADIUS,SEA_STANDOFF_DISTANCE,BLADE_REFLOW_DELAY,MUSCLE_CAGE_HIT_COOLDOWN,MUSCLE_CAGE_DAMAGE_TICK,MUSCLE_CAGE_HIT_TOLERANCE,MUSCLE_CAGE_GREEN_DAMAGE,MUSCLE_JOIN_DURATION,game:()=>game};})();');
vm.runInNewContext(source, scope, {filename: 'game.js'});
const qa = scope.window.__qa;
const state = qa.game();
assert.equal(qa.MUSCLE_CAGE_HIT_COOLDOWN, .5,
  'muscle cage accepts blade hits every .50 seconds');
assert.equal(qa.MUSCLE_CAGE_DAMAGE_TICK, .07,
  'queued muscle-cage damage is displayed one point at a visible cadence');
assert.equal(qa.MUSCLE_CAGE_HIT_TOLERANCE, 38);
assert.equal(qa.MUSCLE_CAGE_GREEN_DAMAGE, 8);
assert.equal(qa.MUSCLE_JOIN_DURATION, .6);
assert.equal(state.formations.length, 5);
assert.equal(state.cars.length, 120);
assert.equal(state.formations[0].corners[0][1] - state.formations[3].corners[2][1], 280);
assert.equal(state.muscleCage.x, 2220, 'upper muscle cage moves right with the upper formations');
assert.equal(state.greenPickups.length, 6);
assert.equal(state.player.x, 1720, 'scene-one spawn moves right by 30 world units');
assert.equal(state.player.y, 2640, 'scene-one spawn keeps its original vertical position');
assert.equal(state.greenPickups[0].x, state.greenPickups[3].x, 'green blades form three columns');
assert(state.cage.x < state.player.x && state.cage.y > state.player.y);
state.flags.lowerCleared = true;
state.player.blades = Array.from({length: 11}, (_, i) => ({tier: 0, angle: i * Math.PI * 2 / 11}));
for (let i = 0; i < state.greenPickups.length; i++) {
  state.player.x = state.greenPickups[i].x;
  state.player.y = state.greenPickups[i].y;
  qa.collectGreen();
  assert.equal(state.player.blades.length, i + 1, 'green pickup count is exact');
  assert(state.player.blades.every(blade => blade.tier === 1));
}
assert(state.flags.green);

state.fatties = [];
state.player.x = state.muscleCage.x - 225;
state.player.y = state.muscleCage.y;
state.player.blades = [{tier: 1, angle: 0}];
assert(qa.bladeHitsCage(state.player.blades[0], state.muscleCage),
  'muscle-cage blade tips hit from 35 world units outside the cage bounds');
state.muscleCage.hp = 6;
qa.combat(.001);
assert.equal(state.muscleCage.hp, 6, 'damage queues for incremental display');
assert.equal(state.muscleCage.pendingDamage, 6);
qa.update(.071);
assert.equal(state.muscleCage.hp, 5, 'one frame can display at most one cage-damage point');
for (let i = 0; i < 5; i++) qa.update(.071);
assert.equal(state.muscleCage.hp, 0);
assert(state.sea && state.sea.blades.length === 12);
assert(state.muscleJoin, 'breaking the cage starts the muscle join animation');
assert.equal(state.flags.evolved, false,
  'gold transformation waits until the muscle sprite reaches the player');
assert.equal(state.muscleCage.opened, true);
const joinPlayerX = state.player.x, joinPlayerY = state.player.y;
qa.update(.3);
assert.equal(state.player.x, joinPlayerX);
assert.equal(state.player.y, joinPlayerY,
  'movement and combat stay paused during the join animation');
const middlePose = qa.muscleJoinPose();
assert(middlePose && middlePose.progress > .45 && middlePose.progress < .55);
assert(middlePose.y < Math.max(state.muscleCage.y, state.player.y),
  'the captive muscle sprite follows a visible upward jump arc');
qa.update(.31);
assert.equal(state.muscleJoin, null);
assert.equal(state.player.form, 'strong');
assert.equal(state.player.blades.filter(blade => blade.tier === 2).length, 12);
assert.equal(state.sea.mode, 'flee', 'Sea begins the original escape after fusion completes');
qa.defeatSea();
assert.equal(state.seaDrop.count, 12);
state.player.x = state.seaDrop.x;
state.player.y = state.seaDrop.y;
qa.update(.016);
assert.equal(state.player.blades.length, 24, 'strong form capacity is 24');
assert.equal(state.player.blades.filter(blade => blade.tier === 2).length, 12);
assert.equal(state.player.blades.filter(blade => blade.tier === 1).length, 12);
const ring = [...state.player.blades].sort((a, b) => a.angle - b.angle);
assert(ring.every((blade, i) => blade.tier !== ring[(i + 1) % ring.length].tier),
  'gold and green blades alternate on one ring');
assert(ring.every(blade => qa.playerBladeRadius(blade) === 87),
  'gold and green blades use the same radius');

state.player.x = state.godzillaCage.x + 190;
state.player.y = state.godzillaCage.y;
state.player.blades = [{tier: 2, angle: Math.PI}];
state.godzillaCage.hp = 559;
qa.combat(.001);
state.player.x = 1400;
qa.update(.4);
assert.equal(state.godzillaCage.hp, 549, 'gold blade deals 10 actual damage');
assert(state.portal.active && state.momo);
assert(state.momo.x + 175 < state.player.x - 225,
  'Momo and her visible ring spawn just outside the portrait view');
state.momo.x = 2200;
state.momo.y = 3000;
state.player.x = state.godzillaCage.x + 190;
state.player.y = state.godzillaCage.y;
state.player.blades[0].angle = Math.PI;
qa.combat(.001);
state.player.x = 1400;
qa.update(.4);
assert.equal(state.godzillaCage.hp, 539,
  'Godzilla cage keeps taking real damage after Momo appears');
qa.stageClear();
assert.equal(state.status, 'next');
assert.equal(scope.window.location.target, 'scene2-play.html');
qa.reset();
const encounter = qa.game();
encounter.fatties = [];
encounter.jiangbao = null;
encounter.flags.body = encounter.flags.white = encounter.flags.lowerCleared = encounter.flags.green = true;
encounter.player.form = 'full';
encounter.player.x = encounter.muscleCage.x - 180;
encounter.player.y = encounter.muscleCage.y;
encounter.player.blades = Array.from({length: 6}, (_, i) => ({tier: 1, angle: i * Math.PI / 3}));
for (let i = 0; i < 400 && encounter.status === 'playing' && !encounter.flags.evolved; i++)
  qa.update(.016);
assert.equal(encounter.muscleCage.hp, 0, 'six green blades break the cage');
assert(encounter.flags.evolved, 'Sea arrives close enough to trigger the fusion');
assert(encounter.sea && encounter.sea.mode === 'flee');
encounter.sea.x = encounter.sea.fleeStartX - 431;
qa.update(.016);
assert.equal(encounter.sea.mode, 'stand', 'Sea stops after a short escape');
encounter.player.x = 1000;
encounter.player.y = 1900;
encounter.player.form = 'full';
const playerBlade = {tier: 1, angle: 0};
encounter.player.blades = [playerBlade,
  {tier: 1, angle: 1.4}, {tier: 1, angle: 3.7}];
const enemyBlade = {tier: 1, angle: Math.PI};
const target = {x: 1172, y: 1900, blades: [enemyBlade]};
assert(qa.clash(playerBlade, enemyBlade, target, 72));
assert.equal(encounter.player.blades.length, 2);
assert.equal(target.blades.length, 0);
assert(!target.kbX && !encounter.player.kbX,
  'same-tier blades both shatter without knocking either actor away');
assert(encounter.player.needsBladeReflow,
  'a collision leaves the surviving blade layout untouched until combat ends');
const survivorAngle = encounter.player.blades[0].angle;
encounter.clock += qa.BLADE_REFLOW_DELAY - .01;
qa.updateBladeCircle(encounter.player, .01);
assert.equal(encounter.player.bladeReflow, false,
  'the player ring does not immediately redistribute after a collision');
assert.notEqual(encounter.player.blades[0].angle, survivorAngle,
  'the surviving blade keeps rotating while redistribution is delayed');
encounter.clock += .02;
qa.updateBladeCircle(encounter.player, .02);
assert.equal(encounter.player.bladeReflow, true,
  'the surviving ring starts a gradual redistribution only after the delay');
const seaPlayerBlade = {tier: 1, angle: 0};
const seaEnemyBlade = {tier: 1, angle: Math.PI};
encounter.player.blades = [seaPlayerBlade];
encounter.sea = {x: 1172, y: 1900, r: 37, speed: 190, mode: 'attack',
  blades: [seaEnemyBlade]};
assert(qa.clash(seaPlayerBlade, seaEnemyBlade, encounter.sea, qa.SEA_BLADE_RADIUS));
assert(!encounter.sea.kbX && !encounter.player.kbX,
  'Sea and the player both stay fixed during a blade clash');
assert.equal(qa.SEA_BLADE_RADIUS, qa.playerBladeRadius({tier: 1}),
  'Sea and the green-blade player use the same blade-ring radius');
encounter.player.x = 1000;
encounter.player.y = 1900;
encounter.player.blades = [];
encounter.sea.x = encounter.player.x + qa.SEA_STANDOFF_DISTANCE;
encounter.sea.y = encounter.player.y;
encounter.sea.blades = Array.from({length: 12}, (_, i) =>
  ({tier: 1, angle: i * Math.PI * 2 / 12}));
encounter.flags.evolved = false;
const heldSeaX = encounter.sea.x;
qa.combat(.016);
assert.equal(encounter.sea.x, heldSeaX,
  'Sea stops at the confirmed attackable distance until transformation');
qa.reset();
const unarmed = qa.game();
unarmed.fatties = [];
unarmed.player.blades = [];
unarmed.player.x = unarmed.greenPickups[0].x;
unarmed.player.y = unarmed.greenPickups[0].y;
qa.update(.016);
assert.equal(unarmed.player.blades.length, 1,
  'a player who lost every white blade can still pick up green');
assert.equal(unarmed.player.blades[0].tier, 1);
unarmed.player.form = 'strong';
unarmed.player.blades = [{tier: 2, angle: 0}];
const guardedSea = {x: unarmed.player.x + 65, y: unarmed.player.y,
  r: 37, initialBladeCount: 12, initialBladeTier: 1,
  blades: Array.from({length: 12}, () => ({tier: 1, angle: 0}))};
assert.equal(qa.directBladeHit(guardedSea), false,
  'a full green blade ring protects Sea from a direct gold body hit');
guardedSea.blades.length = 6;
assert.equal(qa.directBladeHit(guardedSea), true,
  'gold blades can finish Sea after weakening its ring');
const guardedMomo = {x: unarmed.player.x + 65, y: unarmed.player.y,
  r: 45, initialBladeCount: 4, initialBladeTier: 3,
  blades: Array.from({length: 4}, () => ({tier: 3, angle: 0}))};
assert.equal(qa.directBladeHit(guardedMomo), false,
  'gold blades cannot bypass Momo’s purple blade grade');
const ringMomo = {x: unarmed.player.x + 252, y: unarmed.player.y};
qa.momoRingClash(ringMomo);
assert.equal(unarmed.player.blades.length, 0,
  'Momo’s visible ring consumes a touching gold blade');
unarmed.player.blades = [{tier: 1, angle: 0}];
ringMomo.nextRingClashAt = 0;
qa.momoRingClash(ringMomo);
assert.equal(unarmed.player.blades.length, 0,
  'Momo’s visible ring also consumes a touching green blade');

qa.reset();
const queued = qa.game();
queued.fatties = [];
queued.flags.green = true;
const hitPoint = {x: queued.muscleCage.x, y: queued.muscleCage.y};
for (let i = 0; i < 4; i++) {
  queued.clock = i * qa.MUSCLE_CAGE_HIT_COOLDOWN;
  assert(qa.cageHit(queued.muscleCage, hitPoint,
    qa.muscleCageBladeDamage({tier: 1})), `green cage hit ${i + 1} is accepted`);
}
assert.equal(queued.muscleCage.pendingDamage, 30,
  'four green hits queue enough single-point damage to finish defense 30');
assert.equal(queued.muscleCage.hp, 30,
  'queued damage never changes the visible defense in an eight-point jump');
for (let expected = 29; expected >= 0; expected--) {
  queued.clock += qa.MUSCLE_CAGE_DAMAGE_TICK + .001;
  qa.tickCageDamage(queued.muscleCage);
  assert.equal(queued.muscleCage.hp, expected,
    `visible muscle-cage defense counts down through ${expected}`);
}
assert(queued.muscleJoin,
  'the completed one-point countdown still starts the confirmed join animation');
console.log('PASS: scene one map, exact green pickups, incremental cage damage, bosses, portal');
