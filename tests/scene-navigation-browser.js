const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-navigation-'));
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
  '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=600,1000', entry,
], {stdio: 'ignore'});

async function activePort() {
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(file))
      return Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]);
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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
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
    const response = await send('Runtime.evaluate', {expression, returnByValue: true});
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  }
  async function waitForPath(filename) {
    for (let i = 0; i < 80; i++) {
      try {
        if ((await evaluate('location.pathname')).endsWith(`/${filename}`)) return;
      } catch (_) {}
      await wait(100);
    }
    throw new Error(`Navigation to ${filename} timed out`);
  }

  await send('Runtime.enable');
  await evaluate("location.assign('scene2-play.html')");
  await waitForPath('scene2-play.html');
  assert.match(await evaluate('document.title'), /场景二/);
  await evaluate("location.assign('scene3-play.html')");
  await waitForPath('scene3-play.html');
  assert.match(await evaluate('document.title'), /场景三/);
  for (let i = 0; i < 80; i++) {
    if (await evaluate("document.getElementById('game')?.dataset.renderStatus") === 'ready') break;
    await wait(100);
  }
  assert.equal(await evaluate("document.getElementById('game')?.dataset.renderStatus"), 'ready');
  socket.close();
  console.log('scene-navigation-browser: PASS (real file navigation reaches scene two and scene three)');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  browser.kill();
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
});
