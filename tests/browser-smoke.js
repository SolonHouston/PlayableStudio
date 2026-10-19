const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {pathToFileURL} = require('url');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const profile = path.join(__dirname, 'chrome-profile');
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromePath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(chromePath, 'Chrome or Edge executable exists');
const html = pathToFileURL(path.join(root, 'src', 'index.html')).href;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.rmSync(path.join(profile, 'DevToolsActivePort'), {force: true});
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter', '--no-first-run',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=600,1000', html
], {stdio: 'ignore'});

async function activePort() {
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(file)) return Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]);
    if (chrome.exitCode !== null) throw new Error(`Chrome exited: ${chrome.exitCode}`);
    await wait(100);
  }
  throw new Error('Chrome did not open a debugging port');
}
async function run() {
  const port = await activePort();
  let page;
  for (let i = 0; i < 50; i++) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    page = tabs.find(tab => tab.type === 'page' && tab.url.startsWith('file:'));
    if (page) break;
    await wait(100);
  }
  assert(page, 'file page exists');
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
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
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
      expression, returnByValue: true, awaitPromise: true
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  }
  await send('Runtime.enable');
  for (let i = 0; i < 50; i++) {
    if (await evaluate('typeof window.__bladeSceneOne === "object"')) break;
    await wait(100);
  }
  const initial = await evaluate('window.__bladeSceneOne.state()');
  assert.equal(initial.player.form, 'half');
  assert.equal(initial.fattyTotal, 10);
  assert(initial.fattyCount < 10, 'fatties do not appear in one group at start');
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft',
    windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37
  });
  await wait(220);
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft',
    windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37
  });
  const moved = await evaluate('window.__bladeSceneOne.state()');
  assert(moved.player.x < initial.player.x - 15, 'keyboard moves the player');
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: 300, y: 790, button: 'left', clickCount: 1
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 395, y: 790, button: 'left', buttons: 1
  });
  await wait(220);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: 395, y: 790, button: 'left', clickCount: 1
  });
  const dragged = await evaluate('window.__bladeSceneOne.state()');
  assert(dragged.player.x > moved.player.x + 15, 'drag joystick moves the player');
  await wait(850);
  const entered = await evaluate('window.__bladeSceneOne.state()');
  assert(entered.fattyCount > 0 && entered.fattyCount <= 10);
  assert(entered.fatties.some(fatty => fatty.x - 46 < entered.view.x + entered.view.width),
    'fatty enters from outside the view');
  assert.equal(exceptions.length, 0, 'no uncaught browser exceptions');
  socket.close();
  console.log('PASS: browser loaded the H5; controls work; fatties enter from outside the view');
}
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => chrome.kill());
