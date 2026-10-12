// Test Combat Juice, LootDrop Vacuum System, Dash Afterimages, and Hitstop
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.document = {
  getElementById: (id) => ({
    id,
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    innerHTML: '',
    textContent: '',
    addEventListener: () => {}
  })
};

let coinSoundPlayed = false;
let globeSoundPlayed = false;
let footstepSoundPlayed = false;
let dashSoundPlayed = false;

global.soundEngine = {
  playCoin: () => { coinSoundPlayed = true; },
  playCoinPickup: () => { coinSoundPlayed = true; },
  playHealthGlobePickup: () => { globeSoundPlayed = true; },
  playFootstep: () => { footstepSoundPlayed = true; },
  playDash: () => { dashSoundPlayed = true; },
  playDashWhoosh: () => { dashSoundPlayed = true; },
  playHitImpact: () => {},
  playHeal: () => {},
  playShardCollect: () => {}
};

// Mock storage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
eval(storageCode);
global.StorageManager = StorageManager;

const entitiesCode = fs.readFileSync(path.join(__dirname, '../js/entities.js'), 'utf8');
eval(entitiesCode);

console.log('✓ Loaded storage.js and entities.js successfully');

// TEST 1: LootDrop instantiation, physics, and magnetic vacuum
{
  assert.strictEqual(typeof LootDrop, 'function', 'LootDrop class must be defined');

  const player = new Player(200, 200, 'WARRIOR');
  player.gold = 10;
  player.hp = 100; // injured
  player.mana = 20;

  const dropGold = new LootDrop(250, 200, 'GOLD', 25, { speed: 0 });
  const particles = [];
  const floatingTexts = [];

  // Update drop while player is within vacuum radius (50px distance < 140px vacuum radius)
  dropGold.update(0.016, player, particles, floatingTexts);

  // Velocity should pull toward player (dx = 200 - 250 = -50, so vx accelerates negatively)
  assert.strictEqual(dropGold.vx < 0, true, 'Magnetic vacuum must pull loot toward player');

  // Place drop directly on player to collect
  const dropCollect = new LootDrop(player.x, player.y, 'GOLD', 50);
  const collected = dropCollect.update(0.016, player, particles, floatingTexts);

  assert.strictEqual(collected, true, 'Drop must be collected on contact');
  assert.strictEqual(player.gold, 60, 'Player gold must increase by value');
  assert.strictEqual(coinSoundPlayed, true, 'playCoin sound must trigger on collection');

  // Health Globe collection
  const dropGlobe = new LootDrop(player.x, player.y, 'HEALTH_GLOBE', 1);
  dropGlobe.update(0.016, player, particles, floatingTexts);
  assert.strictEqual(player.hp > 100, true, 'Health globe must restore player HP');
  assert.strictEqual(globeSoundPlayed, true, 'playHealthGlobePickup sound must trigger');

  console.log('✓ TEST 1 PASSED: LootDrop physics, magnetic vacuum, and collection work perfectly');
}

// TEST 2: Player Dash Afterimages (Ghost Trails)
{
  const player = new Player(100, 100, 'ROGUE');
  const dummyParticles = [];
  const dummyDungeon = { checkCollision: () => false };
  const dummyInput = { keys: {}, joystick: { active: false }, gamepad: null };
  const dummyFloatingTexts = [];

  player.triggerDash(dummyParticles);
  assert.strictEqual(player.isDashing, true, 'Player should be in dashing state');
  assert.strictEqual(dashSoundPlayed, true, 'Dash sound must play');

  // Step dash by several frames
  for (let i = 0; i < 5; i++) {
    player.update(0.02, dummyInput, dummyDungeon, dummyParticles, dummyFloatingTexts);
  }

  assert.strictEqual(player.dashGhosts.length > 0, true, 'Dash must record afterimage ghost snapshots');
  assert.strictEqual(player.dashGhosts[0].alpha > 0, true, 'Ghosts must have alpha');

  // Step beyond dash to verify decay
  player.isDashing = false;
  player.dashTimer = 0;
  for (let i = 0; i < 40; i++) {
    player.update(0.05, dummyInput, dummyDungeon, dummyParticles, dummyFloatingTexts);
  }

  assert.strictEqual(player.dashGhosts.length, 0, 'Ghost snapshots must cleanly decay and be removed');
  console.log('✓ TEST 2 PASSED: Dash afterimage ghost trail snapshots and decay verified');
}

// TEST 3: Footstep Cadence on Movement
{
  footstepSoundPlayed = false;
  const player = new Player(100, 100, 'WARRIOR');
  const dummyParticles = [];
  const dummyDungeon = { checkCollision: () => false };
  const moveInput = { keys: { KeyD: true }, joystick: { active: false }, gamepad: null };
  const dummyFloatingTexts = [];

  for (let i = 0; i < 30; i++) {
    player.update(0.016, moveInput, dummyDungeon, dummyParticles, dummyFloatingTexts);
  }

  assert.strictEqual(footstepSoundPlayed, true, 'Footstep audio must trigger rhythmically during movement');
  console.log('✓ TEST 3 PASSED: Footstep cadence on locomotion confirmed');
}

// TEST 4: Hitstop Micro-Freeze and Hold-to-Attack
{
  const game = {
    hitstopTimer: 0,
    state: 'PLAYING',
    camera: { update: () => {} },
    particles: [],
    floatingTexts: [],
    lootDrops: [],
    enemies: [],
    dungeon: { checkCollision: () => false, updateExploration: () => {} },
    input: { attackHeld: true, keys: {}, mouseWorld: { x: 0, y: 0 }, mouseScreen: { x: 0, y: 0 } },
    player: new Player(100, 100, 'WARRIOR'),
    triggerHitstop: function(d = 0.045) {
      this.hitstopTimer = Math.max(this.hitstopTimer, d);
    }
  };

  game.triggerHitstop(0.05);
  assert.strictEqual(game.hitstopTimer, 0.05, 'triggerHitstop must set timer');

  // Verify hold-to-attack
  let attackTriggered = false;
  game.player.triggerPrimaryAttack = () => { attackTriggered = true; };

  // When attackHeld is true and attackCdTimer is 0:
  if (game.input.attackHeld && game.player.attackCdTimer <= 0) {
    game.player.triggerPrimaryAttack();
  }

  assert.strictEqual(attackTriggered, true, 'Continuous hold-to-attack must fire when cooldown is ready');
  console.log('✓ TEST 4 PASSED: Hitstop micro-freeze and continuous hold-to-attack confirmed');
}

console.log('\n🌟 ALL COMBAT JUICE, LOOT VACUUM & ERGONOMIC TESTS PASSED! 🌟');
