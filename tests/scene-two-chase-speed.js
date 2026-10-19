'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+(?:\\.\\d+)?);`));
  assert(match, `缺少速度或距离常量 ${name}`);
  return Number(match[1]);
}

const playerSpeed = constant('PLAYER_SPEED');
const jiangbaoTrigger = constant('JIANGBAO_FLEE_TRIGGER_DISTANCE');
const jiangbaoApproach = constant('JIANGBAO_APPROACH_SPEED');
const jiangbaoFlee = constant('JIANGBAO_FLEE_SPEED');
const jiangbaoLateral = constant('JIANGBAO_LATERAL_SPEED');
const momoEntry = constant('MOMO_ENTRY_SPEED');
const momoChase = constant('MOMO_CHASE_SPEED');

assert.strictEqual(playerSpeed, 160, '主角速度必须由 185 降至 160');
assert.strictEqual(jiangbaoTrigger, 170, '酱爆必须等主角更接近后才回头逃跑');
assert.strictEqual(jiangbaoApproach, 24, '酱爆下行接近速度必须降低');
assert.strictEqual(jiangbaoFlee, 68, '酱爆逃跑速度必须降低');
assert.strictEqual(jiangbaoLateral, 78, '酱爆横向回中速度必须同步降低');
assert.strictEqual(momoEntry, 135, 'momo 对齐和入场速度必须降低');
assert.strictEqual(momoChase, 80, 'momo 追击速度必须降低');
assert(playerSpeed > jiangbaoFlee,
  '主角速度必须明确高于酱爆逃跑速度，保证能够追上');
assert(source.includes('distance(enemy, player) < JIANGBAO_FLEE_TRIGGER_DISTANCE'),
  '酱爆回头条件必须使用统一距离常量');

console.log('scene-two-chase-speed: PASS (slower actors + catchable jiangbao)');
