// Items, Equipment, and Loot Progression System

const RARITIES = {
  COMMON: { name: 'Common', color: '#94a3b8', border: '#475569', statMult: 1.0 },
  RARE: { name: 'Rare', color: '#38bdf8', border: '#0284c7', statMult: 1.4 },
  EPIC: { name: 'Epic', color: '#c084fc', border: '#9333ea', statMult: 1.9 },
  LEGENDARY: { name: 'Legendary', color: '#fbbf24', border: '#d97706', statMult: 2.6 }
};

const ITEM_POOLS = {
  weapon: [
    { name: 'Iron Broadsword', icon: '⚔️', baseAtk: 6, baseCrit: 3 },
    { name: 'Twin Shadow Daggers', icon: '🗡️', baseAtk: 7, baseCrit: 9, baseSpeed: 10 },
    { name: 'Runic Longsword', icon: '🗡️', baseAtk: 10, baseCrit: 5 },
    { name: 'Archmage Staff', icon: '🪄', baseAtk: 8, baseMagic: 18, baseMana: 25 },
    { name: 'Abyssal Cleaver', icon: '🪓', baseAtk: 16, baseCrit: 8 },
    { name: 'Colossus Greatsword', icon: '⚔️', baseAtk: 20, baseDef: 6 },
    { name: 'Sunfire Blade', icon: '✨', baseAtk: 22, baseCrit: 12 },
    { name: 'Shadowfang Scythe', icon: '💀', baseAtk: 30, baseCrit: 15 }
  ],
  armor: [
    { name: 'Leather Jerkin', icon: '🥋', baseDef: 3, baseHp: 15 },
    { name: 'Chainmail Hauberk', icon: '🛡️', baseDef: 7, baseHp: 30 },
    { name: 'Obsidian Plate', icon: '🎽', baseDef: 12, baseHp: 55 },
    { name: 'Dragonbone Cuirass', icon: '🐉', baseDef: 18, baseHp: 90 },
    { name: 'Celestial Aegis', icon: '👑', baseDef: 25, baseHp: 140 }
  ],
  ring: [
    { name: 'Brass Band', icon: '💍', baseCrit: 4, baseAtk: 2 },
    { name: 'Ring of Haste', icon: '⚡', baseSpeed: 15, baseCrit: 5 },
    { name: 'Bloodstone Signet', icon: '🩸', baseAtk: 8, baseHp: 20 },
    { name: 'Ring of the Archmage', icon: '🔮', baseMagic: 20, baseMana: 30 },
    { name: 'Abyss Lord Ring', icon: '👁️', baseCrit: 10, baseAtk: 14, baseDef: 6 }
  ],
  amulet: [
    { name: 'Copper Locket', icon: '📿', baseHp: 20, baseMana: 15 },
    { name: 'Heart of Vitality', icon: '❤️', baseHp: 50, baseDef: 5 },
    { name: 'Pendant of Arcana', icon: '💠', baseMagic: 25, baseMana: 45 },
    { name: 'Tears of the Phoenix', icon: '🔥', baseAtk: 12, baseMagic: 30 },
    { name: 'Eternal Soul Talisman', icon: '🌟', baseHp: 80, baseMana: 60, baseCrit: 8 }
  ]
};

