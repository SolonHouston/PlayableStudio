'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

for (const name of ['scene2-play.js', 'scene2.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
  assert(source.includes('const RESOURCE_ROWS = 9;'), `${name} 必须保留 9 行资源`);
  assert(source.includes('const RESOURCE_COLUMNS = 6;'), `${name} 每行必须保留 6 个资源`);
  assert(source.includes('const RESOURCE_ROW_START = 158;'),
    `${name} 资源区必须整体居中收拢`);
  assert(source.includes('const RESOURCE_ROW_SPACING = 68;'),
    `${name} 资源行距必须从 80 缩小到 68`);
  assert(source.includes('const RESOURCE_ROTATION_SPEED = .8;'),
    `${name} 必须使用统一顺时针旋转速度`);
  assert(source.includes('const RESOURCE_INWARD_OFFSET = 24;'),
    `${name} 每排资源必须向中间通道聚拢 24 世界单位`);
  assert(source.includes("const inwardOffset = side === 0 ?") &&
    source.includes('RESOURCE_INWARD_OFFSET : -RESOURCE_INWARD_OFFSET;'),
    `${name} 左右墙内资源必须对称地朝中间通道移动`);
  assert(source.includes('(span[0] + span[1]) / 2 + inwardOffset +'),
    `${name} 聚拢偏移必须应用到每一排资源的整体中心`);
  assert(source.includes('clock * RESOURCE_ROTATION_SPEED'),
    `${name} 所有气泡必须使用同一个正角度同步顺时针旋转`);
  assert(!source.includes('row * 80'), `${name} 不得保留旧的 80 行距`);
}

const playSource = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2-play.js'), 'utf8');
assert(!playSource.includes('resourceLayer'),
  '试玩页资源不能继续烘焙到静态图层，否则无法旋转');
assert(playSource.includes('paintText(ctx, resource.label, resource.x, resource.y + 17, 15);'),
  '资源数值文字必须保持正向，不随气泡旋转');

const previewSource = fs.readFileSync(path.join(__dirname, '..', 'src',
  'scene2.js'), 'utf8');
assert(previewSource.includes('requestAnimationFrame(draw);'),
  '预览页必须持续重绘才能展示旋转效果');

console.log('scene-two-resources: PASS (compact rows + synchronized clockwise rotation)');
