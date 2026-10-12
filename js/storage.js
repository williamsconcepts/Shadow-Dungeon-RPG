// ==========================================================================
// SHADOW DUNGEON RPG — LOCALSTORAGE PROGRESSION & PERSISTENCE MANAGER
// Features: Active Run Persistence, Soul Sanctum Meta-Progression,
//           Hall of Records, Bestiary Codex & System Settings.
// ==========================================================================

// Global Difficulty Definitions (guaranteed loaded early for all UI and entities)
const GLOBAL_DIFFICULTIES = {
  NORMAL: {
    id: 'NORMAL',
    name: 'Adventurer',
    hpMult: 1.0,
    dmgMult: 1.0,
    speedMult: 1.0,
    eliteChance: 0.20,
    goldMult: 1.0,
    shardMult: 1.0,
    xpMult: 1.0,
    badgeClass: 'diff-chip normal',
    badgeText: '🛡️ Adventurer'
  },
  NIGHTMARE: {
    id: 'NIGHTMARE',
    name: 'Nightmare',
    hpMult: 1.55,
    dmgMult: 1.40,
    speedMult: 1.15,
    eliteChance: 0.45,
    goldMult: 1.50,
    shardMult: 1.50,
    xpMult: 1.40,
    badgeClass: 'diff-chip nightmare',
    badgeText: '⚔️ Nightmare'
  },
  INFERNO: {
    id: 'INFERNO',
    name: 'Inferno',
    hpMult: 2.30,
    dmgMult: 1.95,
    speedMult: 1.30,
    eliteChance: 0.75,
    goldMult: 2.20,
    shardMult: 2.50,
    xpMult: 2.00,
    badgeClass: 'diff-chip inferno',
    badgeText: '💀 Inferno'
  }
};

if (typeof window !== 'undefined') {
  window.DIFFICULTIES = window.DIFFICULTIES || GLOBAL_DIFFICULTIES;
}
if (typeof global !== 'undefined') {
  global.DIFFICULTIES = global.DIFFICULTIES || GLOBAL_DIFFICULTIES;
}

class StorageManager {
  static KEYS = {
    RUN: 'shadow_dungeon_active_run_v1',
    PROFILE: 'shadow_dungeon_profile_v1',
    RECORDS: 'shadow_dungeon_records_v1',
    SETTINGS: 'shadow_dungeon_settings_v1',
    CODEX: 'shadow_dungeon_codex_v1'
  };

  // 8 Permanent Meta-Upgrades in the Soul Sanctum
  static SANCTUM_UPGRADES = {
    titanHp: {
      name: "Titan's Fortitude",
      icon: "🩸",
      desc: "+40 Max HP per rank",
      maxRank: 5,
      costs: [30, 75, 160, 320, 650],
      getStat: (rank) => ({ maxHp: rank * 40 })
    },
    aetherMana: {
      name: "Aetheric Surge",
      icon: "💠",
      desc: "+25 Max Mana & +1 Mana regen/s per rank",
      maxRank: 5,
      costs: [25, 60, 140, 280, 550],
      getStat: (rank) => ({ maxMana: rank * 25, manaRegen: rank * 1.0 })
    },
    abyssalAtk: {
      name: "Abyssal Edge",
      icon: "⚔️",
      desc: "+4 Base Attack Power per rank",
      maxRank: 5,
      costs: [40, 90, 200, 420, 800],
      getStat: (rank) => ({ atk: rank * 4 })
    },
    obsidianDef: {
      name: "Obsidian Bastion",
      icon: "🛡️",
      desc: "+3 Base Defense & Armor per rank",
      maxRank: 5,
      costs: [35, 80, 180, 380, 720],
      getStat: (rank) => ({ def: rank * 3 })
    },
    shadowCrit: {
      name: "Shadow Precision",
      icon: "🎯",
      desc: "+3% Critical Strike Chance per rank",
      maxRank: 5,
      costs: [45, 100, 220, 450, 900],
      getStat: (rank) => ({ crit: rank * 3 })
    },
    alchemistSatchel: {
      name: "Alchemist's Satchel",
      icon: "🧪",
      desc: "+1 Starting HP & MP Potion per rank",
      maxRank: 3,
      costs: [50, 150, 350],
      getStat: (rank) => ({ bonusPotions: rank * 1 })
    },
    midasGreed: {
      name: "Abyssal Midas",
      icon: "🪙",
      desc: "+20% Gold Loot Bonus per rank",
      maxRank: 5,
      costs: [30, 70, 150, 300, 600],
      getStat: (rank) => ({ goldMult: 1 + rank * 0.20 })
    },
    swiftStride: {
      name: "Phantom Stride",
      icon: "⚡",
      desc: "+10 Movement Speed per rank",
      maxRank: 4,
      costs: [35, 85, 190, 400],
      getStat: (rank) => ({ speed: rank * 10 })
    }
  };

