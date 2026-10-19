const fs = require('fs');
const path = require('path');
const os = require('os');
const {spawnSync} = require('child_process');
const {pathToFileURL} = require('url');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-three-browser-'));
const screenshot = path.join(__dirname, 'scene-three-map-full.png');
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');

const html = pathToFileURL(path.join(root, 'src', 'scene3.html')).href;
const commonArgs = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter', '--no-first-run',
  '--hide-scrollbars', '--virtual-time-budget=3000', `--user-data-dir=${profile}`,
];

const domRun = spawnSync(browserPath, [...commonArgs, '--dump-dom', html], {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});
assert.equal(domRun.status, 0, domRun.stderr || 'browser DOM run failed');
assert.match(domRun.stdout, /id="scene3-map"[^>]*data-render-status="ready"/,
  'canvas reports that all scene-three assets loaded and rendering completed');
assert.match(domRun.stdout, /id="scene3-map"[^>]*data-layout-status="precise"/,
  'canvas reports that sketch-relative adjacency and horizontal-edge checks passed');
assert.doesNotMatch(domRun.stdout, /data-render-status="failed"/,
  'canvas does not report a resource loading failure');

const shotRun = spawnSync(browserPath, [
  ...commonArgs, '--window-size=900,850', `--screenshot=${screenshot}`, html,
], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
assert.equal(shotRun.status, 0, shotRun.stderr || 'browser screenshot run failed');
assert(fs.existsSync(screenshot) && fs.statSync(screenshot).size > 100000,
  'scene-three screenshot was written and contains rendered content');

fs.rmSync(profile, {recursive: true, force: true});
console.log(`scene-three-browser: PASS (assets rendered; screenshot: ${screenshot})`);
