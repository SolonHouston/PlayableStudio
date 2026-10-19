'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');

const rewardRender = source.match(
  /for \(const reward of state\.rewards\) \{([\s\S]*?)\n    \}/);
assert(rewardRender, '缺少宝箱奖励绘制逻辑');
assert(rewardRender[1].includes(
  'reward.fromY + (reward.toY - reward.fromY) * launch'),
  '奖励必须直接移动到箱子上方目标点');
assert(!rewardRender[1].includes('settle') &&
  !rewardRender[1].includes('toY - 45'),
  '奖励不得先超过目标高度再慢慢落回');

const updateMomo = source.match(
  /function updateMomo\(dt\) \{([\s\S]*?)\n  \}/);
assert(updateMomo, '缺少 momo 更新逻辑');
assert(updateMomo[1].includes("if (momo.phase !== 'align')") &&
  updateMomo[1].includes('breakDurians(momo)') &&
  !source.includes('MOMO_DURIAN_BREAK_DEPTH'),
  'momo 对齐阶段不得破墙，从 enter 入场阶段起实际接触榴莲必须立即破坏');
assert(source.includes('const MOMO_ENTRY_DROP = 35;') &&
  source.includes('MOMO_ENTRY_Y = UPPER_GATE - 270 + DURIAN_SIZE / 2 +') &&
  source.includes('MOMO_ENTRY_DROP;'),
  'momo 出生点必须在上一版基础上再向下微调 15 世界单位');

const bladeClash = source.match(
  /function clashWithEnemyBlade\([\s\S]*?\n  \}/);
assert(bladeClash, '缺少场景二统一刀刃碰撞规则');
assert(bladeClash[0].includes('playerTier <= enemyTier') &&
  bladeClash[0].includes('enemyTier <= playerTier'),
  '低级刀必须破碎，同级刀必须双方破碎');
assert(bladeClash[0].includes('markBladeContact(state.player)') &&
  bladeClash[0].includes('removeBlade(enemy, enemyBlade)'),
  '碰刀必须记录脱战时间并保留延迟重排状态');
assert(!bladeClash[0].includes('pushAway') &&
  !bladeClash[0].includes('nextClashAt'),
  '连续碰刀不得附带击退或单次碰撞冷却');
assert(source.includes('clashWithEnemyBlade(sea, seaBlade, seaTip, playerBlade)'),
  '海神紫刃必须复用统一等级碰刀规则');
assert(source.includes('const BLADE_REFLOW_DELAY = .5;') &&
  source.includes('if (state.clock - (subject.lastBladeContactAt ?? -Infinity) < BLADE_REFLOW_DELAY) return;'),
  '剩余刀刃必须在脱战半秒后才开始重新布局');

assert(source.includes('const foot = playerFoot(state.player);') &&
  source.includes('footInsidePortal(foot.x, foot.y, state.portal)'),
  '传送门必须复用角色脚部碰撞模型');

console.log('scene-two-four-fixes: PASS (reward, momo, unified blade clash, foot reuse)');
