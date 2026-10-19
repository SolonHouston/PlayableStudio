const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(root, '..', '(素材)');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const copies = [
  ['音频/音效/刀击中_爱给网_aigei_com.mp3', 'audio/enemy-hit.mp3'],
  ['音频/音效/卧槽.MP3', 'audio/momo-hit.mp3'],
  ['音频/音效/溜了溜了.MP3', 'audio/run-away.mp3'],
  ['音频/音效/胡.MP3', 'audio/hu.mp3'],
  ['音频/音效/惊讶.MP3', 'audio/surprised.mp3'],
  ['音频/音效/笑.MP3', 'audio/laugh.mp3'],
  ['音频/音效/哟.mp3', 'audio/yo.mp3'],
  ['音频/音效/哎呀.MP3', 'audio/ouch.mp3'],
  ['音频/音效/刀碰撞.mp3', 'audio/blade-clash.mp3'],
  ['动效/砍墙火花.mp4', 'video/wall-spark.mp4'],
  ['动效/升级 (2).mp4', 'video/upgrade-2.mp4'],
  ['动效/火花02.mp4', 'video/clash.mp4'],
];
for (const [sourceName, targetName] of copies) {
  const source = path.join(sourceRoot, ...sourceName.split('/'));
  const target = path.join(root, 'assets', ...targetName.split('/'));
  assert(fs.existsSync(target), `${targetName} exists`);
  assert.equal(sha(target), sha(source), `${targetName} is an exact source copy`);
}
for (const [prefix, count] of [['fire01-', 6], ['bone-', 7]])
  for (let index = 0; index < count; index++)
    assert(fs.statSync(path.join(root, 'assets', 'images', `${prefix}${index}.webp`)).size > 500,
      `${prefix}${index}.webp exists`);

const source = fs.readFileSync(path.join(root, 'src', 'scene3-play.js'), 'utf8');
assert.match(source, /const CONTACT_SOUND_COOLDOWN = \.08;/);
assert.match(source, /goblinHit: 'enemy-hit\.mp3'[\s\S]*goblinsClear: 'momo-hit\.mp3'/);
assert.match(source, /runAway: 'run-away\.mp3'[\s\S]*hu: 'hu\.mp3'[\s\S]*yo: 'yo\.mp3'/);
assert.match(source, /if \(enemy\.kind === 'goblin'\) fireImpact\(enemy\.x, enemy\.y\)/);
assert.match(source, /playSound\('goblinHit', \.24\)/);
assert.match(source, /!state\.goblins\.some\(goblin => goblin\.alive\)[\s\S]*playSound\('goblinsClear', \.31\)/);
assert.match(source, /firstCorridorCuePlayed[\s\S]*FIRST_CORRIDOR_ENTRY_Y[\s\S]*playSound\('runAway', \.31\)/);
assert.match(source, /state\.startWhiteCollected === whiteStartPoints\.length[\s\S]*playSound\('hu', \.31\)/);
assert.match(source, /videoImpact\('upgrade2', item\.x, item\.y, \.62\)/);
assert.match(source, /function spawnJiangbao[\s\S]*playSound\('surprised', \.31\)/);
assert.match(source, /enemy\.kind === 'jiangbao'[\s\S]*playSound\('laugh', \.31\)/);
assert.match(source, /function attackSea[\s\S]*playSound\('yo', \.31\)/);
assert.match(source, /function playVenomChaseCue[\s\S]*venomChaseCuePlayed[\s\S]*playSound\('ouch', \.31\)/);
assert.match(source, /videoImpact\('clash',[\s\S]*playSound\('clash', \.24, CONTACT_SOUND_COOLDOWN\)/);
assert.match(source, /giant\.mode = demon\.mode = 'blocking';[\s\S]*videoImpact\('wallSpark'/);
assert.match(source, /state\.phase = 'bossesChase';[\s\S]*videoImpact\('wallSpark'/);
assert.match(source, /fire01-[^\n]*webp[\s\S]*effect\.type === 'fire01'/);
assert.match(source, /effect\.type === 'video'[\s\S]*globalCompositeOperation = 'screen'/);

console.log('scene-three-feedback: PASS (exact assets, confirmed story cues, small FX, throttled clash)');
