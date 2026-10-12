// Test runner for Shadow Dungeon RPG Pause System & Enemy Freeze
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING PAUSE SYSTEM & ENEMY PROCESS FREEZE TESTS ===\n');

// 1. Verify HTML Structure
console.log('--- 1. Testing HTML Structure for Pause Controls ---');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
assert(html.includes('id="btn-pause-toggle"'), 'btn-pause-toggle must exist in index.html');
assert(html.includes('id="pause-modal"'), 'pause-modal must exist in index.html');
assert(html.includes('id="btn-pause-resume"'), 'btn-pause-resume must exist in index.html');
assert(html.includes('id="btn-pause-inventory"'), 'btn-pause-inventory must exist in index.html');
assert(html.includes('id="btn-pause-sanctum"'), 'btn-pause-sanctum must exist in index.html');
assert(html.includes('id="btn-pause-settings"'), 'btn-pause-settings must exist in index.html');
assert(html.includes('id="btn-pause-save-exit"'), 'btn-pause-save-exit must exist in index.html');
console.log('✅ PASSED: HTML contains all pause toggle and menu elements');

// 2. Verify CSS Rules
console.log('\n--- 2. Testing CSS Rules for Pause Modal ---');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');
assert(css.includes('.pause-modal-card'), 'pause-modal-card CSS class must exist');
assert(css.includes('.pause-menu-actions'), 'pause-menu-actions CSS class must exist');
assert(css.includes('.pause-action-btn'), 'pause-action-btn CSS class must exist');
console.log('✅ PASSED: CSS contains pause modal styling');

// 3. Mock DOM & Environment for Game Engine Logic
console.log('\n--- 3. Testing Game Engine Pause State & Update Freeze ---');

function createMockElement(tag, id = '', className = '') {
  const classes = new Set(className ? className.split(' ') : []);
  return {
    tagName: tag.toUpperCase(),
    id,
    className,
    style: {},
    classList: {
      add(c) { classes.add(c); this._update(); },
      remove(c) { classes.delete(c); this._update(); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c); else classes.add(c);
        } else if (force) classes.add(c); else classes.delete(c);
        this._update();
      },
      _update: () => {}
    },
    addEventListener() {},
    click() {},
    appendChild(c) { return c; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; },
    querySelector() { return createMockElement('span'); },
    querySelectorAll() { return []; },
    getContext() {
      return {
        fillRect() {}, clearRect() {}, save() {}, restore() {}, translate() {},
        scale() {}, resetTransform() {}, drawImage() {}, beginPath() {}, stroke() {},
        fill() {}, arc() {}, ellipse() {}, roundRect() {}, fillText() {}, strokeText() {},
        clip() {}, moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, rotate() {},
        createLinearGradient() { return { addColorStop() {} }; },
        createRadialGradient() { return { addColorStop() {} }; }
      };
    }
  };
}

const mockElements = {};
['pause-modal', 'pause-subtitle', 'btn-close-pause', 'btn-pause-resume', 'btn-pause-inventory',
 'btn-pause-sanctum', 'btn-pause-settings', 'btn-pause-save-exit', 'btn-pause-toggle',
 'inventory-modal', 'sanctum-modal', 'records-modal', 'codex-modal', 'settings-modal', 'shop-modal',
 'start-screen', 'hud', 'mobile-controls', 'game-over-screen', 'victory-screen', 'save-toast',
 'hp-bar-fill', 'hp-bar-ghost', 'hp-text', 'mana-bar-fill', 'mana-bar-ghost', 'mana-text',
 'xp-bar-fill', 'level-badge', 'gold-text', 'shard-text', 'depth-badge', 'boss-bar-container',
 'boss-bar-fill', 'boss-bar-ghost', 'boss-hp-text', 'boss-name-text', 'low-hp-vignette',
 'btn-potion-hp', 'btn-potion-mp', 'potion-hp-count', 'potion-mp-count', 'btn-attack', 'btn-dash',
 'btn-fireball', 'btn-frost', 'btn-thunder', 'stat-atk', 'stat-def', 'stat-crit', 'stat-speed', 'stat-magic',
 'game-canvas', 'minimap-canvas'
].forEach(id => {
  mockElements[id] = createMockElement('div', id, id.includes('modal') ? 'modal-backdrop hidden' : '');
});

