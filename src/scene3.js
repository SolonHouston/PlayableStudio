(() => {
  'use strict';

  const canvas = document.getElementById('scene3-map');
  const ctx = canvas.getContext('2d');
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const ASSET = '../assets/images/';
  const MAP_OFFSET_X = 180;

  const FULL_DIAMOND_COUNT = 5;
  const HORIZONTAL_CAR_COUNT = 9;
  const SLANTED_CAR_COUNT = 6;
  const GOLD_RESOURCES_PER_DIAMOND = 12;
  const DIAMOND_SIDE = 220;
  const DIAMOND_SLANT_X = 84.61538461538461;
  const DIAMOND_SLANT_Y = Math.sqrt(DIAMOND_SIDE ** 2 - DIAMOND_SLANT_X ** 2);
  const CAR_WIDTH = 68;
  const CAR_HEIGHT = 36;
  const CAR_ROTATION = -12 * Math.PI / 180;
  const PLAYER_MODEL_HEIGHT = 72;
  const HORIZONTAL_CHANNEL_CLEAR_WIDTH = PLAYER_MODEL_HEIGHT * 1.2;
  const SLANTED_CHANNEL_CLEAR_WIDTH = PLAYER_MODEL_HEIGHT * 1.2;
  const SLANTED_EDGE_ANGLE = Math.atan2(DIAMOND_SLANT_Y, -DIAMOND_SLANT_X);
  const SLANTED_NORMAL_ANGLE = SLANTED_EDGE_ANGLE - Math.PI / 2;
  const WALL_THICKNESS_NORMAL =
    Math.abs(CAR_WIDTH * Math.cos(CAR_ROTATION - SLANTED_NORMAL_ANGLE)) +
    Math.abs(CAR_HEIGHT * Math.sin(CAR_ROTATION - SLANTED_NORMAL_ANGLE));
  const WALL_THICKNESS_VERTICAL =
    Math.abs(CAR_WIDTH * Math.sin(CAR_ROTATION)) +
    Math.abs(CAR_HEIGHT * Math.cos(CAR_ROTATION));
  const SLANTED_CHANNEL_CENTERLINE_DISTANCE = SLANTED_CHANNEL_CLEAR_WIDTH + WALL_THICKNESS_NORMAL;
  const SLANTED_CHANNEL_HORIZONTAL_GAP =
    SLANTED_CHANNEL_CENTERLINE_DISTANCE * DIAMOND_SIDE / DIAMOND_SLANT_Y;
  const HORIZONTAL_CAR_PITCH = DIAMOND_SIDE / (HORIZONTAL_CAR_COUNT - 1);
  const RESOURCE_WALL_GAP = 6;
  const BOTTOM_RESOURCE_WALL_GAP = 0.4;
  const MOMO_VISIBLE_CONTACT_INSET = 6;
  const MOMO_CORNER_TANGENCY_TOLERANCE = 8;
  const RESOURCE_BUBBLE_SIZE = 30;
  const MOMO_RESOURCE_SPAN = HORIZONTAL_CAR_PITCH * 4;
  const MOMO_RESOURCE_SPACING = RESOURCE_BUBBLE_SIZE;

  const fullDiamonds = [
    {id: 'D1', center: [492, 467.28977014048616]},
    {id: 'D2', center: [888.3802404905086, 467.28977014048616]},
    {id: 'D3', center: [747.2018106242804, 806.1180018194339]},
    {id: 'D4', center: [156.2061855183871, 1009.194924896357]},
    {id: 'D5', center: [552.5864260088957, 1009.194924896357]},
  ];

  const topTwoWalls = {
    horizontal: [[480.8707375585359, 230], [700.8707375585359, 230]],
    slanted: [[700.8707375585359, 230], [785.4861221739205, 26.923076923076934]],
  };

  const goblinSpawns = [
    [344, 158], [377, 143], [410, 164], [444, 151], [469, 178],
    [359, 191], [390, 181], [421, 201], [451, 193], [478, 211],
  ];

  const resourceGroups = [
    {id: 'white-start', asset: 'white-orb.webp', center: [590.8707375585359, 297.8756543010123], columns: 3, rows: 2, spacing: RESOURCE_BUBBLE_SIZE, size: RESOURCE_BUBBLE_SIZE},
    {id: 'green-start', asset: 'green-orb.webp', center: [760.7793351783685, 297.8756543010123], columns: 2, rows: 2, spacing: RESOURCE_BUBBLE_SIZE, size: RESOURCE_BUBBLE_SIZE, rowShiftX: -12.5},
    {id: 'green-middle', asset: 'green-orb.webp', center: [690.1901202452543, 467.28977014048616], columns: 2, rows: 4, spacing: RESOURCE_BUBBLE_SIZE, size: RESOURCE_BUBBLE_SIZE, rowShiftX: -12.5},
    {id: 'red-momo', asset: 'red-orb.webp', center: [529.894118316588, 858.9808090568831], columns: 3, rows: 2, spacing: MOMO_RESOURCE_SPACING, size: RESOURCE_BUBBLE_SIZE},
    {id: 'red-finish', asset: 'red-orb.webp', center: [374.01169037902605, 962.1180018194339], columns: 3, rows: 2, spacing: RESOURCE_BUBBLE_SIZE, size: RESOURCE_BUBBLE_SIZE, rowShiftX: -12.5},
  ];

  const MAGNET_POSITION = [500, 770];
  const PORTAL_POSITION = [336.51169037902605, 1052.1180018194339];

  const images = {};
  const imageNames = [
    'grass.webp', 'car.webp', 'white-orb.webp', 'green-orb.webp',
    'gold-orb.webp', 'red-orb.webp', 'portal-0.webp', 'player-0.webp',
    'jiangbao-0.webp', 'poseidon-0.webp', 'momo-0.webp',
    '巨人_00000.png', '哥布林走路_00000.png', 'dy-run_00_00000.png',
    'ftb-run_00.png',
  ];

  function loadImage(name) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images[name] = image; resolve(); };
      image.onerror = () => reject(new Error(`无法加载素材：${name}`));
      image.src = ASSET + name;
    });
  }

  function drawCentered(name, x, y, width, height, rotation = 0) {
    const image = images[name];
    ctx.save();
    ctx.translate(x + MAP_OFFSET_X, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawContained(name, x, y, maxWidth, maxHeight) {
    const image = images[name];
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    drawCentered(name, x, y, image.naturalWidth * scale, image.naturalHeight * scale);
  }

  function text(value, x, y, size, color = '#fff') {
    ctx.font = `900 ${size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 4);
    ctx.strokeStyle = '#1d2116';
    ctx.strokeText(value, x + MAP_OFFSET_X, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x + MAP_OFFSET_X, y);
  }

  function drawGround() {
    for (let x = 0; x < WIDTH; x += 900)
      for (let y = 0; y < HEIGHT; y += 900)
        ctx.drawImage(images['grass.webp'], x, y, 900, 900);
  }

  function diamondPoints([cx, cy]) {
    const half = DIAMOND_SIDE / 2;
    const lean = DIAMOND_SLANT_X / 2;
    const rise = DIAMOND_SLANT_Y / 2;
    return [
      [cx - half + lean, cy - rise],
      [cx + half + lean, cy - rise],
      [cx + half - lean, cy + rise],
      [cx - half - lean, cy + rise],
    ];
  }

  function drawCarSegment(a, b, count) {
    for (let index = 0; index < count; index++) {
      const progress = count === 1 ? 0 : index / (count - 1);
      const x = a[0] + (b[0] - a[0]) * progress;
      const y = a[1] + (b[1] - a[1]) * progress;
      drawCentered('car.webp', x, y, CAR_WIDTH, CAR_HEIGHT, CAR_ROTATION);
    }
  }

  function drawDiamondWalls(points) {
    drawCarSegment(points[0], points[1], HORIZONTAL_CAR_COUNT);
    drawCarSegment(points[1], points[2], SLANTED_CAR_COUNT);
    drawCarSegment(points[2], points[3], HORIZONTAL_CAR_COUNT);
    drawCarSegment(points[3], points[0], SLANTED_CAR_COUNT);
  }

  function drawResourceGrid(asset, centerX, centerY, columns, rows, spacing, size = 36, rowShiftX = 0) {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = centerX + (row - (rows - 1) / 2) * rowShiftX +
          (column - (columns - 1) / 2) * spacing;
        const y = centerY + (row - (rows - 1) / 2) * spacing;
        drawCentered(asset, x, y, size, size);
      }
    }
  }

  function drawDiamondResources(center) {
    for (let row = 0; row < 3; row++) {
      const yOffset = (row - 1) * 48;
      const rowCenterX = center[0] - yOffset * DIAMOND_SLANT_X / DIAMOND_SLANT_Y;
      for (let column = 0; column < 4; column++) {
        const x = rowCenterX + (column - 1.5) * 48;
        drawCentered('gold-orb.webp', x, center[1] + yOffset,
          RESOURCE_BUBBLE_SIZE, RESOURCE_BUBBLE_SIZE);
      }
    }
  }

  function drawLabelledSprite(name, x, y, width, height, label, labelOffset) {
    drawContained(name, x, y, width, height);
    text(label, x, y + labelOffset, 18);
  }

  function drawTextMarker(x, y, label, radius = 30) {
    ctx.beginPath();
    ctx.arc(x + MAP_OFFSET_X, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#214b50b8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ecfaff';
    ctx.stroke();
    text(label, x, y, 18, '#fff7bf');
  }

  function drawSpawns() {
    drawLabelledSprite('巨人_00000.png', 476, 70, 86, 102, '巨人出生点', 62);

    for (const [x, y] of goblinSpawns)
      drawContained('哥布林走路_00000.png', x, y, 36, 46);
    text('10哥布林出生区', 390, 230, 16);

    drawLabelledSprite('player-0.webp', 357, 262, 54, 72, '主角出生点', 48);
    drawLabelledSprite('jiangbao-0.webp', 805, 122, 58, 76, '酱爆出生点', 55);
    drawTextMarker(273, 396, '魔人');
    text('魔人出生点', 273, 444, 18);
    drawLabelledSprite('poseidon-0.webp', 466, 594, 62, 82, '海神出生点', 58);
    drawLabelledSprite('dy-run_00_00000.png', 213, 592, 86, 96, '毒液出生点', 68);
    drawLabelledSprite('ftb-run_00.png', 238, 693, 66, 84, '斧头帮出生点', 60);
    drawLabelledSprite('momo-0.webp', 605, 696, 72, 90, 'momo出生点', 60);
  }

  function validatePreciseLayout() {
    const diamonds = fullDiamonds.map(diamond => diamondPoints(diamond.center));
    for (const points of diamonds) {
      if (points[0][1] !== points[1][1] || points[2][1] !== points[3][1])
        throw new Error('平行四边形上下底必须严格水平');
    }
    const horizontalProjection =
      Math.abs(CAR_WIDTH * Math.cos(CAR_ROTATION)) + Math.abs(CAR_HEIGHT * Math.sin(CAR_ROTATION));
    const slantedProjection =
      Math.abs(CAR_WIDTH * Math.cos(CAR_ROTATION - SLANTED_EDGE_ANGLE)) +
      Math.abs(CAR_HEIGHT * Math.sin(CAR_ROTATION - SLANTED_EDGE_ANGLE));
    const horizontalOverlap = horizontalProjection - DIAMOND_SIDE / (HORIZONTAL_CAR_COUNT - 1);
    const slantedOverlap = slantedProjection - DIAMOND_SIDE / (SLANTED_CAR_COUNT - 1);
    if (slantedOverlap <= 0 || horizontalOverlap <= slantedOverlap)
      throw new Error('斜边车辆必须重叠，且重叠程度小于水平边');

    const clearWidth = (a, b) =>
      Math.abs((b[0] - a[0]) * DIAMOND_SLANT_Y + (b[1] - a[1]) * DIAMOND_SLANT_X) /
        DIAMOND_SIDE - WALL_THICKNESS_NORMAL;
    const upperClear = clearWidth(diamonds[0][1], diamonds[1][0]);
    const lowerClear = clearWidth(diamonds[3][1], diamonds[4][0]);
    if (Math.abs(upperClear - SLANTED_CHANNEL_CLEAR_WIDTH) > 0.01 ||
        Math.abs(lowerClear - SLANTED_CHANNEL_CLEAR_WIDTH) > 0.01)
      throw new Error('左右斜墙之间的通道净宽必须等于 1.2 个主角模型高度');

    const middleHorizontalClear =
      diamonds[2][0][1] - diamonds[1][3][1] - WALL_THICKNESS_VERTICAL;
    const edgeCollinearity = (a, b, point) => Math.abs(
      (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])
    ) / DIAMOND_SIDE;
    if (Math.abs(middleHorizontalClear - HORIZONTAL_CHANNEL_CLEAR_WIDTH) > 0.01 ||
        edgeCollinearity(diamonds[1][0], diamonds[1][3], diamonds[2][0]) > 0.01 ||
        edgeCollinearity(diamonds[1][1], diamonds[1][2], diamonds[2][1]) > 0.01)
      throw new Error('上右与中间四边形必须斜边共线，并保留 1.2 个主角高度的水平通道');

    const edgeCenters = (a, b) => Array.from({length: HORIZONTAL_CAR_COUNT}, (_, index) => {
      const progress = index / (HORIZONTAL_CAR_COUNT - 1);
      return [a[0] + (b[0] - a[0]) * progress, a[1]];
    });
    const upperBottom = edgeCenters(diamonds[2][3], diamonds[2][2]);
    const lowerRightTop = edgeCenters(diamonds[4][0], diamonds[4][1]);
    const key = point => `${point[0].toFixed(3)},${point[1].toFixed(3)}`;
    const upperKeys = new Set(upperBottom.map(key));
    const sharedCount = lowerRightTop.filter(point => upperKeys.has(key(point))).length;
    const unionCount = new Set([...upperBottom, ...lowerRightTop].map(key)).size;
    if (sharedCount !== 5 || unionCount !== 13 ||
        Math.abs(upperBottom[0][0] - lowerRightTop[4][0]) > 0.01)
      throw new Error('D3 下边与 D5 上边必须形成 5 辆共用、4 辆向左伸出的 13 车区');

    const groupPoints = group => {
      const points = [];
      for (let row = 0; row < group.rows; row++)
        for (let column = 0; column < group.columns; column++)
          points.push([
            group.center[0] + (row - (group.rows - 1) / 2) * (group.rowShiftX || 0) +
              (column - (group.columns - 1) / 2) * group.spacing,
            group.center[1] + (row - (group.rows - 1) / 2) * group.spacing,
          ]);
      return points;
    };
    const lineDistance = (point, a, b) =>
      Math.abs((b[0] - a[0]) * (a[1] - point[1]) - (a[0] - point[0]) * (b[1] - a[1])) /
        Math.hypot(b[0] - a[0], b[1] - a[1]);
    const corridorChecks = [
      [resourceGroups.find(group => group.id === 'green-middle'), diamonds[0][1], diamonds[0][2], diamonds[1][0], diamonds[1][3], RESOURCE_WALL_GAP],
      [resourceGroups.find(group => group.id === 'red-finish'), diamonds[3][1], diamonds[3][2], diamonds[4][0], diamonds[4][3], BOTTOM_RESOURCE_WALL_GAP],
      [resourceGroups.find(group => group.id === 'green-start'), topTwoWalls.slanted[0], topTwoWalls.slanted[1], diamonds[1][0], diamonds[1][3], RESOURCE_WALL_GAP],
    ];
    for (const [group, wallA1, wallA2, wallB1, wallB2, resourceWallGap] of corridorChecks) {
      const required = WALL_THICKNESS_NORMAL / 2 + group.size / 2 + resourceWallGap;
      if (group.rowShiftX === 0 || groupPoints(group).some(point =>
        lineDistance(point, wallA1, wallA2) < required ||
        lineDistance(point, wallB1, wallB2) < required))
        throw new Error('通道资源必须倾斜排列，并与两侧墙体保持净距');
    }
    const momoGroup = resourceGroups.find(group => group.id === 'red-momo');
    const momoSpan = (momoGroup.columns - 1) * momoGroup.spacing + momoGroup.size;
    const momoPoints = groupPoints(momoGroup);
    const momoLeft = Math.min(...momoPoints.map(point => point[0])) - momoGroup.size / 2;
    const momoRight = Math.max(...momoPoints.map(point => point[0])) + momoGroup.size / 2;
    const momoBottom = Math.max(...momoPoints.map(point => point[1])) + momoGroup.size / 2;
    const extensionLeft = diamonds[4][0][0];
    const extensionRight = diamonds[2][3][0];
    const sharedWallTop = diamonds[4][0][1] - WALL_THICKNESS_VERTICAL / 2;
    const requiredSlantDistance = WALL_THICKNESS_NORMAL / 2 + momoGroup.size / 2 -
      MOMO_CORNER_TANGENCY_TOLERANCE;
    if (resourceGroups.some(group => group.size !== RESOURCE_BUBBLE_SIZE) ||
        Math.abs(momoGroup.spacing - momoGroup.size) > 0.01 || momoSpan > MOMO_RESOURCE_SPAN + 0.01 ||
        momoLeft < extensionLeft - 0.01 || momoRight > extensionRight + 0.01 ||
        Math.abs(momoBottom - sharedWallTop - MOMO_VISIBLE_CONTACT_INSET) > 0.01 ||
        momoPoints.some(point => lineDistance(point, diamonds[2][0], diamonds[2][3]) < requiredSlantDistance))
      throw new Error('momo 左下气泡必须紧贴成 3×2，位于 4 车延伸区内且底部贴墙');

    const whiteGroup = resourceGroups.find(group => group.id === 'white-start');
    const upperHorizontalClear = diamonds[0][0][1] - topTwoWalls.horizontal[0][1] - WALL_THICKNESS_VERTICAL;
    const upperSlantedClear = clearWidth(topTwoWalls.slanted[0], diamonds[1][0]);
    const whiteRequired = WALL_THICKNESS_VERTICAL / 2 + whiteGroup.size / 2 + RESOURCE_WALL_GAP;
    if (Math.abs(upperHorizontalClear - HORIZONTAL_CHANNEL_CLEAR_WIDTH) > 0.01 ||
        Math.abs(upperSlantedClear - SLANTED_CHANNEL_CLEAR_WIDTH) > 0.01 ||
        groupPoints(whiteGroup).some(point =>
          point[1] - topTwoWalls.horizontal[0][1] < whiteRequired ||
          diamonds[0][0][1] - point[1] < whiteRequired))
      throw new Error('最上方水平与斜向通道必须为 1.2 个主角高度，资源不得盖墙');
    if (topTwoWalls.horizontal[1][0] !== topTwoWalls.slanted[0][0] ||
        topTwoWalls.horizontal[1][1] !== topTwoWalls.slanted[0][1])
      throw new Error('顶部两面墙必须在端点相连');
  }

  function drawMap() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawGround();

    for (const diamond of fullDiamonds)
      drawDiamondResources(diamond.center);
    for (const diamond of fullDiamonds)
      drawDiamondWalls(diamondPoints(diamond.center));

    drawCarSegment(...topTwoWalls.horizontal, HORIZONTAL_CAR_COUNT);
    drawCarSegment(...topTwoWalls.slanted, SLANTED_CAR_COUNT);

    for (const group of resourceGroups)
      drawResourceGrid(group.asset, ...group.center, group.columns, group.rows, group.spacing,
        group.size, group.rowShiftX);

    drawSpawns();
    drawTextMarker(...MAGNET_POSITION, '吸铁石', 34);
    drawCentered('portal-0.webp', ...PORTAL_POSITION, 96, 96);
    text('触发游戏结束的传送门', PORTAL_POSITION[0], PORTAL_POSITION[1] + 66, 20, '#efe6ff');
  }

  window.__SCENE3_MAP__ = Object.freeze({
    fullDiamondCount: FULL_DIAMOND_COUNT,
    horizontalCarsPerEdge: HORIZONTAL_CAR_COUNT,
    slantedCarsPerEdge: SLANTED_CAR_COUNT,
    goldResourcesPerDiamond: GOLD_RESOURCES_PER_DIAMOND,
    goblinCount: goblinSpawns.length,
    resourceCounts: Object.freeze({white: 6, green: 12, red: 12, gold: 60}),
    magnetMarker: 'text',
    mapOffsetX: MAP_OFFSET_X,
    layoutPrecision: 'sketch-relative-v2',
    horizontalDiamondEdges: true,
    connectedDiamondPair: 'D3-bottom-overlaps-D5-top',
    carRotationDegrees: CAR_ROTATION * 180 / Math.PI,
    horizontalChannelClearWidth: HORIZONTAL_CHANNEL_CLEAR_WIDTH,
    slantedChannelClearWidth: SLANTED_CHANNEL_CLEAR_WIDTH,
    horizontalChannelWidthInPlayerHeights: HORIZONTAL_CHANNEL_CLEAR_WIDTH / PLAYER_MODEL_HEIGHT,
    slantedChannelWidthInPlayerHeights: SLANTED_CHANNEL_CLEAR_WIDTH / PLAYER_MODEL_HEIGHT,
    sharedEdgeCars: Object.freeze({union: 13, upperBottom: 9, lowerTop: 9, shared: 5, lowerLeftExtension: 4}),
    resourceWallGap: RESOURCE_WALL_GAP,
    resourceBubbleSize: RESOURCE_BUBBLE_SIZE,
    momoResourceSpan: MOMO_RESOURCE_SPAN,
    momoResourceWidth: RESOURCE_BUBBLE_SIZE * 3,
    middleHorizontalChannelClearWidth: HORIZONTAL_CHANNEL_CLEAR_WIDTH,
    topHorizontalChannelClearWidth: HORIZONTAL_CHANNEL_CLEAR_WIDTH,
    topSlantedChannelClearWidth: SLANTED_CHANNEL_CLEAR_WIDTH,
    gameplayEnabled: false,
  });

  canvas.dataset.renderStatus = 'loading';
  Promise.all(imageNames.map(loadImage)).then(() => {
    validatePreciseLayout();
    drawMap();
    canvas.dataset.layoutStatus = 'precise';
    canvas.dataset.renderStatus = 'ready';
  }).catch((error) => {
    canvas.dataset.renderStatus = 'failed';
    canvas.dataset.renderError = error.message;
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(error.message, 24, 36);
  });
})();
