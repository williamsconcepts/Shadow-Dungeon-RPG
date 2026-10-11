// Node.js test script for Stage Progression Lock (All Villains Eliminated Requirement)

// Mock browser environment
global.window = global;
global.window.addEventListener = () => {};

const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  ellipse: () => {},
  roundRect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  fill: () => {},
  stroke: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  fillText: () => {},
  clip: () => {},
  setLineDash: () => {},
  clearRect: () => {}
};

const domStore = {};
function createMockEl(id = '') {
  const el = {
    id,
    _className: '',
    get className() { return this._className; },
    set className(val) {
      this._className = val;
      this.classList._classes = new Set(val ? val.split(/\s+/).filter(Boolean) : []);
    },
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); el._className = Array.from(this._classes).join(' '); },
      remove: function(c) { this._classes.delete(c); el._className = Array.from(this._classes).join(' '); },
      contains: function(c) { return this._classes.has(c); }
    },
    style: {},
    children: [],
    appendChild: function(c) { this.children.push(c); return c; },
    removeChild: function(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
    },
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 20, top: 400, width: 140, height: 140, right: 160, bottom: 540 }),
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getContext: () => mockCtx,
    width: 800,
    height: 600,
    textContent: ''
  };
  return el;
}

global.document = {
  getElementById: (id) => {
    if (!domStore[id]) domStore[id] = createMockEl(id);
    return domStore[id];
  },
  createElement: (tag) => createMockEl(tag),
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Load modules in order
require('../js/storage.js');
require('../js/items.js');
require('../js/audio.js');
require('../js/gamepad.js');
require('../js/joystick.js');
require('../js/entities.js');
require('../js/dungeon.js');
require('../js/ui.js');
require('../js/game.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== RUNNING PORTAL LOCKING & VILLAIN ELIMINATION TESTS ===\n');

// Initialize Game
const game = new window.Game();
game.canvas = createMockEl('game-canvas');
game.ctx = mockCtx;
game.lightCanvas = createMockEl('light-canvas');
game.lightCtx = mockCtx;

// Initialize floor 1 in PLAYING state
game.loadFloor(1, true);
game.state = 'PLAYING';

console.log('--- TEST 1: Initial Floor State & Portal Sealed ---');
assert(game.floorCleared === false, 'Floor 1 starts with floorCleared = false');
assert(game.enemies.length > 0, `Floor 1 spawned ${game.enemies.length} enemies`);

const stairsWorldX = (game.dungeon.stairs.x + 0.5) * game.dungeon.tileSize;
const stairsWorldY = (game.dungeon.stairs.y + 0.5) * game.dungeon.tileSize;

// Move player directly onto the stairs while enemies are alive
game.player.x = stairsWorldX;
game.player.y = stairsWorldY;

let descendCalled = false;
const origDescend = game.descendFloor.bind(game);
game.descendFloor = () => {
  descendCalled = true;
  origDescend();
};

// Test interact/attack near stairs
game.floatingTexts = [];
game.checkInteractOrAttack();
assert(!descendCalled, 'checkInteractOrAttack does NOT trigger descendFloor while enemies remain');
assert(
  game.floatingTexts.some(t => t.text.includes('Portal Sealed') || t.text.includes('villain')),
  'Warning floating text displayed alerting player that portal is sealed'
);

// Test update(dt) stepping on stairs
game.update(0.016);
assert(!descendCalled, 'Stepping directly on stairs in update() does NOT trigger descent while enemies remain');
assert(game.state === 'PLAYING', 'Game remains in PLAYING state');

console.log('\n--- TEST 2: Radar / UI Indicates Locked Status ---');
game.ui.renderMinimap(game.player, game.dungeon);
const exitStatus = document.getElementById('radar-exit-status');
assert(
  exitStatus.textContent.includes('Sealed') || exitStatus.textContent.includes('Exit Unseen'),
  `Radar exit status reflects sealed/unseen state: "${exitStatus.textContent}"`
);

// If stairs explored
game.dungeon.explored[game.dungeon.stairs.y][game.dungeon.stairs.x] = true;
game.ui.renderMinimap(game.player, game.dungeon);
assert(
  exitStatus.textContent.includes('Sealed') && exitStatus.classList.contains('locked'),
  `Radar status displays 🔒 Sealed when stairs explored and enemies alive: "${exitStatus.textContent}"`
);

console.log('\n--- TEST 3: Slaying All Villains Unseals the Portal ---');
// Move player away from stairs into dungeon room to fight
game.player.x = 200;
game.player.y = 200;

const totalEnemies = game.enemies.length;
console.log(`Simulating combat: slaying all ${totalEnemies} enemies...`);

// Slay all enemies one by one except the last
while (game.enemies.length > 1) {
  const enemy = game.enemies[0];
  enemy.hp = 0;
  enemy.isDead = true;
  game.update(0.016);
}
assert(game.floorCleared === false, 'Portal remains sealed with 1 enemy remaining');

// Slay the final enemy
const lastEnemy = game.enemies[0];
lastEnemy.hp = 0;
lastEnemy.isDead = true;
game.update(0.016);

assert(game.enemies.length === 0, 'All enemies removed from active list');
assert(game.floorCleared === true, 'floorCleared is now TRUE after last villain defeated');
assert(
  game.floatingTexts.some(t => t.text.includes('STAGE CLEARED — PORTAL UNSEALED')),
  'Floating banner ★ STAGE CLEARED — PORTAL UNSEALED! ★ announced'
);

// Check radar status after floor cleared
game.ui.renderMinimap(game.player, game.dungeon);
assert(
  exitStatus.textContent.includes('Portal Open') && exitStatus.classList.contains('found'),
  `Radar status updates to ✨ Portal Open! after clearing: "${exitStatus.textContent}"`
);

console.log('\n--- TEST 4: Stepping on Unsealed Portal Descends to Next Stage ---');
assert(!descendCalled, 'Descent has not triggered yet');

// Now player steps onto unsealed portal
game.player.x = stairsWorldX;
game.player.y = stairsWorldY;
game.update(0.016);

assert(descendCalled, 'Stepping onto unsealed portal successfully triggers descendFloor()');
assert(game.state === 'TRANSITION', 'Game transitions to next floor');

console.log('\n--- TEST 5: Next Floor Resets Clear State & Spawns New Enemies ---');
// Manually advance to floor 2 as descendFloor timer would
game.loadFloor(2, false);
assert(game.floorNumber === 2, 'Arrived at Floor 2');
assert(game.floorCleared === false, 'Floor 2 resets floorCleared to false');
assert(game.enemies.length > 0, `Floor 2 has ${game.enemies.length} fresh enemies`);

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed`);
if (passedTests === totalTests) {
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED! ✗');
  process.exit(1);
}
