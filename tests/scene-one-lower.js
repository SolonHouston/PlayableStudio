const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const elements = new Map();
const ctx = new Proxy({}, {get: () => () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, hidden: false, textContent: '', style: {},
    classList: {add() {}, remove() {}},
    addEventListener() {}, setPointerCapture() {},
    getBoundingClientRect() { return {left: 0, top: 0, width: 600, height: 1000}; },
    getContext() { return ctx; }
  });
  return elements.get(id);
}
const scope = {
  document: {getElementById: element},
  window: {devicePixelRatio: 1, addEventListener() {}, location: {assign() {}}},
  Image: class {constructor() {this.complete = true; this.naturalWidth = 100;}},
  requestAnimationFrame() {}, console, Math
};
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8')
  .replace(/\}\)\(\);\s*$/, 'window.__qa={reset,update,combat,blocked,breakCage,halfJoinPose,collectWhite,chase,bladePosition,keys,joystick,HALF_JOIN_DURATION,game:()=>game};})();');
vm.runInNewContext(source, scope, {filename: 'game.js'});
const qa = scope.window.__qa;
let state = qa.game();
assert.equal(state.player.form, 'half');
assert.equal(state.player.speed, 200);
assert.equal(state.player.blades.length, 1);
assert.equal(state.fatties.length, 10);
assert.equal(state.cars.length, 120);
assert.equal(state.formations.length, 5);
assert.equal(state.cage.hp, 3);
assert.equal(state.jiangbao, null);
assert.equal(state.whitePickup.active, true);
assert.equal(state.fatties[0].speed, 65);
assert(state.fatties.every(fatty => !fatty.active),
  'fatties are scheduled rather than generated together on screen');
qa.update(.16);
assert.equal(state.fatties.filter(fatty => fatty.active).length, 1);
assert(state.fatties[0].x - 53 > state.player.x + 225,
  'the first fatty enters from beyond the view');
qa.update(.38);
assert.equal(state.fatties.filter(fatty => fatty.active).length, 2);
assert.equal(state.formations[1].corners[0][0] - state.formations[0].corners[1][0],
  state.formations[2].corners[0][0] - state.formations[1].corners[1][0],
  'top horizontal passages are equal');
assert.equal(state.formations[1].corners[3][0] - state.formations[0].corners[2][0],
  state.formations[2].corners[3][0] - state.formations[1].corners[2][0],
  'bottom horizontal passages are equal');
assert.equal(state.formations[1].corners[0][0] - state.formations[0].corners[1][0], 170,
  'both lower passages are slightly wider');
assert(state.formations[3].corners.every((point, index) =>
  point[0] - state.formations[1].corners[index][0] === 170),
  'upper column two stays based on lower column two and shifts right by 170');
assert(state.formations[4].corners.every((point, index) =>
  point[0] - state.formations[2].corners[index][0] === 170),
  'upper column three stays based on lower column three and shifts right by 170');
assert.equal(Math.round(Math.hypot(
  qa.bladePosition(state.player, state.player.blades[0], 112).x - state.player.x,
  qa.bladePosition(state.player, state.player.blades[0], 112).y - state.player.y)), 112);
state.player.blades[0].angle = 0;
state.fatties[0].active = true;
state.fatties[0].x = state.player.x + 88;
state.fatties[0].y = state.player.y;
qa.combat(.016);
assert.equal(state.fatties.filter(fatty => fatty.alive).length, 9,
  'slower fatty is defeated by a blade hit');
qa.reset();
state = qa.game();
// The confirmed spawn shift means the player now has to approach the half cage.
state.player.x = state.cage.x + 140;
for (let i = 0; i < 370 && state.status === 'playing' && !state.cage.opened; i++)
  qa.update(.016);
assert.equal(state.status, 'playing', 'the opening survives while the approached half cage breaks');
assert.equal(state.cage.opened, true, 'one starting blade breaks the cage after three passes');
assert.equal(state.jiangbao, null, 'Jiangbao waits until the white pickup');
qa.reset();
state = qa.game();
// The +10 white-blade orb exists immediately and may be collected before the cage.
state.player.x = state.whitePickup.x;
state.player.y = state.whitePickup.y;
qa.update(.016);
assert.equal(state.player.blades.length, 11);
assert.equal(state.cage.opened, false);
assert.equal(state.jiangbao, null);
qa.reset();
state = qa.game();

// The white blade has to contact the cage to free the other half.
state.player.x = state.cage.x + 132;
state.player.y = state.cage.y;
state.player.blades[0].angle = Math.PI;
qa.combat(.016);
assert.equal(state.cage.hp, 2);
state.clock += .23;
state.player.blades[0].angle = Math.PI;
qa.combat(.016);
assert.equal(state.cage.hp, 2, 'one pass through the cage counts once');
state.player.blades[0].angle = 0;
qa.combat(.016);
state.clock += 1.85;
state.player.blades[0].angle = Math.PI;
qa.combat(.016);
assert.equal(state.cage.hp, 1);
state.player.blades[0].angle = 0;
qa.combat(.016);
state.clock += 1.85;
state.player.blades[0].angle = Math.PI;
qa.combat(.016);
assert.equal(state.cage.hp, 0);
assert(state.halfJoin, 'breaking the first cage starts the half-body join animation');
assert.equal(state.flags.body, false,
  'the player does not become whole until the captive half reaches the ring center');