global.document = {
  getElementById: (id) => mockElements[id] || createMockElement('div', id),
  createElement: (tag) => createMockElement(tag),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

global.window = {
  innerWidth: 800,
  innerHeight: 600,
  document: global.document,
  addEventListener: () => {},
  performance: { now: () => Date.now() },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { vibrate: () => {} },
  soundEngine: {
    isInitialized: true,
    init: () => {},
    resume: () => {},
    playHitImpact: () => {},
    toggleMute: () => false
  }
};
global.navigator.getGamepads = () => [];

require('../js/storage.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/joystick.js');
require('../js/entities.js');
require('../js/ui.js');
require('../js/gamepad.js');
require('../js/game.js');

const game = new global.window.Game();
global.window.gameInstance = game;

// Start game into PLAYING state
game.startNewGame();
assert.strictEqual(game.state, 'PLAYING', 'Game must be in PLAYING state after startNewGame()');
console.log('✅ PASSED: Initial game state is PLAYING');

// 3.1 Test pauseGame()
game.pauseGame();
assert.strictEqual(game.state, 'PAUSED', 'Game must enter PAUSED state on pauseGame()');
assert(!mockElements['pause-modal'].classList.contains('hidden'), 'pause-modal must be visible when paused');
console.log('✅ PASSED: pauseGame() transitions to PAUSED and reveals pause-modal');

// 3.2 Test update(dt) freeze while PAUSED
let enemyUpdateRan = false;
let playerUpdateRan = false;
let trapUpdateRan = false;
let projectileUpdateRan = false;

const dummyEnemy = {
  x: 200,
  y: 200,
  update: () => { enemyUpdateRan = true; },
  isDead: false,
  isBoss: false
};
game.enemies = [dummyEnemy];

const origPlayerUpdate = game.player.update;
game.player.update = () => { playerUpdateRan = true; };

game.traps = [{ update: () => { trapUpdateRan = true; } }];
game.projectiles = [{ update: () => { projectileUpdateRan = true; } }];

// Run update tick during PAUSED state
game.update(0.016);

assert.strictEqual(enemyUpdateRan, false, 'Enemy update MUST NOT RUN when state is PAUSED');
assert.strictEqual(playerUpdateRan, false, 'Player update MUST NOT RUN when state is PAUSED');
assert.strictEqual(trapUpdateRan, false, 'Trap update MUST NOT RUN when state is PAUSED');
assert.strictEqual(projectileUpdateRan, false, 'Projectile update MUST NOT RUN when state is PAUSED');
console.log('✅ PASSED: All world updates (enemies, player, traps, projectiles) are 100% frozen in PAUSED state');

// 3.3 Test Player.takeDamage() safety while PAUSED
const dmgTaken = game.player.takeDamage(50, [], null);
assert.strictEqual(dmgTaken, 0, 'Player must take 0 damage while game is PAUSED');
console.log('✅ PASSED: Player takeDamage returns 0 while PAUSED (cannot be harmed)');

// 3.4 Test resumeGame()
game.resumeGame();
assert.strictEqual(game.state, 'PLAYING', 'Game must return to PLAYING state after resumeGame()');
assert(mockElements['pause-modal'].classList.contains('hidden'), 'pause-modal must be hidden after resumeGame()');
console.log('✅ PASSED: resumeGame() restores PLAYING state and hides pause-modal');

// 3.5 Test update(dt) executes normally when PLAYING
enemyUpdateRan = false;
playerUpdateRan = false;
game.update(0.016);
assert.strictEqual(enemyUpdateRan, true, 'Enemy update MUST RUN when state is PLAYING');
assert.strictEqual(playerUpdateRan, true, 'Player update MUST RUN when state is PLAYING');
console.log('✅ PASSED: Updates execute normally when PLAYING');

// 4. Test Modal Auto-Pause Integration
console.log('\n--- 4. Testing Modal Auto-Pause Hooks ---');

// Case A: Opening Inventory pauses game
game.ui.toggleInventory(true);
assert.strictEqual(game.state, 'PAUSED', 'Opening inventory must set game.state to PAUSED');
game.ui.toggleInventory(false);
assert.strictEqual(game.state, 'PLAYING', 'Closing inventory must restore game.state to PLAYING');
console.log('✅ PASSED: Inventory modal automatically pauses & unpauses game');

// Case B: Opening Merchant Shop pauses game
game.ui.openShopModal(game.player, 1);
assert.strictEqual(game.state, 'PAUSED', 'Opening shop must set game.state to PAUSED');
game.ui.closeShopModal();
assert.strictEqual(game.state, 'PLAYING', 'Closing shop must restore game.state to PLAYING');
console.log('✅ PASSED: Merchant shop modal automatically pauses & unpauses game');

// Case C: Opening Soul Sanctum pauses game
game.ui.openSanctumModal();
assert.strictEqual(game.state, 'PAUSED', 'Opening sanctum must set game.state to PAUSED');
game.ui.closeModals();
assert.strictEqual(game.state, 'PLAYING', 'Closing sanctum must restore game.state to PLAYING');
console.log('✅ PASSED: Soul Sanctum modal automatically pauses & unpauses game');

// Case D: Opening Settings pauses game
game.ui.openSettingsModal();
assert.strictEqual(game.state, 'PAUSED', 'Opening settings must set game.state to PAUSED');
game.ui.closeModals();
assert.strictEqual(game.state, 'PLAYING', 'Closing settings must restore game.state to PLAYING');
console.log('✅ PASSED: Settings modal automatically pauses & unpauses game');

console.log('\n🎉 ALL 14/14 PAUSE SYSTEM TESTS PASSED PERFECTLY!\n');
