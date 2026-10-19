const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist', '一秒八刀_三场景_单文件.html');
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'blade-single-html-'));
const entryPath = path.join(isolated, 'game.html');
fs.copyFileSync(source, entryPath);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blade-single-profile-'));
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = spawn(browserPath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=600,1000', pathToFileURL(entryPath).href,
], {stdio: 'ignore'});

async function activePort() {
  const file = path.join(profile, 'DevToolsActivePort');
  for (let index = 0; index < 100; index++) {
    if (fs.existsSync(file)) return Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]);
    if (browser.exitCode !== null) throw new Error(`Browser exited: ${browser.exitCode}`);
    await wait(100);
  }
  throw new Error('Browser did not open a debugging port');
}

async function run() {
  const port = await activePort();
  let page;
  for (let index = 0; index < 50; index++) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    page = tabs.find(tab => tab.type === 'page' && tab.url.startsWith('file:'));
    if (page) break;
    await wait(100);
  }
  assert(page, 'isolated single HTML page exists');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  const requests = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown')
      exceptions.push(message.params.exceptionDetails.exception?.description ||
        message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent')
      requests.push(message.params.request.url);
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
    if (response.exceptionDetails) throw new Error(
      response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  }
  async function waitFor(expression, label) {
    for (let index = 0; index < 120; index++) {
      if (await evaluate(expression)) return;
      await wait(100);
    }
    throw new Error(`Timed out: ${label}`);
  }
  const screenshotDir = path.join(root, 'build', 'single-html-qa');
  fs.mkdirSync(screenshotDir, {recursive: true});
  async function capture(name) {
    const shot = await send('Page.captureScreenshot', {format: 'png'});
    fs.writeFileSync(path.join(screenshotDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await waitFor(`window.__singleGame?.scene === 'scene1' &&
    !!document.getElementById('game-frame').contentWindow.__bladeSceneOne`, 'scene one ready');
  const sceneOne = await evaluate(`(() => {
    const w=document.getElementById('game-frame').contentWindow;
    const s=w.__bladeSceneOne.state();
    return {scene:window.__singleGame.scene,assets:window.__singleGame.assetCount,
      cars:s.carCount,formations:s.formationCount,canvas:!!w.document.getElementById('game')};
  })()`);
  assert.deepEqual(sceneOne, {scene:'scene1', assets:209, cars:120, formations:5, canvas:true});
  await wait(500);
  await capture('scene1');
  const bgmState = await evaluate(`(async()=>{
    const w=document.getElementById('game-frame').contentWindow;
    w.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}));
    w.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp'}));
    for(let i=0;i<40&&window.__singleGame.bgm.currentTime===0;i++)
      await new Promise(r=>setTimeout(r,100));
    const a=window.__singleGame.bgm;
    return {time:a.currentTime,paused:a.paused,ready:a.readyState,error:a.error&&a.error.message};})()`);
  assert(bgmState.time > 0, `top-level BGM started: ${JSON.stringify(bgmState)}`);
  const bgmStart = bgmState.time;
  await send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });
  await evaluate(`window.__singleSwitchScene('scene2')`);
  await waitFor(`window.__singleGame.scene === 'scene2' && (()=>{
    const w=document.getElementById('game-frame').contentWindow;
    const c=w.document.getElementById('game');
    if(!c||c.width!==324||c.height!==535)return false;
    const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    for(let i=3;i<p.length;i+=4000)if(p[i])return true;
    return false;
  })()`, 'scene two rendered offline');
  const bgmSceneTwo = await evaluate(`window.__singleGame.bgm.currentTime`);
  assert(bgmSceneTwo >= bgmStart, 'BGM continued into scene two');
  await capture('scene2');
  await evaluate(`window.__singleSwitchScene('scene3')`);
  await waitFor(`window.__singleGame.scene === 'scene3' && (()=>{
    const c=document.getElementById('game-frame').contentWindow.document.getElementById('game');
    return c?.dataset.renderStatus === 'ready' && c.dataset.gameplayStatus === 'enabled';
  })()`, 'scene three rendered offline');
  const final = await evaluate(`(() => {
    const frame=document.getElementById('game-frame');
    const c=frame.contentWindow.document.getElementById('game');
    return {scene:window.__singleGame.scene,w:c.width,h:c.height,bgm:window.__singleGame.bgm.currentTime};
  })()`);
  assert.equal(final.scene, 'scene3');
  assert.equal(final.w, 280);
  assert.equal(final.h, 462);
  assert(final.bgm >= bgmSceneTwo, 'BGM continued into scene three');
  await capture('scene3');
  assert.equal(exceptions.length, 0, `browser exceptions: ${exceptions.join('\n')}`);
  assert(requests.every(url => url.startsWith('file:') || url.startsWith('data:') ||
    url === 'about:srcdoc'), `external requests: ${requests.join(', ')}`);
  socket.close();
  console.log('single-html-browser: PASS (empty-directory copy, offline scene1->2->3, BGM continuity)');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  browser.kill();
  for (const directory of [profile, isolated]) {
    try { fs.rmSync(directory, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
    catch (_) {}
  }
});
