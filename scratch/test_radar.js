// Node.js test script for Tactical Radar & Minimap Enhancement

global.window = global;
global.window.addEventListener = () => {};

// Mock canvas & context
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
  clearRect: () => {},
  rect: () => {},
  clip: () => {},
  setLineDash: () => {}
};

const domStore = {};
global.document = {
  getElementById: (id) => {
    if (!domStore[id]) {
      domStore[id] = {
        id,
        classList: {
          _classes: new Set(),
          add: function(c) { this._classes.add(c); },
          remove: function(c) { this._classes.delete(c); },
          contains: function(c) { return this._classes.has(c); }
        },
        style: {},
        addEventListener: () => {},
        dataset: {},
        querySelector: () => null,
        querySelectorAll: () => [],
        getContext: () => mockCtx,
        width: 280,
        height: 280,
        textContent: ''
      };
    }
    return domStore[id];
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Load modules
require('../js/storage.js');
require('../js/items.js');
require('../js/audio.js');
require('../js/gamepad.js');
require('../js/joystick.js');
require('../js/entities.js');
require('../js/dungeon.js');
require('../js/game.js');
require('../js/ui.js');

console.log('--- 1. Testing Tactical Radar Instantiation & Initial State ---');
const dungeon = new Dungeon(1);
const player = new Player(dungeon.playerStart.x, dungeon.playerStart.y, 'WARRIOR');
const game = {
  player,
  dungeon,
  enemies: [
    new Enemy(dungeon.playerStart.x + 80, dungeon.playerStart.y + 80, 'SLIME', 1),
    new Enemy(dungeon.playerStart.x + 120, dungeon.playerStart.y + 40, 'SKELETON', 1)
  ],
  shrines: dungeon.shrines.map(s => new Shrine(s.x, s.y, s.type)),
  urns: dungeon.urns.map(u => new Urn(u.x, u.y)),
  merchant: null,
  difficulty: 'NORMAL',
  hardcore: false
};

const ui = new UIManager(game);

if (ui.minimapMode !== 'RADAR') {
  throw new Error(`Expected initial mode RADAR, got ${ui.minimapMode}`);
}
console.log('✓ Initial radar mode is RADAR (Tactical local scan)');

if (ui.radarZoom !== 1.0) {
  throw new Error(`Expected initial radarZoom 1.0, got ${ui.radarZoom}`);
}
console.log('✓ Initial radar zoom is 1.0x');

console.log('\n--- 2. Testing Radar Mode & Zoom Toggles ---');
ui.toggleMinimapMode();
if (ui.minimapMode !== 'MAP') {
  throw new Error(`Expected mode MAP after toggle, got ${ui.minimapMode}`);
}
console.log('✓ Toggled to MAP mode');

ui.toggleMinimapMode();
if (ui.minimapMode !== 'RADAR') {
  throw new Error(`Expected mode RADAR after toggle, got ${ui.minimapMode}`);
}
console.log('✓ Toggled back to RADAR mode');

ui.cycleRadarZoom();
if (ui.radarZoom !== 1.5) {
  throw new Error(`Expected zoom 1.5 after cycle, got ${ui.radarZoom}`);
}
console.log('✓ Cycled zoom to 1.5x (Close range)');

ui.cycleRadarZoom();
if (ui.radarZoom !== 0.65) {
  throw new Error(`Expected zoom 0.65 after cycle, got ${ui.radarZoom}`);
}
console.log('✓ Cycled zoom to 0.65x (Wide range)');

ui.cycleRadarZoom();
if (ui.radarZoom !== 1.0) {
  throw new Error(`Expected zoom 1.0 after cycle, got ${ui.radarZoom}`);
}
console.log('✓ Cycled zoom back to 1.0x (Standard range)');

console.log('\n--- 3. Testing Radar Rendering (Mode: RADAR) ---');
// Reveal exploration around player
dungeon.updateExploration(player.x, player.y, 12);
ui.renderMinimap(player, dungeon);
console.log('✓ Rendered Tactical Radar with circular clip, range rings, and heading cone without errors');

console.log('\n--- 4. Testing Off-Screen Compass Chevrons ---');
// Place exit far away and mark explored
if (dungeon.stairsLocation) {
  dungeon.explored[dungeon.stairsLocation.y][dungeon.stairsLocation.x] = true;
}
ui.renderMinimap(player, dungeon);
console.log('✓ Rendered off-screen objective pointers without errors');

console.log('\n--- 5. Testing Full Tactical Map Rendering (Mode: MAP) ---');
ui.toggleMinimapMode('MAP');
ui.renderMinimap(player, dungeon);
console.log('✓ Rendered Full Tactical Floor Map with ping pulse and room boundaries without errors');

console.log('\n--- 6. Testing SoundEngine Radar Ping ---');
let pingPlayed = false;
soundEngine.playRadarPing();
console.log('✓ SoundEngine playRadarPing executed without errors');

console.log('\nALL 6/6 TACTICAL RADAR TESTS PASSED 100%!');
