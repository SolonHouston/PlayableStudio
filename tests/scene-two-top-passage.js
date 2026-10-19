'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const files = ['scene2-play.js', 'scene2.js'];
const original = [
  [[227, 18], [545, 12], [373, 281], [552, 547], [375, 814], [62, 820], [234, 550], [55, 287]],
  [[771, 17], [1092, 11], [863, 360], [982, 544], [814, 815], [493, 817], [665, 545], [545, 360]],
];

function readWalls(source) {
  const match = source.match(/const sketchWalls = (\[[\s\S]*?\n  \]);/);
  assert(match, '缺少可读取的 sketchWalls');
  return Function(`return ${match[1]}`)();
}

function angle(from, to) {
  return Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
}

function length(from, to) {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

function xAtY(from, to, y) {
  return from[0] + (y - from[1]) * (to[0] - from[0]) /
    (to[1] - from[1]);
}

for (const name of files) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
  const walls = readWalls(source);

  assert.deepStrictEqual(walls[0][0], [227, 75], `${name} 左上顶边起点不符合确认坐标`);
  assert.deepStrictEqual(walls[0][1], [483, 75], `${name} 左侧上端点不符合确认坐标`);
  assert.deepStrictEqual(walls[0][2], [422, 281], `${name} 左侧下端拐点不符合协调坐标`);
  assert.deepStrictEqual(walls[1][0], [642.5, 63], `${name} 右上平行四边形左斜边必须向上延长一个榴莲间距`);
  assert.deepStrictEqual(walls[1][1], [930.5, 63], `${name} 右上平行四边形右斜边必须同步等长延长`);
  assert.deepStrictEqual(walls[1][2], [863, 360], `${name} 右下点必须保持原坐标`);
  assert.deepStrictEqual(walls[1][7], [575, 360], `${name} 右侧中段上端必须恢复上一版坐标`);
  assert.strictEqual(walls[0][0][1], walls[0][1][1],
    `${name} 左上四边形顶边必须水平`);

  for (let side = 0; side < original.length; side++) {
    for (let point = 0; point < original[side].length; point++) {
      if ((side === 0 && point <= 2) ||
          (side === 1 && (point === 0 || point === 1 || point === 7))) continue;
      assert.deepStrictEqual(walls[side][point], original[side][point],
        `${name} 不得改动目标通道以外的墙体端点 ${side}:${point}`);
    }
  }

  const leftLengthRatio = length(walls[0][2], walls[0][1]) /
    length(original[0][2], original[0][1]);
  const rightLengthRatio = length(walls[1][7], walls[1][0]) /
    length(original[1][7], original[1][0]);
  assert(leftLengthRatio >= .65 && leftLengthRatio <= .7,
    `${name} 左侧顶部墙仍须保持约七成长度`);
  assert(rightLengthRatio >= .73 && rightLengthRatio <= .77,
    `${name} 右侧顶部墙须在上一版基础上增加一个榴莲间距`);

  const leftMiddleAngle = angle(walls[0][2], walls[0][3]);
  const rightMiddleAngle = angle(walls[1][7], walls[1][6]);
  assert(Math.abs(leftMiddleAngle - rightMiddleAngle) < .2,
    `${name} 中间段通道左右墙必须平行`);

  const rightTop = walls[1].slice(0, 3).concat([walls[1][7]]);
  const topVector = [rightTop[1][0] - rightTop[0][0],
    rightTop[1][1] - rightTop[0][1]];
  const bottomVector = [rightTop[2][0] - rightTop[3][0],
    rightTop[2][1] - rightTop[3][1]];
  const leftVector = [rightTop[3][0] - rightTop[0][0],
    rightTop[3][1] - rightTop[0][1]];
  const rightVector = [rightTop[2][0] - rightTop[1][0],
    rightTop[2][1] - rightTop[1][1]];
  assert.deepStrictEqual(topVector, bottomVector,
    `${name} 右上区域上下边必须等长平行`);
  assert.deepStrictEqual(leftVector, rightVector,
    `${name} 右上区域左右斜边必须等长平行`);

  const chestSketchY = 12 + 35 + 76;
  const leftX = xAtY(walls[0][1], walls[0][2], chestSketchY);
  const rightX = xAtY(walls[1][0], walls[1][7], chestSketchY);
  const corridorWidth = (rightX - leftX) * 1.35;
  assert(Math.abs(corridorWidth - 216) < 1,
    `${name} 宝箱高度处的顶部通道中心线宽应约为 216`);
  assert(corridorWidth / 2 - 50 - 43 >= 15,
    `${name} 主角居中时刀圈与两侧墙体至少保留 15 的安全余量`);

  assert(source.includes('side === 0 && edge === 1') ||
    source.includes('side === 0 && i === 1'),
  `${name} 左侧目标墙段必须改为 7 个榴莲`);
  assert(source.includes('edge === 7') || source.includes('i === 7'),
    `${name} 右侧目标墙段必须改为 7 个榴莲`);
}

