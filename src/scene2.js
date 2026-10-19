(() => {
  'use strict';

  const canvas = document.getElementById('scene2-map');
  const ctx = canvas.getContext('2d');
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const ASSET = '../assets/images/';
  const DURIAN_SIZE = 76;
  const RIGHT_TOP_MAX_DURIAN_SPACING = DURIAN_SIZE * 0.47;
  const RESOURCE_ROWS = 9;
  const RESOURCE_COLUMNS = 6;
  const RESOURCE_ROW_START = 158;
  const RESOURCE_ROW_SPACING = 68;
  const RESOURCE_ROTATION_SPEED = .8;
  const RESOURCE_INWARD_OFFSET = 24;
  const X_SCALE = 1.35;
  const X_OFFSET = 20;
  const TOP_SPACE = 140;
  const mapX = x => X_OFFSET + x * X_SCALE;
  const mapY = y => TOP_SPACE + y;
  const twoDurianY = (814 - 547) / 10 * 2;
  const twoDurianX = (375 - 552) * X_SCALE / 10 * 2;

  // Coordinates follow the supplied scene-two sketch. The wall polygons are
  // layout guides; the visible and permanent walls are the durian sprites.
  const sketchWalls = [
    [[227, 75], [483, 75], [422, 281], [552, 547], [375, 814], [62, 820], [234, 550], [55, 287]],
    [[642.5, 63], [930.5, 63], [863, 360], [982, 544], [814, 815], [493, 817], [665, 545], [575, 360]],
  ];
  const walls = sketchWalls.map(polygon => polygon.map(([x, y]) => [mapX(x), mapY(y)]));
  const images = {};
  const names = ['grass.webp', 'BG20.png', 'BG21.png', '榴莲.png', '宝箱.png', 'player-0.webp', 'red-orb.webp', 'gold-orb.webp', 'portal-0.webp'];

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
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function text(value, x, y, size, color = '#fff') {
    ctx.font = `900 ${size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 4);
    ctx.strokeStyle = '#1d2116';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }

  function horizontalSpan(polygon, y) {
    const crossings = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      if ((a[1] <= y && y < b[1]) || (b[1] <= y && y < a[1]))
        crossings.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    crossings.sort((a, b) => a - b);
    return crossings.length >= 2 ? [crossings[0], crossings[crossings.length - 1]] : null;
  }

  function corridorCenter(y) {
    const left = horizontalSpan(walls[0], y);
    const right = horizontalSpan(walls[1], y);
    return (left[1] + right[0]) / 2;
  }

  function drawGround() {
    // Match the existing scene-one grass art without adding a replacement asset.
    for (let x = 0; x < WIDTH; x += 900)
      for (let y = 0; y < HEIGHT; y += 900)
        ctx.drawImage(images['grass.webp'], x, y, 900, 900);
  }

  function drawInterior(polygon, name) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...polygon[0]);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(...polygon[i]);
    ctx.closePath();
    ctx.clip();
    const xs = polygon.map(point => point[0]);
    const ys = polygon.map(point => point[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    const right = Math.max(...xs), bottom = Math.max(...ys);
    ctx.drawImage(images[name], left, top, right - left, bottom - top);
    ctx.restore();
  }

  function drawResources(clock) {
    const rotation = clock * RESOURCE_ROTATION_SPEED;
    for (let side = 0; side < walls.length; side++) {
      const polygon = walls[side];
      const inwardOffset = side === 0 ?
        RESOURCE_INWARD_OFFSET : -RESOURCE_INWARD_OFFSET;
      for (let row = 0; row < RESOURCE_ROWS; row++) {
        const y = mapY(RESOURCE_ROW_START + row * RESOURCE_ROW_SPACING);
        const span = horizontalSpan(polygon, y);
        if (!span) continue;
        const gold = row % 2 === 0;
        for (let column = 0; column < RESOURCE_COLUMNS; column++) {
          const x = (span[0] + span[1]) / 2 + inwardOffset +
            (column - 2.5) * 48;
          drawCentered(gold ? 'gold-orb.webp' : 'red-orb.webp', x, y, 44, 44,
            rotation);
          text(gold ? '+66' : '+88', x, y + 17, 15);
        }
      }
    }
  }

  function drawWall(polygon, side) {
    // Keep the confirmed short passage walls and the red-line upper-right parallelogram counts.
    const centers = [];
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length];
      const short = side === 0 && i === 1 ||
        side === 1 && i === 2;
      const count = side === 1 && i === 0 ?
        Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) /
          RIGHT_TOP_MAX_DURIAN_SPACING) :
        side === 1 && (i === 1 || i === 7) ? 9 :
          side === 1 && i === 6 ? 8 : short ? 7 : 10;
      for (let n = 0; n < count; n++) {
        const t = n / count;
        centers.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    });
    // Paint from top to bottom so each lower durian covers the lower part above.
    centers.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of centers) {
      drawCentered('榴莲.png', x, y, DURIAN_SIZE, DURIAN_SIZE);
      text('99', x, y - 27, 17, '#fff9bf');
    }
  }

  function drawSpawn(x, y, label, labelY) {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#214b50a8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ecfaff';
    ctx.stroke();
    text(label, x, labelY, 18);
  }

  function drawChest() {
    const sheet = images['宝箱.png'];
    const chestY = mapY(12) + 35 + DURIAN_SIZE;
    const chestX = corridorCenter(chestY);
    // The supplied PNG has open and closed art; the approved closed frame is below.
    ctx.drawImage(sheet, 125, 598, 352, 350,
      chestX - 35, chestY - 35, 70, 70);
  }

  function drawPortalMarker() {
    const y = mapY(390);
    const left = horizontalSpan(walls[0], y);
    const right = horizontalSpan(walls[1], y);
    const x = (left[1] + right[0]) / 2;
    drawCentered('portal-0.webp', x, y, 108, 108);
    text('momo 召唤后生成传送门', x, y + 50, 16);
  }

  function draw(time = 0) {
    const clock = time / 1000;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawGround();
    drawInterior(walls[0], 'BG21.png');
    drawInterior(walls[1], 'BG20.png');
    walls.forEach(drawWall);
    drawResources(clock);
    drawPortalMarker();
    drawChest();
    drawSpawn(mapX(594), mapY(520), '酱爆出生点', mapY(483));
    drawSpawn(mapX(546), mapY(850) + twoDurianY,
      '海王出生点', mapY(884) + twoDurianY);
    drawCentered('player-0.webp', mapX(493) + twoDurianX,
      mapY(721) + twoDurianY, 56, DURIAN_SIZE);
    text('主角出生点', mapX(493) + twoDurianX,
      mapY(663) + twoDurianY, 18);
    requestAnimationFrame(draw);
  }

  Promise.all(names.map(loadImage)).then(() => requestAnimationFrame(draw)).catch((error) => {
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(error.message, 24, 36);
  });
})();
