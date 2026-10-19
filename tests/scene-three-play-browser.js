const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {pathToFileURL} = require('url');

const root = path.resolve(__dirname, '..');
const screenshot = path.join(__dirname, 'scene-three-play-start.png');
const threatScreenshot = path.join(__dirname, 'scene-three-threat-block.png');
const transformedScreenshot = path.join(__dirname, 'scene-three-transformed.png');
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = browserPaths.find(candidate => fs.existsSync(candidate));
assert(browserPath, 'Chrome or Edge executable exists');
const html = pathToFileURL(path.join(root, 'src', 'scene3-play.html')).href;
const stateMachineHtml = pathToFileURL(path.join(__dirname, 'scene-three-state-machine.html')).href;
const threatHtml = pathToFileURL(path.join(__dirname, 'scene-three-threat-routes.html')).href;
const bossGuardHtml = pathToFileURL(path.join(__dirname, 'scene-three-boss-guard.html')).href;

function browserRun(extraArgs, target = html) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-three-play-'));
  const result = spawnSync(browserPath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
    '--no-first-run', '--hide-scrollbars', '--virtual-time-budget=6000',
    `--user-data-dir=${profile}`, '--window-size=600,900', ...extraArgs, target,
  ], {encoding: 'utf8', maxBuffer: 6 * 1024 * 1024});
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 4, retryDelay: 100}); }
  catch (_) {}
  return result;
}

const domRun = browserRun(['--dump-dom']);
assert.equal(domRun.status, 0, domRun.stderr || 'browser DOM run failed');
assert.match(domRun.stdout, /id="game"[^>]*data-render-status="ready"/,
  'all scene-three gameplay assets loaded and the loop initialized');
assert.match(domRun.stdout, /id="game"[^>]*data-gameplay-status="enabled"/,
  'scene-three gameplay is enabled');
assert.doesNotMatch(domRun.stdout, /data-render-status="failed"/,
  'scene-three gameplay page reports no asset-loading failure');

const stateRun = browserRun(['--dump-dom'], stateMachineHtml);
assert.equal(stateRun.status, 0, stateRun.stderr || 'state-machine browser run failed');
assert.match(stateRun.stdout, /data-state-machine="pass"/,
  '4+8 green blades, gold conversion, transformation and final bosses are reachable in order');
assert.doesNotMatch(stateRun.stdout, /data-state-machine="failed"/,
  'state-machine browser harness reports no story-transition failure');

const threatRun = browserRun(['--dump-dom'], threatHtml);
assert.equal(threatRun.status, 0, threatRun.stderr || 'threat-route browser run failed');
assert.match(threatRun.stdout, /data-threat-routes="pass"/,
  'giant and demon travel along fixed diagonal lines and stop at their blocking points');
assert.doesNotMatch(threatRun.stdout, /data-threat-routes="failed"/,
  'threat-route browser harness reports no route failure');

const bossGuardRun = browserRun(['--dump-dom'], bossGuardHtml);
assert.equal(bossGuardRun.status, 0, bossGuardRun.stderr || 'boss-guard browser run failed');
assert.match(bossGuardRun.stdout, /data-boss-guard="pass"/,
  'actual upper-right input spawns both final bosses and venom keeps slowing upper-left');
assert.doesNotMatch(bossGuardRun.stdout, /data-boss-guard="failed"/,
  'boss-guard browser harness reports no route-guard failure');

const shotRun = browserRun([`--screenshot=${screenshot}`]);
assert.equal(shotRun.status, 0, shotRun.stderr || 'browser screenshot run failed');
assert(fs.existsSync(screenshot) && fs.statSync(screenshot).size > 50000,
  'scene-three gameplay screenshot contains rendered content');

const threatShotRun = browserRun([`--screenshot=${threatScreenshot}`], threatHtml);
assert.equal(threatShotRun.status, 0, threatShotRun.stderr || 'threat screenshot run failed');
assert(fs.existsSync(threatScreenshot) && fs.statSync(threatScreenshot).size > 50000,
  'threat blocking screenshot contains rendered content');

const transformedShotRun = browserRun([`--screenshot=${transformedScreenshot}`], stateMachineHtml);
assert.equal(transformedShotRun.status, 0,
  transformedShotRun.stderr || 'transformation screenshot run failed');
assert(fs.existsSync(transformedScreenshot) && fs.statSync(transformedScreenshot).size > 50000,
  'transformation screenshot contains rendered content for visual size inspection');

console.log(`scene-three-play-browser: PASS (assets rendered; screenshot: ${screenshot})`);
