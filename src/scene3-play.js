(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    shell: document.getElementById('shell'),
    objective: document.getElementById('objective'),
    blades: document.getElementById('blade-count'),
    hint: document.getElementById('phase-hint'),
    toast: document.getElementById('toast'),
    stick: document.getElementById('floating-stick'),
    knob: document.getElementById('floating-knob'),
    result: document.getElementById('result'),
    title: document.getElementById('result-title'),
    detail: document.getElementById('result-detail'),
    retry: document.getElementById('retry'),
  };

  const WORLD = {width: 1400, height: 1200};
  const MAP_OFFSET_X = 180;
  const IMAGE_ROOT = '../assets/images/';
  const AUDIO_ROOT = '../assets/audio/';
  const VIDEO_ROOT = '../assets/video/';
  const PLAYER_SPEED = 150;
  const PLAYER_RADIUS = 18;
  const PLAYER_FOOT_Y = 29;
  const PLAYER_FOOT_RADIUS = 10;
  const PLAYER_HEIGHT = 72;
  const CORRIDOR_WIDTH = PLAYER_HEIGHT * 1.2;
  const PLAYER_BLADE_RING_DIAMETER = PLAYER_HEIGHT * 1.5;
  const BLADE_DRAW_WIDTH = 28;
  const BLADE_DRAW_HEIGHT = 39;
  const PLAYER_BLADE_RADIUS = PLAYER_BLADE_RING_DIAMETER / 2 - BLADE_DRAW_WIDTH / 2;
  const SAIYAN_EFFECT_WIDTH = 60;
  const SAIYAN_EFFECT_HEIGHT = 80;
  const ENEMY_BLADE_RADIUS = 58;
  const THREAT_FULL_RING_BLADE_COUNT = Math.ceil(
    Math.PI * 2 * ENEMY_BLADE_RADIUS / (BLADE_DRAW_WIDTH * .82));
  const BLADE_SPEED = 2.75;
  const BLADE_CLASH_DISTANCE = 21;
  const BLADE_BODY_HIT_RADIUS = 7;
  const BLADE_REFLOW_DELAY = .5;
  const BLADE_REFLOW_SPEED = 5.5;
  const CONTACT_SOUND_COOLDOWN = .08;
  const WALL_RADIUS = 22;
  const PORTAL_HOLD_TIME = 0.08;
  const THREAT_RING_OUTER_RADIUS = ENEMY_BLADE_RADIUS + 14;
  const SEA_BLOCK_SPEED = 127;
  const SEA_FLEE_SPEED = 153;
  const SEA_VENOM_DELAY = 2;
  const SEA_ENTRY_OFFSET_X = 50;
  const VENOM_ENTRY_OFFSET_X = -50;
  const VENOM_INTERCEPT_LEAD = 220;
  const VENOM_FLEE_GRACE = 1.1;
  const VENOM_CHASE_SPEED = 103;
  const VENOM_FLEE_START_SPEED = 80;
  const VENOM_FLEE_MIN_SPEED = 38;
  const VENOM_FLEE_DECELERATION = 9;
  const FINAL_BOSS_SPAWN_GRACE = 1;
  const FINAL_BOSS_ALIGN_SPEED = 91;
  const OFFSCREEN_SPAWN_MARGIN = 30;
  const OFFSCREEN_ENTRY_GRACE = .8;
  const MAGNET_PULL_STAGGER = .012;
  const MAGNET_PULL_SPEED = 720;
  const TIER = {white: 0, green: 1, gold: 2, purple: 3, red: 4, rainbow: 5};
  const TIER_LABEL = {white: '白刃', green: '绿刃', gold: '金刃', purple: '紫刃', red: '红刃'};
  const TIER_ART = {
    white: 'white.webp', green: 'green.webp', gold: 'gold.webp',
    purple: 'purple.webp', red: 'scene3/red-blade.png',
  };
  const ORB_ART = {
    white: 'white-orb.webp', green: 'green-orb.webp', gold: 'gold-orb.webp',
  };
  const ACTOR_FRAMES = {
    player: Array.from({length: 6}, (_, i) => `player-${i}.webp`),
    super: Array.from({length: 8}, (_, i) => `scene3/super-${i}.png`),
    goblin: Array.from({length: 8}, (_, i) => `scene3/goblin-${i}.png`),
    giant: Array.from({length: 8}, (_, i) => `scene3/giant-${i}.png`),
    demon: Array.from({length: 8}, (_, i) => `scene3/demon-${i}.png`),
    jiangbao: Array.from({length: 6}, (_, i) => `jiangbao-${i}.webp`),
    poseidon: Array.from({length: 6}, (_, i) => `poseidon-${i}.webp`),
    venom: Array.from({length: 8}, (_, i) => `scene3/venom-${i}.png`),
    axe: Array.from({length: 8}, (_, i) => `scene3/axe-${i}.png`),
    momo: Array.from({length: 6}, (_, i) => `momo-${i}.webp`),
    portal: Array.from({length: 10}, (_, i) => `portal-${i}.webp`),
    bone: Array.from({length: 7}, (_, i) => `bone-${i}.webp`),
  };
  const FRAME_SIZE = {
    player: [54, 72], super: [86, 86], goblin: [36, 48], giant: [82, 110],
    demon: [82, 110], jiangbao: [58, 76], poseidon: [64, 82], venom: [86, 92],
    axe: [74, 60], momo: [74, 92],
  };
  const VIDEO_FX = {
    clash: {file: 'clash.mp4', crop: [180, 170, 720, 650], w: 54, h: 49},
    wallSpark: {file: 'wall-spark.mp4', w: 72, h: 72},
    upgrade2: {file: 'upgrade-2.mp4', w: 88, h: 112},
  };

  const DIAMOND_SIDE = 220;
  const DIAMOND_SLANT_X = 84.61538461538461;
  const DIAMOND_SLANT_Y = Math.sqrt(DIAMOND_SIDE ** 2 - DIAMOND_SLANT_X ** 2);
  const CAR_ROTATION = -12 * Math.PI / 180;
  const CAR_WIDTH = 68;
  const CAR_HEIGHT = 36;
  const diamonds = [
    [492, 467.28977014048616], [888.3802404905086, 467.28977014048616],
    [747.2018106242804, 806.1180018194339], [156.2061855183871, 1009.194924896357],
    [552.5864260088957, 1009.194924896357],
  ].map(([x, y]) => [x + MAP_OFFSET_X, y]);
  const topWalls = [
    [[480.8707375585359 + MAP_OFFSET_X, 230], [700.8707375585359 + MAP_OFFSET_X, 230], 9],
    [[700.8707375585359 + MAP_OFFSET_X, 230], [785.4861221739205 + MAP_OFFSET_X, 26.923076923076934], 6],
  ];
  const THREAT_BLOCK_POINT = Object.freeze({x: 540, y: 280});
  const THREAT_RING_CONTACT_DISTANCE = THREAT_RING_OUTER_RADIUS * 2;
  const THREAT_CONTACT_TIME = 5.2;
  const DEMON_APPROACH_TIME = 3.5;
  const THREAT_RELEASE_Y = 235;
  const RAINBOW_BAIT_POINT = Object.freeze({x: X(530), y: 48});
  const THREAT_STARTS = Object.freeze({
    giant: Object.freeze({x: RAINBOW_BAIT_POINT.x, y: -110}),
    demon: Object.freeze({x: X(273), y: 396}),
  });
  function configureThreatApproach(giant, demon) {
    const routeProgress = 1 - THREAT_RING_CONTACT_DISTANCE / distance(giant, demon);
    for (const threat of [giant, demon]) {
      threat.stopPoint = {
        x: threat.x + (THREAT_BLOCK_POINT.x - threat.x) * routeProgress,
        y: threat.y + (THREAT_BLOCK_POINT.y - threat.y) * routeProgress,
      };
      threat.approachDone = false;
    }
    giant.speed = distance(giant, giant.stopPoint) / THREAT_CONTACT_TIME;
    demon.speed = distance(demon, demon.stopPoint) / DEMON_APPROACH_TIME;
  }
  const FINAL_BOSS_ROUTE = Object.freeze({
    centerX: X(440), ringContactDistance: 210, downSpeed: 75,
    downX: -DIAMOND_SLANT_X / DIAMOND_SIDE,
    downY: DIAMOND_SLANT_Y / DIAMOND_SIDE,
  });
  const FINAL_BOSS_GUARD = Object.freeze({
    leftX: X(410), leftY: 710, rightIntentX: X(470), rightIntentY: 810,
    rightBoundaryX: X(650), rightBoundaryY: 790,
  });

  const images = {};
  const imageNames = [
    'grass.webp', 'car.webp', 'white.webp', 'green.webp', 'gold.webp', 'purple.webp',
    'white-orb.webp', 'green-orb.webp', 'gold-orb.webp', 'red-orb.webp', '彩刃.png',
    '超大金轮.png', 'scene3/red-blade.png', ...Object.values(ACTOR_FRAMES).flat(),
    ...Array.from({length: 6}, (_, i) => `fire01-${i}.webp`),
  ];
  const sounds = {};
  for (const [key, file] of Object.entries({
    clash: 'blade-clash.mp3', pickup: 'pickup.mp3', hit: 'enemy-hit.mp3',
    hurt: 'collision.mp3', upgrade: 'upgrade.mp3', death: 'death.mp3',
    goblinHit: 'enemy-hit.mp3', goblinsClear: 'momo-hit.mp3',
    runAway: 'run-away.mp3', hu: 'hu.mp3', surprised: 'surprised.mp3',
    laugh: 'laugh.mp3', yo: 'yo.mp3', ouch: 'ouch.mp3',
  })) sounds[key] = Array.from({length: 3}, () => new Audio(AUDIO_ROOT + file));

  function makeVideo(name) {
    if (typeof document.createElement !== 'function') return null;
    const video = document.createElement('video');
    video.src = VIDEO_ROOT + VIDEO_FX[name].file;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    try { video.play().catch(() => {}); } catch (_) {}
    return video;
  }

  function X(value) { return value + MAP_OFFSET_X; }
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
  function bladeList(tier, count) {
    return Array.from({length: count}, (_, index) => ({
      tier, angle: index * Math.PI * 2 / count, reflowTargetOffset: null,
    }));
  }
  function arrangeBlades(subject) {
    const count = subject.blades.length;
    subject.blades.forEach((blade, index) => {
      blade.angle = normalizeAngle(state.bladeAngle + index * Math.PI * 2 / Math.max(1, count));
      blade.reflowTargetOffset = null;
    });
    subject.lastBladeContactAt = -Infinity;
    subject.needsBladeReflow = false;
    subject.bladeReflow = false;
  }
  function grid(center, columns, rows, spacing, rowShiftX = 0) {
    const result = [];
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      result.push({
        x: X(center[0]) + (row - (rows - 1) / 2) * rowShiftX +
          (column - (columns - 1) / 2) * spacing,
        y: center[1] + (row - (rows - 1) / 2) * spacing,
      });
    }
    return result;
  }
  function diamondPoints([cx, cy]) {
    const half = DIAMOND_SIDE / 2;
    const lean = DIAMOND_SLANT_X / 2;
    const rise = DIAMOND_SLANT_Y / 2;
    return [
      [cx - half + lean, cy - rise], [cx + half + lean, cy - rise],
      [cx + half - lean, cy + rise], [cx - half - lean, cy + rise],
    ];
  }
  const diamondPolygons = diamonds.map(diamondPoints);
  const wallSegments = [];
  for (const points of diamondPolygons)
    for (let index = 0; index < 4; index++) wallSegments.push([points[index], points[(index + 1) % 4]]);
  for (const [a, b] of topWalls) wallSegments.push([a, b]);

  const goldDecorations = diamonds.flatMap(([cx, cy]) => {
    const points = [];
    for (let row = 0; row < 3; row++) {
      const yOffset = (row - 1) * 48;
      const rowCenterX = cx - yOffset * DIAMOND_SLANT_X / DIAMOND_SLANT_Y;
      for (let column = 0; column < 4; column++)
        points.push({x: rowCenterX + (column - 1.5) * 48, y: cy + yOffset});
    }
    return points;
  });
  const whiteStartPoints = grid([590.8707375585359, 297.8756543010123], 3, 2, 30);
  const FIRST_CORRIDOR_ENTRY_Y = Math.min(...whiteStartPoints.map(point => point.y)) - 20;
  const JIANGBAO_TRIGGER_POINT = Object.freeze({
    x: X(620.8707375585359), y: 297.8756543010123,
  });
  const JIANGBAO_TRIGGER_RADIUS = 45;
  const greenStartPoints = grid([760.7793351783685, 297.8756543010123], 2, 2, 30, -12.5);
  const greenMiddlePoints = grid([690.1901202452543, 467.28977014048616], 2, 4, 30, -12.5);
  const SEA_CORRIDOR_RESOURCE_TRIGGER_COUNT = 6;
  const SEA_EXIT_TRIGGER_ZONE = Object.freeze({
    minX: Math.min(...greenMiddlePoints.map(point => point.x)) - 70,
    maxX: Math.max(...greenMiddlePoints.map(point => point.x)) + 70,
    minY: Math.max(...greenMiddlePoints.map(point => point.y)) + 35,
    maxY: 650,
  });
  const redPoints = [
    ...grid([529.894118316588, 858.9808090568831], 3, 2, 30),
    ...grid([374.01169037902605, 962.1180018194339], 3, 2, 30, -12.5),
  ];
  const goblinPoints = [
    [344, 158], [377, 143], [410, 164], [444, 151], [469, 178],
    [359, 191], [390, 181], [421, 201], [451, 193], [478, 211],
  ].map(([x, y]) => ({x: X(x), y}));
  const portalPoint = {x: X(336.51169037902605), y: 1052.1180018194339};
  const magnetPoint = {x: X(500), y: 770};
  const rainbowPoint = RAINBOW_BAIT_POINT;

  function actor(config) {
    return Object.assign({
      active: false, alive: true, angle: 0, blades: [], arrived: false,
      invulnerable: false, killable: true, mode: 'idle', attacked: false,
      entryState: 'ready', entryGraceUntil: -Infinity, entrySide: null,
      lastBladeContactAt: -Infinity, needsBladeReflow: false, bladeReflow: false,
    }, config);
  }

  let state;
  let lastTime = performance.now();
  const keys = new Set();
  const pointer = {active: false, id: null, originX: 0, originY: 0, x: 0, y: 0};

  function reset() {
    state?.saiyanVideo?.pause();
    const saiyanVideo = document.createElement('video');
    saiyanVideo.src = VIDEO_ROOT + 'saiyan.mp4';
    saiyanVideo.loop = true;
    saiyanVideo.muted = true;
    saiyanVideo.playsInline = true;
    saiyanVideo.preload = 'auto';
    state = {
      clock: 0, status: 'playing', phase: 'goblins', toastUntil: 0, bladeAngle: 0,
      camera: {x: 0, y: 0}, effects: [], portalStanding: 0, venomAt: Infinity,
      feedback: {sounds: [], effects: []}, soundNextAt: {},
      finalBossGuardReason: null, finalBossGraceUntil: -Infinity,
      startWhiteCollected: 0, startGreenCollected: 0, middleGreenCollected: 0,
      totalGreenCollected: 0,
      greensConverted: false, threatsReleased: false,
      firstCorridorCuePlayed: false, whiteCompleteCuePlayed: false,
      venomChaseCuePlayed: false,
      redTransformationCompleted: false,
      player: {x: X(357), y: 262, r: PLAYER_RADIUS, speed: PLAYER_SPEED,
        form: 'normal', hasMoved: false, blades: bladeList('white', 6),
        lastBladeContactAt: -Infinity, needsBladeReflow: false, bladeReflow: false},
      goblins: goblinPoints.map((point, index) => actor({
        id: `goblin-${index}`, kind: 'goblin', ...point, home: {...point}, r: 15,
        speed: 30 + index % 3 * 4, frames: 'goblin', active: true,
      })),
      giant: actor({id: 'giant', kind: 'giant', ...THREAT_STARTS.giant, r: 31, speed: 0,
        mode: 'waiting',
        frames: 'giant', blades: bladeList('red', THREAT_FULL_RING_BLADE_COUNT),
        fullBladeRing: true, fullBladeTier: 'red', routeEnd: THREAT_BLOCK_POINT,
        invulnerable: true, killable: false}),
      demon: actor({id: 'demon', kind: 'demon', ...THREAT_STARTS.demon, r: 31, speed: 0,
        mode: 'waiting',
        frames: 'demon', blades: bladeList('red', THREAT_FULL_RING_BLADE_COUNT),
        fullBladeRing: true, fullBladeTier: 'red', routeEnd: THREAT_BLOCK_POINT,
        invulnerable: true, killable: false}),
      jiangbao: actor({id: 'jiangbao', kind: 'jiangbao', x: X(905), y: 92, r: 25,
        speed: 88, frames: 'jiangbao', blades: bladeList('green', 6)}),
      sea: actor({id: 'sea', kind: 'poseidon', x: X(466), y: 594, r: 28,
        speed: SEA_BLOCK_SPEED, fleeSpeed: SEA_FLEE_SPEED, venomSpawnAt: Infinity,
        frames: 'poseidon', blades: bladeList('green', 12), mode: 'block'}),
      venom: actor({id: 'venom', kind: 'venom', x: X(213), y: 592, r: 31,
        speed: VENOM_CHASE_SPEED, fleeSpeed: VENOM_FLEE_START_SPEED,
        currentFleeSpeed: VENOM_FLEE_START_SPEED, fleeElapsed: 0, fleeTarget: null,
        frames: 'venom', blades: bladeList('purple', 9), mode: 'chase',
        killable: false, fleeKillableAt: Infinity}),
      axe: actor({id: 'axe', kind: 'axe', x: X(238), y: 693, r: 28,
        speed: FINAL_BOSS_ALIGN_SPEED,
        frames: 'axe', ring: true, ringRadius: 112, invulnerable: true, killable: false}),
      momo: actor({id: 'momo', kind: 'momo', x: X(605), y: 696, r: 31,
        speed: FINAL_BOSS_ALIGN_SPEED,
        frames: 'momo', ring: true, ringRadius: 112, invulnerable: true, killable: false}),
      finalBossCenter: null,
      resources: [
        ...whiteStartPoints.map((point, index) => ({...point, id: `white-start-${index}`,
          group: 'white-start', tier: 'white', active: true, taken: false})),
        ...greenStartPoints.map((point, index) => ({...point, id: `green-start-${index}`,
          group: 'start', tier: 'green', active: true, taken: false})),
        ...greenMiddlePoints.map((point, index) => ({...point, id: `green-middle-${index}`,
          group: 'middle', tier: 'green', active: true, taken: false})),
      ],
      redResources: redPoints.map((point, index) => ({...point, home: {...point},
        id: `red-${index}`, active: true, taken: false, arrived: false,
        pickupSource: null})),
      magnet: {...magnetPoint, active: false, taken: false, pulling: false, elapsed: 0},
      rainbow: {...rainbowPoint, active: true, collectible: false},
      portal: {...portalPoint, active: false},
      saiyanVideo,
    };
    ui.result.hidden = true;
    ui.toast.classList.remove('visible');
    pointer.active = false;
    ui.stick.style.display = 'none';
    try { saiyanVideo.play().catch(() => {}); } catch (_) {}
    updateHud();
  }

  function playSound(name, volume = .26, cooldown = 0) {
    const pool = sounds[name];
    if (!pool) return;
    if (cooldown) {
      const nextAt = state.soundNextAt[name] || 0;
      if (state.clock < nextAt) return;
      state.soundNextAt[name] = state.clock + cooldown;
    }
    const clip = pool.shift();
    pool.push(clip);
    clip.volume = volume;
    try { clip.currentTime = 0; clip.play().catch(() => {}); } catch (_) {}
    state.feedback.sounds.push({name, at: state.clock, volume});
    return clip;
  }
  function toast(message, duration = 2.4) {
    ui.toast.textContent = message;
    ui.toast.classList.add('visible');
    state.toastUntil = state.clock + duration;
  }
  function burst(x, y, color = '#fff36b') {
    state.effects.push({type: 'burst', x, y, color, born: state.clock, duration: .45});
  }
  function fireImpact(x, y, duration = .42) {
    state.effects.push({type: 'fire01', x, y, born: state.clock, duration});
    state.feedback.effects.push({name: 'fire01', x, y, at: state.clock});
  }
  function videoImpact(name, x, y, duration = .52) {
    const video = makeVideo(name);
    if (video) state.effects.push({type: 'video', name, video, x, y,
      born: state.clock, duration});
    else state.effects.push({type: 'burst', x, y, color: '#fff36b',
      born: state.clock, duration});
    state.feedback.effects.push({name, x, y, at: state.clock});
  }
  function boneShatter(x, y) {
    state.effects.push({type: 'bone', x, y, born: state.clock, duration: .72});
    state.feedback.effects.push({name: 'bone', x, y, at: state.clock});
  }

  function updateHud() {
    if (!state) return;
    const counts = {};
    for (const blade of state.player.blades) counts[blade.tier] = (counts[blade.tier] || 0) + 1;
    ui.blades.textContent = Object.keys(TIER).filter(tier => counts[tier])
      .map(tier => `${TIER_LABEL[tier]} × ${counts[tier]}`).join(' · ') || '没有刀刃';
    const goblins = state.goblins.filter(enemy => enemy.alive).length;
    const objectives = {
      goblins: '向上击败全部哥布林',
      escape: '彩刃拿不到！避开巨人和魔人向下逃',
      jiangbao: '继续向下拾取8绿刃，反杀酱爆',
      afterJiangbao: '绿刃已转金，继续穿过斜通道',
      sea: '攻击堵门海神，向左追击',
      venom: '被毒液追击！寻找下方吸铁石',
      magnet: '等待12红刃吸附完成',
      transformed: '满红刃变身！反杀9紫刃毒液',
      bossesAlign: '两大Boss正在封住上路，快向下逃',
      bossesChase: '逃入最下面的斜通道传送门',
    };
    ui.objective.textContent = objectives[state.phase] || '向下进入传送门';
    if (state.phase === 'goblins') ui.hint.textContent = `哥布林 ${goblins}`;
    else if (state.phase === 'jiangbao')
      ui.hint.textContent = `已拾绿刃 ${state.totalGreenCollected}/12`;
    else if (state.magnet.pulling)
      ui.hint.textContent = `红刃吸附 ${state.redResources.filter(item => item.arrived).length}/12`;
    else ui.hint.textContent = state.player.form === 'super' ? '黄衣金发悟空' : '禁止碰到敌人身体';
  }

  function pointSegmentDistance(x, y, segment) {
    const [[ax, ay], [bx, by]] = segment;
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
  }
  function walkable(x, y) {
    const footY = y + PLAYER_FOOT_Y;
    if (x < 36 || x > WORLD.width - 36 || footY < 24 || footY > WORLD.height - 20) return false;
    return wallSegments.every(segment => pointSegmentDistance(x, footY, segment) >= WALL_RADIUS + PLAYER_FOOT_RADIUS);
  }
  function inputVector() {
    let x = 0, y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x--;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x++;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y--;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y++;
    if (pointer.active) {
      const dx = pointer.x - pointer.originX, dy = pointer.y - pointer.originY;
      const length = Math.hypot(dx, dy);
      if (length > 5) { x += dx / Math.max(52, length); y += dy / Math.max(52, length); }
    }
    const length = Math.hypot(x, y);
    return length > 1 ? {x: x / length, y: y / length} : {x, y};
  }
  function movePlayer(dt) {
    const input = inputVector();
    const player = state.player;
    if (Math.hypot(input.x, input.y) > .05) player.hasMoved = true;
    const dx = input.x * player.speed * dt, dy = input.y * player.speed * dt;
    if (walkable(player.x + dx, player.y + dy)) { player.x += dx; player.y += dy; return; }
    if (walkable(player.x + dx, player.y)) player.x += dx;
    if (walkable(player.x, player.y + dy)) player.y += dy;
  }
  function moveToward(subject, target, speed, dt) {
    const dx = target.x - subject.x, dy = target.y - subject.y;
    const length = Math.hypot(dx, dy);
    if (length < .001) return true;
    const step = Math.min(length, speed * dt);
    subject.x += dx / length * step;
    subject.y += dy / length * step;
    return step >= length;
  }
  function actorVisualExtent(subject) {
    if (subject.ring) return subject.ringRadius * 1.05;
    if (subject.blades.length) return ENEMY_BLADE_RADIUS + BLADE_DRAW_HEIGHT / 2;
    return Math.max(subject.r || 0, 24);
  }
  function isFullyOutsideCamera(subject) {
    const extent = actorVisualExtent(subject);
    return subject.x + extent < state.camera.x - OFFSCREEN_SPAWN_MARGIN ||
      subject.x - extent > state.camera.x + canvas.width + OFFSCREEN_SPAWN_MARGIN ||
      subject.y + extent < state.camera.y - OFFSCREEN_SPAWN_MARGIN ||
      subject.y - extent > state.camera.y + canvas.height + OFFSCREEN_SPAWN_MARGIN;
  }
  function hasSafelyEnteredCamera(subject) {
    const extent = actorVisualExtent(subject);
    const inset = 30;
    if (subject.entrySide === 'left')
      return subject.x + extent >= state.camera.x + inset;
    if (subject.entrySide === 'right')
      return subject.x - extent <= state.camera.x + canvas.width - inset;
    if (subject.entrySide === 'top')
      return subject.y + extent >= state.camera.y + inset;
    if (subject.entrySide === 'bottom')
      return subject.y - extent <= state.camera.y + canvas.height - inset;
    return subject.x + extent >= state.camera.x + inset &&
      subject.x - extent <= state.camera.x + canvas.width - inset &&
      subject.y + extent >= state.camera.y + inset &&
      subject.y - extent <= state.camera.y + canvas.height - inset;
  }
  function beginOffscreenEntry(subject, side) {
    const extent = actorVisualExtent(subject);
    if (side === 'left') subject.x = state.camera.x - extent - OFFSCREEN_SPAWN_MARGIN;
    else if (side === 'right')
      subject.x = state.camera.x + canvas.width + extent + OFFSCREEN_SPAWN_MARGIN;
    else if (side === 'top') {
      subject.x = clamp(subject.x, state.camera.x + extent,
        state.camera.x + canvas.width - extent);
      subject.y = state.camera.y - extent - OFFSCREEN_SPAWN_MARGIN;
    } else if (side === 'bottom')
      subject.y = state.camera.y + canvas.height + extent + OFFSCREEN_SPAWN_MARGIN;
    subject.entryState = 'entering';
    subject.entrySide = side;
    subject.entryGraceUntil = state.clock + OFFSCREEN_ENTRY_GRACE;
  }
  function extendRouteStartOutside(subject) {
    const target = subject.routeEnd;
    const dx = subject.x - target.x, dy = subject.y - target.y;
    const length = Math.max(.001, Math.hypot(dx, dy));
    const ux = dx / length, uy = dy / length;
    for (let step = 0; step < 40 && !isFullyOutsideCamera(subject); step++) {
      subject.x += ux * 32;
      subject.y += uy * 32;
    }
    subject.entryState = 'entering';
    subject.entrySide = 'route-extension';
    subject.entryGraceUntil = state.clock + OFFSCREEN_ENTRY_GRACE;
  }
  function updateEntryState(subject) {
    if (subject.entryState !== 'entering') return true;
    if (state.clock < subject.entryGraceUntil || !hasSafelyEnteredCamera(subject)) return false;
    subject.entryState = 'ready';
    return true;
  }

  function bladeTip(subject, blade, radius = ENEMY_BLADE_RADIUS) {
    return {x: subject.x + Math.cos(blade.angle) * radius,
      y: subject.y + Math.sin(blade.angle) * radius};
  }
  function markBladeContact(subject) {
    subject.lastBladeContactAt = state.clock;
    subject.bladeReflow = false;
    for (const blade of subject.blades) blade.reflowTargetOffset = null;
  }
  function removeBlade(subject, blade) {
    const index = subject.blades.indexOf(blade);
    if (index < 0) return false;
    subject.blades.splice(index, 1);
    subject.needsBladeReflow = subject.blades.length > 1;
    return true;
  }
  function restoreFullBladeRing(subject) {
    if (!subject.fullBladeRing || subject.blades.length >= THREAT_FULL_RING_BLADE_COUNT) return;
    subject.blades = bladeList(subject.fullBladeTier || 'red', THREAT_FULL_RING_BLADE_COUNT);
    arrangeBlades(subject);
  }
  function beginBladeReflow(subject) {
    if (!subject.needsBladeReflow || subject.blades.length < 2) return;
    const gap = Math.PI * 2 / subject.blades.length;
    const ordered = [...subject.blades].sort((a, b) =>
      normalizeAngle(a.angle - state.bladeAngle) - normalizeAngle(b.angle - state.bladeAngle));
    let sumX = 0, sumY = 0;
    ordered.forEach((blade, index) => {
      const phase = normalizeAngle(blade.angle - state.bladeAngle - index * gap);
      sumX += Math.cos(phase);
      sumY += Math.sin(phase);
    });
    const base = normalizeAngle(Math.atan2(sumY, sumX));
    ordered.forEach((blade, index) => {
      blade.reflowTargetOffset = normalizeAngle(base + index * gap);
    });
    subject.bladeReflow = true;
  }
  function updateBladeCircle(subject, dt) {
    if (!subject.blades.length) {
      subject.needsBladeReflow = false;
      subject.bladeReflow = false;
      return;
    }
    for (const blade of subject.blades) blade.angle = normalizeAngle(blade.angle + BLADE_SPEED * dt);
    if (!subject.needsBladeReflow) return;
    if (!subject.bladeReflow) {
      if (state.clock - subject.lastBladeContactAt < BLADE_REFLOW_DELAY) return;
      beginBladeReflow(subject);
    }
    let largestDelta = 0;
    const blend = Math.min(1, dt * BLADE_REFLOW_SPEED);
    for (const blade of subject.blades) {
      const currentOffset = normalizeAngle(blade.angle - state.bladeAngle);
      const delta = angleDelta(currentOffset, blade.reflowTargetOffset);
      largestDelta = Math.max(largestDelta, Math.abs(delta));
      blade.angle = normalizeAngle(blade.angle + delta * blend);
    }
    if (largestDelta > .012) return;
    for (const blade of subject.blades) {
      blade.angle = normalizeAngle(state.bladeAngle + blade.reflowTargetOffset);
      blade.reflowTargetOffset = null;
    }
    subject.needsBladeReflow = false;
    subject.bladeReflow = false;
  }
  function bladeSubjects() {
    return [state.player, ...state.goblins, state.giant, state.demon, state.jiangbao,
      state.sea, state.venom];
  }
  function clashBlades(enemy) {
    if (!enemy.blades.length || !state.player.blades.length) return false;
    let collided = false;
    for (const playerBlade of [...state.player.blades]) {
      if (!state.player.blades.includes(playerBlade)) continue;
      const playerTip = bladeTip(state.player, playerBlade, PLAYER_BLADE_RADIUS);
      for (const enemyBlade of [...enemy.blades]) {
        if (!state.player.blades.includes(playerBlade) || !enemy.blades.includes(enemyBlade)) continue;
        const enemyTip = bladeTip(enemy, enemyBlade, ENEMY_BLADE_RADIUS);
        if (distance(playerTip, enemyTip) > BLADE_CLASH_DISTANCE) continue;
        markBladeContact(state.player);
        markBladeContact(enemy);
        const playerBreaks = TIER[playerBlade.tier] <= TIER[enemyBlade.tier];
        const enemyBreaks = TIER[enemyBlade.tier] <= TIER[playerBlade.tier];
        if (playerBreaks) removeBlade(state.player, playerBlade);
        if (enemyBreaks) removeBlade(enemy, enemyBlade);
        videoImpact('clash', (playerTip.x + enemyTip.x) / 2,
          (playerTip.y + enemyTip.y) / 2, .46);
        collided = true;
      }
    }
    if (collided) {
      restoreFullBladeRing(enemy);
      playSound('clash', .24, CONTACT_SOUND_COOLDOWN);
      normalizePlayerForm();
      updateHud();
    }
    return collided;
  }
  function playerBladeTouchesBody(enemy) {
    return state.player.blades.some(blade =>
      distance(bladeTip(state.player, blade, PLAYER_BLADE_RADIUS), enemy) <
        enemy.r + BLADE_BODY_HIT_RADIUS);
  }
  function enemyWeaponTouchesPlayer(enemy) {
    if (enemy.ring)
      return Math.abs(distance(state.player, enemy) - enemy.ringRadius) < state.player.r + 8;
    return enemy.blades.some(blade =>
      distance(bladeTip(enemy, blade), state.player) < state.player.r + BLADE_BODY_HIT_RADIUS);
  }
  function fail(message) {
    if (state.status !== 'playing') return;
    state.status = 'failed';
    playSound('hurt', .26);
    ui.title.textContent = '挑战失败';
    ui.detail.textContent = message;
    ui.result.hidden = false;
  }
  function win() {
    if (state.status !== 'playing') return;
    state.status = 'won';
    ui.title.textContent = '场景三完成';
    ui.detail.textContent = '成功摆脱追击并进入终点传送门。';
    ui.result.hidden = false;
  }
  function bodyContact(enemy) {
    const bodiesTouch = distance(state.player, enemy) < state.player.r + enemy.r - 6;
    if (bodiesTouch || enemyWeaponTouchesPlayer(enemy)) {
      fail(`被${enemy.kind === 'demon' ? '魔人' : enemy.kind === 'sea' ? '海神' :
        enemy.kind === 'axe' ? '斧头帮' : enemy.kind}的身体或武器碰到，请重试`);
      return true;
    }
    return false;
  }
  function ringShattersBlade(enemy) {
    let collided = false;
    for (const blade of [...state.player.blades]) {
      const point = bladeTip(state.player, blade, PLAYER_BLADE_RADIUS);
      if (Math.abs(distance(point, enemy) - enemy.ringRadius) > 22) continue;
      markBladeContact(state.player);
      removeBlade(state.player, blade);
      videoImpact('clash', point.x, point.y, .46);
      collided = true;
    }
    if (collided) {
      playSound('clash', .24, CONTACT_SOUND_COOLDOWN);
      normalizePlayerForm();
      updateHud();
    }
  }
  function resolveEnemy(enemy) {
    if (!enemy.active || !enemy.alive || state.status !== 'playing') return;
    if (!updateEntryState(enemy)) return;
    if (enemy.kind === 'goblin') {
      if (playerBladeTouchesBody(enemy)) defeatEnemy(enemy);
      else bodyContact(enemy);
      return;
    }
    if (enemy.ring) ringShattersBlade(enemy);
    else if (clashBlades(enemy) && enemy.kind === 'poseidon') attackSea();
    if (enemy.kind === 'poseidon' && !enemy.attacked && playerBladeTouchesBody(enemy)) {
      attackSea();
      return;
    }
    if (!enemy.ring && enemy.killable && playerBladeTouchesBody(enemy)) {
      defeatEnemy(enemy);
      return;
    }
    if (enemy.alive) bodyContact(enemy);
  }

  function defeatEnemy(enemy) {
    if (!enemy.alive || !enemy.killable) return;
    enemy.alive = false;
    enemy.active = false;
    if (enemy.kind === 'goblin') fireImpact(enemy.x, enemy.y);
    boneShatter(enemy.x, enemy.y);
    if (enemy.kind === 'goblin') {
      playSound('goblinHit', .24);
      if (!state.goblins.some(goblin => goblin.alive)) playSound('goblinsClear', .31);
    } else if (enemy.kind === 'jiangbao') {
      playSound('laugh', .31);
      onJiangbaoDefeated();
    } else playSound('death', .24);
    if (enemy.kind === 'poseidon') {
      spawnVenom('chase');
      toast('海神倒下，毒液开始追击！');
    } else if (enemy.kind === 'venom') spawnFinalBosses();
    updateHud();
  }
  function normalizePlayerForm() {
    if (state.player.form !== 'super') return;
    if (state.player.blades.some(blade => blade.tier === 'red')) return;
    state.player.form = 'normal';
    toast('红刃已耗尽，恢复原来的样子！');
    playSound('hurt', .24);
  }

  function collectResources() {
    for (const item of state.resources) {
      if (!item.active || item.taken || distance(state.player, item) > 29) continue;
      item.taken = true;
      if (item.group === 'middle') {
        state.middleGreenCollected++;
        if (state.middleGreenCollected >= SEA_CORRIDOR_RESOURCE_TRIGGER_COUNT)
          spawnSea();
      }
      if (item.tier === 'green') {
        if (state.totalGreenCollected === 0)
          state.player.blades = state.player.blades.filter(blade => blade.tier !== 'white');
        state.totalGreenCollected++;
        if (item.group === 'start') state.startGreenCollected++;
      } else if (item.tier === 'white' && item.group === 'white-start') {
        state.startWhiteCollected++;
        videoImpact('upgrade2', item.x, item.y, .62);
        if (state.startWhiteCollected === whiteStartPoints.length &&
            !state.whiteCompleteCuePlayed) {
          state.whiteCompleteCuePlayed = true;
          playSound('hu', .31);
        }
      }
      state.player.blades.push({tier: item.tier, angle: state.bladeAngle,
        reflowTargetOffset: null});
      arrangeBlades(state.player);
      burst(item.x, item.y, item.tier === 'gold' ? '#ffd548' : '#72ff73');
      if (item.tier !== 'white') playSound('pickup', .22);
      updateHud();
    }
    for (const item of state.redResources) {
      if (state.magnet.pulling || !item.active || item.arrived ||
          distance(state.player, item) > 29) continue;
      item.taken = true;
      item.arrived = true;
      item.pickupSource = 'manual';
      state.player.blades.push({tier: 'red', angle: state.bladeAngle,
        reflowTargetOffset: null});
      arrangeBlades(state.player);
      burst(item.x, item.y, '#ff4e55');
      playSound('pickup', .22);
      toast(`拾取红刃 ${state.redResources.filter(resource => resource.arrived).length}/12`);
      updateHud();
    }
    if (!state.redTransformationCompleted &&
        state.redResources.every(item => item.arrived))
      transformPlayer();
  }
  function spawnJiangbao() {
    if (state.jiangbao.active || !state.jiangbao.alive) return false;
    state.jiangbao.active = true;
    state.jiangbao.x = X(905);
    state.jiangbao.y = 92;
    state.jiangbao.entryState = 'entering';
    state.jiangbao.entrySide = null;
    state.jiangbao.entryGraceUntil = state.clock + OFFSCREEN_ENTRY_GRACE;
    state.phase = 'jiangbao';
    playSound('surprised', .31);
    toast('6绿刃酱爆从4绿刃右上方追来！向下拾取绿刃');
    return true;
  }
  function onJiangbaoDefeated() {
    state.greensConverted = true;
    for (const blade of state.player.blades) if (blade.tier === 'green') blade.tier = 'gold';
    for (const item of state.resources) if (!item.taken && item.tier === 'green') item.tier = 'gold';
    state.phase = 'afterJiangbao';
    toast('反杀酱爆！主角和地图剩余绿刃全部转为金刃', 3.2);
    playSound('upgrade', .28);
  }
  function spawnSea() {
    if (state.sea.active || !state.sea.alive) return false;
    state.sea.active = true;
    state.sea.mode = 'block';
    beginOffscreenEntry(state.sea, 'left');
    state.sea.x += SEA_ENTRY_OFFSET_X;
    state.phase = 'sea';
    toast('12绿刃海神从左侧向右横向堵门！');
    return true;
  }
  function playerInSeaExitTriggerZone() {
    const player = state.player;
    return player.x >= SEA_EXIT_TRIGGER_ZONE.minX && player.x <= SEA_EXIT_TRIGGER_ZONE.maxX &&
      player.y >= SEA_EXIT_TRIGGER_ZONE.minY && player.y <= SEA_EXIT_TRIGGER_ZONE.maxY;
  }
  function triggerSeaNearCorridorExit() {
    if (!state.sea.active && state.sea.alive && playerInSeaExitTriggerZone()) spawnSea();
  }
  function attackSea() {
    const sea = state.sea;
    if (sea.attacked) return;
    sea.attacked = true;
    sea.mode = 'flee';
    sea.killable = false;
    sea.venomSpawnAt = state.clock + SEA_VENOM_DELAY;
    playSound('yo', .31);
    toast('海神向左逃跑，快追！毒液稍后会从左侧出现', 2.4);
  }
  function spawnVenom(mode = 'chase') {
    if (state.venom.active || !state.venom.alive) return false;
    state.venom.active = true;
    state.venom.mode = mode;
    beginOffscreenEntry(state.venom, 'left');
    state.venom.x += VENOM_ENTRY_OFFSET_X;
    if (mode === 'interceptSea')
      state.venom.x = Math.min(state.venom.x, state.sea.x - VENOM_INTERCEPT_LEAD);
    state.phase = 'venom';
    if (mode === 'interceptSea')
      toast('海神向左逃跑，但9紫刃毒液正从左侧迎面截杀！', 3);
    else {
      state.magnet.active = true;
      playVenomChaseCue();
      toast('9紫刃毒液从左侧出现并开始追击！', 3);
    }
    return true;
  }
  function playVenomChaseCue() {
    if (state.venomChaseCuePlayed) return;
    state.venomChaseCuePlayed = true;
    playSound('ouch', .31);
  }
  function killSeaByVenom() {
    const sea = state.sea;
    if (!sea.alive) return;
    sea.alive = false;
    sea.active = false;
    boneShatter(sea.x, sea.y);
    playSound('death', .24);
    state.venom.mode = 'chase';
    playVenomChaseCue();
    state.magnet.active = true;
    state.phase = 'venom';
    toast('毒液击杀海神后转向主角，快去拾取吸铁石！', 3.2);
    updateHud();
  }
  function takeMagnet() {
    if (!state.magnet.active || state.magnet.taken) return;
    state.magnet.taken = true;
    state.magnet.pulling = true;
    state.magnet.elapsed = 0;
    state.phase = 'magnet';
    toast('吸铁石启动！下方12红刃正在飞来');
    playSound('upgrade', .28);
  }
  function transformPlayer() {
    if (state.redTransformationCompleted) return false;
    state.redTransformationCompleted = true;
    state.magnet.pulling = false;
    state.player.blades = bladeList('red', 12);
    arrangeBlades(state.player);
    state.player.form = 'super';
    if (state.venom.active && state.venom.alive) {
      state.venom.mode = 'flee';
      state.venom.killable = false;
      state.venom.fleeKillableAt = state.clock + VENOM_FLEE_GRACE;
      state.venom.fleeElapsed = 0;
      state.venom.currentFleeSpeed = state.venom.fleeSpeed;
      state.venom.fleeTarget = {
        x: Math.min(X(300), state.venom.x - 80),
        y: Math.min(650, state.venom.y - 120),
      };
    }
    state.phase = 'transformed';
    burst(state.player.x, state.player.y, '#ffdf53');
    toast('满红刃黄衣金发悟空！反杀毒液', 3);
    playSound('upgrade', .28);
    try { state.saiyanVideo.currentTime = 0; state.saiyanVideo.play().catch(() => {}); } catch (_) {}
    updateHud();
    return true;
  }
  function spawnFinalBosses(reason = 'venom-defeated') {
    if (state.axe.active || state.momo.active) return false;
    state.axe.active = true;
    state.momo.active = true;
    beginOffscreenEntry(state.axe, 'left');
    beginOffscreenEntry(state.momo, 'right');
    state.axe.mode = 'align';
    state.momo.mode = 'align';
    state.finalBossCenter = {x: FINAL_BOSS_ROUTE.centerX,
      y: (state.axe.y + state.momo.y) / 2};
    state.finalBossGuardReason = reason;
    state.finalBossGraceUntil = state.clock + FINAL_BOSS_SPAWN_GRACE;
    state.phase = 'bossesAlign';
    toast(reason === 'venom-defeated' ? '斧头帮与momo从两侧夹击，正在封锁上路！' :
      '偏离路线！斧头帮与momo同时出现并封锁上路！', 3.2);
    return true;
  }

  function rainbowVisibleInCamera() {
    const radius = 21;
    return state.rainbow.x + radius >= state.camera.x &&
      state.rainbow.x - radius <= state.camera.x + canvas.width &&
      state.rainbow.y + radius >= state.camera.y &&
      state.rainbow.y - radius <= state.camera.y + canvas.height;
  }
  function releaseThreats() {
    if (state.threatsReleased) return false;
    state.giant.active = true;
    state.demon.active = true;
    extendRouteStartOutside(state.giant);
    extendRouteStartOutside(state.demon);
    configureThreatApproach(state.giant, state.demon);
    state.threatsReleased = true;
    state.giant.mode = 'approach';
    state.demon.mode = 'approach';
    state.phase = 'escape';
    toast('+99彩刃就在前方，但巨人已从正上方逼近；向下又有魔人，快进通道！', 3.5);
    return true;
  }
  function updateGoblins(dt) {
    for (const enemy of state.goblins) {
      if (!enemy.alive) continue;
      if (state.player.hasMoved) {
        moveToward(enemy, state.player, enemy.speed, dt);
        resolveEnemy(enemy);
      }
    }
    if (!state.threatsReleased &&
        (state.player.y <= THREAT_RELEASE_Y || rainbowVisibleInCamera())) releaseThreats();
  }
  function updateThreats(dt) {
    const giant = state.giant;
    const demon = state.demon;
    if (state.threatsReleased && giant.active && demon.active && !giant.arrived) {
      giant.approachDone = moveToward(giant, giant.stopPoint, giant.speed, dt);
      demon.approachDone = moveToward(demon, demon.stopPoint, demon.speed, dt);
      if (giant.approachDone && demon.approachDone) {
        giant.arrived = true;
        demon.arrived = true;
        giant.mode = demon.mode = 'blocking';
        videoImpact('wallSpark', (giant.x + demon.x) / 2,
          (giant.y + demon.y) / 2, .52);
      }
    }
    if (giant.active) resolveEnemy(giant);
    if (demon.active) resolveEnemy(demon);
  }
  function updateJiangbao(dt) {
    const enemy = state.jiangbao;
    if (!enemy.active || !enemy.alive) return;
    moveToward(enemy, state.player, enemy.speed, dt);
    resolveEnemy(enemy);
  }
  function updateSea(dt) {
    const sea = state.sea;
    if (!sea.active || !sea.alive) return;
    if (sea.mode === 'block') moveToward(sea, {x: X(640), y: 594}, sea.speed, dt);
    else if (sea.mode === 'flee') {
      sea.x -= sea.fleeSpeed * dt;
      if (!state.venom.active && state.clock >= sea.venomSpawnAt)
        spawnVenom('interceptSea');
    }
    resolveEnemy(sea);
  }
  function updateVenom(dt) {
    const venom = state.venom;
    if (!venom.active || !venom.alive) return;
    if (venom.mode === 'interceptSea') {
      if (!state.sea.alive) {
        venom.mode = 'chase';
        state.magnet.active = true;
      } else {
        moveToward(venom, state.sea, venom.speed, dt);
        if (distance(venom, state.sea) <= ENEMY_BLADE_RADIUS * 2) killSeaByVenom();
      }
      return;
    }
    if (venom.mode === 'chase') {
      moveToward(venom, state.player, venom.speed, dt);
    } else if (venom.mode === 'flee') {
      venom.fleeElapsed += dt;
      venom.currentFleeSpeed = Math.max(VENOM_FLEE_MIN_SPEED,
        venom.fleeSpeed - VENOM_FLEE_DECELERATION * venom.fleeElapsed);
      moveToward(venom, venom.fleeTarget, venom.currentFleeSpeed, dt);
      if (!venom.killable && state.clock >= venom.fleeKillableAt) venom.killable = true;
    }
    resolveEnemy(venom);
  }
  function updateMagnet(dt) {
    if (state.magnet.active && !state.magnet.taken && distance(state.player, state.magnet) < 34)
      takeMagnet();
    if (!state.magnet.pulling) return;
    state.magnet.elapsed += dt;
    for (let index = 0; index < state.redResources.length; index++) {
      const item = state.redResources[index];
      if (item.arrived) continue;
      const delay = index * MAGNET_PULL_STAGGER;
      if (state.magnet.elapsed < delay) continue;
      const dx = state.player.x - item.x, dy = state.player.y - item.y;
      const length = Math.hypot(dx, dy);
      const speed = MAGNET_PULL_SPEED + index * 16;
      if (length < 18 || speed * dt >= length) {
        item.x = state.player.x; item.y = state.player.y; item.arrived = true;
        item.taken = true; item.pickupSource = 'magnet';
      } else {
        item.x += dx / length * speed * dt;
        item.y += dy / length * speed * dt;
      }
    }
    if (!state.redTransformationCompleted &&
        state.redResources.every(item => item.arrived)) transformPlayer();
    updateHud();
  }
  function finalBossGuardReason(input = inputVector()) {
    if (state.player.form !== 'super' || state.axe.active || state.momo.active) return null;
    const player = state.player;
    if (player.x <= FINAL_BOSS_GUARD.leftX && player.y <= FINAL_BOSS_GUARD.leftY)
      return 'left-script-boundary';
    const headingUpperRight = input.x > .28 && input.y < -.2;
    if (headingUpperRight && player.x >= FINAL_BOSS_GUARD.rightIntentX &&
        player.y <= FINAL_BOSS_GUARD.rightIntentY) return 'right-up-intent';
    if (player.x >= FINAL_BOSS_GUARD.rightBoundaryX &&
        player.y <= FINAL_BOSS_GUARD.rightBoundaryY) return 'right-script-boundary';
    return null;
  }
  function updateFinalBossGuard() {
    const reason = finalBossGuardReason();
    if (reason) spawnFinalBosses(reason);
  }
  function updateFinalBosses(dt) {
    if (!state.axe.active || !state.momo.active) return;
    if (state.phase === 'bossesAlign') {
      const verticalGap = state.momo.y - state.axe.y;
      const halfGap = Math.sqrt(Math.max(0,
        FINAL_BOSS_ROUTE.ringContactDistance ** 2 - verticalGap ** 2)) / 2;
      const leftDone = moveToward(state.axe,
        {x: FINAL_BOSS_ROUTE.centerX - halfGap, y: state.axe.y}, state.axe.speed, dt);
      const rightDone = moveToward(state.momo,
        {x: FINAL_BOSS_ROUTE.centerX + halfGap, y: state.momo.y}, state.momo.speed, dt);
      if ((leftDone && rightDone) ||
          distance(state.axe, state.momo) <= FINAL_BOSS_ROUTE.ringContactDistance + .5) {
        state.finalBossCenter = {x: (state.axe.x + state.momo.x) / 2,
          y: (state.axe.y + state.momo.y) / 2};
        state.phase = 'bossesChase';
        state.portal.active = true;
        videoImpact('wallSpark', state.finalBossCenter.x,
          state.finalBossCenter.y, .52);
        toast('两个光轮已经接触！两大Boss沿斜边向下压来');
      }
    } else if (state.phase === 'bossesChase') {
      const step = FINAL_BOSS_ROUTE.downSpeed * dt;
      const dx = FINAL_BOSS_ROUTE.downX * step;
      const dy = FINAL_BOSS_ROUTE.downY * step;
      state.finalBossCenter.x += dx;
      state.finalBossCenter.y += dy;
      state.axe.x += dx;
      state.axe.y += dy;
      state.momo.x += dx;
      state.momo.y += dy;
    }
    if (state.clock >= state.finalBossGraceUntil) {
      resolveEnemy(state.axe);
      resolveEnemy(state.momo);
    }
  }
  function updatePortal(dt) {
    if (!state.portal.active) return;
    const foot = {x: state.player.x, y: state.player.y + PLAYER_FOOT_Y};
    const dx = (foot.x - state.portal.x) / 42;
    const dy = (foot.y - state.portal.y) / 14;
    state.portalStanding = dx * dx + dy * dy <= 1 ? state.portalStanding + dt : 0;
    if (state.portalStanding >= PORTAL_HOLD_TIME) win();
  }
  function updateStory(dt) {
    updateGoblins(dt);
    updateThreats(dt);
    if (state.threatsReleased && !state.firstCorridorCuePlayed &&
        state.player.y >= FIRST_CORRIDOR_ENTRY_Y) {
      state.firstCorridorCuePlayed = true;
      playSound('runAway', .31);
    }
    collectResources();
    triggerSeaNearCorridorExit();
    if (!state.jiangbao.active && state.jiangbao.alive &&
        distance(state.player, JIANGBAO_TRIGGER_POINT) <= JIANGBAO_TRIGGER_RADIUS)
      spawnJiangbao();
    updateJiangbao(dt);
    updateSea(dt);
    updateVenom(dt);
    updateMagnet(dt);
    updateFinalBossGuard();
    updateFinalBosses(dt);
    updatePortal(dt);
  }
  function updateCamera() {
    state.camera.x = clamp(state.player.x - canvas.width / 2, 0, WORLD.width - canvas.width);
    state.camera.y = clamp(state.player.y - canvas.height * .56, 0, WORLD.height - canvas.height);
  }
  function update(dt) {
    if (state.status !== 'playing') return;
    state.clock += dt;
    state.bladeAngle = (state.bladeAngle + BLADE_SPEED * dt) % (Math.PI * 2);
    for (const subject of bladeSubjects()) updateBladeCircle(subject, dt);
    if (state.toastUntil && state.clock >= state.toastUntil) {
      state.toastUntil = 0;
      ui.toast.classList.remove('visible');
    }
    state.effects = state.effects.filter(effect => state.clock - effect.born < effect.duration);
    movePlayer(dt);
    updateStory(dt);
    updateCamera();
  }

  function paint(name, x, y, width, height, rotation = 0, alpha = 1) {
    const image = images[name];
    if (!image) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }
  function label(value, x, y, size = 14, color = '#fff') {
    ctx.font = `900 ${size}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#14200f';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  function drawGround() {
    for (let x = 0; x < WORLD.width; x += 900)
      for (let y = 0; y < WORLD.height; y += 900)
        ctx.drawImage(images['grass.webp'], x, y, 900, 900);
  }
  function drawCarSegment(a, b, count) {
    for (let index = 0; index < count; index++) {
      const progress = index / (count - 1);
      paint('car.webp', a[0] + (b[0] - a[0]) * progress,
        a[1] + (b[1] - a[1]) * progress, CAR_WIDTH, CAR_HEIGHT, CAR_ROTATION);
    }
  }
  function drawMap() {
    drawGround();
    for (const point of goldDecorations) paint('gold-orb.webp', point.x, point.y, 30, 30);
    for (const points of diamondPolygons) {
      drawCarSegment(points[0], points[1], 9); drawCarSegment(points[1], points[2], 6);
      drawCarSegment(points[2], points[3], 9); drawCarSegment(points[3], points[0], 6);
    }
    for (const [a, b, count] of topWalls) drawCarSegment(a, b, count);
  }
  function drawMagnet(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#df3232';
    ctx.beginPath();
    ctx.arc(0, 0, 10, .18 * Math.PI, .82 * Math.PI, true);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f3f3ef';
    ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-10, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(10, 13); ctx.stroke();
    ctx.restore();
    label('吸铁石', x, y + 27, 11, '#fff4a0');
  }
  function drawResources() {
    for (const item of state.resources) {
      if (!item.active || item.taken) continue;
      paint(ORB_ART[item.tier] || 'gold-orb.webp', item.x, item.y, 30, 30);
    }
    for (const item of state.redResources) {
      if (item.arrived) continue;
      paint('red-orb.webp', item.x, item.y, 30, 30);
    }
    if (state.rainbow.active) {
      paint('彩刃.png', state.rainbow.x, state.rainbow.y, 42, 42);
      label('+99', state.rainbow.x, state.rainbow.y - 30, 14, '#ffed70');
    }
    if (state.magnet.active && !state.magnet.taken) drawMagnet(state.magnet.x, state.magnet.y);
    if (state.portal.active) {
      const frame = ACTOR_FRAMES.portal[Math.floor(state.clock * 10) % ACTOR_FRAMES.portal.length];
      paint(frame, state.portal.x, state.portal.y, 96, 96);
      label('终点', state.portal.x, state.portal.y + 55, 14, '#f0ddff');
    }
  }
  function drawBlades(subject, radius = ENEMY_BLADE_RADIUS) {
    for (const blade of subject.blades) {
      const point = bladeTip(subject, blade, radius);
      paint(TIER_ART[blade.tier], point.x, point.y,
        BLADE_DRAW_WIDTH, BLADE_DRAW_HEIGHT, blade.angle + Math.PI / 2);
    }
  }
  function drawActor(subject, labelText = '') {
    if (!subject.active || !subject.alive) return;
    if (subject.ring) {
      paint('超大金轮.png', subject.x, subject.y, subject.ringRadius * 2.1,
        subject.ringRadius * 2.1, -state.bladeAngle);
    } else drawBlades(subject);
    const frames = ACTOR_FRAMES[subject.frames];
    const frame = frames[Math.floor(state.clock * 9) % frames.length];
    const [width, height] = FRAME_SIZE[subject.frames];
    paint(frame, subject.x + (subject.kind === 'momo' ? 11 : 0), subject.y, width, height);
    if (labelText) label(labelText, subject.x, subject.y - Math.max(55, height * .72), 13);
  }
  function drawPlayer() {
    const player = state.player;
    if (player.form === 'super' && state.saiyanVideo.readyState >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(state.saiyanVideo, 0, 0, 720, 970,
        player.x - SAIYAN_EFFECT_WIDTH / 2, player.y - SAIYAN_EFFECT_HEIGHT / 2,
        SAIYAN_EFFECT_WIDTH, SAIYAN_EFFECT_HEIGHT);
      ctx.restore();
    }
    drawBlades(player, PLAYER_BLADE_RADIUS);
    const frames = ACTOR_FRAMES[player.form === 'super' ? 'super' : 'player'];
    const frame = frames[Math.floor(state.clock * 9) % frames.length];
    const size = FRAME_SIZE[player.form === 'super' ? 'super' : 'player'];
    paint(frame, player.x, player.y, size[0], size[1]);
  }
  function drawEffects() {
    for (const effect of state.effects) {
      const progress = (state.clock - effect.born) / effect.duration;
      if (effect.type === 'bone') {
        const index = Math.min(ACTOR_FRAMES.bone.length - 1,
          Math.floor(progress * ACTOR_FRAMES.bone.length));
        paint(ACTOR_FRAMES.bone[index], effect.x, effect.y, 92, 92, 0, 1 - progress * .18);
        continue;
      }
      if (effect.type === 'fire01') {
        const index = Math.min(5, Math.floor(progress * 6));
        paint(`fire01-${index}.webp`, effect.x, effect.y, 56, 56, 0,
          1 - progress * .45);
        continue;
      }
      if (effect.type === 'video') {
        const spec = VIDEO_FX[effect.name];
        if (effect.video.readyState >= 2) {
          ctx.save();
          ctx.globalAlpha = 1 - progress;
          ctx.globalCompositeOperation = 'screen';
          if (spec.crop) ctx.drawImage(effect.video, ...spec.crop,
            effect.x - spec.w / 2, effect.y - spec.h / 2, spec.w, spec.h);
          else ctx.drawImage(effect.video,
            effect.x - spec.w / 2, effect.y - spec.h / 2, spec.w, spec.h);
          ctx.restore();
        }
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 12 + progress * 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawMap();
    drawResources();
    for (const goblin of state.goblins) drawActor(goblin);
    drawActor(state.giant, '满红刃巨人');
    drawActor(state.demon, '满红刃魔人');
    drawActor(state.jiangbao, '6绿刃酱爆');
    drawActor(state.sea, '12绿刃海神');
    drawActor(state.venom, '9紫刃毒液');
    drawActor(state.axe, '斧头帮');
    drawActor(state.momo, 'momo');
    drawPlayer();
    drawEffects();
    ctx.restore();
  }

  function loadImage(name) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images[name] = image; resolve(); };
      image.onerror = () => reject(new Error(`无法加载素材：${name}`));
      image.src = IMAGE_ROOT + name;
    });
  }
  function loop(now) {
    const dt = Math.min(.034, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height};
  }
  function updateStick() {
    const dx = pointer.x - pointer.originX, dy = pointer.y - pointer.originY;
    const length = Math.hypot(dx, dy);
    const limit = 34;
    const scale = length > limit ? limit / length : 1;
    ui.knob.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
  }

  canvas.addEventListener('pointerdown', event => {
    if (state.status !== 'playing') return;
    const point = eventPoint(event);
    pointer.active = true; pointer.id = event.pointerId;
    pointer.originX = pointer.x = point.x; pointer.originY = pointer.y = point.y;
    ui.stick.style.display = 'block';
    const shellRect = ui.shell.getBoundingClientRect();
    ui.stick.style.left = `${event.clientX - shellRect.left}px`;
    ui.stick.style.top = `${event.clientY - shellRect.top}px`;
    ui.knob.style.transform = 'translate(0,0)';
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer.active || pointer.id !== event.pointerId) return;
    const point = eventPoint(event); pointer.x = point.x; pointer.y = point.y; updateStick();
  });
  function endPointer(event) {
    if (pointer.id !== event.pointerId) return;
    pointer.active = false; pointer.id = null; ui.stick.style.display = 'none';
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  addEventListener('keydown', event => {
    if (/^(Arrow|Key[WASD])/.test(event.code)) { keys.add(event.code); event.preventDefault(); }
  });
  addEventListener('keyup', event => keys.delete(event.code));
  ui.retry.addEventListener('click', reset);

  const spec = Object.freeze({
    gameplayEnabled: true,
    noEnemyKnockback: true,
    failureRequiresPlayerBodyContact: true,
    bladeCombat: Object.freeze({continuousPairs: true, independentAngles: true,
      immediateRedistribution: false, reflowDelaySeconds: BLADE_REFLOW_DELAY,
      smoothReflow: true, bodyCanBeHitThroughGap: true}),
    startWhiteBlades: 6,
    viewport: Object.freeze({width: canvas.width, height: canvas.height, zoomedIn: true}),
    offscreenEntry: Object.freeze({enabled: true, margin: OFFSCREEN_SPAWN_MARGIN,
      collisionGraceSeconds: OFFSCREEN_ENTRY_GRACE, requiresFullWeaponOutside: true,
      initialGoblinsExcluded: true}),
    playerBladeRing: Object.freeze({outerDiameter: PLAYER_BLADE_RING_DIAMETER,
      diameterInPlayerHeights: 1.5, centerRadius: PLAYER_BLADE_RADIUS,
      bodyCentered: true}),
    goblins: Object.freeze({count: 10, oneHit: true, blades: 0,
      chasesPlayer: true, chaseSpeeds: Object.freeze([30, 34, 38])}),
    giant: Object.freeze({redBlades: THREAT_FULL_RING_BLADE_COUNT, fullRing: true,
      unlimitedReplacement: true, invulnerable: true, shattersByTier: true,
      sharedTarget: THREAT_BLOCK_POINT, stopsOnRingContact: true}),
    demon: Object.freeze({redBlades: THREAT_FULL_RING_BLADE_COUNT, fullRing: true,
      unlimitedReplacement: true, invulnerable: true, asset: '绿色扎克',
      sameModelAndRingSizeAsGiant: true, sharedTarget: THREAT_BLOCK_POINT,
      stopsOnRingContact: true}),
    rainbowBait: Object.freeze({value: 99, collectible: false,
      point: RAINBOW_BAIT_POINT, startsOutsideInitialView: true}),
    openingThreats: Object.freeze({releaseY: THREAT_RELEASE_Y,
      releaseWhenRainbowVisible: true, requiresAllGoblinsDefeated: false,
      giantStartsAboveRainbow: true, contactTimeSeconds: THREAT_CONTACT_TIME,
      demonApproachTimeSeconds: DEMON_APPROACH_TIME,
      demonWaitsAtContactPoint: true, demonEntersRetreatRoute: true}),
    whiteRoute: Object.freeze({collectibleBubbles: 6, addsPerBubble: 1,
      triggerJiangbaoWhenComplete: false}),
    greenRoute: Object.freeze({first: 4, corridor: 8, clearsWhiteOnFirstPickup: true}),
    jiangbao: Object.freeze({greenBlades: 6, killable: true, chaseSpeed: 88,
      fixedSpawn: Object.freeze({x: X(905), y: 92}), spawnRelativeToCamera: false,
      triggerPoint: JIANGBAO_TRIGGER_POINT, triggerRadius: JIANGBAO_TRIGGER_RADIUS,
      triggerRequiresWhiteCount: false}),
    greenToGoldAfterJiangbao: true,
    poseidon: Object.freeze({greenBlades: 12, killable: false,
      speed: SEA_BLOCK_SPEED, blockSpeed: SEA_BLOCK_SPEED, fleeSpeed: SEA_FLEE_SPEED,
      fasterThanPlayer: false, fasterThanPlayerOnFlee: true, killedByVenom: true,
      entryDirection: 'left-to-right', entryOffsetX: SEA_ENTRY_OFFSET_X,
      spawnOnCorridorResourceCount: SEA_CORRIDOR_RESOURCE_TRIGGER_COUNT,
      spawnNearCorridorExit: true, exitTriggerZone: SEA_EXIT_TRIGGER_ZONE,
      fleeDirection: 'left', venomAlwaysSpawns: true,
      venomSpawnDelay: SEA_VENOM_DELAY}),
    venom: Object.freeze({purpleBlades: 9, fasterThanPlayer: false,
      chaseSpeed: VENOM_CHASE_SPEED, fleeStartSpeed: VENOM_FLEE_START_SPEED,
      fleeMinimumSpeed: VENOM_FLEE_MIN_SPEED, fleeDeceleration: VENOM_FLEE_DECELERATION,
      spawnsToInterceptSea: true, chasesPlayerAfterSeaKill: true,
      entryOffsetX: VENOM_ENTRY_OFFSET_X,
      startsWithAutoChase: true,
      invulnerableBeforeTransformation: true, fleesAfterTransformation: true,
      fleeDirection: 'upper-left-toward-axe', fleeGraceSeconds: VENOM_FLEE_GRACE}),
    magnet: Object.freeze({redBladesPulled: 12, ignoresWalls: true, replacesInventory: true,
      manualRedPickupEnabled: true, manualFullSetTransforms: true,
      requiredToFinishBeforeVenomCatches: true,
      x: magnetPoint.x, y: magnetPoint.y, drawSize: 30, pullSpeed: MAGNET_PULL_SPEED}),
    transformation: Object.freeze({asset: '黄衣服悟空2', revertsAtZeroRed: true,
      localFollowingSaiyanEffect: true, sameVisibleHeightAsNormal: true,
      renderSize: Object.freeze([...FRAME_SIZE.super]),
      effectSize: Object.freeze([SAIYAN_EFFECT_WIDTH, SAIYAN_EFFECT_HEIGHT])}),
    finalBosses: Object.freeze({count: 2, invulnerable: true, ultraRing: true,
      nonOverlapping: true, sealUpperRouteFirst: true, ringsTouchBeforeDescent: true,
      fixedHorizontalThenDiagonal: true, tracksPlayerX: false,
      centerGap: FINAL_BOSS_ROUTE.ringContactDistance,
      contactCenterX: FINAL_BOSS_ROUTE.centerX, guardSpawnsBoth: true,
      guardSpawnGraceSeconds: FINAL_BOSS_SPAWN_GRACE,
      alignSpeed: FINAL_BOSS_ALIGN_SPEED, downSpeed: FINAL_BOSS_ROUTE.downSpeed,
      downVector: Object.freeze({x: FINAL_BOSS_ROUTE.downX, y: FINAL_BOSS_ROUTE.downY})}),
    defeatedEnemyEffect: '破碎骨头',
    mediaFeedback: Object.freeze({contactSoundCooldown: CONTACT_SOUND_COOLDOWN,
      smallEffects: true, voicesPlayOnce: true}),
    pointerJoystickAlignedToShell: true,
    ending: Object.freeze({portalByPlayerFoot: true, retryFullReset: true}),
  });
  window.__SCENE3_PLAY__ = {
    spec,
    state: () => ({
      status: state.status, phase: state.phase, clock: state.clock,
      player: {x: state.player.x, y: state.player.y, form: state.player.form,
        blades: state.player.blades.map(blade => blade.tier)},
      goblinsAlive: state.goblins.filter(enemy => enemy.alive).length,
      goblins: state.goblins.map(enemy => ({id: enemy.id, x: enemy.x, y: enemy.y,
        alive: enemy.alive})),
      giant: {active: state.giant.active, blades: state.giant.blades.length,
        x: state.giant.x, y: state.giant.y, arrived: state.giant.arrived,
        entryState: state.giant.entryState, target: {...state.giant.routeEnd},
        stopPoint: state.giant.stopPoint ? {...state.giant.stopPoint} : null,
        speed: state.giant.speed, approachDone: state.giant.approachDone},
      demon: {active: state.demon.active, blades: state.demon.blades.length,
        x: state.demon.x, y: state.demon.y, arrived: state.demon.arrived,
        entryState: state.demon.entryState, target: {...state.demon.routeEnd},
        stopPoint: state.demon.stopPoint ? {...state.demon.stopPoint} : null,
        speed: state.demon.speed, approachDone: state.demon.approachDone},
      jiangbao: {active: state.jiangbao.active, alive: state.jiangbao.alive,
        blades: state.jiangbao.blades.length, x: state.jiangbao.x, y: state.jiangbao.y,
        entryState: state.jiangbao.entryState},
      sea: {active: state.sea.active, alive: state.sea.alive, mode: state.sea.mode,
        blades: state.sea.blades.length, x: state.sea.x, y: state.sea.y,
        entryState: state.sea.entryState, attacked: state.sea.attacked,
        venomSpawnAt: state.sea.venomSpawnAt},
      venom: {active: state.venom.active, alive: state.venom.alive,
        blades: state.venom.blades.length, x: state.venom.x, y: state.venom.y,
        mode: state.venom.mode, killable: state.venom.killable,
        chaseSpeed: state.venom.speed, fleeSpeed: state.venom.fleeSpeed,
        currentFleeSpeed: state.venom.currentFleeSpeed,
        fleeElapsed: state.venom.fleeElapsed,
        entryState: state.venom.entryState,
        fleeTarget: state.venom.fleeTarget ? {...state.venom.fleeTarget} : null,
        fleeKillableAt: state.venom.fleeKillableAt},
      magnet: {active: state.magnet.active, taken: state.magnet.taken,
        arrived: state.redResources.filter(item => item.arrived).length,
        manual: state.redResources.filter(item => item.pickupSource === 'manual').length,
        pulled: state.redResources.filter(item => item.pickupSource === 'magnet').length,
        x: state.magnet.x, y: state.magnet.y},
      bosses: {axe: state.axe.active, momo: state.momo.active,
        gap: state.axe.active && state.momo.active ? distance(state.axe, state.momo) : null,
        phase: state.phase, axePosition: {x: state.axe.x, y: state.axe.y},
        momoPosition: {x: state.momo.x, y: state.momo.y},
        axeEntryState: state.axe.entryState, momoEntryState: state.momo.entryState,
        routeCenterX: FINAL_BOSS_ROUTE.centerX,
        guardReason: state.finalBossGuardReason,
        graceUntil: state.finalBossGraceUntil,
        ringContactDistance: FINAL_BOSS_ROUTE.ringContactDistance,
        downVector: {x: FINAL_BOSS_ROUTE.downX, y: FINAL_BOSS_ROUTE.downY}},
      boneEffects: state.effects.filter(effect => effect.type === 'bone').length,
      portal: {active: state.portal.active, ...portalPoint},
      rainbow: {...state.rainbow},
      whiteCollected: state.startWhiteCollected,
      greenCollected: state.totalGreenCollected,
      middleGreenCollected: state.middleGreenCollected,
      greensConverted: state.greensConverted,
      redTransformationCompleted: state.redTransformationCompleted,
      feedback: {sounds: state.feedback.sounds.map(item => ({...item})),
        effects: state.feedback.effects.map(item => ({...item}))},
      camera: {...state.camera},
    }),
    debug: Object.freeze({
      reset,
      defeatGoblin(index = 0) {
        const enemy = state.goblins[index];
        if (enemy) defeatEnemy(enemy);
      },
      releaseThreats,
      enterFirstCorridor() {
        if (!state.threatsReleased) releaseThreats();
        state.player.y = FIRST_CORRIDOR_ENTRY_Y;
        updateStory(0);
      },
      finishThreatApproach() {
        if (!state.threatsReleased) releaseThreats();
        state.giant.x = state.giant.stopPoint.x;
        state.giant.y = state.giant.stopPoint.y;
        state.demon.x = state.demon.stopPoint.x;
        state.demon.y = state.demon.stopPoint.y;
        updateThreats(.001);
      },
      finishFinalBossAlign() {
        if (!state.axe.active || !state.momo.active) spawnFinalBosses('test-contact');
        const verticalGap = state.momo.y - state.axe.y;
        const halfGap = Math.sqrt(Math.max(0,
          FINAL_BOSS_ROUTE.ringContactDistance ** 2 - verticalGap ** 2)) / 2;
        state.axe.x = FINAL_BOSS_ROUTE.centerX - halfGap;
        state.momo.x = FINAL_BOSS_ROUTE.centerX + halfGap;
        updateFinalBosses(0);
      },
      spawnJiangbao,
      setPlayerPosition(x, y) { state.player.x = x; state.player.y = y; updateCamera(); },
      clearGoblins() { for (const enemy of state.goblins) enemy.alive = false; },
      collectStartWhite() {
        for (const item of state.resources.filter(item => item.group === 'white-start')) {
          item.x = state.player.x; item.y = state.player.y;
        }
        collectResources();
      },
      collectStartGreen() {
        for (const item of state.resources.filter(item => item.group === 'start')) {
          item.x = state.player.x; item.y = state.player.y;
        }
        collectResources();
      },
      collectCorridorGreen(count = 1) {
        const items = state.resources.filter(item => item.group === 'middle' && !item.taken)
          .slice(0, count);
        for (const item of items) { item.x = state.player.x; item.y = state.player.y; }
        collectResources();
      },
      collectAllGreen() {
        for (const item of state.resources.filter(item => !item.taken)) {
          item.x = state.player.x; item.y = state.player.y;
        }
        collectResources();
      },
      defeatJiangbao() { defeatEnemy(state.jiangbao); },
      spawnSea,
      attackSea,
      defeatSea() { defeatEnemy(state.sea); },
      spawnVenom,
      takeMagnet,
      transformPlayer,
      exhaustPlayerRedBlades() {
        state.player.blades = state.player.blades.filter(blade => blade.tier !== 'red');
        normalizePlayerForm();
      },
      defeatVenom() { defeatEnemy(state.venom); },
      collectOneRedManually() {
        const item = state.redResources.find(resource => !resource.arrived);
        if (!item) return false;
        item.x = state.player.x; item.y = state.player.y;
        collectResources();
        return item.pickupSource === 'manual';
      },
      finalBossGuardProbe(x, y, input) {
        const before = {x: state.player.x, y: state.player.y, form: state.player.form};
        state.player.x = x; state.player.y = y; state.player.form = 'super';
        const reason = finalBossGuardReason(input);
        state.player.x = before.x; state.player.y = before.y; state.player.form = before.form;
        return reason;
      },
      threatRingProbe() {
        const subject = state.giant;
        const before = subject.blades.length;
        subject.blades.pop();
        const afterLoss = subject.blades.length;
        restoreFullBladeRing(subject);
        return {before, afterLoss, afterRestore: subject.blades.length};
      },
      combatProbe() {
        const saved = {
          player: state.player, clock: state.clock, bladeAngle: state.bladeAngle,
          status: state.status, effects: state.effects,
        };
        const makePlayer = blades => ({x: 100, y: 100, r: PLAYER_RADIUS,
          speed: PLAYER_SPEED, form: 'normal', hasMoved: true, blades,
          lastBladeContactAt: -Infinity, needsBladeReflow: false, bladeReflow: false});
        const gap = blades => normalizeAngle(blades[1].angle - blades[0].angle);
        try {
          state.status = 'playing';
          state.effects = [];
          state.clock = 10;
          state.bladeAngle = 0;

          state.player = makePlayer([
            {tier: 'gold', angle: 0, reflowTargetOffset: null},
            {tier: 'gold', angle: 0, reflowTargetOffset: null},
            {tier: 'gold', angle: 0, reflowTargetOffset: null},
          ]);
          const alignedEnemyX = 100 + PLAYER_BLADE_RADIUS - ENEMY_BLADE_RADIUS;
          const multiEnemy = actor({kind: 'probe', active: true, x: alignedEnemyX, y: 100, r: 25,
            blades: [
              {tier: 'green', angle: 0, reflowTargetOffset: null},
              {tier: 'green', angle: 0, reflowTargetOffset: null},
              {tier: 'green', angle: 0, reflowTargetOffset: null},
            ]});
          clashBlades(multiEnemy);
          const continuousPairs = state.player.blades.length === 3 && multiEnemy.blades.length === 0;

          state.player = makePlayer([
            {tier: 'green', angle: 0, reflowTargetOffset: null},
            {tier: 'green', angle: 1.8, reflowTargetOffset: null},
            {tier: 'green', angle: 3.8, reflowTargetOffset: null},
          ]);
          const gapEnemy = actor({kind: 'probe', active: true, x: alignedEnemyX, y: 100, r: 25,
            blades: [{tier: 'green', angle: 0, reflowTargetOffset: null}]});
          clashBlades(gapEnemy);
          const gapAfterClash = gap(state.player.blades);
          state.clock += .49;
          state.bladeAngle = normalizeAngle(state.bladeAngle + BLADE_SPEED * .49);
          updateBladeCircle(state.player, .49);
          const gapBeforeDelay = gap(state.player.blades);
          const delayPreserved = !state.player.bladeReflow &&
            Math.abs(gapBeforeDelay - gapAfterClash) < .001;
          state.clock += .02;
          state.bladeAngle = normalizeAngle(state.bladeAngle + BLADE_SPEED * .02);
          updateBladeCircle(state.player, .02);
          const gapDuringReflow = gap(state.player.blades);
          const smoothReflow = state.player.bladeReflow && gapDuringReflow > gapBeforeDelay &&
            gapDuringReflow < Math.PI - .01;

          state.player = makePlayer([
            {tier: 'gold', angle: 0, reflowTargetOffset: null},
          ]);
          const bodyEnemy = actor({kind: 'probe', active: true,
            x: 100 + PLAYER_BLADE_RADIUS + 27, y: 100, r: 25,
            blades: [
              {tier: 'green', angle: Math.PI / 2, reflowTargetOffset: null},
              {tier: 'green', angle: Math.PI * 1.5, reflowTargetOffset: null},
            ]});
          resolveEnemy(bodyEnemy);
          const bodyHitThroughGap = !bodyEnemy.alive && bodyEnemy.blades.length === 2;
          return {continuousPairs, delayPreserved, smoothReflow, bodyHitThroughGap};
        } finally {
          state.player = saved.player;
          state.clock = saved.clock;
          state.bladeAngle = saved.bladeAngle;
          state.status = saved.status;
          state.effects = saved.effects;
          updateHud();
        }
      },
      advance(seconds) {
        const step = 1 / 60;
        for (let elapsed = 0; elapsed < seconds && state.status === 'playing'; elapsed += step)
          update(Math.min(step, seconds - elapsed));
      },
      reset,
    }),
  };

  canvas.dataset.renderStatus = 'loading';
  Promise.all([...new Set(imageNames)].map(loadImage)).then(() => {
    reset();
    updateCamera();
    canvas.dataset.renderStatus = 'ready';
    canvas.dataset.gameplayStatus = 'enabled';
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }).catch(error => {
    canvas.dataset.renderStatus = 'failed';
    canvas.dataset.renderError = error.message;
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(error.message, 12, 30);
  });
})();
