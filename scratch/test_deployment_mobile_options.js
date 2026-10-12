// Test suite for deployment undefined error prevention and mobile layout options
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING DEPLOYMENT & MOBILE OPTIONS TEST SUITE ===');

// --- 1. TEST DIFFICULTIES INITIALIZATION ORDER ---
console.log('\n--- 1. Testing Early DIFFICULTIES Initialization in storage.js ---');
// Clear environment
delete global.window;
delete global.DIFFICULTIES;
delete global.GLOBAL_DIFFICULTIES;

global.window = {};
require('../js/storage.js');

assert(global.window.DIFFICULTIES, 'window.DIFFICULTIES must be initialized early by storage.js');
assert(global.window.DIFFICULTIES.NORMAL, 'window.DIFFICULTIES.NORMAL must exist');
assert(global.window.DIFFICULTIES.NIGHTMARE, 'window.DIFFICULTIES.NIGHTMARE must exist');
assert(global.window.DIFFICULTIES.INFERNO, 'window.DIFFICULTIES.INFERNO must exist');
console.log('✅ PASSED: window.DIFFICULTIES is available immediately upon storage.js execution');

// --- 2. TEST DOM READYSTATE INITIALIZATION (DEPLOYMENT SIMULATION) ---
console.log('\n--- 2. Testing Deployment DOM ReadyState Handling ---');
// Simulate a deployed environment where scripts run when readyState is already 'complete' or 'interactive'
const mockCanvas = {
  getContext: () => ({
    save: () => {},
    restore: () => {},
    scale: () => {},
    clearRect: () => {},
    drawImage: () => {}
  }),
  style: {},
  width: 800,
  height: 600,
  addEventListener: () => {}
};

