const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(root, '..', '(素材)');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const copies = [
  ['音频/音效/击中.MP3', 'audio/wall-hit.mp3'],
  ['音频/音效/人声-英语-不错！_3_(Nice_ _3_)_爱给网_aigei_com.mp3', 'audio/nice.mp3'],
  ['音频/音效/easy.mp3', 'audio/easy.mp3'],
  ['音频/音效/升级_WAV.wav', 'audio/upgrade-wav.wav'],
  ['音频/音效/哎呀.MP3', 'audio/ouch.mp3'],
  ['音频/音效/溜了溜了.MP3', 'audio/run-away.mp3'],
  ['音频/音效/拿来吧你.MP3', 'audio/take-it.mp3'],
  ['音频/音效/卧槽.MP3', 'audio/momo-hit.mp3'],
  ['动效/砍墙火花.mp4', 'video/wall-spark.mp4'],
  ['动效/升级 (2).mp4', 'video/upgrade-2.mp4'],
];
for (const [sourceName, targetName] of copies) {
  const source = path.join(sourceRoot, ...sourceName.split('/'));
  const target = path.join(root, 'assets', ...targetName.split('/'));
  assert(fs.existsSync(target), `${targetName} exists`);
  assert.equal(sha(target), sha(source), `${targetName} is an exact source copy`);
}
for (let index = 0; index < 6; index++)
  assert(fs.statSync(path.join(root, 'assets', 'images', `fire01-${index}.webp`)).size > 500,
    `Fire01 frame ${index} exists`);

const elements = new Map();
const ctx = new Proxy({}, {get: () => () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, hidden: false, textContent: '', style: {},
    classList: {add() {}, remove() {}},
    addEventListener() {}, setPointerCapture() {},
    getBoundingClientRect() { return {left: 0, top: 0, width: 600, height: 1000}; },
    getContext() { return ctx; },
  });
  return elements.get(id);
}
const audioInstances = [];
class MockAudio {
  constructor(src) { this.src = src; this.currentTime = 0; this.volume = 1; this.listeners = {}; audioInstances.push(this); }
  play() { this.played = true; return Promise.resolve(); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  finish() { if (this.listeners.ended) this.listeners.ended(); }
}
const scope = {
  document: {getElementById: element},
  window: {devicePixelRatio: 1, addEventListener() {}, location: {assign() {}}},
  Image: class {constructor() { this.complete = true; this.naturalWidth = 100; }},
  Audio: MockAudio, requestAnimationFrame() {}, console, Math,
};
const gameSource = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8')
  .replace(/\}\)\(\);\s*$/, `window.__feedbackQa={reset,playSound,playSequence,videoImpact,
    markCageHit,cageHitScale,resolveBladeWallSounds,breakCage,collectWhite,collectGreen,
    defeatSea,killEnemy,momoRingClash,clash,bladePosition,playerBladeRadius,
    enableSound(){soundReady=true;},game:()=>game,CAGE_HIT_SCALE_DURATION,
    CONTACT_SOUND_COOLDOWN};})();`);
vm.runInNewContext(gameSource, scope, {filename: 'game.js'});
const qa = scope.window.__feedbackQa;
qa.enableSound();

let game = qa.game();
const blade = game.player.blades[0];
blade.angle = 0;
const originalAngle = blade.angle;
game.cars = [{x: game.player.x + qa.playerBladeRadius(blade), y: game.player.y, r: 28}];
qa.resolveBladeWallSounds();
assert.equal(blade.angle, originalAngle, 'wall feedback does not bounce or rotate the blade');
assert.equal(game.feedback.sounds.filter(item => item.name === 'wallHit').length, 1);
qa.resolveBladeWallSounds();
assert.equal(game.feedback.sounds.filter(item => item.name === 'wallHit').length, 1,
  'continuous overlap does not repeat the wall sound');
game.cars[0].x += 300;
qa.resolveBladeWallSounds();
game.clock += .04;
game.cars[0].x -= 300;
qa.resolveBladeWallSounds();
assert.equal(game.feedback.sounds.filter(item => item.name === 'wallHit').length, 1,
  'wall sound is throttled within 80ms');
game.cars[0].x += 300;
qa.resolveBladeWallSounds();
game.clock += .05;
game.cars[0].x -= 300;
qa.resolveBladeWallSounds();
assert.equal(game.feedback.sounds.filter(item => item.name === 'wallHit').length, 2);

game.clock = 1;
qa.markCageHit(game.cage);
game.clock = 1 + qa.CAGE_HIT_SCALE_DURATION / 2;
assert(Math.abs(qa.cageHitScale(game.cage) - 1.12) < .001,
  'cage reaches the confirmed 1.12 scale');
game.clock = 1 + qa.CAGE_HIT_SCALE_DURATION;
assert.equal(qa.cageHitScale(game.cage), 1, 'cage returns to normal after 0.18 seconds');

qa.breakCage();
assert(game.feedback.sounds.some(item => item.name === 'nice'));
assert(game.feedback.effects.some(item => item.name === 'wallSpark'));

qa.reset();
game = qa.game();
qa.collectWhite();
assert(game.feedback.sounds.some(item => item.name === 'upgradeWav'));
assert(game.feedback.effects.some(item => item.name === 'upgrade2'));

qa.reset();
game = qa.game();
game.player.x = game.greenPickups[0].x;
game.player.y = game.greenPickups[0].y;
qa.collectGreen();
assert(game.feedback.sounds.some(item => item.name === 'pickup'));
assert(game.feedback.effects.some(item => item.name === 'upgrade2'));

qa.reset();
game = qa.game();
for (const fatty of game.fatties) fatty.alive = false;
game.fatties[9].alive = true;
qa.killEnemy(game.fatties[9], 'fatty');
assert.equal(game.feedback.sounds.filter(item => item.name === 'easy').length, 1,
  'the last fatty triggers easy once');

qa.reset();
game = qa.game();
game.sea = {x: 900, y: 900};
qa.defeatSea();
assert(game.feedback.sounds.some(item => item.name === 'takeIt'));
assert(game.feedback.effects.some(item => item.name === 'fire01'));
assert(game.feedback.effects.some(item => item.name === 'bone'));

qa.reset();
game = qa.game();
const momo = {x: game.player.x + qa.playerBladeRadius(game.player.blades[0]) + 165,
  y: game.player.y, nextRingClashAt: 0};
qa.momoRingClash(momo);
assert(game.feedback.sounds.some(item => item.name === 'momoHit'));

qa.reset();
game = qa.game();
const playerBlade = game.player.blades[0];
playerBlade.angle = 0;
const jiangbao = {x: game.player.x + qa.playerBladeRadius(playerBlade) + 78,
  y: game.player.y, blades: [{tier: 2, angle: Math.PI}]};
game.jiangbao = jiangbao;
qa.clash(playerBlade, jiangbao.blades[0], jiangbao, 78);
assert(game.feedback.sounds.some(item => item.name === 'ouch'));
const ouch = audioInstances.find(item => item.src.endsWith('/ouch.mp3') && item.played);
assert(ouch, 'ouch voice starts first');
assert(!game.feedback.sounds.some(item => item.name === 'runAway'),
  'run-away voice does not overlap the first voice');
ouch.finish();
assert(game.feedback.sounds.some(item => item.name === 'runAway'),
  'run-away voice starts after ouch ends');

console.log('scene-one-feedback: PASS (exact assets, low-volume cues, small FX triggers, no wall bounce)');