  // Helper safe storage reference
  static getStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  }

  // Helper safe read/write
  static getJSON(key, defaultValue = null) {
    try {
      const storage = this.getStorage();
      if (!storage) return defaultValue;
      const data = storage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn(`StorageManager: Failed reading ${key}`, e);
      return defaultValue;
    }
  }

  static setJSON(key, value) {
    try {
      const storage = this.getStorage();
      if (!storage) return false;
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`StorageManager: Failed saving ${key}`, e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // 1. PROFILE & SOUL SANCTUM (Permanent Meta-Progression)
  // -------------------------------------------------------------
  static getProfile() {
    const defaultProfile = {
      soulShards: 0,
      totalShardsEarned: 0,
      upgrades: {
        titanHp: 0,
        aetherMana: 0,
        abyssalAtk: 0,
        obsidianDef: 0,
        shadowCrit: 0,
        alchemistSatchel: 0,
        midasGreed: 0,
        swiftStride: 0
      }
    };
    const stored = this.getJSON(this.KEYS.PROFILE, {});
    return {
      soulShards: typeof stored.soulShards === 'number' ? stored.soulShards : 0,
      totalShardsEarned: typeof stored.totalShardsEarned === 'number' ? stored.totalShardsEarned : 0,
      upgrades: Object.assign({}, defaultProfile.upgrades, stored.upgrades || {})
    };
  }

  static saveProfile(profile) {
    this.setJSON(this.KEYS.PROFILE, profile);
  }

  static addSoulShards(amount) {
    if (!amount || amount <= 0) return this.getProfile().soulShards;
    const profile = this.getProfile();
    profile.soulShards += Math.round(amount);
    profile.totalShardsEarned += Math.round(amount);
    this.saveProfile(profile);

    // Also update lifetime records
    const records = this.getRecords();
    records.totalShards = (records.totalShards || 0) + Math.round(amount);
    this.setJSON(this.KEYS.RECORDS, records);

    return profile.soulShards;
  }

  static upgradeSanctum(upgradeKey) {
    const config = this.SANCTUM_UPGRADES[upgradeKey];
    if (!config) return { success: false, reason: 'Invalid upgrade' };

    const profile = this.getProfile();
    const currentRank = profile.upgrades[upgradeKey] || 0;

    if (currentRank >= config.maxRank) {
      return { success: false, reason: 'Already at maximum rank' };
    }

    const cost = config.costs[currentRank];
    if (profile.soulShards < cost) {
      return { success: false, reason: 'Not enough Soul Shards' };
    }

    profile.soulShards -= cost;
    profile.upgrades[upgradeKey] = currentRank + 1;
    this.saveProfile(profile);

    return {
      success: true,
      newRank: profile.upgrades[upgradeKey],
      costPaid: cost,
      remainingShards: profile.soulShards
    };
  }

  static getSanctumStatBonuses() {
    const profile = this.getProfile();
    const bonuses = {
      maxHp: 0,
      maxMana: 0,
      manaRegen: 0,
      atk: 0,
      def: 0,
      crit: 0,
      speed: 0,
      bonusPotions: 0,
      goldMult: 1.0
    };

    for (const key in this.SANCTUM_UPGRADES) {
      const rank = profile.upgrades[key] || 0;
      if (rank > 0) {
        const stats = this.SANCTUM_UPGRADES[key].getStat(rank);
        if (stats.maxHp) bonuses.maxHp += stats.maxHp;
        if (stats.maxMana) bonuses.maxMana += stats.maxMana;
        if (stats.manaRegen) bonuses.manaRegen += stats.manaRegen;
        if (stats.atk) bonuses.atk += stats.atk;
        if (stats.def) bonuses.def += stats.def;
        if (stats.crit) bonuses.crit += stats.crit;
        if (stats.speed) bonuses.speed += stats.speed;
        if (stats.bonusPotions) bonuses.bonusPotions += stats.bonusPotions;
        if (stats.goldMult) bonuses.goldMult = stats.goldMult;
      }
    }

    return bonuses;
  }

  // -------------------------------------------------------------
  // 2. ACTIVE RUN PERSISTENCE (Save & Resume)
  // -------------------------------------------------------------
  static hasActiveRun() {
    const run = this.getJSON(this.KEYS.RUN);
    return !!(run && typeof run.floorNumber === 'number' && run.playerData && (run.playerData.hp > 0 || run.isCheckpoint));
  }

  static getActiveRun() {
    return this.getJSON(this.KEYS.RUN, null);
  }

  static saveActiveRun(game) {
    if (!game || !game.player || game.player.hp <= 0) return false;
    const runData = {
      floorNumber: game.floorNumber,
      monstersDefeated: game.monstersDefeated,
      difficulty: game.difficulty || 'NORMAL',
      hardcore: !!game.hardcore,
      savedAt: Date.now(),
      playerData: game.player.serialize(),
      shardsEarnedThisRun: game.player.shardsEarnedThisRun || 0,
      isCheckpoint: false
    };
    return this.setJSON(this.KEYS.RUN, runData);
  }

  static saveCheckpointRun(game) {
    if (!game || !game.player) return false;
    const serialized = game.player.serialize();
    // For restart checkpoint from where they stopped, restore player's HP and Mana to full
    serialized.hp = game.player.maxHp || serialized.maxHp || 100;
    serialized.mana = game.player.maxMana || serialized.maxMana || 50;
    serialized.maxHp = game.player.maxHp || serialized.maxHp || 100;
    serialized.maxMana = game.player.maxMana || serialized.maxMana || 50;
    serialized.isDead = false;
    if ((serialized.healthPotions || 0) < 2) serialized.healthPotions = 2;
    if ((serialized.manaPotions || 0) < 2) serialized.manaPotions = 2;

    const runData = {
      floorNumber: game.floorNumber,
      monstersDefeated: game.monstersDefeated,
      difficulty: game.difficulty || 'NORMAL',
      hardcore: !!game.hardcore,
      savedAt: Date.now(),
      playerData: serialized,
      shardsEarnedThisRun: (game.player && game.player.shardsEarnedThisRun) || 0,
      isCheckpoint: true
    };
    return this.setJSON(this.KEYS.RUN, runData);
  }

  static clearActiveRun() {
    try {
      const storage = this.getStorage();
      if (storage) storage.removeItem(this.KEYS.RUN);
    } catch (e) {
      console.warn('StorageManager: Failed clearing active run', e);
    }
  }

  // -------------------------------------------------------------
  // 3. HALL OF RECORDS & EXPEDITION HISTORY
  // -------------------------------------------------------------
  static getRecords() {
    const defaultRecords = {
      deepestFloor: 1,
      highestLevel: 1,
      totalRuns: 0,
      victories: 0,
      totalKills: 0,
      bossesSlain: 0,
      totalGold: 0,
      totalShards: 0,
      recentRuns: []
    };
    const stored = this.getJSON(this.KEYS.RECORDS, {});
    return Object.assign({}, defaultRecords, stored);
  }

  static recordRunEnd(summary) {
    const records = this.getRecords();

    records.totalRuns = (records.totalRuns || 0) + 1;
    if (summary.outcome === 'VICTORY') {
      records.victories = (records.victories || 0) + 1;
    }
    records.deepestFloor = Math.max(records.deepestFloor || 1, summary.floor || 1);
    records.highestLevel = Math.max(records.highestLevel || 1, summary.level || 1);
    records.totalKills = (records.totalKills || 0) + (summary.monstersDefeated || 0);
    records.totalGold = (records.totalGold || 0) + (summary.gold || 0);
    if (summary.bossSlain) {
      records.bossesSlain = (records.bossesSlain || 0) + 1;
    }

    // Add to recent runs list (keep last 8)
    const runEntry = {
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      floor: summary.floor,
      level: summary.level,
      gold: summary.gold,
      shards: summary.shardsEarned || 0,
      kills: summary.monstersDefeated,
      difficulty: summary.difficulty || 'NORMAL',
      hardcore: !!summary.hardcore,
      outcome: summary.outcome || 'PERISHED'
    };

    records.recentRuns = [runEntry, ...(records.recentRuns || [])].slice(0, 8);
    this.setJSON(this.KEYS.RECORDS, records);
    return records;
  }

  // -------------------------------------------------------------
  // 4. BESTIARY & CODEX OF THE ABYSS
  // -------------------------------------------------------------
  static getCodex() {
    const defaultCodex = {
      enemies: {
        SLIME: 0,
        SKELETON: 0,
        SORCERER: 0,
        BOSS: 0
      },
      discoveredItems: [] // list of unique item names discovered
    };
    const stored = this.getJSON(this.KEYS.CODEX, {});
    return {
      enemies: Object.assign({}, defaultCodex.enemies, stored.enemies || {}),
      discoveredItems: Array.isArray(stored.discoveredItems) ? stored.discoveredItems : []
    };
  }

  static recordEnemyKill(type) {
    if (!type) return;
    const codex = this.getCodex();
    codex.enemies[type] = (codex.enemies[type] || 0) + 1;
    this.setJSON(this.KEYS.CODEX, codex);
  }

  static recordItemFound(item) {
    if (!item || !item.name) return;
    const codex = this.getCodex();
    if (!codex.discoveredItems.some(i => i.name === item.name)) {
      codex.discoveredItems.push({
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        color: item.color,
        icon: item.icon
      });
      this.setJSON(this.KEYS.CODEX, codex);
    }
  }

  // -------------------------------------------------------------
  // 5. USER SETTINGS
  // -------------------------------------------------------------
  static getSettings() {
    const defaultSettings = {
      soundMuted: false,
      volume: 0.8,
      screenShake: true,
      vibration: true,
      difficulty: 'NORMAL',
      hardcore: false
    };
    const stored = this.getJSON(this.KEYS.SETTINGS, {});
    return Object.assign({}, defaultSettings, stored);
  }

  static saveSettings(settings) {
    const current = this.getSettings();
    const updated = Object.assign({}, current, settings);
    this.setJSON(this.KEYS.SETTINGS, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // 6. TOTAL RESET / WIPE
  // -------------------------------------------------------------
  static wipeAllData() {
    try {
      const storage = this.getStorage();
      if (storage) {
        for (const k in this.KEYS) {
          storage.removeItem(this.KEYS[k]);
        }
      }
      return true;
    } catch (e) {
      console.warn('StorageManager: Failed wiping data', e);
      return false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