const playSource = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');
assert(playSource.includes('const PLAYER_BLADE_RADIUS = 50;'),
  '场景二主角刀圈的绘制与实际攻击半径必须统一缩至 50');
const playHtml = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.html'), 'utf8');
assert(/<canvas[^>]*width="324"[^>]*height="535"/.test(playHtml),
  '场景二内部视野必须缩至 324×535，页面显示尺寸保持由 CSS 控制');
assert(playSource.includes('x: corridorCenter(CHEST_Y)'),
  '宝箱必须根据所在高度的通道中心动态居中');
assert(playSource.includes('toX: CHEST.x + reward.dx,') &&
  !playSource.includes('toX: CHEST.x + reward.dx + DURIAN_SIZE'),
  '两枚掉落资源必须以宝箱中心的 -43/+43 对称展开');
assert(playSource.includes("label: '+999999 红刃', dx: -43") &&
  playSource.includes("label: '+999999 彩刃', dx: 43"),
  '红刃和彩刃的左右偏移必须保持 -43/+43');

const previewSource = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2.js'), 'utf8');
assert(previewSource.includes('const chestX = corridorCenter(chestY);'),
  '场景二预览页的宝箱也必须根据通道中心动态居中');
assert(previewSource.includes('RIGHT_TOP_MAX_DURIAN_SPACING'),
  '场景二预览页也必须按右上顶边实际边长自动补密');

const countMatch = playSource.match(
  /function durianCount\(side, edge, a, b\) \{([\s\S]*?)\n  \}/);
assert(countMatch, '缺少可测试的榴莲数量规则');
const spacingMatch = playSource.match(
  /const RIGHT_TOP_MAX_DURIAN_SPACING = DURIAN_SIZE \* (\d+(?:\.\d+)?);/);
assert(spacingMatch, '缺少右上顶边最大榴莲间距常量');
const maxSpacing = 76 * Number(spacingMatch[1]);
const durianCount = new Function('side', 'edge', 'a', 'b',
  'RIGHT_TOP_MAX_DURIAN_SPACING', countMatch[1]);
const dummyA = [0, 0], dummyB = [100, 0];
assert.strictEqual(durianCount(0, 1, dummyA, dummyB, maxSpacing), 7,
  '左侧目标墙段必须恰好 7 个榴莲');
assert.strictEqual(durianCount(1, 7, dummyA, dummyB, maxSpacing), 9,
  '右上平行四边形左斜边必须再增加 1 个，成为 9 个榴莲');
assert.strictEqual(durianCount(1, 1, dummyA, dummyB, maxSpacing), 9,
  '右上平行四边形右斜边必须与左斜边同为 9 个榴莲');
assert.strictEqual(durianCount(0, 0, dummyA, dummyB, maxSpacing), 10,
  '相邻左侧墙段必须继续保持 10 个榴莲');
assert.strictEqual(durianCount(0, 2, dummyA, dummyB, maxSpacing), 10,
  '中间段左墙必须保持 10 个榴莲');
assert.strictEqual(durianCount(1, 6, dummyA, dummyB, maxSpacing), 8,
  '中间段右墙只能保持 8 个榴莲');
const rightTopA = [20 + 642.5 * 1.35, 140 + 63];
const rightTopB = [20 + 930.5 * 1.35, 140 + 63];
const rightTopCount = durianCount(1, 0, rightTopA, rightTopB, maxSpacing);
assert.strictEqual(rightTopCount, 11, '右上顶边必须以与其他顶边相近的叠加间距排成 11 个榴莲');
assert(length(rightTopA, rightTopB) / rightTopCount <= maxSpacing,
  '右上顶边相邻榴莲中心间距不得超过允许上限');

console.log('scene-two-top-passage: PASS (red-line upper-right parallelogram)');