const halfJoinPlayerX = state.player.x, halfJoinPlayerY = state.player.y;
state.fatties[0].active = true;
state.fatties[0].alive = true;
state.fatties[0].x = state.player.x;
state.fatties[0].y = state.player.y;
qa.update(.3);
assert.equal(state.status, 'playing', 'lethal collisions pause during the half-body join');
assert.equal(state.player.x, halfJoinPlayerX);
assert.equal(state.player.y, halfJoinPlayerY, 'movement pauses during the half-body join');
const halfPose = qa.halfJoinPose();
assert(halfPose && halfPose.progress > .45 && halfPose.progress < .55);
assert(halfPose.y < Math.max(state.cage.y, state.player.y),
  'the captive half follows the same visible upward jump arc as the muscle join');
qa.update(.31);
assert.equal(state.halfJoin, null);
assert.equal(state.player.form, 'full');
assert.equal(state.player.speed, 400);
state.fatties[0].active = false;
assert.equal(state.jiangbao, null, 'Jiangbao waits for the +10 white pickup');
assert.equal(state.whitePickup.active, true);

state.player.x = state.whitePickup.x;
state.player.y = state.whitePickup.y;
qa.update(.016);
assert.equal(state.player.blades.length, 11);
assert.equal(state.flags.white, true);
assert.equal(state.whitePickup.active, false);
assert(state.jiangbao, 'Jiangbao spawns after the +10 white pickup');
assert.equal(state.jiangbao.speed, 330);
assert.equal(state.jiangbao.blades.length, 3);
assert(state.jiangbao.y > state.player.y + 300,
  'Jiangbao enters from below the view');

// The same gaps are open to the player and closed to Jiangbao.
for (let y = 2120; y <= 2420; y += 25) {
  const slope = 130 * (y - 2100) / 340;
  for (const x of [1235 - slope, 1795 - slope]) {
    assert.equal(qa.blocked(x, y, state.player.r, 'player'), false,
      `player passage open at ${x},${y}`);
    assert.equal(qa.blocked(x, y, state.jiangbao.r, 'jiangbao'), true,
      `Jiangbao passage closed at ${x},${y}`);
  }
}
assert.equal(qa.blocked(state.cars[0].x, state.cars[0].y, state.player.r, 'player'), true);

// Scene one no longer reverses blades against the first car passage walls.
const passageTestFatties = state.fatties;
state.fatties = [];
state.jiangbao = null;
state.player.x = 1235;
state.player.y = 2100;
state.player.blades = [{tier: 0, angle: 0, dir: 1}];
qa.combat(.1);
assert.equal(state.player.blades[0].dir, 1,
  'the confirmed removal keeps the blade moving clockwise at the car wall');
assert(state.player.blades[0].angle > 0,
  'the blade continues rotating instead of stopping at the car wall');
state.fatties = passageTestFatties;

// A real movement sequence must reach the middle through a car passage.
state.player.x = state.whitePickup.x;
state.player.y = state.whitePickup.y;
state.player.blades = Array.from({length: 11}, (_, index) =>
  ({tier: 0, angle: index * Math.PI * 2 / 11, dir: 1}));
qa.keys.add('arrowright');
for (let i = 0; i < 22; i++) qa.update(.016);
qa.keys.delete('arrowright');
qa.keys.add('arrowup');
for (let i = 0; i < 59 && state.status === 'playing'; i++)
  qa.update(.016);
qa.keys.delete('arrowup');
qa.joystick.x = .357;
qa.joystick.y = -.934;
for (let i = 0; i < 90 && state.status === 'playing' && !state.flags.lowerCleared; i++)
  qa.update(.016);
qa.joystick.x = qa.joystick.y = 0;
if (!state.flags.lowerCleared) console.log('route position', state.player.x, state.player.y, state.status);
assert.equal(state.status, 'playing', 'escape route remains survivable');
assert.equal(state.flags.lowerCleared, true, 'player reaches the middle');

// Contact with a fatty fails immediately, and retry restores the start.
state.fatties[0].x = state.player.x;
state.fatties[0].y = state.player.y;
state.fatties[0].active = true;
state.fatties[0].alive = true;
qa.combat(.016);
assert.equal(state.status, 'failed');
qa.reset();
state = qa.game();
assert.equal(state.status, 'playing');
assert.equal(state.fatties.length, 10);
assert.equal(state.player.blades.length, 1);

console.log('PASS: lower scene sequence, pickup count, 120 cars, player/boss passages, failure and retry');
