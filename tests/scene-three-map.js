'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'scene3.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'scene3.html'), 'utf8');

assert(source.includes('const FULL_DIAMOND_COUNT = 5;'), '必须绘制 5 个完整菱形');
assert(source.includes('const HORIZONTAL_CAR_COUNT = 9;'), '菱形上下边必须各有 9 辆头文字D');
assert(source.includes('const SLANTED_CAR_COUNT = 6;'), '菱形斜边必须各有 6 辆头文字D');
assert(source.includes('const GOLD_RESOURCES_PER_DIAMOND = 12;'), '每个菱形必须有 12 个金刀资源');
assert(source.includes("resourceCounts: Object.freeze({white: 6, green: 12, red: 12, gold: 60})"),
  '地图资源总数必须为 6 白、12 绿、12 红、60 金');
assert(source.includes('goblinCount: goblinSpawns.length'), '必须暴露哥布林数量供验收');
assert(source.includes("magnetMarker: 'text'"), '吸铁石必须按批准方案使用文字标记');
assert.match(source, /MAGNET_POSITION\s*=\s*\[500,\s*770\]/,
  '吸铁石必须在原位置基础上向下移动20世界单位');
assert.match(source, /drawLabelledSprite\('dy-run_00_00000\.png',\s*213,\s*592/,
  '毒液出生点必须在原位置基础上向左移动50世界单位');
assert(source.includes('gameplayEnabled: false'), '静态地图阶段不得开启玩法');
assert(source.includes("'grass.webp'"), '场景三必须使用统一草地素材');
assert(source.includes("'portal-0.webp'"), '底部必须显示结束传送门');
assert(html.includes('width="1400" height="1200"'), '场景三画布必须容纳分类后的水平与斜向净通道');
assert(source.includes("layoutPrecision: 'sketch-relative-v2'"), '必须声明按手绘图精确相对位置布局');
assert(source.includes('horizontalDiamondEdges: true'), '所有平行四边形上下底必须水平');
assert(source.includes("connectedDiamondPair: 'D3-bottom-overlaps-D5-top'"),
  '中部菱形底边必须与右下菱形上边形成特殊重叠');
assert(source.includes('const CAR_ROTATION = -12 * Math.PI / 180;'), '所有头文字 D 必须使用统一倾斜角度');
assert(source.includes('const HORIZONTAL_CHANNEL_CLEAR_WIDTH = PLAYER_MODEL_HEIGHT * 1.2;'),
  '水平通道实际净宽必须是 1.2 个主角模型高度');
assert(source.includes('const SLANTED_CHANNEL_CLEAR_WIDTH = PLAYER_MODEL_HEIGHT * 1.2;'),
  '斜向通道实际净宽必须是 1.2 个主角模型高度');
assert((source.match(/rowShiftX: -[0-9.]+/g) || []).length >= 2,
  '两组斜边通道资源都必须沿通道倾斜排列');
assert(source.includes('resourceWallGap: RESOURCE_WALL_GAP'), '必须暴露资源与墙体净距供验收');

const diamondMatch = source.match(/const fullDiamonds = \[([\s\S]*?)\n  \];/);
assert(diamondMatch, '缺少可检查的菱形坐标');
const diamonds = Function(`return [${diamondMatch[1]}]`)();
const constant = name => Number(source.match(new RegExp(`const ${name} = ([0-9.]+);`))[1]);
const side = constant('DIAMOND_SIDE');
const slantX = constant('DIAMOND_SLANT_X');
const rise = Math.sqrt(side ** 2 - slantX ** 2) / 2;
const points = diamonds.map(({center: [cx, cy]}) => [
  [cx - side / 2 + slantX / 2, cy - rise],
  [cx + side / 2 + slantX / 2, cy - rise],
  [cx + side / 2 - slantX / 2, cy + rise],
  [cx - side / 2 - slantX / 2, cy + rise],
]);
for (const polygon of points) {
  assert.equal(polygon[0][1], polygon[1][1], '每个平行四边形上底必须水平');
  assert.equal(polygon[2][1], polygon[3][1], '每个平行四边形下底必须水平');
}
assert(Math.abs(points[2][3][1] - points[4][0][1]) < 0.01 &&
  points[2][3][0] >= points[4][0][0] && points[2][3][0] <= points[4][1][0],
  'D3 左下角必须落在 D5 上底，保持手绘图中的相连关系');
assert(points[3][1][0] < points[4][0][0], '底部两个菱形之间必须保留传送门通道');

const edgeCenters = (a, b) => Array.from({length: 9}, (_, index) => {
  const t = index / 8;
  return [a[0] + (b[0] - a[0]) * t, a[1]];
});
const upperBottom = edgeCenters(points[2][3], points[2][2]);
const lowerRightTop = edgeCenters(points[4][0], points[4][1]);
const pointKey = point => `${point[0].toFixed(3)},${point[1].toFixed(3)}`;
const upperKeys = new Set(upperBottom.map(pointKey));
assert.equal(lowerRightTop.filter(point => upperKeys.has(pointKey(point))).length, 5,
  '上下两个 9 车边必须恰有 5 辆共用');
assert.equal(new Set([...upperBottom, ...lowerRightTop].map(pointKey)).size, 13,
  '特殊重叠区合并后必须恰为 13 个车位');
assert.equal(lowerRightTop.filter(point => point[0] < upperBottom[0][0] - 0.01).length, 4,
  '右下四边形上边必须向左伸出 4 辆');

const playerHeight = constant('PLAYER_MODEL_HEIGHT');
const carWidth = constant('CAR_WIDTH');
const carHeight = constant('CAR_HEIGHT');
const rotation = -12 * Math.PI / 180;
const normalAngle = Math.atan2(Math.sqrt(side ** 2 - slantX ** 2), -slantX) - Math.PI / 2;
const wallThickness = Math.abs(carWidth * Math.cos(rotation - normalAngle)) +
  Math.abs(carHeight * Math.sin(rotation - normalAngle));
const clearWidth = (a, b) => Math.abs((b[0] - a[0]) * Math.sqrt(side ** 2 - slantX ** 2) +
  (b[1] - a[1]) * slantX) / side - wallThickness;
assert(Math.abs(clearWidth(points[0][1], points[1][0]) - playerHeight * 1.2) < 0.01,
  '上方斜通道实际净宽必须为 1.2 个主角模型高度');
assert(Math.abs(clearWidth(points[3][1], points[4][0]) - playerHeight * 1.2) < 0.01,
  '下方斜通道实际净宽必须为 1.2 个主角模型高度');
const horizontalClear = points[2][0][1] - points[1][3][1] -
  (Math.abs(carWidth * Math.sin(rotation)) + Math.abs(carHeight * Math.cos(rotation)));
assert(Math.abs(horizontalClear - playerHeight * 1.2) < 0.01,
  '上右四边形与中间四边形必须保留 1.2 个主角高度的水平通道');
const pointLineDistance = (point, a, b) => Math.abs(
  (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])
) / Math.hypot(b[0] - a[0], b[1] - a[1]);
assert(pointLineDistance(points[2][0], points[1][0], points[1][3]) < 0.01 &&
  pointLineDistance(points[2][1], points[1][1], points[1][2]) < 0.01,
  '上右四边形与中间四边形的对应左右斜边必须共线');
