'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+(?:\\.\\d+)?);`));
  assert(match, `缺少可测试常量 ${name}`);
  return Number(match[1]);
}

const radiusX = constant('PORTAL_TRIGGER_RADIUS_X');
const radiusY = constant('PORTAL_TRIGGER_RADIUS_Y');
const holdTime = constant('PORTAL_TRIGGER_HOLD_TIME');
assert(radiusX >= 40, '传送门横向脚底触发区必须覆盖贴墙进入路径');
assert(radiusY >= 11 && radiusY <= 13,
  '纵向触发区必须收紧到脚底真正踩上紫色传送门后才命中');

const helperMatch = source.match(
  /function footInsidePortal\(footX, footY, portal\) \{([\s\S]*?)\n  \}/);
assert(helperMatch, '缺少可单测的传送门脚底判定函数');
const footInsidePortal = new Function('footX', 'footY', 'portal',
  'PORTAL_TRIGGER_RADIUS_X', 'PORTAL_TRIGGER_RADIUS_Y', helperMatch[1]);
const portal = {x: 700, y: 530};

assert(footInsidePortal(700, 530, portal, radiusX, radiusY),
  '从传送门正中进入必须命中');
assert(!footInsidePortal(700, 516, portal, radiusX, radiusY),
  '脚底尚未碰到紫色传送门时不能提前触发');
assert(footInsidePortal(700, 520, portal, radiusX, radiusY),
  '脚底碰到紫色传送门上缘后应进入判定区');
assert(footInsidePortal(675, 530, portal, radiusX, radiusY),
  '沿左墙进入传送门必须命中');
assert(footInsidePortal(725, 530, portal, radiusX, radiusY),
  '沿右墙进入传送门必须命中');
assert(!footInsidePortal(745, 530, portal, radiusX, radiusY),
  '传送门可见范围外不能误触发');

function crossesAtNormalSpeed(x) {
  const dt = 1 / 60;
  const speed = 185;
  let y = portal.y + radiusY + 8;
  let standingFor = 0;
  for (let frame = 0; frame < 60; frame++) {
    y -= speed * dt;
    standingFor = footInsidePortal(x, y, portal, radiusX, radiusY) ?
      standingFor + dt : 0;
    if (standingFor >= holdTime) return true;
  }
  return false;
}

assert(crossesAtNormalSpeed(portal.x), '正中正常速度穿过必须稳定触发');
assert(crossesAtNormalSpeed(portal.x - 25), '贴左墙正常速度穿过必须稳定触发');
assert(crossesAtNormalSpeed(portal.x + 25), '贴右墙正常速度穿过必须稳定触发');
assert(source.includes('state.portal.standingFor >= PORTAL_TRIGGER_HOLD_TIME'),
  '传送计时必须使用统一常量，避免判定与测试漂移');

console.log('scene-two-portal: PASS (center + both wall-side entries)');
