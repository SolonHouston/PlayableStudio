const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-three-feedback-'));
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');
const entry = pathToFileURL(path.join(root, 'src', 'scene3-play.html')).href;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = spawn(browserPath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=600,1000', entry,
], {stdio: 'ignore'});

async function activePort() {
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(file)) return Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]);
    if (browser.exitCode !== null) throw new Error(`Browser exited: ${browser.exitCode}`);
    await wait(100);
  }
  throw new Error('Browser did not open a debugging port');
}

async function run() {
  const port = await activePort();
  let page;
  for (let i = 0; i < 50; i++) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
    page = tabs.find(tab => tab.type === 'page' && tab.url.startsWith('file:'));
    if (page) break;
    await wait(100);
  }
  assert(page, 'scene-three file page exists');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown')
      exceptions.push(message.params.exceptionDetails.text);
    if (!message.id || !pending.has(message.id)) return;
    const promise = pending.get(message.id);
    pending.delete(message.id);
    message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, {resolve, reject});
      socket.send(JSON.stringify({id, method, params}));
    });
  }
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  }
  await send('Runtime.enable');
  for (let i = 0; i < 80; i++) {
    if (await evaluate('typeof window.__SCENE3_PLAY__ === "object"')) break;
    await wait(100);
  }
  const result = await evaluate(`(async () => {
    const audioFiles = ['enemy-hit.mp3','momo-hit.mp3','run-away.mp3','hu.mp3',
      'surprised.mp3','laugh.mp3','yo.mp3','ouch.mp3','blade-clash.mp3'];
    const videoFiles = ['wall-spark.mp4','upgrade-2.mp4','clash.mp4'];
    const imageFiles = Array.from({length: 6}, (_, i) => 'fire01-' + i + '.webp')
      .concat(Array.from({length: 7}, (_, i) => 'bone-' + i + '.webp'));
    const audio = await Promise.all(audioFiles.map(file => new Promise((resolve, reject) => {
      const media = new Audio('../assets/audio/' + file);
      media.addEventListener('loadedmetadata', () => resolve({file, duration: media.duration}), {once:true});
      media.addEventListener('error', () => reject(new Error('audio:' + file)), {once:true});
      media.load();
    })));
    const video = await Promise.all(videoFiles.map(file => new Promise((resolve, reject) => {
      const media = document.createElement('video');
      media.src = '../assets/video/' + file;
      media.addEventListener('loadedmetadata', () => resolve({file, width: media.videoWidth,
        height: media.videoHeight, duration: media.duration}), {once:true});
      media.addEventListener('error', () => reject(new Error('video:' + file)), {once:true});
      media.load();
    })));
    const images = await Promise.all(imageFiles.map(file => new Promise((resolve, reject) => {
      const image = new Image();
      image.src = '../assets/images/' + file;
      image.addEventListener('load', () => resolve({file, width: image.naturalWidth,
        height: image.naturalHeight}), {once:true});
      image.addEventListener('error', () => reject(new Error('image:' + file)), {once:true});
    })));
    const qa = window.__SCENE3_PLAY__;
    qa.debug.reset();
    qa.debug.collectStartWhite();
    const white = qa.state().feedback;
    qa.debug.reset();
    qa.debug.defeatJiangbao();
    const jiangbao = qa.state().feedback;
    qa.debug.reset();
    qa.debug.attackSea();
    const sea = qa.state().feedback;
    qa.debug.reset();
    qa.debug.spawnVenom('chase');
    qa.debug.spawnVenom('chase');
    const venom = qa.state().feedback;
    qa.debug.reset();
    for (let i = 0; i < 10; i++) qa.debug.defeatGoblin(i);
    const goblins = qa.state().feedback;
    qa.debug.reset();
    qa.debug.enterFirstCorridor();
    qa.debug.enterFirstCorridor();
    const corridor = qa.state().feedback;
    qa.debug.reset();
    qa.debug.spawnJiangbao();
    qa.debug.spawnJiangbao();
    const jiangbaoSpawn = qa.state().feedback;
    qa.debug.reset();
    qa.debug.finishThreatApproach();
    qa.debug.finishThreatApproach();
    const threats = qa.state().feedback;
    qa.debug.reset();
    qa.debug.finishFinalBossAlign();
    qa.debug.finishFinalBossAlign();
    const bosses = qa.state().feedback;
    return {audio, video, images, white, jiangbao, sea, venom, goblins,
      corridor, jiangbaoSpawn, threats, bosses};
  })()`);
  assert(result.audio.every(item => item.duration > 0), 'all scene-three audio decodes');
  assert(result.video.every(item => item.width > 0 && item.height > 0 && item.duration > 0),
    'all scene-three video effects decode');
  assert(result.images.every(item => item.width > 0 && item.height > 0),
    'Fire01 and bone frames decode');
  assert.equal(result.white.effects.filter(item => item.name === 'upgrade2').length, 6,
    'each white bubble triggers one upgrade effect');
  assert.equal(result.white.sounds.filter(item => item.name === 'hu').length, 1,
    'white completion voice plays once');
  assert.equal(result.jiangbao.sounds.filter(item => item.name === 'laugh').length, 1);
  assert.equal(result.sea.sounds.filter(item => item.name === 'yo').length, 1);
  assert.equal(result.venom.sounds.filter(item => item.name === 'ouch').length, 1,
    'venom chase cue stays one-shot');
  assert.equal(result.goblins.sounds.filter(item => item.name === 'goblinHit').length, 10,
    'each goblin defeat plays one hit sound');
  assert.equal(result.goblins.sounds.filter(item => item.name === 'goblinsClear').length, 1,
    'the final goblin adds one clear voice');
  assert.equal(result.goblins.effects.filter(item => item.name === 'fire01').length, 10);
  assert.equal(result.goblins.effects.filter(item => item.name === 'bone').length, 10);
  assert.equal(result.corridor.sounds.filter(item => item.name === 'runAway').length, 1,
    'first corridor entry cue stays one-shot');
  assert.equal(result.jiangbaoSpawn.sounds.filter(item => item.name === 'surprised').length, 1,
    'Jiangbao spawn cue stays one-shot');
  assert.equal(result.threats.effects.filter(item => item.name === 'wallSpark').length, 1,
    'giant and demon contact spark plays once');
  assert.equal(result.bosses.effects.filter(item => item.name === 'wallSpark').length, 1,
    'final boss contact spark plays once');
  assert.equal(exceptions.length, 0, `browser exceptions: ${exceptions.join('; ')}`);
  socket.close();
  console.log('scene-three-feedback-browser: PASS (media decode + one-shot story cues)');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  browser.kill();
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
});
