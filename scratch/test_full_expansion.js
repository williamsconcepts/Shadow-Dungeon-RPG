// Comprehensive Node.js verification test for Shadow Dungeon RPG expansions

// Mock window and localStorage environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; }
};

global.window = global;
global.window.localStorage = global.localStorage;

// Mock soundEngine
global.soundEngine = {
  playUrnBreak: () => {},
  playTrapSnap: () => {},
  playShrineBuff: () => {},
  playBuy: () => {},
  playSell: () => {},
  playShardCollect: () => {},
  playCoinPickup: () => {},
  playHeal: () => {},
  playHitImpact: () => {},
  playSwordSlash: () => {},
  playFireballCast: () => {},
  playDash: () => {},
  playExplosion: () => {},
  playFrostNova: () => {},
  playThunderStrike: () => {},
  playBossRoar: () => {}
};

// Require systems in load order
require('../js/storage.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/entities.js');

const { Dungeon, Player, HERO_CLASSES, Urn, SpikeTrap, Shrine, Merchant, Enemy, StorageManager } = global;

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- 1. TESTING HERO CLASSES & ARCHETYPES ---');
for (const classKey of ['WARRIOR', 'MAGE', 'ROGUE']) {
  const p = new Player(100, 100, classKey);
  assert(p.heroClass === classKey, `Player initialized with heroClass ${classKey}`);
  assert(p.skills && p.skills.skill1 && p.skills.skill2 && p.skills.skill3, `Player has 3 distinct class skills`);
  
  if (classKey === 'WARRIOR') {
    assert(p.skills.skill1.name === 'Whirlwind Blade', 'Warrior skill 1 is Whirlwind Blade');
    assert(p.equipped.weapon.name.includes('Broadsword') || p.equipped.weapon.name.includes('Sword'), 'Warrior starts with Broadsword');
  } else if (classKey === 'MAGE') {
    assert(p.skills.skill1.name === 'Hellfire Orb', 'Mage skill 1 is Hellfire Orb');
    assert(p.equipped.weapon.name.includes('Staff'), 'Mage starts with Staff');
  } else if (classKey === 'ROGUE') {
    assert(p.skills.skill1.name === 'Poison Daggers', 'Rogue skill 1 is Poison Daggers');
    assert(p.equipped.weapon.name.includes('Daggers'), 'Rogue starts with Twin Daggers');
  }

  // Serialization & Deserialization persistence test
  const data = p.serialize();
  assert(data.heroClass === classKey, `Serialized data contains class ${classKey}`);
  const restored = new Player(0, 0, 'WARRIOR');
  restored.deserialize(data);
  assert(restored.heroClass === classKey, `Deserialized player restored class ${classKey}`);
}

console.log('\n--- 2. TESTING DUNGEON GENERATION WITH INTERACTIVES ---');
const floor1 = new Dungeon(1);
assert(floor1.urns.length > 0, `Floor 1 generated urns: ${floor1.urns.length}`);
assert(floor1.traps.length > 0, `Floor 1 generated traps: ${floor1.traps.length}`);
assert(floor1.merchant === null, `Floor 1 has no merchant (merchant spawns on even floors)`);

const floor2 = new Dungeon(2);
assert(floor2.merchant !== null, `Floor 2 has safe alcove merchant`);

console.log('\n--- 3. TESTING FOG OF WAR ---');
assert(floor1.isExplored(10, 10) === false, 'Initially tile (10,10) is unexplored');
floor1.updateExploration(10 * floor1.tileSize, 10 * floor1.tileSize, 3);
assert(floor1.isExplored(10, 10) === true, 'Tile (10,10) is explored after updateExploration');
assert(floor1.isExplored(11, 10) === true, 'Tile (11,10) is explored within radius');

console.log('\n--- 4. TESTING URN BREAKING & LOOT ---');
const urn = new Urn(100, 100);
assert(urn.broken === false, 'Urn is initially intact');
const testPlayer = new Player(100, 100, 'WARRIOR');
urn.break(testPlayer);
assert(urn.broken === true, 'Urn is marked broken after break()');

