'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');

const thresholdMatch = source.match(
  /const MOMO_PLAYER_OVERLAP_POINTS = (\d+);/);
assert(thresholdMatch, '缺少 momo 与主角最小重叠采样点常量');
const overlapThreshold = Number(thresholdMatch[1]);
assert(overlapThreshold >= 3,
  '不能因单个边缘采样点命中就提前判定主角死亡');

const functionMatch = source.match(
  /function momoRingTouchesPlayer\(momo, player\) \{([\s\S]*?)\n  \}/);
assert(functionMatch, '缺少 momo 光轮与主角碰撞函数');
const touchesPlayer = new Function('momo', 'player', 'ringAlpha',
  'MOMO_PLAYER_OVERLAP_POINTS', functionMatch[1]);

const momo = {x: 0, y: 0, angle: 0};
const player = {x: 0, y: 8};
function maskWithCells(cells) {
  const mask = new Uint8Array(Math.ceil(70 * 70 / 8));
  for (const [x, y] of cells) {
    const bit = y * 70 + x;
    mask[bit >> 3] |= 1 << (bit & 7);
  }
  return mask;
}

assert.strictEqual(touchesPlayer(momo, player,
  maskWithCells([[35, 35]]), overlapThreshold), false,
'单个光轮边缘像素接近主角时不得提前判失败');
assert.strictEqual(touchesPlayer(momo, player,
  maskWithCells([[33, 35], [35, 35], [36, 35]]), overlapThreshold), true,
'光轮与主角形成最小实际重叠后必须判失败');

console.log('scene-two-momo-contact: PASS (edge gap + real overlap)');
