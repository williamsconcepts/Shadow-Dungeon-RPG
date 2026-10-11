// Test runner for VirtualJoystick and Mobile Move Drag Integration
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; }
};

// Mock DOM elements
function createMockElement(tag, id = '', className = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id: id,
    className: className,
    style: {},
    classList: {
      _classes: new Set(className ? className.split(' ') : []),
      add(c) { this._classes.add(c); el.className = Array.from(this._classes).join(' '); },
      remove(c) { this._classes.delete(c); el.className = Array.from(this._classes).join(' '); },
      contains(c) { return this._classes.has(c); }
    },
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 20, top: 400, width: 140, height: 140, right: 160, bottom: 540 })
  };
  return el;
}

global.document = {
  createElement: (tag) => createMockElement(tag),
  getElementById: (id) => createMockElement('div', id),
  addEventListener: () => {}
};

global.window = {
  innerWidth: 390,
  innerHeight: 844,
  addEventListener: () => {},
  document: global.document,
  localStorage: global.localStorage
};

global.navigator = { vibrate: () => {} };
global.soundEngine = {
  isInitialized: true,
  init: () => {},
  resume: () => {},
  playUrnBreak: () => {}
};

// Require dependencies
require('../js/storage.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/joystick.js');
require('../js/entities.js');

const { VirtualJoystick, Player, Dungeon } = global.window;

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('--- 1. Testing VirtualJoystick Instantiation & Defaults ---');
const container = createMockElement('div', 'joystick-container', 'joystick-zone');
const joystick = new VirtualJoystick(container, { maxRadius: 48, deadzone: 0.08 });

assert(joystick.active === false, 'Joystick initially inactive');
assert(joystick.vector.active === false, 'Joystick vector initially inactive');
assert(joystick.x === 0 && joystick.y === 0, 'Joystick initial coordinates (0, 0)');
assert(joystick.magnitude === 0, 'Joystick initial magnitude 0');

console.log('\n--- 2. Testing Move Drag Touch Interaction ---');
// Simulate touch on joystick
joystick.startTracking(101, 90, 470, false);
assert(joystick.active === true, 'Joystick active after touch start');
assert(joystick.vector.active === true, 'Joystick vector active after touch start');

// Simulate dragging right & down (+dx, +dy)
joystick.updatePosition(120, 500);
assert(joystick.active === true, 'Joystick active while dragging');
assert(joystick.x > 0, `Joystick X moved positive (x: ${joystick.x.toFixed(3)})`);
assert(joystick.y > 0, `Joystick Y moved positive (y: ${joystick.y.toFixed(3)})`);
assert(joystick.magnitude > 0, `Joystick magnitude positive (${joystick.magnitude.toFixed(3)})`);
assert(joystick.angle > 0, `Joystick angle calculated (${joystick.angle.toFixed(3)} rad)`);

console.log('\n--- 3. Testing Player Movement With Virtual Joystick ---');
const dungeon = new Dungeon(1);
const player = new Player(dungeon.playerStart.x, dungeon.playerStart.y, 'WARRIOR');

const mockInput = {
  keys: {},
  joystick: joystick,
  gamepad: null,
  mouseWorld: null,
  isTouchMode: true
};

const initialPlayerX = player.x;
const initialPlayerY = player.y;

// Update player position with dt = 0.05s
player.update(0.05, mockInput, dungeon, [], []);

assert(player.x > initialPlayerX, `Player moved right from joystick input (X: ${initialPlayerX} -> ${player.x})`);
assert(player.y > initialPlayerY, `Player moved down from joystick input (Y: ${initialPlayerY} -> ${player.y})`);
assert(player.isMoving === true, 'Player is marked isMoving = true');
assert(Math.abs(player.angle - joystick.angle) < 0.05, 'Player facing angle aligned with joystick drag direction');

console.log('\n--- 4. Testing Touch Release & Reset ---');
joystick.reset();
assert(joystick.active === false, 'Joystick inactive after reset');
assert(joystick.x === 0 && joystick.y === 0, 'Joystick coordinates reset to 0');
assert(joystick.magnitude === 0, 'Joystick magnitude reset to 0');

// Next player update with inactive joystick
const stoppedX = player.x;
player.update(0.05, mockInput, dungeon, [], []);
assert(player.x === stoppedX, 'Player stops moving when joystick is released');
assert(player.isMoving === false, 'Player is marked isMoving = false');

console.log('\n--- 5. Testing Left-Screen Floating Drag Simulation ---');
// Floating touch at (100, 300)
joystick.startTracking(102, 100, 300, true);
assert(joystick.isFloating === true, 'Floating mode active');
// Drag to the left
joystick.updatePosition(60, 300);
assert(joystick.x < -0.5, `Floating drag left produced negative X (x: ${joystick.x.toFixed(3)})`);
player.update(0.05, mockInput, dungeon, [], []);
assert(player.x < stoppedX, 'Player moved left from floating drag');

joystick.reset();
assert(joystick.isFloating === false, 'Floating mode reset cleanly');

console.log(`\n🎉 ALL ${passed}/${total} MOBILE JOYSTICK TESTS PASSED!`);
