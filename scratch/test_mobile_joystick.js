// Test runner for VirtualJoystick, Dual-Stick Mobile Controls & Aim Angle Retention
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
  playUrnBreak: () => {},
  playSwordSlash: () => {},
  playFireballCast: () => {},
  playHitImpact: () => {}
};

// Require dependencies
require('../js/storage.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/joystick.js');
require('../js/entities.js');

const { VirtualJoystick, Player, Dungeon, Enemy } = global.window;

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

console.log('--- 1. Testing VirtualJoystick Instantiation (Move on Left, Aim on Right) ---');
const moveContainer = createMockElement('div', 'joystick-container', 'joystick-zone move-joystick-zone');
const moveJoystick = new VirtualJoystick(moveContainer, { maxRadius: 48, deadzone: 0.08, side: 'left', theme: 'move' });

const aimContainer = createMockElement('div', 'aim-joystick-container', 'joystick-zone aim-joystick-zone');
const aimJoystick = new VirtualJoystick(aimContainer, { maxRadius: 48, deadzone: 0.08, side: 'right', theme: 'aim' });
aimJoystick.baseEl.getBoundingClientRect = () => ({ left: 242, top: 412, width: 116, height: 116, right: 358, bottom: 528 });

assert(moveJoystick.active === false, 'Move joystick initially inactive');
assert(moveJoystick.side === 'left', 'Move joystick configured for left side');
assert(moveJoystick.theme === 'move', 'Move joystick theme is move');

assert(aimJoystick.active === false, 'Aim joystick initially inactive');
assert(aimJoystick.side === 'right', 'Aim joystick configured for right side');
assert(aimJoystick.theme === 'aim', 'Aim joystick theme is aim');
assert(aimContainer.children[0].className.includes('v-joystick-base-aim'), 'Aim base element has v-joystick-base-aim class');
assert(aimContainer.children[0].children[0].className.includes('v-joystick-knob-aim'), 'Aim knob element has v-joystick-knob-aim class');

console.log('\n--- 2. Testing Move Joystick Drag & Movement ---');
const dungeon = new Dungeon(1);
const player = new Player(dungeon.playerStart.x, dungeon.playerStart.y, 'WARRIOR');

// Mock input object matching game.js in touch mode
const mockInput = {
  keys: {},
  joystick: moveJoystick,
  aimJoystick: aimJoystick,
  gamepad: null,
  mouseScreen: { x: 0, y: 0 },
  mouseWorld: { x: dungeon.playerStart.x - 100, y: dungeon.playerStart.y - 100 },
  mouseMoved: false,
  isTouchMode: true
};

// Touch move joystick down-right
moveJoystick.startTracking(101, 80, 460, false);
moveJoystick.updatePosition(115, 495); // positive dx, positive dy (~45 deg / 0.78 rad)
const moveAngle = moveJoystick.angle;

assert(moveJoystick.active === true, 'Move joystick active');
assert(moveJoystick.magnitude > 0.5, 'Move joystick magnitude registered');

const initialX = player.x;
const initialY = player.y;
player.update(0.05, mockInput, dungeon, [], []);

assert(player.x > initialX, 'Player moved X positively');
assert(player.y > initialY, 'Player moved Y positively');
assert(Math.abs(player.angle - moveAngle) < 0.05, `Player faced walking direction (${player.angle.toFixed(3)} rad)`);

console.log('\n--- 3. CRITICAL: Testing Angle Retention on Move Joystick Release ---');
// Release move joystick
moveJoystick.reset();
assert(moveJoystick.active === false, 'Move joystick now inactive');

const savedAngle = player.angle;
// Update player for multiple frames with no stick active and stale mouseWorld present
for (let f = 0; f < 5; f++) {
  player.update(0.05, mockInput, dungeon, [], []);
}

assert(player.isMoving === false, 'Player stopped moving');
assert(Math.abs(player.angle - savedAngle) < 0.001, `Player facing angle PRESERVED on release (expected ${savedAngle.toFixed(3)}, got ${player.angle.toFixed(3)})`);
assert(player.angle !== 0, 'Player angle DID NOT reset to 0 default');
assert(player.angle !== Math.atan2(mockInput.mouseWorld.y - player.y, mockInput.mouseWorld.x - player.x), 'Player angle DID NOT snap to stale mouseWorld');