class ItemSystem {
  static createItem(slot, floor = 1, forceRarity = null) {
    const pool = ITEM_POOLS[slot];
    // Pick base template based on floor depth
    const maxIdx = Math.min(pool.length - 1, Math.floor(floor * 0.9) + Math.floor(Math.random() * 2));
    const base = pool[Math.min(maxIdx, pool.length - 1)];

    // Determine rarity
    let rarityKey = forceRarity;
    if (!rarityKey) {
      const roll = Math.random() + (floor * 0.05);
      if (roll > 1.25) rarityKey = 'LEGENDARY';
      else if (roll > 0.95) rarityKey = 'EPIC';
      else if (roll > 0.55) rarityKey = 'RARE';
      else rarityKey = 'COMMON';
    }

    const rarity = RARITIES[rarityKey];
    const mult = rarity.statMult * (1 + (floor - 1) * 0.25);

    const item = {
      id: 'item_' + Math.random().toString(36).substr(2, 9),
      name: `${rarityKey === 'COMMON' ? '' : rarityKey + ' '}${base.name}`,
      slot: slot,
      icon: base.icon,
      rarity: rarityKey,
      color: rarity.color,
      stats: {},
      floor: floor,
      value: Math.floor(20 * mult),
      sellValue: Math.max(10, Math.floor(20 * mult * 0.55))
    };

    if (base.baseAtk) item.stats.atk = Math.round(base.baseAtk * mult);
    if (base.baseDef) item.stats.def = Math.round(base.baseDef * mult);
    if (base.baseHp) item.stats.maxHp = Math.round(base.baseHp * mult);
    if (base.baseMana) item.stats.maxMana = Math.round(base.baseMana * mult);
    if (base.baseCrit) item.stats.crit = Math.min(30, Math.round(base.baseCrit * mult));
    if (base.baseSpeed) item.stats.speed = Math.round(base.baseSpeed * (1 + (mult - 1) * 0.3));
    if (base.baseMagic) item.stats.magic = Math.round(base.baseMagic * mult);

    if (window.StorageManager) {
      window.StorageManager.recordItemFound(item);
    }

    return item;
  }

  static createSpecificItem(slot, templateName, rarityKey = 'COMMON') {
    const pool = ITEM_POOLS[slot] || ITEM_POOLS.weapon;
    const base = pool.find(i => i.name.toLowerCase().includes(templateName.toLowerCase())) || pool[0];
    const rarity = RARITIES[rarityKey] || RARITIES.COMMON;
    const mult = rarity.statMult;

    const item = {
      id: 'item_' + Math.random().toString(36).substr(2, 9),
      name: `${rarityKey === 'COMMON' ? '' : rarityKey + ' '}${base.name}`,
      slot: slot,
      icon: base.icon,
      rarity: rarityKey,
      color: rarity.color,
      stats: {},
      floor: 1,
      value: Math.floor(20 * mult),
      sellValue: Math.max(10, Math.floor(20 * mult * 0.55))
    };

    if (base.baseAtk) item.stats.atk = Math.round(base.baseAtk * mult);
    if (base.baseDef) item.stats.def = Math.round(base.baseDef * mult);
    if (base.baseHp) item.stats.maxHp = Math.round(base.baseHp * mult);
    if (base.baseMana) item.stats.maxMana = Math.round(base.baseMana * mult);
    if (base.baseCrit) item.stats.crit = Math.min(30, Math.round(base.baseCrit * mult));
    if (base.baseSpeed) item.stats.speed = Math.round(base.baseSpeed * (1 + (mult - 1) * 0.3));
    if (base.baseMagic) item.stats.magic = Math.round(base.baseMagic * mult);

    if (window.StorageManager) {
      window.StorageManager.recordItemFound(item);
    }
    return item;
  }

  static generateLootDrop(floor = 1, isBoss = false) {
    const goldMult = window.StorageManager ? window.StorageManager.getSanctumStatBonuses().goldMult : 1.0;

    if (isBoss) {
      // Guaranteed rare/epic/legendary equipment + big gold + soul shards
      const slots = ['weapon', 'armor', 'ring', 'amulet'];
      const slot = slots[Math.floor(Math.random() * slots.length)];
      return {
        type: 'equipment',
        item: this.createItem(slot, floor, Math.random() > 0.4 ? 'LEGENDARY' : 'EPIC'),
        gold: Math.floor((150 + Math.random() * 150 * floor) * goldMult),
        shards: Math.floor(45 + Math.random() * 25 * floor)
      };
    }

    const roll = Math.random();
    if (roll < 0.4) {
      // Gold drop
      return { type: 'gold', amount: Math.floor((10 + Math.random() * 25 * floor) * goldMult) };
    } else if (roll < 0.65) {
      // Potion drop
      return { type: 'potion', potionType: Math.random() > 0.5 ? 'health' : 'mana' };
    } else {
      // Equipment drop
      const slots = ['weapon', 'armor', 'ring', 'amulet'];
      const slot = slots[Math.floor(Math.random() * slots.length)];
      return { type: 'equipment', item: this.createItem(slot, floor) };
    }
  }
}

window.ItemSystem = ItemSystem;
window.RARITIES = RARITIES;
