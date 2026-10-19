const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const screenshot = path.join(__dirname, 'scene-two-play-start.png');
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');

const html = pathToFileURL(path.join(root, 'src', 'scene2-play.html')).href;

function browserRun(extraArgs) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-two-play-'));
  const result = spawnSync(browserPath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
    '--no-first-run', '--hide-scrollbars', '--virtual-time-budget=6000',
    `--user-data-dir=${profile}`, '--window-size=600,900', ...extraArgs, html,
  ], {encoding: 'utf8', maxBuffer: 6 * 1024 * 1024});
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
  return result;
}

const domRun = browserRun(['--dump-dom']);
assert.equal(domRun.status, 0, domRun.stderr || 'browser DOM run failed');
assert.match(domRun.stdout, /<canvas id="game" width="324" height="535"/,
  'scene-two canvas uses the approved 324x535 internal viewport');
assert.doesNotMatch(domRun.stdout, /data-render-status="failed"/,
  'scene-two gameplay page reports no asset-loading failure');

const shotRun = browserRun([`--screenshot=${screenshot}`]);
assert.equal(shotRun.status, 0, shotRun.stderr || 'browser screenshot run failed');
assert(fs.existsSync(screenshot) && fs.statSync(screenshot).size > 50000,
  'scene-two gameplay screenshot contains rendered content');

console.log(`scene-two-play-browser: PASS (324x535 canvas; screenshot: ${screenshot})`);