console.log('\n--- 4. Testing Secondary Aim Joystick (Turn to Face Direction) ---');
// Stand still, but turn player using Aim Joystick to face Left / West (pi radians)
aimJoystick.startTracking(202, 300, 470, false);
aimJoystick.updatePosition(260, 470); // dx = -40, dy = 0 -> angle = Math.PI rad
const aimAngle = aimJoystick.angle;

assert(aimJoystick.active === true, 'Aim joystick active');
assert(Math.abs(Math.abs(aimAngle) - Math.PI) < 0.05, `Aim angle pointing West (~pi, got ${aimAngle.toFixed(3)})`);

const stillX = player.x;
const stillY = player.y;
player.update(0.05, mockInput, dungeon, [], []);

assert(player.x === stillX && player.y === stillY, 'Player remained standing still while aiming');
assert(Math.abs(player.angle - aimAngle) < 0.05, `Player turned to face Aim Joystick direction (${player.angle.toFixed(3)} rad)`);

console.log('\n--- 5. CRITICAL: Testing Angle Retention on Aim Joystick Release ---');
aimJoystick.reset();
assert(aimJoystick.active === false, 'Aim joystick now inactive');

for (let f = 0; f < 5; f++) {
  player.update(0.05, mockInput, dungeon, [], []);
}

assert(Math.abs(player.angle - aimAngle) < 0.05, `Player preserved Aim Joystick angle upon release (${player.angle.toFixed(3)} rad)`);

console.log('\n--- 6. Testing Twin-Stick Simultaneous Input (Walk One Way, Aim Another) ---');
// Player moves South (dy > 0, angle = pi/2)
moveJoystick.startTracking(101, 90, 470, false);
moveJoystick.updatePosition(90, 510); // South (pi/2)

// Player aims North (dy < 0, angle = -pi/2)
aimJoystick.startTracking(202, 300, 470, false);
aimJoystick.updatePosition(300, 430); // North (-pi/2)

assert(moveJoystick.active && aimJoystick.active, 'Both sticks actively tracking multi-touch');

const walkStartY = player.y;
player.update(0.05, mockInput, dungeon, [], []);

assert(player.y > walkStartY, 'Player moving South from Move Joystick');
assert(Math.abs(player.angle - aimJoystick.angle) < 0.05, `Player facing North from Aim Joystick priority (${player.angle.toFixed(3)} vs ${aimJoystick.angle.toFixed(3)})`);

moveJoystick.reset();
aimJoystick.reset();

console.log('\n--- 7. Testing Auto-Target Assist on Attack (Face Nearest Enemy) ---');
// Place an enemy to the East (+X)
const enemyEast = new Enemy(player.x + 80, player.y, 'GOBLIN', 1);
const enemyWest = new Enemy(player.x - 200, player.y, 'SLIME', 1);
const enemies = [enemyEast, enemyWest];

// Player is currently facing North from previous step
assert(player.angle < 0, 'Player initially facing away from East');

// Tap attack without holding Aim stick
player.triggerPrimaryAttack(enemies, [], [], [], []);

// Angle to enemyEast is atan2(0, 80) = 0 rad
assert(Math.abs(player.angle - 0) < 0.05, `Player auto-turned to face nearest enemy at ${enemyEast.x}, ${enemyEast.y} (angle: ${player.angle.toFixed(3)} rad)`);

console.log('\n--- 8. Testing Manual Aim Override Over Auto-Target Assist ---');
// While holding Aim Joystick West (-pi), trigger attack
aimJoystick.startTracking(202, 300, 450, false);
aimJoystick.updatePosition(260, 450); // West
player.update(0.05, mockInput, dungeon, [], []);

player.triggerPrimaryAttack(enemies, [], [], [], []);
assert(Math.abs(player.angle - aimJoystick.angle) < 0.05, 'Manual Aim Joystick override respected, did not force auto-target');
aimJoystick.reset();

console.log(`\n🎉 ALL ${passed}/${total} JOYSTICK & AIM CONTROLLER TESTS PASSED!`);
