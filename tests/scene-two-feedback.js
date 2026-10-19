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
  ['音频/音效/刀碰撞.mp3', 'audio/blade-clash.mp3'],
  ['音频/音效/拿来吧你.MP3', 'audio/take-it.mp3'],
  ['音频/音效/升级_WAV.wav', 'audio/upgrade-wav.wav'],
  ['音频/音效/惊.mp3', 'audio/shock.mp3'],
  ['音频/音效/惊讶.MP3', 'audio/surprised.mp3'],
  ['音频/音效/笑.MP3', 'audio/laugh.mp3'],
  ['动效/砍墙火花.mp4', 'video/wall-spark.mp4'],
  ['动效/升级 (2).mp4', 'video/upgrade-2.mp4'],
  ['动效/3d受击圆_黄色3.mp4', 'video/metal.mp4'],
  ['动效/火花02.mp4', 'video/clash.mp4'],
  ['动效/宝藏光.gif', 'images/treasure-glow.gif'],
  ['动效/宝箱光.mp4', 'video/chest-glow.mp4'],
  ['动效/走路获得2.mp4', 'video/walk-acquire-2.mp4'],
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

const source = fs.readFileSync(path.join(root, 'src', 'scene2-play.js'), 'utf8');
assert.match(source, /const CONTACT_SOUND_COOLDOWN = \.08;/);
assert.match(source, /const CHEST_HIT_SCALE_DURATION = \.18;/);
assert.match(source, /playSequence\(\['takeIt', 'laugh'\], \.31\)/,
  'Jiangbao defeat voice is strictly sequenced');
assert.match(source, /playSound\('shock', \.30\)/,
  'approach/open shock cue stays at low voice volume');
assert.match(source, /playSound\('surprised', \.30\)/,
  'flee cue is wired once at the state transition');
assert.match(source, /videoImpact\('upgrade2', state\.player\.x, state\.player\.y, \.62\)/);
assert.match(source, /playSound\('upgradeWav', \.28\)/);
assert.match(source, /videoImpact\('metal', CHEST\.x, CHEST\.y \+ 22, \.46\)/);
assert.match(source, /Math\.sin\(progress \* Math\.PI\) \* \.12/,
  'chest hit reaches the approved 1.12 peak');
assert.match(source, /videoImpact\('wallSpark',[\s\S]*Math\.atan2\(wall\.ty, wall\.tx\)\)/,
  'bounce spark follows the wall tangent');
assert.match(source, /effect\('fire01', fruit\.x, fruit\.y, \.42\)/,
  'momo wall destruction uses Fire01');
assert.match(source, /videoImpact\('clash',[\s\S]*playSound\('bladeClash', \.24, CONTACT_SOUND_COOLDOWN\)/,
  'blade collisions use Fire02 plus throttled low-volume audio');
assert.match(source, /globalCompositeOperation = 'screen';[\s\S]*paintImage\(ctx, 'treasure-glow\.gif', CHEST\.x, CHEST\.y \+ 21, 92, 54\)/,
  'treasure glow removes its black background and sits close to the chest base');
const chestDrawAt = source.indexOf("ctx.drawImage(images['宝箱.png']");
const treasureGlowDrawAt = source.indexOf("paintImage(ctx, 'treasure-glow.gif'");
assert(chestDrawAt >= 0 && treasureGlowDrawAt > chestDrawAt,
  'treasure glow is drawn over the chest model');
assert.match(source, /chestGlow: \{file: 'chest-glow\.mp4', w: 92, h: 68\}/,
  'reward glow is large enough to remain visible around the orb');
assert.match(source, /drawLoopVideo\('chestGlow', x, y \+ 16\)/);
const rewardGlowAt = source.indexOf("drawLoopVideo('chestGlow', x, y + 16)");
const rewardOrbAt = source.indexOf('paintImage(ctx, reward.art, x, y, 56, 56)');
assert(rewardGlowAt >= 0 && rewardGlowAt < rewardOrbAt,
  'reward glow stays below the orb and its label');
assert.match(source, /videoImpact\('walkAcquire2', state\.portal\.x, state\.portal\.y, \.5\)/);
assert.match(source, /window\.location\.assign\('scene3-play\.html'\)/,
  'successful portal navigation remains direct');

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
const audioInstances = [];
class MockAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.volume = 1;
    this.listeners = {};
    audioInstances.push(this);
  }
  play() { this.played = true; return Promise.resolve(); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  finish() { if (this.listeners.ended) this.listeners.ended(); }
}
const scope = {
  document: {getElementById: element},
  window: {addEventListener() {}, location: {assign() {}}},
  Audio: MockAudio, Image: class {}, requestAnimationFrame() {}, console, Math,
};
const instrumented = source.replace(
  /  Promise\.all\(imageNames\.map\(loadImage\)\)[\s\S]*?\n\}\)\(\);\s*$/,
  `  window.__feedbackQa={reset,unlockSound,updateJiangbao,killJiangbao,pickupGreen,
    updateChest,chestHitScale,openChest,clashWithEnemyBlade,bladeTip,
    state:()=>state,CHEST,PLAYER_BLADE_RADIUS,CHEST_HIT_SCALE_DURATION};\n})();`);
