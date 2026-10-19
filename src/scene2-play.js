(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const shell = document.getElementById('shell');
  const hud = {
    objective: document.getElementById('objective'),
    blades: document.getElementById('blade-count'),
    hint: document.getElementById('phase-hint'),
    toast: document.getElementById('toast'),
    result: document.getElementById('result'),
    title: document.getElementById('result-title'),
    detail: document.getElementById('result-detail'),
    retry: document.getElementById('retry'),
    stick: document.getElementById('floating-stick'),
    knob: document.getElementById('floating-knob'),
  };
  const VIEW_W = canvas.width, VIEW_H = canvas.height;
  const WORLD_W = 1540, WORLD_H = 1200;
  const X_SCALE = 1.35, X_OFFSET = 20, TOP_SPACE = 140;
  const X = x => X_OFFSET + x * X_SCALE;
  const Y = y => TOP_SPACE + y;
  const TWO_DURIAN_Y = (814 - 547) / 10 * 2;
  const TWO_DURIAN_X = (375 - 552) * X_SCALE / 10 * 2;
  const UPPER_GATE = Y(85), LOWER_GATE = Y(845);
  const PLAYER_SPEED = 160;
  const BLADE_SPEED = 2.6;
  const BLADE_REFLOW_DELAY = .5;
  const BLADE_REFLOW_SPEED = 5.5;
  const CONTACT_SOUND_COOLDOWN = .08;
  const CHEST_HIT_SCALE_DURATION = .18;
  const JIANGBAO_FLEE_TRIGGER_DISTANCE = 170;
  const JIANGBAO_APPROACH_SPEED = 24;
  const JIANGBAO_FLEE_SPEED = 68;
  const JIANGBAO_LATERAL_SPEED = 78;
  const MOMO_ENTRY_SPEED = 135;
  const MOMO_CHASE_SPEED = 80;
  const MOMO_EARLY_TURN_SPEED = 38;
  const MOMO_TURN_SPEED = 100;
  const PLAYER_BLADE_RADIUS = 50;
  const JIANGBAO_BLADE_RADIUS = 62;
  const SEA_BLADE_RADIUS = 70;
  const BLADE_TIER = {white: 0, green: 1, gold: 2, purple: 3, rainbow: 4};
  const DURIAN_SIZE = 76, BLADE_WALL_RADIUS = 43;
  const RIGHT_TOP_MAX_DURIAN_SPACING = DURIAN_SIZE * 0.47;
  const RESOURCE_ROWS = 9;
  const RESOURCE_COLUMNS = 6;
  const RESOURCE_ROW_START = 158;
  const RESOURCE_ROW_SPACING = 68;
  const RESOURCE_ROTATION_SPEED = .8;
  const RESOURCE_INWARD_OFFSET = 24;
  const MOMO_PLAYER_OVERLAP_POINTS = 3;
  const VIDEO_FX = {
    wallSpark: {file: 'wall-spark.mp4', w: 72, h: 72},
    upgrade2: {file: 'upgrade-2.mp4', w: 88, h: 112},
    metal: {file: 'metal.mp4', crop: [470, 520, 390, 390], w: 68, h: 68},
    clash: {file: 'clash.mp4', crop: [180, 170, 720, 650], w: 54, h: 49},
    walkAcquire2: {file: 'walk-acquire-2.mp4', w: 72, h: 72},
    chestGlow: {file: 'chest-glow.mp4', w: 92, h: 68},
  };
  // Opaque pixels sampled from the supplied ring (70×70) and durian (13×13).
  // Keep these masks local so opening the H5 directly from disk needs no canvas readback.
  const MOMO_RING_MASK = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY7/EAAAAAAAAP+e8AAAAAAAz47H8AAAAAAN9s/qcAAAAAGI//788AAAAAj5/v9+YAAAAI/+//77MAAAAf7//v/8EAAADt/+//5/AAAAge7//v/+AAAB/v/+//72AAEO//7//v+yAADP/v/+//7gAAn+//6//vswAQLv9v/u//4QAE/+/bq//v8AAf7//n/s//YADv/+v96//rEAz/7/arf+/+AB/v/6W37/+jAOz/7yAOf+/gCJ/nYQAY7/8gGu/7QADP/+8Qj//nEACHz/cA/+9xAAAM/2Mc7/sgAAj/78AP/+8AABzv+yDd7/IAAAz/7hCv/2AAANvv8wT/LBAAAO//4B/v/AAABP/vMM//4gAAE+/7AP/vcAAAg99iHO/8IAAA/+/AB//jAAAU7/sg3O/zAAAP/+8Qr//hAADZ7/MM/+MAAAjv/2Ae7z8gAI//7xCP/+8wAP3v9ADf7/0ADG7/gRBv/+cAT3/jcAzf7/7K3+//ABfv9+3Wb//jAI//7fvt/+9wAP/vt25/7/8AEO//792v/yIACH/v9+//5+AAHs//7f/v/wAAB//vf+//4wAA3e//7//vcAAAb//v/+//AAAA/+//7/cBAAAQ7v/v/+9wAAAIv+//7/8AAAAcz//v/+EAAAAG/u//DgAAAAAfL//v8QAAAAAO1+P/IAAAAAAP4/HjAAAAAAAP+e8AAAAAAAAY7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  const DURIAN_MASK = 'AAAAIIcI8I8w5x/g/wjzDzDHECAAAA==';
  const sketchWalls = [
    [[227, 75], [483, 75], [422, 281], [552, 547], [375, 814], [62, 820], [234, 550], [55, 287]],
    [[642.5, 63], [930.5, 63], [863, 360], [982, 544], [814, 815], [493, 817], [665, 545], [575, 360]],
  ];
  const walls = sketchWalls.map(polygon => polygon.map(([x, y]) => [X(x), Y(y)]));
  const PLAYER_FOOT_Y = 33;
  const PLAYER_FOOT_HALF_WIDTH = 10;
  const INNER_WALL_MARGIN = 55;
  const LOWER_RIGHT_PASSAGE_Y = Y(547);
  const LOWER_RIGHT_FOOT_EXPANSION = 7;
  function roundedInnerWall(points) {
    const path = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1];
      const beforeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const afterLength = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const before = [b[0] + (a[0] - b[0]) * 48 / beforeLength,
        b[1] + (a[1] - b[1]) * 48 / beforeLength];
      const after = [b[0] + (c[0] - b[0]) * 48 / afterLength,
        b[1] + (c[1] - b[1]) * 48 / afterLength];
      path.push(before);
      for (let step = 1; step <= 10; step++) {
        const t = step / 10, u = 1 - t;
        path.push([u * u * before[0] + 2 * u * t * b[0] + t * t * after[0],
          u * u * before[1] + 2 * u * t * b[1] + t * t * after[1]]);
      }
    }
    path.push(points[points.length - 1]);
    return path;
  }
  const innerWalls = [
    roundedInnerWall([walls[0][1], walls[0][2], walls[0][3], walls[0][4]]),
    roundedInnerWall([walls[1][0], walls[1][7], walls[1][6], walls[1][5]]),
  ];
  function innerWallX(path, y) {
    let a = path[0], b = path[1];
    if (y >= path[path.length - 1][1]) {
      a = path[path.length - 2]; b = path[path.length - 1];
    } else {
      for (let i = 1; i < path.length; i++) {
        if (y <= path[i][1]) { a = path[i - 1]; b = path[i]; break; }
      }
    }
    return a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
  }
  function corridorBounds(y, extraMargin = 0) {
    return {left: innerWallX(innerWalls[0], y) + INNER_WALL_MARGIN + extraMargin,
      right: innerWallX(innerWalls[1], y) - INNER_WALL_MARGIN - extraMargin};
  }
  function playerFoot(player, x = player.x, y = player.y) {
    return {x, y: y + PLAYER_FOOT_Y,
      left: x - PLAYER_FOOT_HALF_WIDTH, right: x + PLAYER_FOOT_HALF_WIDTH};
  }
  function lowerRightFootExpansion(footY) {
    return LOWER_RIGHT_FOOT_EXPANSION *
      clamp((footY - LOWER_RIGHT_PASSAGE_Y) / 48, 0, 1);
  }
  function playerFootCorridorBounds(footY) {
    const edgeBounds = corridorBounds(footY, -PLAYER_FOOT_HALF_WIDTH);
    const rightExpansion = lowerRightFootExpansion(footY);
    return {left: edgeBounds.left + PLAYER_FOOT_HALF_WIDTH,
      right: edgeBounds.right - PLAYER_FOOT_HALF_WIDTH + rightExpansion};
  }
  const CHEST_Y = Y(12) + 35 + DURIAN_SIZE;
  const CHEST = {x: corridorCenter(CHEST_Y), y: CHEST_Y,
    w: 70, h: 70};
  const PORTAL_Y = Y(390);
  const PORTAL_TRIGGER_RADIUS_X = 40;
  const PORTAL_TRIGGER_RADIUS_Y = 12;
  const PORTAL_TRIGGER_HOLD_TIME = 0.08;
  const MOMO_ENTRY_DROP = 35;
  const MOMO_ENTRY_Y = UPPER_GATE - 270 + DURIAN_SIZE / 2 +
    MOMO_ENTRY_DROP;
  function durianCount(side, edge, a, b) {
    if (side === 1 && edge === 0)
      return Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) /
        RIGHT_TOP_MAX_DURIAN_SPACING);
    if (side === 1 && (edge === 1 || edge === 7)) return 9;
    if (side === 1 && edge === 6) return 8;
    if (side === 0 && edge === 1 ||
        side === 1 && edge === 2) return 7;
    return 10;
  }
  const duriansByWall = walls.map((polygon, side) => polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const count = durianCount(side, i, a, b);
    return Array.from({length: count}, (_, n) => {
      const t = n / count;
      const start = n === 0 ? 0 : (n - .5) / count;
      const end = n === count - 1 ? 1 : (n + .5) / count;
      return {x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        ax: a[0] + (b[0] - a[0]) * start,
        ay: a[1] + (b[1] - a[1]) * start,
        bx: a[0] + (b[0] - a[0]) * end,
        by: a[1] + (b[1] - a[1]) * end,
        broken: false};
    });
  }));
  const durians = duriansByWall.flat().sort((a, b) => a.y - b.y);
  const images = {};
  const imageNames = [
    'grass.webp', 'BG20.png', 'BG21.png', '榴莲.png', '宝箱.png',
    'white.webp', 'green.webp', 'purple.webp', 'red-orb.webp',
    'gold-orb.webp', 'green-orb.webp', '彩刃.png', '超大金轮.png',
    'fx-spark1_00.png', 'treasure-glow.gif',
    ...Array.from({length: 6}, (_, i) => `player-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `jiangbao-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `poseidon-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `momo-${i}.webp`),
    ...Array.from({length: 10}, (_, i) => `portal-${i}.webp`),
    ...Array.from({length: 7}, (_, i) => `bone-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `fire01-${i}.webp`),
  ];
  const sounds = {};
  const audioFiles = {
    bladeClash: 'blade-clash.mp3',
    wallHit: 'wall-hit.mp3',
    hit: 'enemy-hit.mp3',
    death: 'death.mp3',
    pickup: 'pickup.mp3',
    hurt: 'collision.mp3',
    shock: 'shock.mp3',
    surprised: 'surprised.mp3',
    takeIt: 'take-it.mp3',
    laugh: 'laugh.mp3',
    upgradeWav: 'upgrade-wav.wav',
  };
  for (const [name, file] of Object.entries(audioFiles)) {
    sounds[name] = [];
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(`../assets/audio/${file}`);
      audio.preload = 'auto';
      sounds[name].push(audio);
    }
  }
  function makeVideo(name, loop = false) {
    if (typeof document.createElement !== 'function') return null;
    const video = document.createElement('video');
    video.src = `../assets/video/${VIDEO_FX[name].file}`;
    video.muted = true;
    video.playsInline = true;
    video.loop = loop;
    video.preload = 'auto';
    try { video.play().catch(() => {}); } catch (_) {}
    return video;
  }
  const loopVideos = {chestGlow: makeVideo('chestGlow', true)};
  let soundReady = false;
  const keys = new Set();
  const stick = {active: false, id: null, x: 0, y: 0, startX: 0, startY: 0};
  const camera = {x: 0, y: 0};
  let mapLayer, resourceLayout, ringAlpha, durianSamples, state, lastFrame = 0;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function normalizeAngle(value) {
    const full = Math.PI * 2;
    return (value % full + full) % full;
  }
  function angleDelta(from, to) {
    const full = Math.PI * 2;
    return (to - from + Math.PI + full) % full - Math.PI;
  }
  function bladeTip(actor, blade, radius) {
    return {x: actor.x + Math.cos(blade.angle) * radius,
      y: actor.y + Math.sin(blade.angle) * radius};
  }
  function loadImage(name) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images[name] = image; resolve(); };
      image.onerror = () => reject(new Error(`无法加载素材：${name}`));
      image.src = `../assets/images/${name}`;
    });
  }
  function prepareMomoCollision() {
    ringAlpha = Uint8Array.from(atob(MOMO_RING_MASK), char => char.charCodeAt(0));
    const fruitAlpha = Uint8Array.from(atob(DURIAN_MASK),
      char => char.charCodeAt(0));
    durianSamples = [];
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) {
        const bit = y * 13 + x;
        if (fruitAlpha[bit >> 3] & (1 << (bit & 7)))
          durianSamples.push({x: x * 6 + 3 - DURIAN_SIZE / 2,
            y: y * 6 + 3 - DURIAN_SIZE / 2});
      }
  }
  function unlockSound() { soundReady = true; }
  function playSound(name, volume = .26, cooldown = 0) {
    if (!soundReady || !sounds[name]?.length) return;
    if (cooldown) {
      const nextAt = state.soundNextAt[name] || 0;
      if (state.clock < nextAt) return;
      state.soundNextAt[name] = state.clock + cooldown;
    }
    const pool = sounds[name];
    const audio = pool.shift();
    pool.push(audio);
    audio.volume = volume;
    try { audio.currentTime = 0; audio.play().catch(() => {}); } catch (_) {}
    state.feedback.sounds.push({name, at: state.clock, volume});
    return audio;
  }
  function playSequence(names, volume = .32) {
    let index = 0;
    const next = () => {
      if (index >= names.length) return;
      const clip = playSound(names[index++], volume);
      if (!clip || index >= names.length) return;
      clip.addEventListener('ended', next, {once: true});
    };
    next();
  }
  function videoImpact(name, x, y, duration = .52, rotation = 0) {
    const video = makeVideo(name);
    if (video) state.effects.push({type: 'video', name, video, x, y,
      rotation, born: state.clock, duration});
    else state.effects.push({type: 'spark', x, y, rotation,
      born: state.clock, duration});
    state.feedback.effects.push({name, x, y, at: state.clock, rotation});
  }
  function paintImage(target, name, x, y, w, h, rotation = 0) {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.drawImage(images[name], -w / 2, -h / 2, w, h);
    target.restore();
  }
  function paintText(target, value, x, y, size = 18, color = '#fff') {
    target.font = `900 ${size}px "Microsoft YaHei", sans-serif`;
    target.textAlign = 'center';
    target.textBaseline = 'middle';
    target.lineJoin = 'round';
    target.lineWidth = Math.max(3, size / 4);
    target.strokeStyle = '#1a2417';
    target.strokeText(value, x, y);
    target.fillStyle = color;
    target.fillText(value, x, y);
  }
  function horizontalSpan(polygon, y) {
    const hits = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      if ((a[1] <= y && y < b[1]) || (b[1] <= y && y < a[1]))
        hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    return hits.length >= 2 ? [hits[0], hits[hits.length - 1]] : null;
  }
  function corridorCenter(y) {
    const left = horizontalSpan(walls[0], y);
    const right = horizontalSpan(walls[1], y);
    return left && right ? (left[1] + right[0]) / 2 : X(580);
  }
  function drawInterior(target, polygon, name) {
    target.save();
    target.beginPath();
    target.moveTo(...polygon[0]);
    for (let i = 1; i < polygon.length; i++) target.lineTo(...polygon[i]);
    target.closePath();
    target.clip();
    const xs = polygon.map(point => point[0]);
    const ys = polygon.map(point => point[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    target.drawImage(images[name], left, top,
      Math.max(...xs) - left, Math.max(...ys) - top);
    target.restore();
  }
  function drawStaticMap() {
    mapLayer = document.createElement('canvas');
    mapLayer.width = WORLD_W;
    mapLayer.height = WORLD_H;
    const map = mapLayer.getContext('2d');
    for (let x = 0; x < WORLD_W; x += 900)
      for (let y = 0; y < WORLD_H; y += 900)
        map.drawImage(images['grass.webp'], x, y, 900, 900);
    drawInterior(map, walls[0], 'BG21.png');
    drawInterior(map, walls[1], 'BG20.png');
    resourceLayout = [];
    for (let side = 0; side < walls.length; side++) {
      const polygon = walls[side];
      const inwardOffset = side === 0 ?
        RESOURCE_INWARD_OFFSET : -RESOURCE_INWARD_OFFSET;
      for (let row = 0; row < RESOURCE_ROWS; row++) {
        const y = Y(RESOURCE_ROW_START + row * RESOURCE_ROW_SPACING);
        const span = horizontalSpan(polygon, y);
        if (!span) continue;
        const gold = row % 2 === 0;
        for (let column = 0; column < RESOURCE_COLUMNS; column++) {
          const x = (span[0] + span[1]) / 2 + inwardOffset +
            (column - 2.5) * 48;
          resourceLayout.push({x, y,
            art: gold ? 'gold-orb.webp' : 'red-orb.webp',
            label: gold ? '+66' : '+88'});
        }
      }
    }
  }
  function drawResources(clock) {
    const rotation = clock * RESOURCE_ROTATION_SPEED;
    for (const resource of resourceLayout) {
      paintImage(ctx, resource.art, resource.x, resource.y, 44, 44, rotation);
      paintText(ctx, resource.label, resource.x, resource.y + 17, 15);
    }
  }
  function nearestWallSegment(x, y, includeBroken = false) {
    let nearest = {distanceSq: Infinity, tx: 1, ty: 0};
    for (const fruit of durians) {
      if (fruit.broken && !includeBroken) continue;
      const dx = fruit.bx - fruit.ax, dy = fruit.by - fruit.ay;
      const lengthSq = dx * dx + dy * dy;
      const t = clamp(((x - fruit.ax) * dx + (y - fruit.ay) * dy) /
        lengthSq, 0, 1);
      const ex = x - fruit.ax - t * dx, ey = y - fruit.ay - t * dy;
      const distanceSq = ex * ex + ey * ey;
      if (distanceSq < nearest.distanceSq) {
        const length = Math.sqrt(lengthSq);
        nearest = {distanceSq, tx: dx / length, ty: dy / length};
      }
    }
    return nearest;
  }
  function wallAt(x, y, radius) {
    if (y < UPPER_GATE || y > LOWER_GATE) return false;
    const bounds = corridorBounds(y, Math.max(0, radius - state.player.r));
    return x < bounds.left || x > bounds.right;
  }
  function bladeTouchesWall(point) {
    return nearestWallSegment(point.x, point.y).distanceSq < BLADE_WALL_RADIUS ** 2;
  }
  function movePlayer(dx, dy) {
    const p = state.player;
    const nx = clamp(p.x + dx, p.r, WORLD_W - p.r);
    const ny = clamp(p.y + dy, UPPER_GATE, LOWER_GATE);
    const foot = playerFoot(p, nx, ny);
    const bounds = playerFootCorridorBounds(foot.y);
    p.x = clamp(nx, bounds.left, bounds.right);
    p.y = ny;
  }
  function effect(type, x, y, duration = .35, rotation = 0) {
    state.effects.push({type, x, y, rotation, born: state.clock, duration});
    state.feedback.effects.push({name: type, x, y, at: state.clock, rotation});
  }
  function toast(message, duration = 2.5) {
    hud.toast.textContent = message;
    hud.toast.classList.add('visible');
    state.toastUntil = state.clock + duration;
  }
  function updateHud() {
    const green = !state.bounceEnabled;
    hud.blades.textContent = green ? `绿刀 × ${state.player.blades.length}` :
      `白刀 × ${state.player.blades.length}`;
    hud.hint.textContent = green ? '触墙反弹关闭 · 榴莲 99' : '触墙反弹开启';
    hud.objective.textContent = state.chest.open ? '避开 momo，向下进入传送门' :
      state.chest.triggered ? 'momo 正从上方赶来，准备撤退' :
        green ? '向上击打宝箱' :
          state.jiangbao.alive ? '避开海神，向上追击酱爆' : '拾取酱爆掉落的 +6 绿刀';
  }
  function fail(reason) {
    if (state.status !== 'playing') return;
    state.status = 'failed';
    playSound('hurt', .26);
    hud.title.textContent = '挑战失败';
    hud.detail.textContent = reason;
    hud.result.hidden = false;
  }
  function reset() {
    for (const fruit of durians) fruit.broken = false;
    state = {
      status: 'playing', clock: 0, toastUntil: 0, effects: [],
      feedback: {sounds: [], effects: []}, soundNextAt: {},
      player: {x: X(493) + TWO_DURIAN_X, y: Y(721) + TWO_DURIAN_Y,
        r: 20, blades: [
          {tier: 'white', angle: -.8, dir: 1, touchingWall: false}]},
      jiangbao: {x: X(594), y: Y(520), r: 28, alive: true, fleeing: false,
        approachCuePlayed: false, fleeCuePlayed: false,
        blade: {tier: 'green', angle: 2, dir: -1, touchingWall: false}},
      sea: {x: X(546), y: Y(865) + TWO_DURIAN_Y,
        targetX: X(435), r: 29,
        blades: Array.from({length: 12}, (_, i) =>
          ({tier: 'purple', angle: i * Math.PI / 6, reflowTargetOffset: null}))},
      drop: null,
      chest: {triggered: false, open: false, nextHitAt: 0,
        lastHitAt: -Infinity, scaleBorn: -Infinity},
      momo: null,
      rewards: [],
      portal: {x: corridorCenter(PORTAL_Y), y: PORTAL_Y,
        visible: false, active: false, standingFor: 0},
      bounceEnabled: true,
      lastWallSoundAt: -1,
      portalFxPlayed: false,
    };
    hud.result.hidden = true;
    hud.toast.classList.remove('visible');
    updateHud();
    camera.x = clamp(state.player.x - VIEW_W * .5, 0, WORLD_W - VIEW_W);
    camera.y = clamp(state.player.y - VIEW_H * .62, 0, WORLD_H - VIEW_H);
  }
  function inputDirection() {
    let x = stick.x, y = stick.y;
    if (keys.has('arrowleft') || keys.has('a')) x--;
    if (keys.has('arrowright') || keys.has('d')) x++;
    if (keys.has('arrowup') || keys.has('w')) y--;
    if (keys.has('arrowdown') || keys.has('s')) y++;
    const length = Math.hypot(x, y);
    return length > 1 ? {x: x / length, y: y / length} : {x, y};
  }
  function blockedBladeAngle(actor, radius, angle, upperOnly) {
    if (upperOnly && Math.sin(angle) > 0) return true;
    return bladeTouchesWall({x: actor.x + Math.cos(angle) * radius,
      y: actor.y + Math.sin(angle) * radius});
  }
  function nearestClearAngle(actor, radius, angle, direction, upperOnly) {
    // If the actor moves around a corner, its previous safe angle may become
    // embedded in the wall. Recover along the nearest free arc before rotating.
    for (let step = 1; step <= 126; step++) {
      for (const sign of [-direction, direction]) {
        const candidate = angle + sign * step * .025;
        if (!blockedBladeAngle(actor, radius, candidate, upperOnly))
          return {angle: candidate, direction: sign};
      }
    }
    return null;
  }
  function rotateBlade(actor, blade, radius, dt, bounce, upperOnly = false) {
    if (!bounce) {
      blade.angle += blade.dir * BLADE_SPEED * dt;
      const point = bladeTip(actor, blade, radius);
      const touching = bladeTouchesWall(point);
      if (touching && !blade.touchingWall) {
        effect('fire01', point.x, point.y, .42);
        if (state.clock - state.lastWallSoundAt > .18) {
          playSound('wallHit', .22, CONTACT_SOUND_COOLDOWN);
          state.lastWallSoundAt = state.clock;
        }
      }
      blade.touchingWall = touching;
      return;
    }
    if (blockedBladeAngle(actor, radius, blade.angle, upperOnly)) {
      const safe = nearestClearAngle(actor, radius, blade.angle,
        blade.dir, upperOnly);
      if (!safe) return;
      blade.angle = safe.angle;
      blade.dir = safe.direction;
    }
    const stepCount = Math.max(1, Math.ceil(BLADE_SPEED * dt / .03));
    const stepAngle = blade.dir * BLADE_SPEED * dt / stepCount;
    for (let step = 0; step < stepCount; step++) {
      const candidate = blade.angle + stepAngle;
      if (!blockedBladeAngle(actor, radius, candidate, upperOnly)) {
        blade.angle = candidate;
        continue;
      }
      // Stop at the last clear angle, then reverse. Binary search prevents a
      // large frame step from visibly pushing the knife into a corner.
      let clear = blade.angle, blocked = candidate;
      for (let n = 0; n < 8; n++) {
        const middle = (clear + blocked) / 2;
        if (blockedBladeAngle(actor, radius, middle, upperOnly)) blocked = middle;
        else clear = middle;
      }
      blade.angle = clear;
      blade.dir *= -1;
      const point = bladeTip(actor, blade, radius);
      if (bladeTouchesWall({x: actor.x + Math.cos(candidate) * radius,
        y: actor.y + Math.sin(candidate) * radius})) {
        const wall = nearestWallSegment(point.x, point.y);
        videoImpact('wallSpark', point.x, point.y, .52,
          Math.atan2(wall.ty, wall.tx));
        if (state.clock - state.lastWallSoundAt > .13) {
          playSound('wallHit', .22, CONTACT_SOUND_COOLDOWN);
          state.lastWallSoundAt = state.clock;
        }
      }
      blade.touchingWall = true;
      return;
    }
    blade.touchingWall = false;
  }
  function markBladeContact(subject) {
    subject.lastBladeContactAt = state.clock;
    subject.bladeReflow = false;
    for (const blade of subject.blades || []) blade.reflowTargetOffset = null;
  }
  function removeBlade(subject, blade) {
    const index = subject.blades.indexOf(blade);
    if (index < 0) return false;
    subject.blades.splice(index, 1);
    subject.needsBladeReflow = subject.blades.length > 1;
    return true;
  }
  function beginBladeReflow(subject) {
    if (!subject.needsBladeReflow || subject.blades.length < 2) return;
    const phase = subject.bladePhase || 0;
    const gap = Math.PI * 2 / subject.blades.length;
    const ordered = [...subject.blades].sort((a, b) =>
      normalizeAngle(a.angle - phase) - normalizeAngle(b.angle - phase));
    let sumX = 0, sumY = 0;
    ordered.forEach((blade, index) => {
      const offset = normalizeAngle(blade.angle - phase - index * gap);
      sumX += Math.cos(offset);
      sumY += Math.sin(offset);
    });
    const base = normalizeAngle(Math.atan2(sumY, sumX));
    ordered.forEach((blade, index) => {
      blade.reflowTargetOffset = normalizeAngle(base + index * gap);
    });
    subject.bladeReflow = true;
  }
  function updateBladeCircle(subject, dt, advanceBlades = true, speed = BLADE_SPEED) {
    if (!subject.blades.length) {
      subject.needsBladeReflow = false;
      subject.bladeReflow = false;
      return;
    }
    subject.bladePhase = normalizeAngle((subject.bladePhase || 0) + speed * dt);
    if (advanceBlades) for (const blade of subject.blades)
      blade.angle = normalizeAngle(blade.angle + speed * dt);
    if (!subject.needsBladeReflow) return;
    if (!subject.bladeReflow) {
      if (state.clock - (subject.lastBladeContactAt ?? -Infinity) < BLADE_REFLOW_DELAY) return;
      beginBladeReflow(subject);
    }
    let largestDelta = 0;
    const blend = Math.min(1, dt * BLADE_REFLOW_SPEED);
    for (const blade of subject.blades) {
      const currentOffset = normalizeAngle(blade.angle - subject.bladePhase);
      const delta = angleDelta(currentOffset, blade.reflowTargetOffset);
      largestDelta = Math.max(largestDelta, Math.abs(delta));
      blade.angle = normalizeAngle(blade.angle + delta * blend);
    }
    if (largestDelta > .012) return;
    for (const blade of subject.blades) {
      blade.angle = normalizeAngle(subject.bladePhase + blade.reflowTargetOffset);
      blade.reflowTargetOffset = null;
    }
    subject.needsBladeReflow = false;
    subject.bladeReflow = false;
  }
  function killJiangbao() {
    const enemy = state.jiangbao;
    enemy.alive = false;
    state.drop = {x: enemy.x, y: enemy.y, r: 32};
    effect('bone', enemy.x, enemy.y, .58);
    playSequence(['takeIt', 'laugh'], .31);
    toast('击败酱爆！拾取 +6 绿刀');
    updateHud();
  }
  function updateJiangbao(dt) {
    const enemy = state.jiangbao;
    if (!enemy.alive) return;
    if (!enemy.fleeing && !enemy.approachCuePlayed && soundReady) {
      enemy.approachCuePlayed = true;
      playSound('shock', .30);
    }
    const player = state.player;
    if (!enemy.fleeing &&
        distance(enemy, player) < JIANGBAO_FLEE_TRIGGER_DISTANCE) {
      enemy.fleeing = true;
      if (!enemy.fleeCuePlayed) {
        enemy.fleeCuePlayed = true;
        playSound('surprised', .30);
      }
      toast('酱爆开始向上逃跑！', 1.6);
    }
    enemy.y = clamp(enemy.y + (enemy.fleeing ?
      -JIANGBAO_FLEE_SPEED : JIANGBAO_APPROACH_SPEED) * dt,
      UPPER_GATE + 78, LOWER_GATE - 105);
    const targetX = corridorCenter(enemy.y);
    enemy.x += clamp(targetX - enemy.x,
      -JIANGBAO_LATERAL_SPEED * dt, JIANGBAO_LATERAL_SPEED * dt);
    if (enemy.blade)
      rotateBlade(enemy, enemy.blade, JIANGBAO_BLADE_RADIUS, dt, true, true);
  }
  function updateSea(dt) {
    const sea = state.sea;
    sea.x = Math.max(sea.targetX, sea.x - 78 * dt);
    updateBladeCircle(sea, dt, true, 1.5);
  }
  function pickupGreen() {
    const drop = state.drop;
    if (!drop || distance(state.player, drop) > state.player.r + drop.r) return;
    state.drop = null;
    state.player.blades = Array.from({length: 6}, (_, i) => ({
      tier: 'green', angle: i * Math.PI / 3, dir: 1, touchingWall: false,
    }));
    state.player.needsBladeReflow = false;
    state.player.bladeReflow = false;
    state.player.lastBladeContactAt = -Infinity;
    state.bounceEnabled = false;
    videoImpact('upgrade2', state.player.x, state.player.y, .62);
    playSound('upgradeWav', .28);
    toast('获得 6 绿刀！白刀已替换，触墙反弹关闭', 3);
    updateHud();
  }
  function updateChest() {
    if (state.bounceEnabled || state.chest.open) return;
    const hit = state.player.blades.some(blade => {
      const tip = bladeTip(state.player, blade, PLAYER_BLADE_RADIUS);
      return Math.abs(tip.x - CHEST.x) < CHEST.w / 2 + 12 &&
        Math.abs(tip.y - CHEST.y) < CHEST.h / 2 + 12;
    });
    if (!hit) return;
    state.chest.lastHitAt = state.clock;
    if (state.clock < state.chest.nextHitAt) return;
    state.chest.nextHitAt = state.clock + .24;
    state.chest.scaleBorn = state.clock;
    videoImpact('metal', CHEST.x, CHEST.y + 22, .46);
    playSound('wallHit', .22, CONTACT_SOUND_COOLDOWN);
    if (state.chest.triggered) return;
    state.chest.triggered = true;
    state.momo = {x: CHEST.x - 190, y: MOMO_ENTRY_Y, r: 32,
      angle: 0, phase: 'align', chaseAt: Infinity, openAt: Infinity};
    state.portal.visible = true;
    state.portal.active = true;
    toast('宝箱被击中！momo 从左上方出现', 2.4);
    updateHud();
  }
  function openChest() {
    if (state.chest.open) return;
    state.chest.open = true;
    state.momo.openAt = state.clock;
    state.portal.active = true;
    state.rewards = [
      {art: 'red-orb.webp', label: '+999999 红刃', dx: -43},
      {art: '彩刃.png', label: '+999999 彩刃', dx: 43},
    ].map(reward => ({...reward, born: state.clock,
      fromX: CHEST.x, fromY: CHEST.y + 15,
      toX: CHEST.x + reward.dx, toY: CHEST.y - 90}));
    effect('spark', CHEST.x, CHEST.y, .42);
    playSound('shock', .30);
    toast('宝箱打开！奖励跳到箱子上方，快往下逃', 3);
    updateHud();
  }
  function breakDurians(momo) {
    let broken = 0;
    const cos = Math.cos(momo.angle), sin = Math.sin(momo.angle);
    for (const fruit of durians) {
      if (fruit.broken || distance(fruit, momo) > 180) continue;
      const touched = durianSamples.some(point => {
        const dx = fruit.x + point.x - momo.x;
        const dy = fruit.y + point.y - momo.y;
        const x = Math.floor((dx * cos + dy * sin + 140) / 4);
        const y = Math.floor((-dx * sin + dy * cos + 140) / 4);
        if (x < 0 || x >= 70 || y < 0 || y >= 70) return false;
        const bit = y * 70 + x;
        return (ringAlpha[bit >> 3] & (1 << (bit & 7))) !== 0;
      });
      if (!touched) continue;
      fruit.broken = true;
      if (broken < 4) effect('fire01', fruit.x, fruit.y, .42);
      broken++;
    }
    if (broken && state.clock - state.lastWallSoundAt > .15) {
      playSound('wallHit', .22, CONTACT_SOUND_COOLDOWN);
      state.lastWallSoundAt = state.clock;
    }
  }
  function updateMomo(dt) {
    const momo = state.momo;
    if (!momo) return;
    momo.angle -= BLADE_SPEED * dt;
    if (momo.phase === 'align') {
      const laneX = corridorCenter(UPPER_GATE + 5);
      const dx = laneX - momo.x;
      momo.x += clamp(dx, -MOMO_ENTRY_SPEED * dt, MOMO_ENTRY_SPEED * dt);
      if (Math.abs(dx) <= MOMO_ENTRY_SPEED * dt) {
        momo.phase = 'enter';
        if (state.clock - state.chest.lastHitAt <= .45 &&
            distance(state.player, CHEST) < 115) openChest();
      }
    } else if (momo.phase === 'enter') {
      const target = {x: corridorCenter(UPPER_GATE + 5), y: UPPER_GATE + 5};
      const remaining = distance(momo, target);
      const step = Math.min(remaining, MOMO_ENTRY_SPEED * dt);
      if (remaining) {
        momo.x += (target.x - momo.x) / remaining * step;
        momo.y += (target.y - momo.y) / remaining * step;
      }
      if (remaining <= step) {
        momo.phase = 'chase';
        momo.chaseAt = state.clock;
      }
    } else {
      momo.y = Math.min(LOWER_GATE - 90, momo.y + MOMO_CHASE_SPEED * dt);
      const targetX = corridorCenter(momo.y);
      const turnSpeed = state.clock - momo.chaseAt < .75 ?
        MOMO_EARLY_TURN_SPEED : MOMO_TURN_SPEED;
      momo.x += clamp(targetX - momo.x, -turnSpeed * dt, turnSpeed * dt);
    }
    if (momo.phase !== 'align')
      breakDurians(momo);
  }
  function clashWithEnemyBlade(enemy, enemyBlade, enemyTip, playerBlade) {
    const playerTip = bladeTip(state.player, playerBlade, PLAYER_BLADE_RADIUS);
    if (distance(playerTip, enemyTip) >= 28) return false;
    const playerTier = BLADE_TIER[playerBlade.tier];
    const enemyTier = BLADE_TIER[enemyBlade.tier];
    markBladeContact(state.player);
    markBladeContact(enemy);
    if (playerTier <= enemyTier) removeBlade(state.player, playerBlade);
    if (enemyTier <= playerTier) {
      if (enemy.blade === enemyBlade) enemy.blade = null;
      else removeBlade(enemy, enemyBlade);
    }
    videoImpact('clash', (playerTip.x + enemyTip.x) / 2,
      (playerTip.y + enemyTip.y) / 2, .46);
    playSound('bladeClash', .24, CONTACT_SOUND_COOLDOWN);
    updateHud();
    return true;
  }
  function momoRingTouchesPlayer(momo, player) {
    const cos = Math.cos(momo.angle), sin = Math.sin(momo.angle);
    let overlapPoints = 0;
    for (let oy = -34; oy <= 34; oy += 6) {
      for (let ox = -24; ox <= 24; ox += 6) {
        if ((ox / 24) ** 2 + (oy / 34) ** 2 > 1) continue;
        const dx = player.x + ox - momo.x;
        const dy = player.y - 8 + oy - momo.y;
        const x = Math.floor((dx * cos + dy * sin + 140) / 4);
        const y = Math.floor((-dx * sin + dy * cos + 140) / 4);
        if (x < 0 || x >= 70 || y < 0 || y >= 70) continue;
        const bit = y * 70 + x;
        if (ringAlpha[bit >> 3] & (1 << (bit & 7))) {
          overlapPoints++;
          if (overlapPoints >= MOMO_PLAYER_OVERLAP_POINTS) return true;
        }
      }
    }
    return false;
  }
  function resolveMomo() {
    const momo = state.momo;
    if (!momo) return;
    const player = state.player;
    if (momoRingTouchesPlayer(momo, player) ||
        distance(player, {x: momo.x + 22, y: momo.y}) < 48) {
      fail('被 momo 的光轮追上了，请重试');
      return;
    }
    let lost = 0;
    for (const blade of [...player.blades]) {
      const tip = bladeTip(player, blade, PLAYER_BLADE_RADIUS);
      if (Math.abs(distance(tip, momo) - 125) > 38) continue;
      player.blades.splice(player.blades.indexOf(blade), 1);
      videoImpact('clash', tip.x, tip.y, .46);
      lost++;
    }
    if (!lost) return;
    playSound('bladeClash', .24, CONTACT_SOUND_COOLDOWN);
    updateHud();
  }
  function stageClear() {
    state.status = 'cleared';
    window.location.assign('scene3-play.html');
  }
  function footInsidePortal(footX, footY, portal) {
    const dx = (footX - portal.x) / PORTAL_TRIGGER_RADIUS_X;
    const dy = (footY - portal.y) / PORTAL_TRIGGER_RADIUS_Y;
    return dx * dx + dy * dy <= 1;
  }
  function playerStepsOnPortal() {
    if (!state.portal.visible || !state.portal.active) return false;
    const foot = playerFoot(state.player);
    return footInsidePortal(foot.x, foot.y, state.portal);
  }
  function resolveCombat() {
    const player = state.player, enemy = state.jiangbao;
    if (enemy.alive) {
      if (enemy.blade) {
        for (const blade of [...player.blades]) {
          if (!player.blades.includes(blade) || !enemy.blade) continue;
          const enemyTip = bladeTip(enemy, enemy.blade, JIANGBAO_BLADE_RADIUS);
          if (!clashWithEnemyBlade(enemy, enemy.blade, enemyTip, blade)) continue;
          if (!player.blades.length) {
            fail('白刃被酱爆的绿刃击碎，请重试');
            return;
          }
        }
      }
      // Scene-two exception confirmed by the user: white can defeat this
      // one-green-blade boss if the actual white tip reaches its body.
      for (const blade of player.blades) {
        if (distance(bladeTip(player, blade, PLAYER_BLADE_RADIUS), enemy) < enemy.r + 15) {
          killJiangbao();
          break;
        }
      }
      if (enemy.alive) {
        if (distance(player, enemy) < player.r + enemy.r - 4 ||
            (enemy.blade && distance(player,
              bladeTip(enemy, enemy.blade, JIANGBAO_BLADE_RADIUS)) < player.r + 14))
          fail('被酱爆击中，请重试');
      }
    }
    const sea = state.sea;
    for (const playerBlade of [...player.blades]) {
      if (!player.blades.includes(playerBlade)) continue;
      for (const seaBlade of [...sea.blades]) {
        if (!player.blades.includes(playerBlade) || !sea.blades.includes(seaBlade)) continue;
        const seaTip = bladeTip(sea, seaBlade, SEA_BLADE_RADIUS);
        clashWithEnemyBlade(sea, seaBlade, seaTip, playerBlade);
      }
    }
    if (distance(player, sea) < player.r + sea.r + 1) {
      fail('海神封住了下方出口，请向上走');
      return;
    }
    for (const blade of sea.blades) {
      const tip = bladeTip(sea, blade, SEA_BLADE_RADIUS);
      if (distance(player, tip) < player.r + 12) {
        fail('被海神的紫刃击中，请向上走');
        return;
      }
    }
  }
  function update(dt) {
    state.clock += dt;
    state.effects = state.effects.filter(fx => state.clock - fx.born < fx.duration);
    if (state.toastUntil && state.clock >= state.toastUntil) {
      hud.toast.classList.remove('visible');
      state.toastUntil = 0;
    }
    if (state.status !== 'playing') return;
    const input = inputDirection();
    movePlayer(input.x * PLAYER_SPEED * dt, input.y * PLAYER_SPEED * dt);
    updateSea(dt);
    updateJiangbao(dt);
    for (const blade of state.player.blades)
      rotateBlade(state.player, blade, PLAYER_BLADE_RADIUS,
        dt, state.bounceEnabled);
    updateBladeCircle(state.player, dt, false);
    resolveCombat();
    if (state.status !== 'playing') return;
    pickupGreen();
    updateChest();
    updateMomo(dt);
    const onPortal = playerStepsOnPortal();
    if (onPortal && !state.portalFxPlayed) {
      state.portalFxPlayed = true;
      videoImpact('walkAcquire2', state.portal.x, state.portal.y, .5);
    }
    if (!onPortal) state.portalFxPlayed = false;
    state.portal.standingFor = onPortal ? state.portal.standingFor + dt : 0;
    if (state.portal.standingFor >= PORTAL_TRIGGER_HOLD_TIME) {
      stageClear();
      return;
    }
    resolveMomo();
    if (state.status !== 'playing') return;
    camera.x = clamp(state.player.x - VIEW_W * .5, 0, WORLD_W - VIEW_W);
    camera.y = clamp(state.player.y - VIEW_H * .62, 0, WORLD_H - VIEW_H);
  }
  function drawEffects() {
    for (const fx of state.effects) {
      const t = (state.clock - fx.born) / fx.duration;
      ctx.globalAlpha = 1 - t;
      if (fx.type === 'video') {
        const spec = VIDEO_FX[fx.name];
        if (fx.video.readyState >= 2) {
          ctx.save();
          ctx.translate(fx.x, fx.y);
          ctx.rotate(fx.rotation || 0);
          ctx.globalCompositeOperation = 'screen';
          if (spec.crop) ctx.drawImage(fx.video, ...spec.crop,
            -spec.w / 2, -spec.h / 2, spec.w, spec.h);
          else ctx.drawImage(fx.video,
            -spec.w / 2, -spec.h / 2, spec.w, spec.h);
          ctx.restore();
        }
      } else if (fx.type === 'bone') {
        const index = clamp(Math.floor(t * 7), 0, 6);
        paintImage(ctx, `bone-${index}.webp`, fx.x, fx.y, 100, 100);
      } else if (fx.type === 'fire01') {
        const index = clamp(Math.floor(t * 6), 0, 5);
        paintImage(ctx, `fire01-${index}.webp`, fx.x, fx.y, 56, 56,
          fx.rotation || 0);
      } else paintImage(ctx, 'fx-spark1_00.png', fx.x, fx.y, 55, 55);
      ctx.globalAlpha = 1;
    }
  }
  function drawLoopVideo(name, x, y) {
    const video = loopVideos[name];
    const spec = VIDEO_FX[name];
    if (!video || video.readyState < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(video, x - spec.w / 2, y - spec.h / 2, spec.w, spec.h);
    ctx.restore();
  }
  function chestHitScale() {
    const progress = (state.clock - state.chest.scaleBorn) /
      CHEST_HIT_SCALE_DURATION;
    if (progress < 0 || progress >= 1 - 1e-9) return 1;
    return 1 + Math.sin(progress * Math.PI) * .12;
  }
  function drawDurians() {
    for (const fruit of durians) {
      if (fruit.broken || fruit.x < camera.x - 45 ||
          fruit.x > camera.x + VIEW_W + 45 ||
          fruit.y < camera.y - 45 ||
          fruit.y > camera.y + VIEW_H + 45) continue;
      paintImage(ctx, '榴莲.png', fruit.x, fruit.y,
        DURIAN_SIZE, DURIAN_SIZE);
      paintText(ctx, '99', fruit.x, fruit.y - 27, 17, '#fff9bf');
    }
  }
  function drawBlade(actor, blade, radius, art, w, h) {
    const point = bladeTip(actor, blade, radius);
    paintImage(ctx, art, point.x, point.y, w, h, blade.angle + Math.PI / 2);
  }
  function render() {
    if (!state || !mapLayer) return;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(mapLayer, camera.x, camera.y, VIEW_W, VIEW_H,
      0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawDurians();
    const clock = state.clock;
    drawResources(clock);
    const portal = state.portal;
    if (portal.visible) {
      ctx.globalAlpha = portal.active ? 1 : .42;
      paintImage(ctx, `portal-${Math.floor(clock * 10) % 10}.webp`,
        portal.x, portal.y, 108, 108);
      ctx.globalAlpha = 1;
    }
    if (portal.active) paintText(ctx, '进入传送门', portal.x, portal.y + 57, 16);
    const chestScale = chestHitScale();
    ctx.drawImage(images['宝箱.png'], ...(state.chest.open ?
      [74, 95, 400, 400] : [125, 598, 352, 350]),
      CHEST.x - 43 * chestScale, CHEST.y - 44 * chestScale,
      86 * chestScale, 88 * chestScale);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    paintImage(ctx, 'treasure-glow.gif', CHEST.x, CHEST.y + 21, 92, 54);
    ctx.restore();
    const sea = state.sea;
    const seaFrame = Math.floor(clock * 9) % 6;
    paintImage(ctx, `poseidon-${seaFrame}.webp`, sea.x, sea.y - 14, 95, 115);
    for (const blade of sea.blades)
      drawBlade(sea, blade, SEA_BLADE_RADIUS, 'purple.webp', 42, 56);
    const enemy = state.jiangbao;
    if (enemy.alive) {
      const frame = Math.floor(clock * 9) % 6;
      paintImage(ctx, `jiangbao-${frame}.webp`, enemy.x - 13,
        enemy.y - 10, 96, 106);
      if (enemy.blade)
        drawBlade(enemy, enemy.blade, JIANGBAO_BLADE_RADIUS,
          'green.webp', 44, 60);
    }
    if (state.drop) {
      const bob = Math.sin(clock * 3) * 4;
      paintImage(ctx, 'green-orb.webp', state.drop.x,
        state.drop.y + bob, 60, 60);
      paintText(ctx, '+6 绿刀', state.drop.x, state.drop.y + 41 + bob, 18);
    }
    for (const reward of state.rewards) {
      const age = clock - reward.born;
      const launch = 1 - (1 - clamp(age / .4, 0, 1)) ** 2;
      const x = reward.fromX + (reward.toX - reward.fromX) * launch;
      const y = reward.fromY + (reward.toY - reward.fromY) * launch;
      drawLoopVideo('chestGlow', x, y + 16);
      paintImage(ctx, reward.art, x, y, 56, 56);
      paintText(ctx, reward.label, x, y + 39, 13);
    }
    const momo = state.momo;
    if (momo) {
      paintImage(ctx, '超大金轮.png', momo.x, momo.y, 280, 280, momo.angle);
      paintImage(ctx, `momo-${Math.floor(clock * 9) % 6}.webp`,
        momo.x + 22, momo.y, 120, 125);
    }
    const player = state.player;
    for (const blade of player.blades)
      drawBlade(player, blade, PLAYER_BLADE_RADIUS,
        blade.tier === 'white' ? 'white.webp' : 'green.webp', 47, 64);
    paintImage(ctx, `player-${Math.floor(clock * 9) % 6}.webp`,
      player.x, player.y - 8, 65, 85);
    drawEffects();
    ctx.restore();
  }
  function frame(time) {
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .033) : 0;
    lastFrame = time;
    if (state) update(dt);
    render();
    requestAnimationFrame(frame);
  }
  function releaseStick() {
    stick.active = false;
    stick.id = null;
    stick.x = stick.y = 0;
    hud.stick.style.display = 'none';
  }
  canvas.addEventListener('pointerdown', event => {
    if (state?.status !== 'playing') return;
    unlockSound();
    canvas.setPointerCapture(event.pointerId);
    stick.active = true;
    stick.id = event.pointerId;
    stick.startX = event.clientX;
    stick.startY = event.clientY;
    const rect = shell.getBoundingClientRect();
    hud.stick.style.left = `${event.clientX - rect.left}px`;
    hud.stick.style.top = `${event.clientY - rect.top}px`;
    hud.stick.style.display = 'block';
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (!stick.active || event.pointerId !== stick.id) return;
    const dx = event.clientX - stick.startX;
    const dy = event.clientY - stick.startY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const size = Math.min(44, length);
    stick.x = dx / length * Math.min(1, length / 44);
    stick.y = dy / length * Math.min(1, length / 44);
    hud.knob.style.left = `${34 + dx / length * size}px`;
    hud.knob.style.top = `${34 + dy / length * size}px`;
    event.preventDefault();
  });
  canvas.addEventListener('pointerup', releaseStick);
  canvas.addEventListener('pointercancel', releaseStick);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ('arrowup arrowdown arrowleft arrowright w a s d'.split(' ').includes(key)) {
      unlockSound();
      keys.add(key);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); releaseStick(); });
  hud.retry.addEventListener('click', reset);

  Promise.all(imageNames.map(loadImage)).then(() => {
    prepareMomoCollision();
    drawStaticMap();
    reset();
    requestAnimationFrame(frame);
  }).catch(error => {
    hud.result.hidden = false;
    hud.title.textContent = '素材加载失败';
    hud.detail.textContent = error.message;
  });
})();
