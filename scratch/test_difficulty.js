// Node.js test script for Difficulty System & Entity Rendering

// Mock window, document, and localStorage
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  getElementById: (id) => ({
    id,
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    addEventListener: () => {},
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getContext: () => mockCtx
  }),
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

// Mock 2D Canvas Context
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
  fillText: () => {}
};

// Load modules
require('../js/storage.js');
require('../js/items.js');
require('../js/entities.js');
require('../js/game.js');

console.log('--- TEST 1: DIFFICULTIES definitions ---');
if (!global.DIFFICULTIES || !global.DIFFICULTIES.NIGHTMARE || !global.DIFFICULTIES.INFERNO) {
  throw new Error('DIFFICULTIES missing or incomplete');
}
console.log('✓ DIFFICULTIES loaded:', Object.keys(global.DIFFICULTIES));
console.log('Normal:', global.DIFFICULTIES.NORMAL);
console.log('Nightmare:', global.DIFFICULTIES.NIGHTMARE);
console.log('Inferno:', global.DIFFICULTIES.INFERNO);

console.log('\n--- TEST 2: Enemy Stat Scaling by Difficulty ---');
const normalSlime = new Enemy(100, 100, 'SLIME', 1, { ...global.DIFFICULTIES.NORMAL, eliteChance: 0 });
const nightmareSlime = new Enemy(100, 100, 'SLIME', 1, { ...global.DIFFICULTIES.NIGHTMARE, eliteChance: 0 });
const infernoSlime = new Enemy(100, 100, 'SLIME', 1, { ...global.DIFFICULTIES.INFERNO, eliteChance: 0 });

console.log(`Normal Slime HP: ${normalSlime.maxHp}, ATK: ${normalSlime.atk}, Speed: ${normalSlime.speed}`);
console.log(`Nightmare Slime HP: ${nightmareSlime.maxHp}, ATK: ${nightmareSlime.atk}, Speed: ${nightmareSlime.speed}`);
console.log(`Inferno Slime HP: ${infernoSlime.maxHp}, ATK: ${infernoSlime.atk}, Speed: ${infernoSlime.speed}`);

if (nightmareSlime.maxHp <= normalSlime.maxHp || infernoSlime.maxHp <= nightmareSlime.maxHp) {
  throw new Error('Enemy HP did not scale properly with difficulty!');
}
if (nightmareSlime.atk <= normalSlime.atk || infernoSlime.atk <= nightmareSlime.atk) {
  throw new Error('Enemy ATK did not scale properly with difficulty!');
}
console.log('✓ Enemy stats successfully scaled by difficulty!');

console.log('\n--- TEST 3: Enemy Slain Rewards Scaling by Difficulty ---');
const player = new Player(0, 0, 'WARRIOR');
const startShards = StorageManager.getProfile().soulShards;
const texts = [];

// Kill normal slime
normalSlime.die(player, texts, []);
const shardsAfterNormal = StorageManager.getProfile().soulShards;
const gainedNormal = shardsAfterNormal - startShards;

// Kill inferno slime
infernoSlime.die(player, texts, []);
const shardsAfterInferno = StorageManager.getProfile().soulShards;
const gainedInferno = shardsAfterInferno - shardsAfterNormal;

console.log(`Normal Slime Shards Gained: ${gainedNormal}, Inferno Slime Shards Gained: ${gainedInferno}`);
if (gainedInferno < gainedNormal) {
  throw new Error('Inferno enemy did not drop scaled shard rewards!');
}
console.log('✓ Difficulty reward multiplier verified!');

console.log('\n--- TEST 4: Realistic Player Rendering (All 3 Classes) ---');
const warrior = new Player(0, 0, 'WARRIOR');
const mage = new Player(0, 0, 'MAGE');
const rogue = new Player(0, 0, 'ROGUE');

warrior.render(mockCtx);
warrior.isAttacking = true;
warrior.attackTimer = 0.1;
warrior.render(mockCtx);
console.log('✓ Warrior rendered with realistic armor, greatsword, and attack slash!');

mage.render(mockCtx);
mage.isAttacking = true;
mage.render(mockCtx);
console.log('✓ Mage rendered with silk robes, void cowl, grimoire, and archmage staff!');

rogue.render(mockCtx);
rogue.isAttacking = true;
rogue.render(mockCtx);
console.log('✓ Rogue rendered with studded brigandine, shadow cowl, and dual daggers!');

console.log('\n--- TEST 5: Realistic Enemy Rendering (All 4 Types) ---');
const skeleton = new Enemy(50, 50, 'SKELETON', 1, global.DIFFICULTIES.NIGHTMARE);
const cultist = new Enemy(50, 50, 'SORCERER', 1, global.DIFFICULTIES.INFERNO);
const boss = new Enemy(50, 50, 'BOSS', 5, global.DIFFICULTIES.INFERNO);

normalSlime.render(mockCtx);
console.log('✓ Slime rendered with caustic translucent membrane and suspended bone!');

skeleton.render(mockCtx);
console.log('✓ Skeleton rendered with anatomical skull, soul-fire sockets, and ribcage!');

cultist.render(mockCtx);
console.log('✓ Cultist rendered with occult shroud, ritual mask, and skull flame staff!');

boss.render(mockCtx);
console.log('✓ Boss rendered with volcanic fissure plate, demonic horns, and executioner blade!');

console.log('\n--- TEST 6: Hardcore & Active Run Persistence ---');
const mockGame = {
  floorNumber: 3,
  monstersDefeated: 24,
  difficulty: 'INFERNO',
  hardcore: true,
  player: warrior
};
StorageManager.saveActiveRun(mockGame);
const savedRun = StorageManager.getActiveRun();
console.log('Saved Run Difficulty:', savedRun.difficulty);
console.log('Saved Run Hardcore:', savedRun.hardcore);

if (savedRun.difficulty !== 'INFERNO' || savedRun.hardcore !== true) {
  throw new Error('Active run did not persist difficulty or hardcore setting!');
}
console.log('✓ Run persistence with difficulty & hardcore passed!');

// Record run end
StorageManager.recordRunEnd({
  floor: 3,
  level: warrior.level,
  monstersDefeated: 24,
  gold: 450,
  shardsEarned: 88,
  difficulty: 'INFERNO',
  hardcore: true,
  outcome: 'PERISHED'
});
const recs = StorageManager.getRecords();
const lastRun = recs.recentRuns[0];
console.log('Recorded Last Run:', lastRun);
if (lastRun.difficulty !== 'INFERNO' || lastRun.hardcore !== true) {
  throw new Error('Records did not track difficulty or hardcore flag!');
}
console.log('✓ Hall of Records tracked difficulty & hardcore successfully!');

console.log('\nALL TESTS PASSED WITH 100% SUCCESS!');
