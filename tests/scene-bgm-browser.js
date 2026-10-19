const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-bgm-'));
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');
const entry = pathToFileURL(path.join(root, 'src', 'index.html')).href;
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
  assert(page, 'scene-one file page exists');
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
  async function waitFor(expression, label) {
    for (let i = 0; i < 100; i++) {
      try {
        if (await evaluate(expression)) return;
      } catch (_) {}
      await wait(100);
    }
    throw new Error(`${label} timed out`);
  }
  async function navigate(filename) {
    await evaluate(`location.assign('${filename}')`);
    await waitFor(`location.pathname.endsWith('/${filename}')`, `navigation to ${filename}`);
    await waitFor('typeof window.__bgmController === "object"', `${filename} BGM runtime`);
  }

  await send('Runtime.enable');
  await waitFor('typeof window.__bgmController === "object"', 'scene-one BGM runtime');
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp',
    windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp',
    windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38,
  });
  await waitFor('window.__bgmController.state().currentTime > .25',
    'scene-one BGM time advance');
  const sceneOne = await evaluate('window.__bgmController.state()');
  assert(sceneOne.started && !sceneOne.paused && sceneOne.currentTime > .25,
    `scene one BGM did not advance: ${JSON.stringify(sceneOne)}`);
  assert.equal(sceneOne.loop, true);
  assert.equal(sceneOne.volume, .45);
  await evaluate('window.__bgmController.persist()');

  await navigate('scene2-play.html');
  await waitFor('!window.__bgmController.state().paused', 'scene-two BGM resume');
  await waitFor(`window.__bgmController.state().currentTime > ${sceneOne.currentTime - .1}`,
    'scene-two BGM position restore');
  const sceneTwoStart = await evaluate('window.__bgmController.state()');
  assert(sceneTwoStart.currentTime > sceneOne.currentTime - .3,
    'scene two restarted the BGM instead of restoring its position');
  await waitFor(`window.__bgmController.state().currentTime > ${sceneTwoStart.currentTime + .2}`,
    'scene-two BGM continuation');
  const sceneTwoAfter = await evaluate('window.__bgmController.state()');
  assert(sceneTwoAfter.currentTime > sceneTwoStart.currentTime + .2,
    'scene two restored the BGM but did not continue playing');
  await evaluate('window.__bgmController.persist()');

  await navigate('scene3-play.html');
  await waitFor('!window.__bgmController.state().paused', 'scene-three BGM resume');
  const sceneThree = await evaluate('window.__bgmController.state()');
  assert(sceneThree.currentTime > sceneTwoAfter.currentTime - .3,
    'scene three restarted the BGM instead of restoring its position');
  assert.equal(exceptions.length, 0, `browser exceptions: ${exceptions.join('; ')}`);
  socket.close();
  console.log('scene-bgm-browser: PASS (scene 1 -> 2 -> 3 keeps looping BGM position)');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  browser.kill();
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
});
