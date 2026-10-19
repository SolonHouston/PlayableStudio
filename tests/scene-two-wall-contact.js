'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+);`));
  assert(match, `缺少可测试常量 ${name}`);
  return Number(match[1]);
}

const innerWallMargin = constant('INNER_WALL_MARGIN');
const footY = constant('PLAYER_FOOT_Y');
const footHalfWidth = constant('PLAYER_FOOT_HALF_WIDTH');

assert.strictEqual(innerWallMargin, 55,
  '墙体安全边距必须继续保持 55 世界单位');
assert(footHalfWidth > 0 && footHalfWidth <= 14,
  '脚部碰撞模型应保持窄小，避免扩大角色整体碰撞体积');

const footMatch = source.match(
  /function playerFoot\(player, x = player\.x, y = player\.y\) \{([\s\S]*?)\n  \}/);
assert(footMatch, '缺少独立的角色脚部碰撞模型');
const playerFoot = new Function('player', 'x', 'y', 'PLAYER_FOOT_Y',
  'PLAYER_FOOT_HALF_WIDTH', footMatch[1]);
const foot = playerFoot({x: 500, y: 600}, 500, 600, footY, footHalfWidth);
assert.deepStrictEqual(foot, {x: 500, y: 633, left: 490, right: 510},
  '脚部模型必须位于角色底部并包含左右边缘');

assert(source.includes('const foot = playerFoot(p, nx, ny);'),
  '墙体碰撞必须读取脚部模型，而不是角色整身或视觉位置');
assert(source.includes('const bounds = playerFootCorridorBounds(foot.y);'),
  '墙体限制必须按目标帧脚底位置直接计算');
assert(!source.includes('visualOffsetX') &&
  !source.includes('targetWallVisualOffset') &&
  !source.includes('WALL_VISUAL_CONTACT_OFFSET'),
  '不得再用进入墙体后回收的绘制偏移伪造贴墙效果');

const lowerRightExpansion = constant('LOWER_RIGHT_FOOT_EXPANSION');
assert.strictEqual(lowerRightExpansion, 7,
  '最下方向右上通道的右侧只允许向外放宽 7 世界单位');
assert.strictEqual(innerWallMargin - footHalfWidth - lowerRightExpansion, 38,
  '完整放宽后脚部右边缘应到达 76×76 榴莲的可见外沿');
const expansionMatch = source.match(
  /function lowerRightFootExpansion\(footY\) \{([\s\S]*?)\n  \}/);
assert(expansionMatch, '缺少最下方右墙的局部平滑放宽函数');
const lowerRightFootExpansion = new Function('footY', 'clamp',
  'LOWER_RIGHT_PASSAGE_Y', 'LOWER_RIGHT_FOOT_EXPANSION', expansionMatch[1]);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lowerStartY = 687;
assert.strictEqual(lowerRightFootExpansion(lowerStartY - 1, clamp,
  lowerStartY, lowerRightExpansion), 0,
  '最下方通道以上的右墙不能被改动');
assert.strictEqual(lowerRightFootExpansion(lowerStartY, clamp,
  lowerStartY, lowerRightExpansion), 0,
  '局部放宽必须从原边界连续开始，不能产生横向跳变');
assert.strictEqual(lowerRightFootExpansion(lowerStartY + 48, clamp,
  lowerStartY, lowerRightExpansion), 7,
  '进入最下方右墙直线段后应完整放宽 7 世界单位');
assert(source.includes(
  'right: edgeBounds.right - PLAYER_FOOT_HALF_WIDTH + rightExpansion'),
  '放宽量只能加到脚部右边界');
assert(source.includes('left: edgeBounds.left + PLAYER_FOOT_HALF_WIDTH,'),
  '脚部左边界必须保持原值');

console.log('scene-two-wall-contact: PASS (lower-right local expansion only)');
