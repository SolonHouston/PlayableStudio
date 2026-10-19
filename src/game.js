(() => {
  'use strict';

  // Scene one: three lower car formations and two upper formations.
  const W = 2400, H = 3750, LOWEST_Y = 70;
  const DAMAGE = [1, 6, 10, 35, 60];
  const TIER_NAMES = ['白', '绿', '金', '紫', '彩'];
  const BLADE_SPEED = Math.PI * 1.1;
  const BLADE_REFLOW_DELAY = .5;
  const BLADE_REFLOW_SPEED = 5.5;
  const MUSCLE_CAGE_HIT_COOLDOWN = .5;
  const MUSCLE_CAGE_DAMAGE_TICK = .07;
  const MUSCLE_CAGE_HIT_TOLERANCE = 38;
  const MUSCLE_CAGE_GREEN_DAMAGE = 8;
  const CAGE_HIT_SCALE_DURATION = .18;
  const CONTACT_SOUND_COOLDOWN = .08;
  const HALF_JOIN_DURATION = .6;
  const MUSCLE_JOIN_DURATION = .6;
  const UPPER_ROW_SHIFT = 170;
  const SEA_BLADE_RADIUS = 100;
  const SEA_STANDOFF_DISTANCE = 205;
  const ASSET = '../assets/images/';
  const VIDEO_FX = {
    saiyan: {file: 'saiyan.mp4', crop: [0, 0, 720, 970], w: 104, h: 140},
    clash: {file: 'clash.mp4', crop: [180, 170, 720, 650], w: 54, h: 49},
    metal: {file: 'metal.mp4', crop: [470, 520, 390, 390], w: 68, h: 68},
    wallSpark: {file: 'wall-spark.mp4', w: 72, h: 72},
    upgrade2: {file: 'upgrade-2.mp4', w: 88, h: 112}
  };
  const imageNames = [
    'grass.webp', 'white.webp', 'gold.webp', 'cage.webp', 'cage-open.webp',
    'car.webp', 'white-orb.webp', 'red-orb.webp', 'green-orb.webp', 'gold-orb.webp',
    'green.webp', 'purple.webp', '超大金轮.png',
    '左边黄衣悟空.png', '右边黄衣悟空.png',
    ...Array.from({length: 6}, (_, i) => `player-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `jiangbao-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `strong-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `poseidon-${i}.webp`),
    ...Array.from({length: 6}, (_, i) => `momo-${i}.webp`),
    ...Array.from({length: 8}, (_, i) => `muscle-idle-${i}.webp`),
    ...Array.from({length: 8}, (_, i) => `godzilla-idle-${i}.webp`),
    ...Array.from({length: 8}, (_, i) => `muscle-walk-${i}.webp`),
    ...Array.from({length: 10}, (_, i) => `portal-${i}.webp`),
    ...Array.from({length: 7}, (_, i) => `bone-${i}.webp`),
    'fx-upgrade.png', 'fx-spark1_00.png', 'fx-spark1_01.png', 'fx-spark1_02.png',
    ...Array.from({length: 6}, (_, i) => `fire01-${i}.webp`),
    ...Array.from({length: 28}, (_, i) => `胖虎走路_${String(i).padStart(2, '0')}.png`)
  ];
  const images = {};
  for (const name of imageNames) {
    const img = new Image();
    img.src = ASSET + name;
    images[name] = img;
  }
  const sounds = {};
  const audioFiles = {
    collision: 'collision.mp3', hit: 'hit.mp3', upgrade: 'upgrade.mp3',
    death: 'death.mp3', blow: 'blow.mp3', bladeClash: 'blade-clash.mp3',
    enemyHit: 'enemy-hit.mp3', pickup: 'pickup.mp3', metal: 'cage-hit.mp3',
    wallHit: 'wall-hit.mp3', nice: 'nice.mp3', easy: 'easy.mp3',
    upgradeWav: 'upgrade-wav.wav', ouch: 'ouch.mp3', runAway: 'run-away.mp3',
    takeIt: 'take-it.mp3', momoHit: 'momo-hit.mp3'
  };
  for (const [name, file] of Object.entries(audioFiles)) {
    sounds[name] = [];
    if (typeof Audio === 'undefined') continue;
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(`../assets/audio/${file}`);
      audio.preload = 'auto';
      sounds[name].push(audio);
    }
  }
  let soundReady = false;
  function playSound(name, volume = .26, cooldown = 0) {
    if (!soundReady || !sounds[name]?.length) return;
    if (cooldown && game) {
      const nextAt = game.soundNextAt[name] || 0;
      if (game.clock < nextAt) return;
      game.soundNextAt[name] = game.clock + cooldown;
    }
    const pool = sounds[name];
    const clip = pool.shift();
    pool.push(clip);
    clip.volume = volume;
    try { clip.currentTime = 0; clip.play().catch(() => {}); } catch (_) {}
    if (game) game.feedback.sounds.push({name, at: game.clock, volume});
    return clip;
  }
  function playSequence(names, volume = .32) {
    let index = 0;
    const next = () => {
      if (index >= names.length) return;
      const clip = playSound(names[index++], volume);
      if (!clip || index >= names.length) return;
      if (typeof clip.addEventListener === 'function')
        clip.addEventListener('ended', next, {once: true});
    };
    next();
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
  function videoImpact(name, x, y, duration = .52) {
    if (name === 'metal') {
      if (game.clock < game.nextMetalFxAt) return;
      game.nextMetalFxAt = game.clock + .18;
    }
    const video = makeVideo(name);
    if (video) game.effects.push({x, y, born: game.clock, duration, kind: 'video', name, video});
    else impact(x, y, name === 'upgrade2' ? 'upgrade' : 'hit', duration);
    game.feedback.effects.push({name, x, y, at: game.clock});
  }

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    objective: document.getElementById('objective'),
    blades: document.getElementById('blade-count'),
    phase: document.getElementById('phase-hint'),
    toast: document.getElementById('toast'),
    result: document.getElementById('result'),
    resultTitle: document.getElementById('result-title'),
    resultDetail: document.getElementById('result-detail'),
    retry: document.getElementById('retry'),
    stick: document.getElementById('floating-stick'),
    knob: document.getElementById('floating-knob')
  };
  const keys = new Set();
  const joystick = {x: 0, y: 0};
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let game, scale = 1, viewW = 900, viewH = 1500;
  let cameraX = 0, cameraY = 0, lastFrame = 0, heldPointer = null, pointerStart = null;

  function image(name, x, y, width, height, angle = 0) {
    const img = images[name];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
  }
  function label(value, x, y, size = 25, color = '#fff') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px Microsoft YaHei,sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1a2615';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
    ctx.restore();
  }
  function makeCars(corners, orb = 'red') {
    const group = [];
    for (let side = 0; side < 4; side++) {
      const a = corners[side], b = corners[(side + 1) % 4];
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const car = {x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, r: 28};
        group.push(car);
        game.cars.push(car);
      }
    }
    const center = {
      x: corners.reduce((sum, point) => sum + point[0], 0) / 4,
      y: corners.reduce((sum, point) => sum + point[1], 0) / 4
    };
    game.formations.push({corners, cars: group, center, orb});
  }
  function reset() {
    if (game?.saiyanVideo) game.saiyanVideo.pause();
    for (const effect of game?.effects || []) effect.video?.pause();
    game = {
      clock: 0, status: 'playing', phase: 'half', toastUntil: 0, nextMetalFxAt: 0,
      soundNextAt: {}, feedback: {sounds: [], effects: []},
      cues: {fattyClear: false, jiangbaoBladeBreak: false, momoHit: false},
      player: {x: 1720, y: 2640, r: 21, speed: 200, form: 'half', blades: [{tier: 0, angle: 0}]},
      cage: {x: 1550, y: 2720, r: 55, hp: 3, hitCooldown: 0, hitUntil: 0,
        scaleBorn: -Infinity, opened: false},
      whitePickup: {x: 1500, y: 2875, r: 55, active: true, count: 10},
      flags: {body: false, white: false, lowerCleared: false, green: false,
        greenStarted: false,
        muscleBroken: false, evolved: false, seaDefeated: false, momo: false},
      greenPickups: Array.from({length: 6}, (_, i) => ({x: 1770 + i % 3 * 70,
        y: 1905 + Math.floor(i / 3) * 75, active: true})),
      seaDrop: null,
      muscleCage: {x: 2050 + UPPER_ROW_SHIFT, y: 1960, r: 76, w: 180, h: 260, hp: 30,
        hitCooldown: 0, hitUntil: 0, scaleBorn: -Infinity,
        opened: false, damaged: false, pendingDamage: 0, nextDamageTick: 0},
      godzillaCage: {x: 1125, y: 1620, r: 122, w: 320, h: 400, hp: 999,
        hitCooldown: 0, hitUntil: 0, scaleBorn: -Infinity,
        opened: false, pendingDamage: 0, nextDamageTick: 0},
      portal: {x: 1730, y: 1960, active: false},
      cars: [], formations: [], fatties: [], jiangbao: null, sea: null, momo: null,
      halfJoin: null, muscleJoin: null, effects: []
    };
    // The three lower car quadrilaterals match the lower row of the map.
    makeCars([[760, 2100], [1150, 2100], [1020, 2440], [630, 2440]]);
    makeCars([[1320, 2100], [1710, 2100], [1580, 2440], [1190, 2440]]);
    makeCars([[1880, 2100], [2270, 2100], [2140, 2440], [1750, 2440]]);
    // The two upper formations start from columns two and three, then move
    // together with the muscle cage about three visible car gaps to the right.
    makeCars([[1320 + UPPER_ROW_SHIFT, 1480], [1710 + UPPER_ROW_SHIFT, 1480],
      [1580 + UPPER_ROW_SHIFT, 1820], [1190 + UPPER_ROW_SHIFT, 1820]], 'gold');
    makeCars([[1880 + UPPER_ROW_SHIFT, 1480], [2270 + UPPER_ROW_SHIFT, 1480],
      [2140 + UPPER_ROW_SHIFT, 1820], [1750 + UPPER_ROW_SHIFT, 1820]], 'gold');
    cameraX = clamp(game.player.x - viewW * .5, 0, Math.max(0, W - viewW));
    const entranceYs = [2550, 2590, 2540, 2620, 2570, 2535, 2630, 2555, 2605, 2580];
    for (let i = 0; i < 10; i++) {
      game.fatties.push({
        x: 0, y: entranceYs[i], spawnAt: .15 + i * .38, active: false,
        r: 29, speed: 65, alive: true
      });
    }
    cameraY = clamp(game.player.y - viewH * .65, LOWEST_Y, H - viewH);
    ui.result.hidden = true;
    ui.toast.classList.remove('visible');
    ui.stick.style.display = 'none';
    heldPointer = null;
    joystick.x = joystick.y = 0;
    updateHud();
  }
  function say(message, seconds = 2.5) {
    ui.toast.textContent = message;
    ui.toast.classList.add('visible');
    game.toastUntil = game.clock + seconds;
  }
  function updateHud() {
    const count = game.player.blades.length;
    const counts = TIER_NAMES.map((_, tier) => game.player.blades.filter(blade => blade.tier === tier).length);
    ui.blades.textContent = counts.map((n, tier) => n ? `${TIER_NAMES[tier]}刀 × ${n}` : '').filter(Boolean).join(' · ') || '没有刀刃';
    ui.phase.textContent = game.player.form === 'strong' ? '肌肉悟空' :
      game.phase === 'half' ? '半身悟空' : '完整悟空';
    ui.objective.textContent = game.flags.momo ? '避开 momo，折返进入紫色传送门' :
      game.flags.seaDefeated && game.seaDrop?.active ? '拾取海神掉落的 12 绿刀，形成金绿光轮' :
      game.flags.seaDefeated ? `攻击哥斯拉铁笼 · 防御 ${game.godzillaCage.hp}` :
      game.flags.evolved ? '向左追击海神，拾取它掉落的 12 绿刀' :
      game.flags.muscleBroken ? `继续攻破铁笼 · 防御 ${game.muscleCage.hp}；海神正在靠近` :
      game.flags.green ? `向右攻破肌肉悟空铁笼 · 防御 ${game.muscleCage.hp}` :
      game.flags.lowerCleared ? '拾取地上的 6 把绿刀，再向右解救肌肉悟空' :
      !game.flags.body ? `躲开 10 个胖虎，救出另一半悟空 · 牢笼防御 ${game.cage.hp}` :
      !game.flags.white ? '拾取下方 10 白刀，躲避三金刀酱爆' :
      '穿过下排汽车阵列之间的缝隙，前往地图中部';
  }
  function distanceToCage(point, cage) {
    const dx = Math.max(Math.abs(point.x - cage.x) - cage.w * .5, 0);
    const dy = Math.max(Math.abs(point.y - cage.y) - cage.h * .5, 0);
    return Math.hypot(dx, dy);
  }
  function bladeHitsCage(blade, cage) {
    const point = bladePosition(game.player, blade, playerBladeRadius(blade));
    const tolerance = cage === game.muscleCage ? MUSCLE_CAGE_HIT_TOLERANCE : 26;
    return distanceToCage(point, cage) <= tolerance ? point : null;
  }
  function muscleCageBladeDamage(blade) {
    return blade.tier === 1 ? MUSCLE_CAGE_GREEN_DAMAGE : DAMAGE[blade.tier];
  }
  function markCageHit(cage) {
    cage.hitUntil = game.clock + .28;
    cage.scaleBorn = game.clock;
  }
  function cageHitScale(cage) {
    const progress = (game.clock - cage.scaleBorn) / CAGE_HIT_SCALE_DURATION;
    if (progress < 0 || progress >= .999999) return 1;
    return 1 + Math.sin(progress * Math.PI) * .12;
  }
  function cageHit(cage, point, damage) {
    if (game.clock < cage.hitCooldown || cage.hp <= cage.pendingDamage) return false;
    const wasIdle = cage.pendingDamage === 0;
    cage.pendingDamage += Math.min(damage, cage.hp - cage.pendingDamage);
    if (wasIdle)
      cage.nextDamageTick = game.clock;
    cage.hitCooldown = game.clock +
      (cage === game.muscleCage ? MUSCLE_CAGE_HIT_COOLDOWN : .09);
    markCageHit(cage);
    videoImpact('metal', point.x, point.y, .46);
    playSound('metal', .24);
    if (cage === game.muscleCage) spawnSea();
    return true;
  }
  function tickCageDamage(cage) {
    if (cage === game.muscleCage) {
      if (cage.pendingDamage > 0 && game.clock >= cage.nextDamageTick) {
        cage.pendingDamage--;
        cage.hp = Math.max(0, cage.hp - 1);
        cage.nextDamageTick = game.clock + MUSCLE_CAGE_DAMAGE_TICK;
        updateHud();
        if (cage.hp === 0) {
          cage.damaged = true;
          if (game.sea) beginMuscleJoin();
        }
      }
      return;
    }
    while (cage.pendingDamage > 0 && game.clock >= cage.nextDamageTick) {
      cage.pendingDamage--;
      cage.hp = Math.max(0, cage.hp - 1);
      cage.nextDamageTick += .008;
      if (cage === game.godzillaCage && cage.hp <= 558) spawnMomo();
    }
  }
  function blocked(x, y, radius, actor) {
    if (x < radius + 15 || x > W - radius - 15 ||
        y < LOWEST_Y + radius || y > H - radius - 15) return true;
    if (game.cars.some(car => Math.hypot(car.x - x, car.y - y) < radius + car.r)) return true;
    if (actor === 'player' && !game.cage.opened &&
        Math.hypot(game.cage.x - x, game.cage.y - y) < radius + game.cage.r) return true;
    if (actor === 'player' && !game.muscleCage.opened &&
        distanceToCage({x, y}, game.muscleCage) < radius) return true;
    if (actor === 'player' && !game.godzillaCage.opened &&
        distanceToCage({x, y}, game.godzillaCage) < radius) return true;
    return false;
  }
  function moveActor(actor, dx, dy, radius, kind) {
    const nextX = actor.x + dx;
    if (!blocked(nextX, actor.y, radius, kind)) actor.x = nextX;
    const nextY = actor.y + dy;
    if (!blocked(actor.x, nextY, radius, kind)) actor.y = nextY;
  }
  function direction() {
    let x = joystick.x, y = joystick.y;
    if (keys.has('arrowleft') || keys.has('a')) x--;
    if (keys.has('arrowright') || keys.has('d')) x++;
    if (keys.has('arrowup') || keys.has('w')) y--;
    if (keys.has('arrowdown') || keys.has('s')) y++;
    const length = Math.hypot(x, y);
    return length > 1 ? {x: x / length, y: y / length} : {x, y};
  }
  function bladePosition(actor, blade, radius) {
    return {x: actor.x + Math.cos(blade.angle) * radius,
      y: actor.y + Math.sin(blade.angle) * radius};
  }
  function playerBladeRadius(blade) {
    if (game.player.form === 'strong') {
      if (blade.tier === 2 || blade.tier === 1) return 87;
    }
    if (game.player.form === 'half' && blade.tier === 0) return 112;
    return 88 + blade.tier * 12;
  }
  function normalizeAngle(value) {
    const full = Math.PI * 2;
    return (value % full + full) % full;
  }
  function angleDelta(from, to) {
    const full = Math.PI * 2;
    return (to - from + Math.PI + full) % full - Math.PI;
  }
  function markBladeContact(subject) {
    subject.lastBladeContactAt = game.clock;
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
  function updateBladeCircle(subject, dt) {
    const blades = subject?.blades;
    if (!blades?.length) {
      if (subject) {
        subject.needsBladeReflow = false;
        subject.bladeReflow = false;
      }
      return;
    }
    subject.bladePhase = normalizeAngle((subject.bladePhase || 0) + BLADE_SPEED * dt);
    for (const blade of blades)
      blade.angle = normalizeAngle(blade.angle + BLADE_SPEED * dt);
    if (!subject.needsBladeReflow) return;
    if (!subject.bladeReflow) {
      if (game.clock - (subject.lastBladeContactAt ?? -Infinity) < BLADE_REFLOW_DELAY) return;
      beginBladeReflow(subject);
    }
    let largestDelta = 0;
    const blend = Math.min(1, dt * BLADE_REFLOW_SPEED);
    for (const blade of blades) {
      const currentOffset = normalizeAngle(blade.angle - subject.bladePhase);
      const delta = angleDelta(currentOffset, blade.reflowTargetOffset);
      largestDelta = Math.max(largestDelta, Math.abs(delta));
      blade.angle = normalizeAngle(blade.angle + delta * blend);
    }
    if (largestDelta > .012) return;
    for (const blade of blades) {
      blade.angle = normalizeAngle(subject.bladePhase + blade.reflowTargetOffset);
      blade.reflowTargetOffset = null;
    }
    subject.needsBladeReflow = false;
    subject.bladeReflow = false;
  }
  function viewEdge(side, visualRadius = 90) {
    const left = clamp(game.player.x - viewW * .5, 0, Math.max(0, W - viewW));
    return side === 'left' ? Math.min(left, cameraX) - visualRadius - 10 :
      Math.max(left, cameraX) + viewW + visualRadius + 10;
  }
  function viewBottom(visualRadius = 90) {
    const top = clamp(game.player.y - viewH * .62, LOWEST_Y, Math.max(LOWEST_Y, H - viewH));
    return Math.max(top, cameraY) + viewH + visualRadius + 10;
  }
  function impact(x, y, kind = 'hit', duration = .38) {
    game.effects.push({x, y, born: game.clock, duration, kind});
    game.feedback.effects.push({name: kind, x, y, at: game.clock});
  }
  function killEnemy(actor, kind) {
    if (kind === 'sea') {
      defeatSea();
      return;
    }
    impact(actor.x, actor.y, 'fire01', .42);
    impact(actor.x, actor.y, 'bone', .56);
    playSound('enemyHit', .24);
    playSound('death', .22);
    if (kind === 'fatty') {
      actor.alive = false;
      if (!game.cues.fattyClear && game.fatties.every(fatty => !fatty.alive)) {
        game.cues.fattyClear = true;
        playSound('easy', .32);
      }
    } else if (kind === 'jiangbao') game.jiangbao = null;
    else if (kind === 'momo') game.momo = null;
  }
  function knockback(actor, source, force = 50) {
    const dx = actor.x - source.x, dy = actor.y - source.y;
    const len = Math.hypot(dx, dy) || 1;
    actor.kbX = dx / len * force;
    actor.kbY = dy / len * force;
  }
  function bodyImpact(enemy, reason) {
    knockback(game.player, enemy, 160);
    moveActor(game.player, game.player.kbX * .12, game.player.kbY * .12,
      game.player.r, 'player');
    impact(game.player.x, game.player.y, 'hit', .4);
    playSound('collision', .24);
    fail(reason);
  }
  function clash(playerBlade, enemyBlade, enemy, enemyRadius) {
    const playerTip = bladePosition(game.player, playerBlade, playerBladeRadius(playerBlade));
    const enemyTip = bladePosition(enemy, enemyBlade, enemyRadius);
    if (distance(playerTip, enemyTip) > 28) return false;
    markBladeContact(game.player);
    markBladeContact(enemy);
    const playerBladeLost = playerBlade.tier <= enemyBlade.tier;
    if (playerBladeLost) removeBlade(game.player, playerBlade);
    if (enemyBlade.tier <= playerBlade.tier) removeBlade(enemy, enemyBlade);
    videoImpact('clash', (playerTip.x + enemyTip.x) / 2,
      (playerTip.y + enemyTip.y) / 2, .46);
    playSound('bladeClash', .24, CONTACT_SOUND_COOLDOWN);
    if (enemy === game.jiangbao && playerBladeLost && !game.cues.jiangbaoBladeBreak) {
      game.cues.jiangbaoBladeBreak = true;
      playSequence(['ouch', 'runAway'], .32);
    }
    return true;
  }
  function resolveBossClashes(enemy, radius) {
    let collided = false;
    for (const playerBlade of [...game.player.blades]) {
      if (!game.player.blades.includes(playerBlade)) continue;
      for (const enemyBlade of [...enemy.blades]) {
        if (!game.player.blades.includes(playerBlade) || !enemy.blades.includes(enemyBlade)) continue;
        collided = clash(playerBlade, enemyBlade, enemy, radius) || collided;
      }
    }
    if (collided) updateHud();
  }
  function resolveBladeWallSounds() {
    for (const blade of game.player.blades) {
      const point = bladePosition(game.player, blade, playerBladeRadius(blade));
      const touching = game.cars.some(car => distance(point, car) < car.r + 16);
      const entered = touching && !blade.wallContact;
      blade.wallContact = touching;
      if (entered) playSound('wallHit', .22, CONTACT_SOUND_COOLDOWN);
    }
  }
  function momoRingClash(momo) {
    if (game.clock < (momo.nextRingClashAt || 0)) return;
    for (const blade of [...game.player.blades]) {
      const point = bladePosition(game.player, blade, playerBladeRadius(blade));
      if (Math.abs(distance(point, momo) - 165) > 25) continue;
      game.player.blades.splice(game.player.blades.indexOf(blade), 1);
      momo.nextRingClashAt = game.clock + .38;
      knockback(game.player, momo, 220);
      videoImpact('clash', point.x, point.y, .46);
      playSound('bladeClash', .24, CONTACT_SOUND_COOLDOWN);
      if (!game.cues.momoHit) {
        game.cues.momoHit = true;
        playSound('momoHit', .3);
      }
      updateHud();
      return;
    }
  }
  function directBladeHit(actor) {
    return game.player.blades.some(blade => {
      if (actor.blades?.length) {
        const strongest = Math.max(...actor.blades.map(enemyBlade => enemyBlade.tier));
        if (blade.tier < strongest) return false;
        if (blade.tier === strongest && actor.blades.length > 0) return false;
        if (actor.blades.length > (actor.initialBladeCount || actor.blades.length) / 2) return false;
      } else if (actor.initialBladeCount &&
                 blade.tier < actor.initialBladeTier) return false;
      return distance(bladePosition(game.player, blade, playerBladeRadius(blade)), actor) <
        Math.min(actor.r, 34) + 12;
    });
  }
  function breakCage() {
    if (game.cage.opened || game.halfJoin || game.flags.body) return;
    game.cage.hp = 0;
    game.cage.opened = true;
    videoImpact('wallSpark', game.cage.x, game.cage.y + 82, .52);
    playSound('nice', .32);
    game.halfJoin = {
      born: game.clock, duration: HALF_JOIN_DURATION,
      startX: game.cage.x, startY: game.cage.y + 4,
    };
    game.player.kbX = game.player.kbY = 0;
    joystick.x = joystick.y = 0;
    heldPointer = null;
    pointerStart = null;
    ui.stick.style.display = 'none';
    ui.knob.style.transform = 'translate(0,0)';
  }
  function halfJoinPose() {
    const join = game.halfJoin;
    if (!join) return null;
    const progress = clamp((game.clock - join.born) / join.duration, 0, 1);
    const travel = 1 - (1 - progress) ** 3;
    return {
      progress,
      x: join.startX + (game.player.x - join.startX) * travel,
      y: join.startY + (game.player.y - join.startY) * travel -
        Math.sin(progress * Math.PI) * 90,
      width: 140 + (118 - 140) * travel,
      height: 188 + (163 - 188) * travel,
    };
  }
  function updateHalfJoin() {
    const join = game.halfJoin;
    if (!join || game.clock - join.born < join.duration) return false;
    game.halfJoin = null;
    game.flags.body = true;
    game.phase = 'full';
    game.player.form = 'full';
    game.player.speed = 400;
    if (game.flags.white) spawnJiangbao();
    say(game.flags.white ? '合体成功！酱爆从下方追来，快穿过车阵' :
      '合体成功！先拾取下方 +10 白刀', 3.2);
    game.effects.push({x: game.cage.x, y: game.cage.y,
      born: game.clock, duration: .7, kind: 'upgrade'});
    playSound('upgrade', .28);
    updateHud();
    return true;
  }
  function spawnJiangbao() {
    if (game.jiangbao || !game.flags.body || !game.flags.white) return;
    // The pickup completes the opening sequence; Jiangbao enters from below.
    game.jiangbao = {
      x: game.player.x - 130,
      y: viewBottom(120), r: 92, speed: 330, initialBladeCount: 3, initialBladeTier: 2, blades: [
        {tier: 2, angle: 0},
        {tier: 2, angle: Math.PI * 2 / 3},
        {tier: 2, angle: Math.PI * 4 / 3}
      ]
    };
  }
  function collectWhite() {
    const item = game.whitePickup;
    if (!item.active) return;
    item.active = false;
    game.flags.white = true;
    const list = game.player.blades;
    for (let i = 0; i < item.count; i++) {
      list.push({tier: 0, angle: 0});
    }
    list.forEach((blade, i) => { blade.angle = i * Math.PI * 2 / list.length; });
    videoImpact('upgrade2', item.x, item.y, .62);
    playSound('upgradeWav', .28);
    if (game.flags.body) spawnJiangbao();
    say(game.flags.body ? '获得 10 把白刀！穿过汽车阵列向上逃' :
      '获得 10 把白刀！去打破牢笼救出另一半悟空', 3);
    updateHud();
  }
  function arrangeBlades() {
    const blades = game.player.blades;
    game.player.needsBladeReflow = false;
    game.player.bladeReflow = false;
    game.player.lastBladeContactAt = -Infinity;
    for (const blade of blades) blade.reflowTargetOffset = null;
    if (game.player.form === 'strong' && blades.every(blade => blade.tier === 1 || blade.tier === 2)) {
      const gold = blades.filter(blade => blade.tier === 2);
      const green = blades.filter(blade => blade.tier === 1);
      const alternating = [];
      for (let i = 0; i < Math.max(gold.length, green.length); i++) {
        if (gold[i]) alternating.push(gold[i]);
        if (green[i]) alternating.push(green[i]);
      }
      alternating.forEach((blade, index) => {
        blade.angle = index * Math.PI * 2 / alternating.length;
      });
      return;
    }
    blades.sort((a, b) => b.tier - a.tier);
    for (const tier of [...new Set(blades.map(blade => blade.tier))]) {
      const ring = blades.filter(blade => blade.tier === tier);
      ring.forEach((blade, index) => {
        blade.angle = index * Math.PI * 2 / ring.length + (tier === 1 ? Math.PI / ring.length : 0);
      });
    }
  }
  function grantBlades(tier, count) {
    const blades = game.player.blades;
    const capacity = game.player.form === 'strong' ? 24 : 15;
    for (let n = 0; n < count; n++) {
      if (blades.length >= capacity) {
        let pair = -1;
        for (let t = 0; t < 4; t++) {
          if (blades.filter(blade => blade.tier === t).length >= 2) { pair = t; break; }
        }
        if (pair >= 0) {
          let removed = 0;
          for (let i = blades.length - 1; i >= 0 && removed < 2; i--) {
            if (blades[i].tier === pair) { blades.splice(i, 1); removed++; }
          }
          blades.unshift({tier: pair + 1, angle: 0});
        } else {
          const weakest = Math.min(...blades.map(blade => blade.tier));
          if (tier <= weakest) continue;
          blades.splice(blades.findIndex(blade => blade.tier === weakest), 1);
        }
      }
      blades.push({tier, angle: 0});
    }
    arrangeBlades();
    updateHud();
  }
  function collectGreen() {
    const item = game.greenPickups.find(pickup => pickup.active &&
      distance(game.player, pickup) < game.player.r + 46);
    if (!item) return;
    item.active = false;
    videoImpact('upgrade2', item.x, item.y, .62);
    playSound('pickup', .24);
    if (!game.flags.greenStarted) {
      game.flags.greenStarted = true;
      game.player.blades = game.player.blades.filter(blade => blade.tier !== 0);
      say('白刀消失，拾到几把绿刀就拥有几把', 2.8);
    }
    if (game.player.blades.length < 15)
      game.player.blades.push({tier: 1, angle: 0});
    arrangeBlades();
    updateHud();
    if (game.greenPickups.every(pickup => !pickup.active)) {
      game.flags.green = true;
      say('拾齐 6 绿刀！向右攻击防御 30 的铁笼', 3);
    }
  }
  function spawnSea() {
    if (game.flags.muscleBroken) return;
    game.flags.muscleBroken = true;
    game.sea = {x: viewEdge('left', 110), y: game.player.y,
      r: 37, speed: 190, initialBladeCount: 12, initialBladeTier: 1,
      blades: Array.from({length: 12}, (_, i) =>
        ({tier: 1, angle: i * Math.PI * 2 / 12})), mode: 'attack'};
    say('绿刀海神堵住去路！趁它靠近打破铁笼', 3);
    updateHud();
  }
  function beginMuscleJoin() {
    if (game.flags.evolved || game.muscleJoin) return;
    game.muscleCage.opened = true;
    game.muscleJoin = {
      born: game.clock, duration: MUSCLE_JOIN_DURATION,
      startX: game.muscleCage.x, startY: game.muscleCage.y + 8,
    };
    game.player.kbX = game.player.kbY = 0;
    joystick.x = joystick.y = 0;
    heldPointer = null;
    ui.stick.style.display = 'none';
  }
  function muscleJoinPose() {
    const join = game.muscleJoin;
    if (!join) return null;
    const progress = clamp((game.clock - join.born) / join.duration, 0, 1);
    const travel = 1 - (1 - progress) ** 3;
    return {
      progress,
      x: join.startX + (game.player.x - join.startX) * travel,
      y: join.startY + (game.player.y - join.startY) * travel -
        Math.sin(progress * Math.PI) * 90,
      width: 150 + (91 - 150) * travel,
      height: 210 + (126 - 210) * travel,
    };
  }
  function updateMuscleJoin() {
    const join = game.muscleJoin;
    if (!join || game.clock - join.born < join.duration) return false;
    game.muscleJoin = null;
    evolve();
    return true;
  }
  function evolve() {
    if (game.flags.evolved) return;
    game.muscleJoin = null;
    game.flags.evolved = true;
    game.muscleCage.opened = true;
    game.player.form = 'strong';
    game.player.blades = Array.from({length: 12}, (_, i) =>
      ({tier: 2, angle: i * Math.PI * 2 / 12}));
    arrangeBlades();
    game.player.speed = 400;
    game.saiyanVideo = makeVideo('saiyan', true);
    game.sea.mode = 'flee';
    game.sea.speed = 145;
    game.sea.invulnerableUntil = game.clock + .8;
    game.sea.fleeStartX = game.sea.x;
    game.effects.push({x: game.player.x, y: game.player.y,
      born: game.clock, duration: .7, kind: 'upgrade'});
    playSound('upgrade', .28);
    say('铁笼破开，合体进化！12 金刀肌肉悟空，追击海神', 4);
    updateHud();
  }
  function defeatSea() {
    if (game.flags.seaDefeated) return;
    game.flags.seaDefeated = true;
    game.seaDrop = {x: game.sea.x, y: game.sea.y, r: 50, count: 12,
      active: true, until: game.clock + 10};
    game.sea = null;
    impact(game.seaDrop.x, game.seaDrop.y, 'fire01', .42);
    impact(game.seaDrop.x, game.seaDrop.y, 'bone', .56);
    playSound('enemyHit', .24);
    playSound('death', .22);
    playSound('takeIt', .32);
    say('击败海神！拾取掉落的 12 绿刀，向左寻找哥斯拉', 4);
    updateHud();
  }
  function spawnMomo() {
    if (game.flags.momo) return;
    game.flags.momo = true;
    game.momo = {x: viewEdge('left', 190), y: game.player.y,
      r: 45, speed: 235, initialBladeCount: 4, initialBladeTier: 3,
      blades: Array.from({length: 4}, (_, i) =>
        ({tier: 3, angle: i * Math.PI / 2}))};
    game.portal.active = true;
    say('momo 从左侧出现！打不过，往回跑进传送门', 4);
    updateHud();
  }
  function stageClear() {
    if (game.status !== 'playing') return;
    game.status = 'next';
    window.location.assign('scene2-play.html');
  }
  function fail(reason) {
    if (game.status !== 'playing') return;
    impact(game.player.x, game.player.y, 'hit', .5);
    game.status = 'failed';
    ui.resultTitle.textContent = '挑战失败';
    ui.resultDetail.textContent = reason;
    ui.result.hidden = false;
    playSound('hit', .24);
  }
  function chase(actor, dt, radius, kind) {
    const player = game.player;
    if (actor.kbX || actor.kbY) {
      moveActor(actor, (actor.kbX || 0) * dt, (actor.kbY || 0) * dt, radius, kind);
      actor.kbX *= Math.exp(-8 * dt);
      actor.kbY *= Math.exp(-8 * dt);
    }
    const dx = player.x - actor.x, dy = player.y - actor.y;
    const length = Math.hypot(dx, dy) || 1;
    // Entrants can begin beyond the map edge on wide screens, then walk in.
    if (actor.x > W - radius - 15) {
      actor.x = Math.max(W - radius - 15, actor.x - actor.speed * dt);
      return;
    }
    if (actor.x < radius + 15) {
      actor.x = Math.min(radius + 15, actor.x + actor.speed * dt);
      return;
    }
    if (actor.y > H - radius - 15) {
      actor.y = Math.max(H - radius - 15, actor.y - actor.speed * dt);
      return;
    }
    moveActor(actor, dx / length * actor.speed * dt, dy / length * actor.speed * dt, radius, kind);
  }
  function combat(dt) {
    const player = game.player;
    updateBladeCircle(player, dt);
    resolveBladeWallSounds();
    for (const fatty of game.fatties) {
      if (!fatty.active || !fatty.alive) continue;
      if (game.clock > .35) chase(fatty, dt, fatty.r, 'fatty');
      const separation = distance(player, fatty);
      if (separation < 135 && directBladeHit(fatty)) {
        killEnemy(fatty, 'fatty');
        continue;
      }
      if (separation < player.r + fatty.r - 2) {
        bodyImpact(fatty, '被胖虎追上了，请从场景一下方重新开始');
        return;
      }
    }
    const boss = game.jiangbao;
    if (boss && !game.flags.lowerCleared) {
      updateBladeCircle(boss, dt);
      chase(boss, dt, boss.r, 'jiangbao');
      const separation = distance(player, boss);
      resolveBossClashes(boss, 78);
      if (directBladeHit(boss)) killEnemy(boss, 'jiangbao');
      else if (separation < boss.r + player.r - 7 || boss.blades.some(blade =>
        distance(bladePosition(boss, blade, 78), player) < player.r + 16)) {
        bodyImpact(boss, '三金刀酱爆追上了你');
      }
    }
    if (!game.cage.opened) {
      for (const blade of player.blades) {
        const touching = distance(bladePosition(player, blade, playerBladeRadius(blade)),
          game.cage) < game.cage.r + 17;
        const entered = touching && !blade.halfCageContact;
        blade.halfCageContact = touching;
        if (entered && game.clock >= game.cage.hitCooldown) {
          const point = bladePosition(player, blade, playerBladeRadius(blade));
          game.cage.hp = Math.max(0, game.cage.hp - 1);
          game.cage.hitCooldown = game.clock + Math.PI * 2 / BLADE_SPEED - .06;
          markCageHit(game.cage);
          videoImpact('metal', point.x, point.y, .46);
          playSound('wallHit', .22);
          if (game.cage.hp === 0) breakCage();
          break;
        }
      }
    }
    const sea = game.sea;
    if (sea) {
      updateBladeCircle(sea, dt);
      if (sea.mode === 'flee') {
        if (sea.x > sea.fleeStartX - 430) moveActor(sea, -sea.speed * dt, 0, sea.r, 'sea');
        else sea.mode = 'stand';
      } else if (sea.mode === 'attack') {
        sea.kbX = sea.kbY = 0;
        if (game.flags.evolved || distance(player, sea) > SEA_STANDOFF_DISTANCE)
          chase(sea, dt, sea.r, 'sea');
      }
      if (distance(player, sea) < 240) {
        if (game.flags.evolved || game.muscleCage.hp <= 12)
          resolveBossClashes(sea, SEA_BLADE_RADIUS);
        if (game.clock >= (sea.invulnerableUntil || 0) && directBladeHit(sea)) defeatSea();
        else if (distance(player, sea) < player.r + sea.r ||
                 sea.blades.some(blade =>
                   distance(bladePosition(sea, blade, SEA_BLADE_RADIUS), player) < player.r + 15))
          bodyImpact(sea, '被绿刀海神击败');
      }
    }
    const momo = game.momo;
    if (momo) {
      updateBladeCircle(momo, dt);
      chase(momo, dt, momo.r, 'momo');
      if (distance(player, momo) < 300) {
        momoRingClash(momo);
        resolveBossClashes(momo, 145);
      }
      if (directBladeHit(momo)) killEnemy(momo, 'momo');
      else if (distance(player, momo) < player.r + momo.r ||
               momo.blades.some(blade =>
                 distance(bladePosition(momo, blade, 145), player) < player.r + 15))
        bodyImpact(momo, '被 momo 的紫刀击败');
    }
    if (game.flags.green && !game.flags.evolved) {
      const cage = game.muscleCage;
      if (cage.hp > 0) for (const blade of player.blades) {
        const tip = bladeHitsCage(blade, cage);
        if (!tip || !cageHit(cage, tip, muscleCageBladeDamage(blade))) continue;
        break;
      }
    }
    if (game.flags.seaDefeated) {
      const cage = game.godzillaCage;
      for (const blade of player.blades) {
        const tip = bladeHitsCage(blade, cage);
        if (!tip || !cageHit(cage, tip, DAMAGE[blade.tier])) continue;
        break;
      }
    }
  }
  function update(dt) {
    game.clock += dt;
    game.effects = game.effects.filter(effect => {
      const active = game.clock - effect.born < effect.duration;
      if (!active) effect.video?.pause();
      return active;
    });
    if (game.toastUntil && game.clock > game.toastUntil) {
      ui.toast.classList.remove('visible');
      game.toastUntil = 0;
    }
    if (game.status !== 'playing') return;
    if (game.halfJoin) {
      updateHalfJoin();
      return;
    }
    if (game.muscleJoin) {
      updateMuscleJoin();
      return;
    }
    for (let i = 0; i < game.fatties.length; i++) {
      const fatty = game.fatties[i];
      if (fatty.active || game.clock < fatty.spawnAt) continue;
      fatty.active = true;
      const right = Math.max(cameraX,
        clamp(game.player.x - viewW * .5, 0, Math.max(0, W - viewW))) + viewW;
      fatty.x = right + 105 + (i % 3) * 35;
    }
    const input = direction();
    if (game.player.kbX || game.player.kbY) {
      moveActor(game.player, (game.player.kbX || 0) * dt,
        (game.player.kbY || 0) * dt, game.player.r, 'player');
      game.player.kbX *= Math.exp(-8 * dt);
      game.player.kbY *= Math.exp(-8 * dt);
    }
    moveActor(game.player, input.x * game.player.speed * dt,
      input.y * game.player.speed * dt, game.player.r, 'player');
    combat(dt);
    if (game.status !== 'playing') return;
    tickCageDamage(game.muscleCage);
    tickCageDamage(game.godzillaCage);
    if (game.status !== 'playing') return;
    if (game.whitePickup.active &&
        distance(game.player, game.whitePickup) < game.player.r + game.whitePickup.r) collectWhite();
    collectGreen();
    if (game.seaDrop && game.seaDrop.active) {
      if (game.clock > game.seaDrop.until) game.seaDrop.active = false;
      else if (distance(game.player, game.seaDrop) < game.player.r + game.seaDrop.r) {
        game.seaDrop.active = false;
        grantBlades(1, game.seaDrop.count);
        videoImpact('upgrade2', game.seaDrop.x, game.seaDrop.y, .62);
        playSound('upgradeWav', .28);
        say('获得 12 绿刀！继续向左找哥斯拉铁笼', 3);
      }
    }
    if (game.portal.active && distance(game.player, game.portal) < 82) stageClear();
    if (!game.flags.lowerCleared && game.flags.body && game.flags.white &&
        game.player.y < 2070) {
      game.flags.lowerCleared = true;
      say('已穿过下排车阵，到达地图中部', 4);
      updateHud();
    }
    if (Math.floor(game.clock * 4) !== Math.floor((game.clock - dt) * 4)) updateHud();
  }
  function ground() {
    const firstX = Math.floor(cameraX / 900) * 900;
    const firstY = Math.floor(cameraY / 900) * 900;
    for (let y = firstY; y < cameraY + viewH + 900; y += 900)
      for (let x = firstX; x < cameraX + viewW + 900; x += 900)
        image('grass.webp', x + 450, y + 450, 900, 900);
  }
  function drawCars() {
    for (const formation of game.formations) {
      const c = formation.center;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        const x = c.x + (col - 1) * 79, y = c.y + (row - 1) * 81;
        image(formation.orb === 'gold' ? 'gold-orb.webp' : 'red-orb.webp', x, y, 72, 72);
        label(formation.orb === 'gold' ? '+66' : '+88', x, y + 29, 20);
      }
      for (const car of formation.cars) {
        image('car.webp', car.x, car.y, 110, 71);
        label('?', car.x + 5, car.y - 11, 24);
      }
    }
  }
  function drawCage() {
    const cage = game.cage;
    const scale = cageHitScale(cage);
    const width = 150 * scale, height = 190 * scale;
    image(cage.opened ? 'cage-open.webp' : 'cage.webp', cage.x, cage.y, width, height);
    if (!cage.opened) {
      image('右边黄衣悟空.png', cage.x, cage.y + 4, 140, 188);
      // Repaint the bars over the captive without changing the source artwork.
      ctx.save();
      ctx.beginPath();
      for (const position of [.12, .31, .49, .67, .86])
        ctx.rect(cage.x - width / 2 + width * position, cage.y - 51 * scale,
          5 * scale, 125 * scale);
      ctx.clip();
      image('cage.webp', cage.x, cage.y, width, height);
      ctx.restore();
      label(`${cage.hp}`, cage.x, cage.y - 105, 30, '#fff3ad');
    }
  }
  function drawPlayer() {
    const p = game.player;
    const frame = Math.floor(game.clock * 9) % 6;
    if (p.form === 'strong' && game.saiyanVideo?.readyState >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const fx = VIDEO_FX.saiyan;
      ctx.drawImage(game.saiyanVideo, ...fx.crop,
        p.x - fx.w / 2, p.y - fx.h / 2, fx.w, fx.h);
      ctx.restore();
    }
    for (const blade of p.blades) {
      const point = bladePosition(p, blade, playerBladeRadius(blade));
      const art = blade.tier === 2 ? 'gold.webp' : blade.tier === 1 ? 'green.webp' : 'white.webp';
      const size = blade.tier === 0 ? [58, 78] : blade.tier === 1 ? [56, 74] : [52, 68];
      image(art, point.x, point.y, size[0], size[1],
        blade.angle + Math.PI / 2);
    }
    if (p.form === 'half') image('左边黄衣悟空.png', p.x, p.y - 14, 118, 163);
    else if (p.form === 'strong')
      image(`muscle-walk-${Math.floor(game.clock * 8) % 8}.webp`,
        p.x, p.y + Math.sin(game.clock * 12) * 3, 91, 126);
    else image(`player-${frame}.webp`, p.x, p.y - 14, 100, 136);
  }
  function drawMuscleJoin() {
    const pose = muscleJoinPose();
    if (!pose) return;
    const frame = Math.min(7, Math.floor(pose.progress * 8));
    image(`muscle-idle-${frame}.webp`, pose.x, pose.y,
      pose.width, pose.height);
  }
  function drawHalfJoin() {
    const pose = halfJoinPose();
    if (!pose) return;
    image('右边黄衣悟空.png', pose.x, pose.y, pose.width, pose.height);
  }
  function drawFatty(fatty) {
    if (!fatty.active || !fatty.alive) return;
    const frame = Math.floor(game.clock * 10) % 28;
    image(`胖虎走路_${String(frame).padStart(2, '0')}.png`,
      fatty.x, fatty.y - 12, 105, 125);
  }
  function drawBoss() {
    const boss = game.jiangbao;
    if (!boss) return;
    const frame = Math.floor(game.clock * 9) % 6;
    // The company frame's opaque figure is right of its transparent canvas center.
    image(`jiangbao-${frame}.webp`, boss.x - 32, boss.y - 14, 160, 178);
    for (const blade of boss.blades) {
      const point = bladePosition(boss, blade, 78);
      image('gold.webp', point.x, point.y, 54, 73, blade.angle + Math.PI / 2);
    }
    label('三金刀酱爆', boss.x, boss.y - 128, 24, '#ffe970');
  }
  function drawPickup() {
    const item = game.whitePickup;
    const bob = Math.sin(game.clock * 3) * 5;
    if (item.active) {
      image('white-orb.webp', item.x, item.y + bob, 75, 75);
      label('+10 白刀', item.x, item.y + 60 + bob, 23);
    }
    for (const green of game.greenPickups) {
      if (!green.active) continue;
      image('green-orb.webp', green.x, green.y + bob, 61, 61);
      label('+1', green.x, green.y + 41 + bob, 20);
    }
    if (game.seaDrop?.active) {
      const drop = game.seaDrop;
      image('green-orb.webp', drop.x, drop.y + bob, 82, 82);
      label('+12 绿刀', drop.x, drop.y + 63 + bob, 22);
    }
  }
  function drawUpperCages() {
    const muscle = game.muscleCage;
    const muscleScale = cageHitScale(muscle);
    const muscleWidth = muscle.w * muscleScale, muscleHeight = muscle.h * muscleScale;
    ctx.save();
    if (game.clock < muscle.hitUntil) ctx.filter = 'brightness(1.75)';
    image(muscle.opened ? 'cage-open.webp' : 'cage.webp', muscle.x, muscle.y,
      muscleWidth, muscleHeight);
    ctx.restore();
    if (!muscle.opened) {
      const frame = Math.floor(game.clock * 6) % 8;
      image(`muscle-idle-${frame}.webp`, muscle.x, muscle.y + 8, 150, 210);
      ctx.save();
      ctx.beginPath();
      for (const position of [.12, .31, .49, .67, .86])
        ctx.rect(muscle.x - muscleWidth / 2 + muscleWidth * position,
          muscle.y - muscleHeight * .27, 6 * muscleScale, muscleHeight * .65);
      ctx.clip();
      image('cage.webp', muscle.x, muscle.y, muscleWidth, muscleHeight);
      ctx.restore();
      label(`${muscle.hp}`, muscle.x, muscle.y - muscle.h / 2 - 18, 31, '#fff3ad');
    }
    const godzilla = game.godzillaCage;
    const godzillaScale = cageHitScale(godzilla);
    const godzillaWidth = godzilla.w * godzillaScale;
    const godzillaHeight = godzilla.h * godzillaScale;
    ctx.save();
    if (game.clock < godzilla.hitUntil) ctx.filter = 'brightness(1.75)';
    image('cage.webp', godzilla.x, godzilla.y, godzillaWidth, godzillaHeight);
    ctx.restore();
    const frame = Math.floor(game.clock * 6) % 8;
    image(`godzilla-idle-${frame}.webp`, godzilla.x, godzilla.y + 5,
      godzilla.w * .96, godzilla.h * .88);
    ctx.save();
    ctx.beginPath();
    for (const position of [.12, .31, .49, .67, .86])
      ctx.rect(godzilla.x - godzillaWidth / 2 + godzillaWidth * position,
        godzilla.y - godzillaHeight * .29, 10 * godzillaScale, godzillaHeight * .65);
    ctx.clip();
    image('cage.webp', godzilla.x, godzilla.y, godzillaWidth, godzillaHeight);
    ctx.restore();
    label(`${godzilla.hp}`, godzilla.x,
      godzilla.y - godzilla.h / 2 + 34, 42, '#fff3ad');
  }
  function drawEnemy(actor, kind) {
    const frame = Math.floor(game.clock * 9) % 6;
    if (kind === 'momo')
      image('超大金轮.png', actor.x, actor.y, 350, 350,
        -game.clock * BLADE_SPEED);
    image(`${kind}-${frame}.webp`, actor.x + (kind === 'momo' ? 30 : 0),
      actor.y + (kind === 'momo' ? 7 : -17),
      kind === 'momo' ? 130 : 116, kind === 'momo' ? 125 : 142);
    if (kind !== 'momo') for (const blade of actor.blades) {
      const point = bladePosition(actor, blade,
        kind === 'poseidon' ? SEA_BLADE_RADIUS : 72);
      image(kind === 'momo' ? 'purple.webp' : 'green.webp', point.x, point.y,
        57, 74, blade.angle + Math.PI / 2);
    }
    label(kind === 'momo' ? 'momo · 快逃' : '12 绿刀海神',
      actor.x, actor.y - (kind === 'momo' ? 200 : 124), 23,
      kind === 'momo' ? '#f8a5ff' : '#a4ff83');
  }
  function drawPortal() {
    if (!game.portal.active) return;
    const p = game.portal;
    image(`portal-${Math.floor(game.clock * 10) % 10}.webp`, p.x, p.y,
      230, 245);
    label('进入场景二', p.x, p.y - 84, 23, '#ebcaff');
  }
  function drawEffects() {
    for (const effect of game.effects) {
      const progress = (game.clock - effect.born) / effect.duration;
      if (progress < 0 || progress > 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      if (effect.kind === 'video') {
        const fx = VIDEO_FX[effect.name];
        if (effect.video.readyState >= 2) {
          ctx.globalCompositeOperation = 'screen';
          if (fx.crop) ctx.drawImage(effect.video, ...fx.crop,
            effect.x - fx.w / 2, effect.y - fx.h / 2, fx.w, fx.h);
          else ctx.drawImage(effect.video,
            effect.x - fx.w / 2, effect.y - fx.h / 2, fx.w, fx.h);
        }
      } else if (effect.kind === 'bone') {
        ctx.globalAlpha = 1;
        image(`bone-${Math.min(6, Math.floor(progress * 7))}.webp`,
          effect.x, effect.y, 100, 100);
      } else if (effect.kind === 'fire01') {
        ctx.globalAlpha = 1 - progress * .45;
        image(`fire01-${Math.min(5, Math.floor(progress * 6))}.webp`,
          effect.x, effect.y, 56, 56);
      } else if (effect.kind === 'upgrade') {
        image('fx-upgrade.png', effect.x, effect.y - 26, 82 + progress * 18, 130 + progress * 22);
        ctx.strokeStyle = '#ffe45d';
        ctx.lineWidth = 5 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 16 + progress * 54, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.kind === 'hit' || effect.kind === 'metal') {
        image(`fx-spark1_0${Math.min(2, Math.floor(progress * 3))}.png`,
          effect.x, effect.y, effect.kind === 'metal' ? 64 : 52,
          effect.kind === 'metal' ? 58 : 46);
        ctx.strokeStyle = '#fff9b7';
        ctx.lineWidth = 4 * (1 - progress);
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(a) * 12, effect.y + Math.sin(a) * 12);
          ctx.lineTo(effect.x + Math.cos(a) * (17 + progress * 26),
            effect.y + Math.sin(a) * (17 + progress * 26));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  function render(dt) {
    const p = game.player;
    const targetX = clamp(p.x - viewW * .5, 0, Math.max(0, W - viewW));
    let targetY = clamp(p.y - viewH * .62, LOWEST_Y, Math.max(LOWEST_Y, H - viewH));
    const godzilla = game.godzillaCage;
    if (game.flags.seaDefeated && p.x < godzilla.x + godzilla.w / 2 + 260 &&
        p.y < godzilla.y + godzilla.h / 2 + 260)
      targetY = Math.min(targetY, godzilla.y - godzilla.h / 2 - 80);
    const follow = Math.min(1, dt * 8);
    cameraX += (targetX - cameraX) * follow;
    cameraY += (targetY - cameraY) * follow;
    ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
    ctx.clearRect(cameraX, cameraY, viewW, viewH);
    ground();
    drawCars();
    drawPortal();
    drawPickup();
    drawCage();
    drawUpperCages();
    const actors = [
      ...game.fatties.filter(fatty => fatty.active && fatty.alive).map(fatty => ({y: fatty.y, draw: () => drawFatty(fatty)})),
      ...(game.jiangbao ? [{y: game.jiangbao.y, draw: drawBoss}] : []),
      ...(game.sea ? [{y: game.sea.y, draw: () => drawEnemy(game.sea, 'poseidon')}] : []),
      ...(game.momo ? [{y: game.momo.y, draw: () => drawEnemy(game.momo, 'momo')}] : []),
      {y: p.y, draw: drawPlayer}
    ].sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
    drawHalfJoin();
    drawMuscleJoin();
    drawEffects();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = canvas.width / 450;
    viewW = canvas.width / scale;
    viewH = canvas.height / scale;
  }
  function frame(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    soundReady = true;
    heldPointer = event.pointerId;
    pointerStart = {x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    ui.stick.style.left = `${event.clientX - rect.left}px`;
    ui.stick.style.top = `${event.clientY - rect.top}px`;
    ui.stick.style.display = 'block';
  });
  canvas.addEventListener('pointermove', event => {
    if (heldPointer !== event.pointerId || !pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    const length = Math.hypot(dx, dy);
    joystick.x = length > 75 ? dx / length : dx / 75;
    joystick.y = length > 75 ? dy / length : dy / 75;
    ui.knob.style.transform = `translate(${joystick.x * 34}px,${joystick.y * 34}px)`;
  });
  function release(event) {
    if (heldPointer !== event.pointerId) return;
    heldPointer = null;
    pointerStart = null;
    joystick.x = joystick.y = 0;
    ui.stick.style.display = 'none';
    ui.knob.style.transform = 'translate(0,0)';
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key))
      event.preventDefault();
    keys.add(key);
    soundReady = true;
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => {
    keys.clear();
    joystick.x = joystick.y = 0;
    heldPointer = null;
    ui.stick.style.display = 'none';
  });
  window.addEventListener('resize', resize);
  ui.retry.addEventListener('click', reset);
  resize();
  reset();
  requestAnimationFrame(frame);
  window.__bladeSceneOne = {
    state: () => ({
      status: game.status, phase: game.phase, flags: {...game.flags},
      player: {x: game.player.x, y: game.player.y, form: game.player.form,
        speed: game.player.speed, blades: game.player.blades.map(blade => blade.tier)},
      cage: {hp: game.cage.hp, opened: game.cage.opened,
        hitScale: cageHitScale(game.cage)},
      halfJoin: game.halfJoin && halfJoinPose(),
      fattyTotal: game.fatties.length,
      fattyCount: game.fatties.filter(fatty => fatty.active && fatty.alive).length,
      fatties: game.fatties.filter(fatty => fatty.active && fatty.alive).map(fatty => ({x: fatty.x, y: fatty.y})),
      boss: game.jiangbao && {x: game.jiangbao.x, y: game.jiangbao.y,
        blades: game.jiangbao.blades.length},
      muscleCage: {hp: game.muscleCage.hp, opened: game.muscleCage.opened,
        hitScale: cageHitScale(game.muscleCage)},
      muscleJoin: game.muscleJoin && muscleJoinPose(),
      godzillaCage: {hp: game.godzillaCage.hp, opened: game.godzillaCage.opened,
        hitScale: cageHitScale(game.godzillaCage)},
      greenRemaining: game.greenPickups.filter(pickup => pickup.active).length,
      sea: game.sea && {x: game.sea.x, y: game.sea.y, blades: game.sea.blades.length,
        mode: game.sea.mode, bladeRadius: SEA_BLADE_RADIUS,
        standoffDistance: SEA_STANDOFF_DISTANCE},
      momo: game.momo && {x: game.momo.x, y: game.momo.y},
      portal: {...game.portal},
      feedback: {sounds: game.feedback.sounds.map(item => ({...item})),
        effects: game.feedback.effects.map(item => ({...item}))},
      carCount: game.cars.length, formationCount: game.formations.length,
      view: {x: cameraX, width: viewW}
    }),
    restart: reset
  };
})();