vm.runInNewContext(instrumented, scope, {filename: 'scene2-play.js'});
const qa = scope.window.__feedbackQa;
qa.reset();
qa.unlockSound();
let state = qa.state();

qa.updateJiangbao(.016);
qa.updateJiangbao(.016);
assert.equal(state.feedback.sounds.filter(item => item.name === 'shock').length, 1,
  'Jiangbao approach shock plays once');
state.jiangbao.x = state.player.x;
state.jiangbao.y = state.player.y + 1;
qa.updateJiangbao(.016);
qa.updateJiangbao(.016);
assert.equal(state.feedback.sounds.filter(item => item.name === 'surprised').length, 1,
  'Jiangbao flee surprise plays once');

qa.killJiangbao();
assert.equal(state.feedback.sounds.filter(item => item.name === 'takeIt').length, 1);
assert.equal(state.feedback.sounds.filter(item => item.name === 'laugh').length, 0,
  'laugh does not overlap take-it');
const takeIt = audioInstances.find(item => item.src.endsWith('/take-it.mp3') && item.played);
assert(takeIt, 'take-it clip starts first');
takeIt.finish();
assert.equal(state.feedback.sounds.filter(item => item.name === 'laugh').length, 1,
  'laugh starts after take-it ends');

state.drop = {x: state.player.x, y: state.player.y, r: 32};
qa.pickupGreen();
assert(state.feedback.sounds.some(item => item.name === 'upgradeWav'));
assert(state.feedback.effects.some(item => item.name === 'upgrade2'));

state.bounceEnabled = false;
state.player.x = qa.CHEST.x - qa.PLAYER_BLADE_RADIUS;
state.player.y = qa.CHEST.y;
state.player.blades = [{tier: 'green', angle: 0, dir: 1}];
state.clock = 3;
qa.updateChest();
assert(state.feedback.effects.some(item => item.name === 'metal'));
assert(state.feedback.sounds.some(item => item.name === 'wallHit'));
state.clock += qa.CHEST_HIT_SCALE_DURATION / 2;
assert(Math.abs(qa.chestHitScale() - 1.12) < .001,
  'chest reaches 1.12 scale at the midpoint');
state.clock += qa.CHEST_HIT_SCALE_DURATION / 2;
assert.equal(qa.chestHitScale(), 1, 'chest returns to normal after 0.18 seconds');

state.momo = state.momo || {};
qa.openChest();
assert(state.feedback.sounds.filter(item => item.name === 'shock').length >= 2,
  'opening the chest plays the confirmed shock cue');

console.log('scene-two-feedback: PASS (exact assets, confirmed event mappings, low-volume cues, small FX)');
