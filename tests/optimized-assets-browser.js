const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, 'build', 'optimized-assets', 'manifest.json'), 'utf8'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'optimized-assets-'));
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');
const entry = pathToFileURL(path.join(__dirname, 'optimized-assets-browser.html')).href;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = spawn(browserPath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, entry,
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
  assert(page, 'decode test page exists');
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
  await send('Runtime.enable');
  const items = manifest.entries.map(item => ({kind: item.kind, path: item.output}));
  const response = await send('Runtime.evaluate', {
    expression: `(async () => {
      const items = ${JSON.stringify(items)};
      const load = item => new Promise((resolve, reject) => {
        const source = '../build/optimized-assets/' + item.path;
        if (item.kind === 'image') {
          const media = new Image();
          media.onload = () => resolve({kind:item.kind,path:item.path,w:media.naturalWidth,h:media.naturalHeight});
          media.onerror = () => reject(new Error('image:' + item.path));
          media.src = source;
          return;
        }
        const media = document.createElement(item.kind === 'audio' ? 'audio' : 'video');
        media.onloadedmetadata = () => resolve({kind:item.kind,path:item.path,d:media.duration,
          w:media.videoWidth || 0,h:media.videoHeight || 0});
        media.onerror = () => reject(new Error(item.kind + ':' + item.path));
        media.src = source;
        media.load();
      });
      return Promise.all(items.map(load));
    })()`,
    returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  const results = response.result.value;
  assert.equal(results.length, 209, 'all optimized assets loaded');
  assert(results.filter(item => item.kind === 'image').every(item => item.w > 0 && item.h > 0));
  assert(results.filter(item => item.kind !== 'image').every(item => item.d > 0));
  assert(results.filter(item => item.kind === 'video').every(item => item.w > 0 && item.h > 0));
  assert.equal(exceptions.length, 0, `browser exceptions: ${exceptions.join('; ')}`);
  socket.close();
  console.log('optimized-assets-browser: PASS (209 assets decode in Chromium)');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  browser.kill();
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
});
