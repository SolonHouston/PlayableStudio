const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'src', 'bgm.js'), 'utf8');
const audio = path.join(root, 'assets', 'audio', 'beat-blitz-2.mp3');

assert(fs.existsSync(audio), 'Beat Blitz BGM is present in project assets');
assert(fs.statSync(audio).size > 1_000_000, 'BGM file is not an empty placeholder');
assert.match(script, /new Audio\(AUDIO_PATH\)/, 'shared runtime creates the BGM audio');
assert.match(script, /audio\.loop = true/, 'BGM loops');
assert.match(script, /const VOLUME = \.45/, 'BGM volume is the confirmed 0.45');
assert.match(script, /sessionStorage\.setItem/, 'playback position is persisted');
assert.match(script, /audio\.currentTime =/, 'saved playback position is restored');
assert.match(script, /\['pointerdown', 'touchstart', 'mousedown', 'keydown'\]/,
  'first user interaction unlocks audio');

for (const name of ['index.html', 'scene2-play.html', 'scene3-play.html']) {
  const html = fs.readFileSync(path.join(root, 'src', name), 'utf8');
  assert.match(html, /<script src="bgm\.js"><\/script>\s*<script src="(?:game|scene2-play|scene3-play)\.js"><\/script>/,
    `${name} loads the shared BGM before gameplay`);
}

console.log('shared-bgm: PASS (loop, gesture start, 0.45 volume, cross-page persistence)');