global.document = {
  readyState: 'complete', // DOM is already parsed on deployment/CDN
  getElementById: (id) => {
    if (id === 'game-canvas') return mockCanvas;
    return {
      id,
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      style: {},
      addEventListener: () => {},
      dataset: {}
    };
  },
  createElement: () => mockCanvas,
  querySelector: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.window.innerWidth = 800;
global.window.innerHeight = 600;
global.window.addEventListener = () => {};
global.requestAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

// Require full game scripts
require('../js/audio.js');
require('../js/gamepad.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/entities.js');
require('../js/ui.js');
require('../js/game.js');

assert(global.window.gameInstance, 'window.gameInstance must be instantiated when readyState is complete (deployment)');
assert(global.window.gameInstance instanceof global.window.Game, 'window.gameInstance must be instance of Game');
assert(global.window.gameInstance.state === 'START', 'Initial game state must be START');
console.log('✅ PASSED: Game initializes instantly on deployment without waiting for a missed DOMContentLoaded');

// --- 3. TEST UPDATE TITLE SCREEN WITH CORRUPTED / MISSING PLAYERDATA ---
console.log('\n--- 3. Testing updateTitleScreen Null-Safety ---');
const ui = global.window.gameInstance.ui;
const mockRunCard = { innerHTML: '', classList: { add: () => {}, remove: () => {} } };
const mockResumeBtn = { innerHTML: '', classList: { add: () => {}, remove: () => {} } };
const mockStartBtn = { innerHTML: '', classList: { add: () => {}, remove: () => {} } };
ui.activeRunPreview = mockRunCard;
ui.activeRunStats = mockRunCard;
ui.btnResumeGame = mockResumeBtn;
ui.btnStartGame = mockStartBtn;

// Test with empty playerData
global.window.StorageManager.hasActiveRun = () => true;
global.window.StorageManager.getActiveRun = () => ({
  floorNumber: 4,
  // playerData is empty object with undefined hp, level, gold, etc.
  playerData: {}
});

// Calling updateTitleScreen must NOT throw and must NOT output NaN or undefined
assert.doesNotThrow(() => {
  ui.updateTitleScreen();
}, 'updateTitleScreen must safely handle empty playerData without throwing');

assert(!mockRunCard.innerHTML.includes('undefined'), 'activeRunStats must not render "undefined"');
assert(!mockRunCard.innerHTML.includes('NaN'), 'activeRunStats must not render "NaN"');
assert(!mockResumeBtn.innerHTML.includes('undefined'), 'Resume button text must not render "undefined"');
console.log('✅ PASSED: updateTitleScreen gracefully renders fallback values without "undefined" or crashes');

// --- 4. TEST SHOWGAMEOVER WITH MISSING / UNDEFINED STATS FIELDS ---
console.log('\n--- 4. Testing showGameOver Null-Safety ---');
const mockStatsSummary = { innerHTML: '' };
ui.statsSummary = mockStatsSummary;
ui.gameOverScreen = { classList: { remove: () => {}, add: () => {} } };

assert.doesNotThrow(() => {
  ui.showGameOver({}); // completely empty stats object
}, 'showGameOver must safely handle empty stats object');

assert(!mockStatsSummary.innerHTML.includes('undefined'), 'Game over summary must not contain "undefined"');
assert(!mockStatsSummary.innerHTML.includes('NaN'), 'Game over summary must not contain "NaN"');
console.log('✅ PASSED: showGameOver safely renders defaults for empty stats without "undefined"');

// --- 5. TEST HTML STRUCTURE & CSS RULES FOR MOBILE SCREEN OPTIONS ---
console.log('\n--- 5. Testing HTML & CSS Mobile Layout Rules ---');
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

// A. HTML checks
assert(htmlContent.includes('class="hud-options-toolbar"'), 'index.html must have separate hud-options-toolbar');
assert(htmlContent.includes('class="info-badges"'), 'index.html must have info-badges');
assert(htmlContent.includes('btn-pause-toggle'), 'Pause toggle button must exist');
assert(htmlContent.includes('btn-save-exit'), 'Save & Exit button must exist');

// B. CSS mobile layout checks
// Class cards grid must NOT be 1fr on 650px or 768px (which stacked cards into 400px column)
assert(!cssContent.match(/@media\s*\(max-width:\s*650px\)\s*\{[^}]*\.class-cards-grid\s*\{[^}]*grid-template-columns:\s*1fr;/),
  '.class-cards-grid must NOT be forced to 1fr on 650px (must use 3-column compact row)');
assert(!cssContent.match(/@media\s*\(max-width:\s*650px\)\s*\{[^}]*\.difficulty-pills-grid\s*\{[^}]*grid-template-columns:\s*1fr;/),
  '.difficulty-pills-grid must NOT be forced to 1fr on 650px (must use 3-column compact row)');

// Verify repeat(3, 1fr) is used for mobile options
assert(cssContent.includes('.class-cards-grid {\n    grid-template-columns: repeat(3, 1fr);'),
  'class-cards-grid must be 3-column on mobile');
assert(cssContent.includes('.difficulty-pills-grid {\n    grid-template-columns: repeat(3, 1fr);'),
  'difficulty-pills-grid must be 3-column on mobile');

// Verify controls-guide is hidden on mobile screens
assert(cssContent.includes('.controls-guide {\n    display: none;'),
  'controls-guide must be hidden on mobile to avoid pushing options off screen');

// Verify radar canvas is sized down on mobile
assert(cssContent.includes('.radar-canvas-wrap {\n    width: 76px;\n    height: 76px;\n  }'),
  'radar-canvas-wrap must be sized down to 76px on 768px screens');
assert(cssContent.includes('.radar-canvas-wrap {\n    width: 66px;\n    height: 66px;\n  }'),
  'radar-canvas-wrap must be sized down to 66px on 480px screens');

// Verify hud-top-right has max-width constraint to prevent covering the screen
assert(cssContent.includes('max-width: 48vw;'), 'hud-top-right must be bounded on mobile');

// Verify ultra-compact touch controls on 480px
assert(cssContent.includes('width: 82px;\n    height: 82px;'), 'joysticks must be 82px on small phones');
assert(cssContent.includes('width: 38px;\n    height: 38px;'), 'skill buttons must be 38px on small phones');

console.log('✅ PASSED: All mobile layout CSS constraints and option sizing verified');

console.log('\n🎉 ALL DEPLOYMENT & MOBILE OPTIONS TESTS PASSED PERFECTLY (100%)! 🎉\n');
