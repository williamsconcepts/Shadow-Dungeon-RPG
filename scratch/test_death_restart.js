// Test realistic player death and checkpoint restart system
const assert = require('assert');

// Mock browser globals
global.window = global;
global.document = {
  getElementById: (id) => {
    return {
      id,
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      innerHTML: '',
      textContent: '',
      addEventListener: () => {}
    };
  }
};

let soundDeathPlayed = false;
let soundHealPlayed = false;
let soundHitPlayed = false;
global.soundEngine = {
  playPlayerDeath: () => { soundDeathPlayed = true; },
  playHeal: () => { soundHealPlayed = true; },
  playHitImpact: () => { soundHitPlayed = true; },
  toggleMute: () => false,
  init: () => {},
  resume: () => {}
};

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Load classes
const fs = require('fs');
const path = require('path');

const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
eval(storageCode);
global.StorageManager = StorageManager;

const entitiesCode = fs.readFileSync(path.join(__dirname, '../js/entities.js'), 'utf8');
eval(entitiesCode);

console.log('✓ Loaded storage.js and entities.js successfully');

// TEST 1: Fatal damage causes immediate death and prevents HP rebuilding
{
  const player = new Player(100, 100, 'WARRIOR');
  assert.strictEqual(player.isDead, false, 'Player should start alive');
  assert.strictEqual(player.hp, player.maxHp, 'Player should start with max HP');

  const floatingTexts = [];
  const dummyCamera = { shake: () => {} };

  // Deal fatal damage
  const lethalDamage = player.maxHp * 2;
  player.takeDamage(lethalDamage, floatingTexts, dummyCamera);

  assert.strictEqual(player.hp, 0, 'HP should be clamped to 0 upon fatal damage');
  assert.strictEqual(player.isDead, true, 'isDead flag should be true');
  assert.strictEqual(player.invulnerableTimer, 0, 'Invulnerability timer should be 0 on death');

  // Attempt to update player over 10 seconds (dt = 0.1 x 100 frames)
  const dummyInput = { keys: {}, joystick: { active: false }, gamepad: null };
  const dummyDungeon = { checkCollision: () => false };
  const dummyParticles = [];

  for (let i = 0; i < 100; i++) {
    player.update(0.1, dummyInput, dummyDungeon, dummyParticles, floatingTexts);
  }

  assert.strictEqual(player.hp, 0, 'CRITICAL: HP must remain 0 and NEVER passively regenerate when dead');
  assert.strictEqual(player.isDead, true, 'isDead must remain true');
  assert.strictEqual(player.isMoving, false, 'Movement must remain halted when dead');

  console.log('✓ TEST 1 PASSED: Player dies on lethal damage and HP never rebuilds');
}

// TEST 2: StorageManager checkpoint run save and verification
{
  global.localStorage.clear();

  const mockGame = {
    floorNumber: 7,
    monstersDefeated: 42,
    difficulty: 'HARD',
    hardcore: false,
    player: new Player(200, 200, 'WARRIOR')
  };
  mockGame.player.level = 8;
  mockGame.player.gold = 550;
  mockGame.player.hp = 0; // player died
  mockGame.player.isDead = true;
  mockGame.player.healthPotions = 0; // depleted

  StorageManager.saveCheckpointRun(mockGame);

  assert.strictEqual(StorageManager.hasActiveRun(), true, 'hasActiveRun should return true for checkpoint run');
  const savedRun = StorageManager.getActiveRun();
  assert.strictEqual(savedRun.floorNumber, 7, 'Floor number should be preserved at Depth 7');
  assert.strictEqual(savedRun.isCheckpoint, true, 'Checkpoint flag should be true');
  assert.strictEqual(savedRun.playerData.hp, mockGame.player.maxHp, 'Saved checkpoint should have full HP restored');
  assert.strictEqual(savedRun.playerData.isDead, false, 'Saved checkpoint should have isDead = false');
  assert.strictEqual(savedRun.playerData.healthPotions >= 2, true, 'Emergency health potions should be at least 2');

  console.log('✓ TEST 2 PASSED: StorageManager checkpoint persists depth and restores vital stats');
}

// TEST 3: Game handlePlayerDeath & restartGame(true) simulation
{
  soundDeathPlayed = false;
  soundHealPlayed = false;

  let gameOverShown = false;
  let gameOverFloor = 0;
  let toastShown = '';

  const mockUI = {
    gameOverScreen: { classList: { add: () => {}, remove: () => {} } },
    victoryScreen: { classList: { add: () => {}, remove: () => {} } },
    updateHUD: () => {},
    showToast: (msg) => { toastShown = msg; },
    showGameOver: (stats) => {
      gameOverShown = true;
      gameOverFloor = stats.floor;
    }
  };

  const game = {
    state: 'PLAYING',
    floorNumber: 5,
    monstersDefeated: 28,
    difficulty: 'NORMAL',
    hardcore: false,
    camera: { x: 0, y: 0, shake: () => {} },
    gamepad: { vibrate: () => {} },
    particles: [],
    canvas: { width: 800, height: 600 },
    player: new Player(150, 150, 'MAGE'),
    ui: mockUI,
    loadFloor: function(num, isFirst) {
      this.floorNumber = num;
      this.dungeon = { playerStart: { x: 300, y: 400 } };
      this.player.x = this.dungeon.playerStart.x;
      this.player.y = this.dungeon.playerStart.y;
    }
  };

  const gameJsCode = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
  
  const restartMatch = gameJsCode.match(/restartGame\([^)]*\)\s*\{[\s\S]*?\n  \}/)[0];
  const deathMatch = gameJsCode.match(/handlePlayerDeath\(\)\s*\{[\s\S]*?\n  \}/)[0];

  eval(`
    game.restartGame = function ${restartMatch};
    game.handlePlayerDeath = function ${deathMatch};
  `);

  window.gameInstance = game;

  // Kill player
  game.player.hp = 0;
  game.player.isDead = true;
  game.handlePlayerDeath();

  assert.strictEqual(game.state, 'GAME_OVER', 'Game state must transition to GAME_OVER');
  assert.strictEqual(soundDeathPlayed, true, 'playPlayerDeath sound must be triggered');
  assert.strictEqual(gameOverShown, true, 'Game Over screen must be displayed');
  assert.strictEqual(gameOverFloor, 5, 'Stats must reflect Depth 5');
  assert.strictEqual(game.particles.length >= 35, true, 'Death particle burst should create at least 35 particles');

  // Restart from where stopped
  game.restartGame(true);

  assert.strictEqual(game.state, 'PLAYING', 'Game state should return to PLAYING');
  assert.strictEqual(game.floorNumber, 5, 'Player should restart at the exact Depth 5 checkpoint');
  assert.strictEqual(game.player.isDead, false, 'Player should be alive');
  assert.strictEqual(game.player.hp, game.player.maxHp, 'Player HP should be 100% full');
  assert.strictEqual(game.player.mana, game.player.maxMana, 'Player Mana should be 100% full');
  assert.strictEqual(game.player.invulnerableTimer, 2.0, 'Player should have 2.0s spawn shield');
  assert.strictEqual(game.player.healthPotions >= 2, true, 'Player should have emergency potions');
  assert.strictEqual(soundHealPlayed, true, 'Revive sound played');
  assert.strictEqual(toastShown.includes('Respawned at Depth 5'), true, 'Toast message announced respawn');

  console.log('✓ TEST 3 PASSED: Game Over death sequence and Depth checkpoint restart work seamlessly');
}

console.log('\n🌟 ALL PLAYER DEATH & CHECKPOINT RESTART TESTS PASSED SUCCESSFULLY! 🌟');