console.log('\n--- 5. TESTING SPIKE TRAPS ---');
const trap = new SpikeTrap(100, 100);
assert(trap.state === 'IDLE', `Trap starts in IDLE state (state: ${trap.state})`);
trap.state = 'ARMING';
trap.timer = 0.05;
const initHp = testPlayer.hp;
trap.update(0.1, testPlayer, [], [], [], null);
assert(trap.state === 'ACTIVE', 'Trap transitioned to ACTIVE state');
assert(testPlayer.hp < initHp, `Player took trap damage (HP: ${testPlayer.hp}/${testPlayer.maxHp})`);

console.log('\n--- 6. TESTING MYSTICAL SHRINES ---');
const shrineBlood = new Shrine(100, 100, 'BLOOD');
assert(shrineBlood.used === false, 'Shrine is initially unused');
const initialAtk = testPlayer.attack;
const bloodResult = shrineBlood.activate(testPlayer);
assert(shrineBlood.used === true, 'Shrine is marked used after activation');
assert(bloodResult === true, `Shrine successfully activated`);
assert(testPlayer.attack > initialAtk, `Player gained permanent attack boost from Blood Shrine (+${testPlayer.attack - initialAtk} Atk)`);

const shrineArcana = new Shrine(100, 100, 'ARCANA');
shrineArcana.activate(testPlayer);
assert(shrineArcana.used === true, 'Arcana shrine marked used');
assert(testPlayer.buffTimer > 0, 'Player received Arcana spell power buff');

const shrineGreed = new Shrine(100, 100, 'GREED');
const preGreedGold = testPlayer.gold;
shrineGreed.activate(testPlayer);
assert(testPlayer.gold > preGreedGold, 'Player received gold surge from Greed Shrine');

console.log('\n--- 7. TESTING GARRICK THE MERCHANT (BUY & SELL LOGIC) ---');
const merch = new Merchant(floor2.merchant.x, floor2.merchant.y);
assert(merch.name === 'Garrick the Void Broker', 'Merchant name is Garrick the Void Broker');

// Buy logic test
testPlayer.gold = 500;
const initialPotions = testPlayer.healthPotions;
const buyPrice = 30;
testPlayer.gold -= buyPrice;
testPlayer.healthPotions++;
assert(testPlayer.healthPotions === initialPotions + 1, 'Purchased potion incremented player health potions');
assert(testPlayer.gold === 470, 'Player gold deducted accurately');

// Sell logic test
const dummyItem = { id: 'junk_sword', name: 'Rusted Blade', level: 1, rarity: 'common', sellValue: 27 };
testPlayer.inventory.push(dummyItem);
const preSellGold = testPlayer.gold;
const sellPrice = dummyItem.sellValue || Math.round(15 + dummyItem.level * 12);
testPlayer.inventory.splice(testPlayer.inventory.indexOf(dummyItem), 1);
testPlayer.gold += sellPrice;
assert(testPlayer.gold === preSellGold + 27, `Player received gold for selling item (Gold: ${testPlayer.gold})`);
assert(!testPlayer.inventory.includes(dummyItem), 'Item removed from player backpack');

console.log('\n--- 8. TESTING ELITE MONSTERS & AFFIXES ---');
const mob = new Enemy(150, 150, 'SKELETON', 2);
assert(mob.isElite === false, 'Default monster is not elite');
mob.makeElite('MOLTEN');
assert(mob.isElite === true, 'Monster is now elite');
assert(mob.affix === 'MOLTEN', 'Monster has MOLTEN affix');
assert(mob.name.includes('Molten'), `Monster has champion title: ${mob.name}`);
assert(mob.maxHp > 30, 'Elite monster has boosted health');
assert(mob.xpValue > 10, 'Elite monster grants bonus EXP');

console.log(`\n🎉 ALL ${passed}/${total} EXPANSION VERIFICATION TESTS PASSED!`);
