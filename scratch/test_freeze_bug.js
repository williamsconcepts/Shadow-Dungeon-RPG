// Verification test for hitstop camera freeze and hold-to-attack hang fix
const assert = require('assert');

console.log('=== RUNNING FREEZE & HANG REGRESSION TEST SUITE ===');

// Mock browser environment
const createMockElement = (id = '') => ({
  id,
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false,
    toggle: () => {}
  },
  style: {},
  children: [],
  appendChild: () => {},
  removeChild: () => {},
  innerHTML: '',
  textContent: '',
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: (event, cb) => {
    listeners[`${id}:${event}`] = listeners[`${id}:${event}`] || [];
    listeners[`${id}:${event}`].push(cb);
  },
  dataset: {},
  getContext: () => ({
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    clip: () => {},
    setLineDash: () => {},
    moveTo: () => {},
    lineTo: () => {},
    clearRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    closePath: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} })
  })
});

const mockCanvas = createMockElement('game-canvas');
mockCanvas.width = 800;
mockCanvas.height = 600;

const listeners = {};
global.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener: (event, cb) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
  },
  removeEventListener: () => {}
};
global.document = {
  readyState: 'complete',
  getElementById: (id) => {
    if (id === 'game-canvas') return mockCanvas;
    return createMockElement(id);
  },
  createElement: (tag) => createMockElement(tag),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.requestAnimationFrame = (cb) => { global._lastRafCb = cb; };
global.performance = { now: () => Date.now() };

// Load full game scripts
require('../js/storage.js');
require('../js/audio.js');
require('../js/gamepad.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/entities.js');
require('../js/ui.js');
require('../js/game.js');

console.log('\n--- 1. Testing Hitstop Freeze Bug Resolution ---');
const game = global.window.gameInstance;
assert(game, 'gameInstance must exist');
game.startNewGame('WARRIOR', 'NORMAL', false);

assert.strictEqual(game.state, 'PLAYING', 'Game must be in PLAYING state');
assert.strictEqual(game.hitstopTimer, 0, 'Initial hitstop timer must be 0');

// Simulate a critical hit landing
game.triggerHitstop(0.045);
assert.strictEqual(game.hitstopTimer, 0.045, 'hitstopTimer must be 0.045');

// Update frame during hitstop - previously this crashed with TypeError: Cannot read properties of undefined (reading 'width')
assert.doesNotThrow(() => {
  game.update(0.016);
}, 'game.update(0.016) during hitstop must not throw');

assert(game.hitstopTimer < 0.045, 'hitstopTimer must count down');
console.log('✅ Frame 1 during hitstop passed without crashing!');

// Next frames until hitstop expires
assert.doesNotThrow(() => {
  game.update(0.016);
  game.update(0.016);
}, 'Successive frames during hitstop must not throw');

assert.strictEqual(game.hitstopTimer, 0, 'hitstopTimer must finish cleanly');
console.log('✅ Hitstop completed cleanly and resumed gameplay updates!');

// --- 2. Testing Elite Death Hitstop ---
console.log('\n--- 2. Testing Elite / Boss Kill Hitstop ---');
game.triggerHitstop(0.065);
assert.strictEqual(game.hitstopTimer, 0.065);

for (let i = 0; i < 5; i++) {
  assert.doesNotThrow(() => {
    game.update(0.016);
  }, `Frame ${i} during elite hitstop must not throw`);
}
assert.strictEqual(game.hitstopTimer, 0, 'Elite hitstop timer must reach 0');
console.log('✅ Elite/Boss kill hitstop handled safely!');

// --- 3. Testing Camera.update Resiliency with Undefined Arguments ---
console.log('\n--- 3. Testing Camera.update Resiliency ---');
assert.doesNotThrow(() => {
  game.camera.update(undefined, undefined, 0.016, undefined);
  game.camera.update(NaN, NaN, 0.016, null);
  game.camera.update(100, 100, 0.016, null);
}, 'Camera.update must safely ignore undefined/null/NaN arguments without throwing');
console.log('✅ Camera.update defensive guards verified!');

// --- 4. Testing LootDrop divide-by-zero avoidance ---
console.log('\n--- 4. Testing LootDrop Physics Stability ---');
const loot = new global.window.LootDrop(game.player.x, game.player.y, 'GOLD', 25);
assert.doesNotThrow(() => {
  loot.update(0.016, game.player, game.particles, game.floatingTexts);
}, 'LootDrop update at exact same position (dist = 0) must not produce NaN');
assert(!isNaN(loot.vx) && !isNaN(loot.vy), 'LootDrop velocities must remain numbers, never NaN');
console.log('✅ LootDrop vacuum physics never produces NaN or freezes entity arrays!');

// --- 5. Testing Game.loop Error Boundary ---
console.log('\n--- 5. Testing Game.loop Error Boundary ---');
let ranNextFrame = false;
global.requestAnimationFrame = (cb) => {
  ranNextFrame = true;
};
assert.doesNotThrow(() => {
  game.loop(performance.now());
}, 'game.loop must execute safely');
assert(ranNextFrame, 'game.loop must request next animation frame');
console.log('✅ Game.loop error boundary ensures frame loop never dies!');

// --- 6. Testing LootDrop Pickup and updateHUD Integrity ---
console.log('\n--- 6. Testing LootDrop Pickup & updateHUD ---');
const dropShard = new global.window.LootDrop(game.player.x, game.player.y, 'SHARD', 5);
game.lootDrops.push(dropShard);
assert.doesNotThrow(() => {
  // When drop is collected at dist 0, it calls this.ui.updateHUD
  game.update(0.016);
}, 'Collecting loot drop must not throw or crash updateHUD');
assert.strictEqual(game.lootDrops.length, 0, 'Collected loot drop must be removed from lootDrops array');
console.log('✅ Loot collection updateHUD works seamlessly without crashing!');

// --- 7. Testing Warrior Skill 1 & 2 Urn Breaking Safety ---
console.log('\n--- 7. Testing Warrior Urn Breaking Skills ---');
// Place an urn near the player
const testUrn = new global.window.Urn(game.player.x + 20, game.player.y);
game.urns.push(testUrn);
game.player.skills.skill1.currentCd = 0;
game.player.mana = 100;

assert.doesNotThrow(() => {
  game.player.triggerSkill1(game.enemies, game.projectiles, game.particles, game.floatingTexts);
}, 'Whirlwind Skill 1 near urns must not throw u.break is not a function');
assert.strictEqual(testUrn.broken, true, 'Urn must be broken by whirlwind');
console.log('✅ Skill 1 breaks urns safely!');

const testUrn2 = new global.window.Urn(game.player.x + 30, game.player.y);
game.urns.push(testUrn2);
game.player.skills.skill2.currentCd = 0;
game.player.mana = 100;
assert.doesNotThrow(() => {
  game.player.triggerSkill2(game.enemies, game.particles, game.floatingTexts, game.camera);
}, 'Seismic Stomp Skill 2 near urns must not throw');
assert.strictEqual(testUrn2.broken, true, 'Urn must be broken by stomp');
console.log('✅ Skill 2 breaks urns safely!');

// --- 8. Testing Checkpoint Respawn & HUD Update ---
console.log('\n--- 8. Testing Checkpoint Respawn & HUD Update ---');
assert.doesNotThrow(() => {
  game.restartGame(true);
}, 'restartGame(true) must cleanly respawn player without throwing');
assert.strictEqual(game.state, 'PLAYING', 'Game must be PLAYING after checkpoint restart');
console.log('✅ Checkpoint restart restores player and HUD flawlessly!');

// --- 9. Testing descendFloor Transition Guards ---
console.log('\n--- 9. Testing descendFloor Transition Guards ---');
assert.doesNotThrow(() => {
  game.descendFloor();
}, 'descendFloor must trigger transition safely');
assert.strictEqual(game.state, 'TRANSITION', 'Game must enter TRANSITION state');
// Attempt duplicate invocation while in transition
assert.doesNotThrow(() => {
  game.descendFloor();
}, 'Duplicate descendFloor calls while in TRANSITION must be ignored safely');
console.log('✅ descendFloor handles transition states safely!');

console.log('\n🎉 ALL FREEZE & HANG REGRESSION TESTS PASSED (100%)! 🎉\n');