const topWallsMatch = source.match(/const topTwoWalls = (\{[\s\S]*?\n  \});/);
assert(topWallsMatch, '缺少可检查的顶部两面墙坐标');
const topWalls = Function(`return (${topWallsMatch[1]})`)();
const verticalWallThickness = Math.abs(carWidth * Math.sin(rotation)) +
  Math.abs(carHeight * Math.cos(rotation));
assert(Math.abs(points[0][0][1] - topWalls.horizontal[0][1] - verticalWallThickness -
  playerHeight * 1.2) < 0.01, '顶部水平墙与左上四边形的净通道必须为 1.2 个主角高度');
assert(Math.abs(clearWidth(topWalls.slanted[0], points[1][0]) - playerHeight * 1.2) < 0.01,
  '顶部斜墙与右上四边形的净通道必须为 1.2 个主角高度');
assert(source.includes('const MOMO_RESOURCE_SPAN = HORIZONTAL_CAR_PITCH * 4;'),
  'momo 左下资源总宽必须锁定为 4 个水平车位');
assert(source.includes('const MOMO_RESOURCE_SPACING = RESOURCE_BUBBLE_SIZE;'),
  'momo 左下 3×2 气泡必须彼此紧贴');
assert(source.includes('momoSpan > MOMO_RESOURCE_SPAN + 0.01'),
  'momo 左下气泡总宽不得超过 4 个水平车位');
assert.equal(constant('RESOURCE_BUBBLE_SIZE'), 30,
  'momo 左下气泡及全图资源气泡必须由 25 放大到 30');
assert(source.includes("{id: 'red-finish', asset: 'red-orb.webp'") &&
  source.includes('columns: 3, rows: 2, spacing: RESOURCE_BUBBLE_SIZE'),
  '最下面通道的 6 个红刃必须排列为两行三列');
assert(source.includes('Math.abs(momoBottom - sharedWallTop - MOMO_VISIBLE_CONTACT_INSET) > 0.01'),
  'momo 左下气泡底部必须保持已确认的墙面相对偏移');
assert.equal(constant('MOMO_VISIBLE_CONTACT_INSET'), 6,
  'momo 左下6个气泡必须从上一版贴墙位置整体上移10个世界单位');
assert((source.match(/size: RESOURCE_BUBBLE_SIZE/g) || []).length === 5,
  '所有 5 组外部资源气泡必须使用统一尺寸');

const goblinMatch = source.match(/const goblinSpawns = \[([\s\S]*?)\n  \];/);
assert(goblinMatch, '缺少可检查的哥布林出生点');
const goblinPoints = Function(`return [${goblinMatch[1]}]`)();
assert.strictEqual(goblinPoints.length, 10, '哥布林出生点必须恰好为 10 个');
assert(new Set(goblinPoints.map(point => point[0])).size > 5 &&
  new Set(goblinPoints.map(point => point[1])).size > 5,
  '10 个哥布林必须自然错落，不能排成规整方阵');

console.log('scene-three-map: PASS (precise sketch relations + counts + static-stage boundary)');
