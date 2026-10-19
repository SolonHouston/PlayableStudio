const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'scene3-play.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'scene3-play.html'), 'utf8');
const imageRoot = path.join(root, 'assets', 'images');

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `${name} function can be inspected`);
  return source.slice(start, end);
}

assert.match(html, /id="game" width="280" height="462"/,
  'gameplay viewport is reduced again while the CSS display area stays full-screen');
assert.match(html, /scene3-play\.js/);
assert.match(source, /noEnemyKnockback:\s*true/);
assert.doesNotMatch(source, /function\s+knockback|\bknockback\s*\(/,
  'scene three must not add enemy or player knockback');
assert.match(source, /failureRequiresPlayerBodyContact:\s*true/);
assert.match(source, /offscreenEntry:[\s\S]*requiresFullWeaponOutside:\s*true[\s\S]*initialGoblinsExcluded:\s*true/,
  'mid-story enemies spawn with their full weapon ring outside the camera');
assert.match(source, /function\s+beginOffscreenEntry[\s\S]*OFFSCREEN_SPAWN_MARGIN/);
assert.match(source, /function\s+updateEntryState[\s\S]*hasSafelyEnteredCamera/,
  'enemy collisions stay disabled until the actor visibly enters the view');
assert.match(source, /startWhiteBlades:\s*6/);
assert.match(source, /whiteRoute:[\s\S]*collectibleBubbles:\s*6[\s\S]*addsPerBubble:\s*1[\s\S]*triggerJiangbaoWhenComplete:\s*false/,
  'the six map white bubbles each add one white blade without controlling jiangbao timing');
assert.match(source, /ORB_ART\s*=\s*\{[\s\S]*white:\s*'white-orb\.webp'/,
  'runtime white bubbles render with the white orb instead of the gold orb');
assert.match(source, /count:\s*10,\s*oneHit:\s*true/);
assert.match(source, /chasesPlayer:\s*true/,
  'scene-three goblins continuously chase like scene-one fatties');
assert.match(source, /moveToward\(enemy, state\.player, enemy\.speed, dt\)/,
  'live goblin updates move each enemy toward the player');
assert.match(source, /THREAT_FULL_RING_BLADE_COUNT\s*=\s*Math\.ceil/,
  'giant and demon blade count is derived from the circumference needed to fill the ring');
assert.match(source, /fullRing:\s*true,[\s\S]*unlimitedReplacement:\s*true/,
  'threat blade rings stay visually full and replace every shattered blade');
assert.match(source, /greenRoute:[\s\S]*first:\s*4,\s*corridor:\s*8/);
assert.match(source, /jiangbao:[\s\S]*greenBlades:\s*6/);
assert.match(source, /greenToGoldAfterJiangbao:\s*true/);
assert.match(source, /SEA_CORRIDOR_RESOURCE_TRIGGER_COUNT\s*=\s*6/,
  'poseidon waits until six of eight corridor resources are collected');
assert.match(source, /spawnOnCorridorResourceCount:\s*SEA_CORRIDOR_RESOURCE_TRIGGER_COUNT[\s\S]*spawnNearCorridorExit:\s*true/,
  'poseidon also has a late corridor exit-position fallback');
assert.doesNotMatch(source, /spawnOnFirstCorridorResource:\s*true/,
  'the obsolete first-corridor-resource trigger is removed');
assert.match(source, /poseidon:[\s\S]*greenBlades:\s*12[\s\S]*venomAlwaysSpawns:\s*true/);
assert.match(source, /venom:[\s\S]*purpleBlades:\s*9/);
assert.match(source, /redBladesPulled:\s*12[\s\S]*replacesInventory:\s*true/);
assert.match(source, /manualRedPickupEnabled:\s*true[\s\S]*manualFullSetTransforms:\s*true/,
  'red blade bubbles can be collected directly without the magnet');
assert.match(source, /revertsAtZeroRed:\s*true[\s\S]*localFollowingSaiyanEffect:\s*true/);
assert.match(source, /super:\s*\[86,\s*86\]/,
  'the square transformation frames render at the size that matches the normal visible character height');
assert.match(source, /PLAYER_BLADE_RING_DIAMETER\s*=\s*PLAYER_HEIGHT\s*\*\s*1\.5/);
assert.match(source, /PLAYER_BLADE_RADIUS\s*=\s*PLAYER_BLADE_RING_DIAMETER\s*\/\s*2\s*-\s*BLADE_DRAW_WIDTH\s*\/\s*2/,
  'player blade-ring visible outer diameter is one and a half player heights');
assert.match(source, /bodyCentered:\s*true/,
  'the normal and transformed player bodies share the blade-ring center');
assert.match(source, /finalBosses:[\s\S]*count:\s*2[\s\S]*ultraRing:\s*true/);
assert.match(source, /portalByPlayerFoot:\s*true[\s\S]*retryFullReset:\s*true/);
assert.match(source, /collectible:\s*false/,
  '+99 rainbow blade is a guaranteed non-collectible story bait');
assert.match(source, /RAINBOW_BAIT_POINT[\s\S]*y:\s*48/,
  'the rainbow bait moves upward another thirty world units without moving other resources');
assert.match(source, /openingThreats:[\s\S]*releaseWhenRainbowVisible:\s*true[\s\S]*requiresAllGoblinsDefeated:\s*false/,
  'the opening threats release from player position or bait visibility without waiting for all goblins');
assert.match(source, /THREAT_CONTACT_TIME\s*=\s*5\.2/,
  'the giant and demon approach leaves time to clear the opening goblins');
assert.match(source, /DEMON_APPROACH_TIME\s*=\s*3\.5/,
  'the demon reaches its original contact point sooner and waits for the giant');
assert.match(source, /giantStartsAboveRainbow:\s*true[\s\S]*contactTimeSeconds:\s*THREAT_CONTACT_TIME/,
  'the giant enters above the rainbow bait and exposes the slower pacing contract');

assert.match(source, /BLADE_REFLOW_DELAY\s*=\s*\.5/,
  'blade circles wait half a second after the last clash before reflow');
assert.match(source, /continuousPairs:\s*true[\s\S]*independentAngles:\s*true/);
assert.match(source, /immediateRedistribution:\s*false[\s\S]*smoothReflow:\s*true/);
assert.doesNotMatch(source, /nextClashAt|function\s+redistribute/,
  'blade collisions have no one-pair cooldown and no immediate redistribution helper');
assert.doesNotMatch(source, /blade\.offset/,
  'every blade stores its own current world angle');

const clashSource = functionSource('clashBlades', 'playerBladeTouchesBody');
assert.match(clashSource, /let collided = false/);
assert.match(clashSource, /return collided/);
assert.doesNotMatch(clashSource, /return true/,
  'clash scan does not stop after the first colliding blade pair');
const removeSource = functionSource('removeBlade', 'restoreFullBladeRing');
assert.doesNotMatch(removeSource, /arrangeBlades|reflowTargetOffset\s*=/,
  'removing a blade preserves every surviving blade angle');
const resolveSource = functionSource('resolveEnemy', 'defeatEnemy');
assert.doesNotMatch(resolveSource, /!enemy\.blades\.length/,
  'a blade can hit a killable enemy body through a live blade-ring gap');
assert.match(resolveSource, /enemy\.killable\s*&&\s*playerBladeTouchesBody\(enemy\)/);

assert.match(source, /THREAT_BLOCK_POINT\s*=\s*Object\.freeze\(\{x:\s*540,\s*y:\s*280\}\)/);
assert.match(source, /demon:\s*\[82,\s*110\]/,
  'demon render size matches the giant model size');
assert.match(source, /THREAT_RING_CONTACT_DISTANCE[\s\S]*distance\(giant, demon\)/,
  'giant and demon share the target and stop only when their blade rings touch');
assert.match(source, /speed:\s*88,\s*frames:\s*'jiangbao'/,
  'jiangbao chase leaves time for multi-clash resolution');
assert.match(source, /x:\s*X\(213\),\s*y:\s*592/,
  'venom spawn point moved left by 50 world units');
assert.match(source, /VENOM_CHASE_SPEED\s*=\s*103/,
  'venom intercept and chase speed is raised from 100 to 103');
assert.match(source, /VENOM_FLEE_START_SPEED\s*=\s*80[\s\S]*VENOM_FLEE_MIN_SPEED\s*=\s*38[\s\S]*VENOM_FLEE_DECELERATION\s*=\s*9/,
  'venom slows progressively while fleeing upper-left');
assert.match(source, /SEA_BLOCK_SPEED\s*=\s*127[\s\S]*SEA_FLEE_SPEED\s*=\s*153[\s\S]*SEA_VENOM_DELAY\s*=\s*2/,
  'sea-god blocking speed drops by three while its confirmed faster flee remains 153');
assert.match(source, /fasterThanPlayerOnFlee:\s*true[\s\S]*venomSpawnDelay:\s*SEA_VENOM_DELAY/,
  'only the fleeing sea-god stays faster than the player and venom waits for the chase window');
assert.match(source, /spawnsToInterceptSea:\s*true[\s\S]*chasesPlayerAfterSeaKill:\s*true/,
  'venom intercepts and kills the sea-god before chasing the player');
assert.match(source, /killedByVenom:\s*true/,
  'the player cannot catch and personally defeat the fleeing sea-god');
assert.match(source, /entryDirection:\s*'left-to-right'/,
  'sea-god still enters from the left toward the blocking point');
assert.match(source, /entryOffsetX:\s*SEA_ENTRY_OFFSET_X[\s\S]*fleeDirection:\s*'left'/,
  'sea-god starts fifty units farther right and flees left after being hit');
assert.match(source, /drawSize:\s*30/,
  'the magnet visual footprint matches the thirty-unit resource bubbles');
assert.match(source, /ringContactDistance:\s*210/,
  'final boss ring centers close far enough for visible artwork edges to touch');
assert.match(source, /FINAL_BOSS_ALIGN_SPEED\s*=\s*91/,
  'both final bosses align three units faster');
assert.match(source, /ringContactDistance:\s*210,\s*downSpeed:\s*75/,
  'both final bosses descend three units faster after their rings touch');
assert.match(source, /fixedSpawn:\s*Object\.freeze\(\{x:\s*X\(905\),\s*y:\s*92\}\)[\s\S]*spawnRelativeToCamera:\s*false/,
  'jiangbao uses the confirmed map anchor shifted right one hundred and up thirty');
assert.match(source, /triggerPoint:\s*JIANGBAO_TRIGGER_POINT[\s\S]*triggerRadius:\s*JIANGBAO_TRIGGER_RADIUS[\s\S]*triggerRequiresWhiteCount:\s*false/,
  'jiangbao uses the rightmost-white position trigger instead of the pickup count');
assert.match(source, /entryOffsetX:\s*VENOM_ENTRY_OFFSET_X/,
  'venom starts fifty world units farther left');
assert.match(source, /pickupSource\s*=\s*'manual'[\s\S]*tier:\s*'red'/,
  'touching an uncollected red bubble directly adds a red blade');
assert.match(source, /mode:\s*'chase',\s*killable:\s*false/,
  'venom cannot be defeated before transformation');
assert.match(source, /state\.venom\.mode\s*=\s*'flee'[\s\S]*state\.venom\.fleeKillableAt/,
  'transformation starts a visible venom escape before it becomes killable');
assert.match(source, /fleeTarget\s*=\s*\{[\s\S]*Math\.min\(X\(300\)[\s\S]*Math\.min\(650/,
  'transformed venom receives a fixed upper-left target toward the axe side');
assert.match(source, /magnetPoint\s*=\s*\{x:\s*X\(500\),\s*y:\s*770\}/,
  'magnet moved down by 20 world units');
assert.match(source, /MAGNET_PULL_SPEED\s*=\s*720[\s\S]*MAGNET_PULL_STAGGER\s*=\s*\.012|MAGNET_PULL_STAGGER\s*=\s*\.012[\s\S]*MAGNET_PULL_SPEED\s*=\s*720/,
  'magnet pull animation is accelerated');
const finalBossSource = functionSource('updateFinalBosses', 'updatePortal');
assert.match(finalBossSource, /ringContactDistance[\s\S]*distance\(state\.axe, state\.momo\)/,
  'final bosses do not descend until their ultra rings touch');
assert.match(finalBossSource, /FINAL_BOSS_ROUTE\.downX[\s\S]*FINAL_BOSS_ROUTE\.downY/);
assert.doesNotMatch(finalBossSource, /state\.player\.x|desiredX/,
  'final bosses keep the fixed horizontal-then-diagonal route instead of tracking player X');
assert.match(source, /centerX:\s*X\(440\)/,
  'final boss ring-contact midpoint moves right by thirty world units');
assert.match(source, /function\s+finalBossGuardReason[\s\S]*right-up-intent[\s\S]*right-script-boundary/,
  'both left script boundary and upper-right escape intent trigger the boss guard');
assert.match(source, /guardSpawnsBoth:\s*true/);
assert.match(source, /SAIYAN_EFFECT_WIDTH\s*=\s*60[\s\S]*SAIYAN_EFFECT_HEIGHT\s*=\s*80/,
  'the local transformation background only slightly exceeds the visible character');
assert.match(source, /boneShatter\(enemy\.x, enemy\.y\)/,
  'all killable enemies use the centralized bone-shatter death effect');
assert.match(source, /event\.clientX\s*-\s*shellRect\.left[\s\S]*event\.clientY\s*-\s*shellRect\.top/,
  'floating joystick is positioned in shell-local coordinates');
assert.match(source, /restoreFullBladeRing\(enemy\)/,
  'shattered giant or demon blades are restored after each clash');

for (const prefix of ['super', 'demon', 'giant', 'goblin', 'venom', 'axe']) {
  for (let index = 0; index < 8; index++) {
    const file = path.join(imageRoot, 'scene3', `${prefix}-${index}.png`);
    assert(fs.existsSync(file) && fs.statSync(file).size > 1000,
      `${prefix}-${index}.png is a non-empty processed frame`);
  }
}
assert(fs.existsSync(path.join(imageRoot, 'scene3', 'red-blade.png')));
for (let index = 0; index < 7; index++)
  assert(fs.existsSync(path.join(imageRoot, `bone-${index}.webp`)),
    `bone-${index}.webp exists for enemy defeat animation`);
assert(fs.existsSync(path.join(root, 'assets', 'video', 'saiyan.mp4')));

console.log('scene-three-gameplay: PASS (story contract, no knockback, assets, reset/ending rules)');
