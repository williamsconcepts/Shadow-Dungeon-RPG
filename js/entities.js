// Entities: Player, Enemies, Projectiles, Particles & Floating Text

// --- Particle System ---
class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 120;
    this.vy = options.vy || (Math.random() - 0.5) * 120;
    this.size = options.size || 3 + Math.random() * 3;
    this.color = options.color || '#f59e0b';
    this.life = options.life || 0.4 + Math.random() * 0.4;
    this.maxLife = this.life;
    this.drag = options.drag || 0.95;
    this.gravity = options.gravity || 0;
    this.shape = options.shape || 'circle';
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(this.drag, dt * 60);
    this.vy *= Math.pow(this.drag, dt * 60);
    this.vy += this.gravity * dt;
    this.life -= dt;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    if (this.shape === 'circle') {
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.rect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Floating Damage / Combat Text ---
class FloatingText {
  constructor(x, y, text, color = '#ffffff', isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.vy = -55 - (isCrit ? 35 : 0);
    this.vx = (Math.random() - 0.5) * 30;
    this.life = 0.85;
    this.maxLife = this.life;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 40 * dt; // gravity deceleration
    this.life -= dt;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.isCrit ? 'bold 18px "Cinzel", "Outfit", sans-serif' : 'bold 14px "Cinzel", "Outfit", sans-serif';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// --- Projectiles ---
class Projectile {
  constructor(x, y, targetX, targetY, options = {}) {
    this.x = x;
    this.y = y;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.angle = angle;
    this.speed = options.speed || 380;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = options.radius || 10;
    this.damage = options.damage || 20;
    this.isPlayer = options.isPlayer !== false;
    this.color = options.color || '#f97316';
    this.type = options.type || 'fireball';
    this.splashRadius = options.splashRadius || 50;
    this.life = options.life || 2.5;
    this.trailTimer = 0;
  }

  update(dt, dungeon, particles) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Trail particles
    this.trailTimer += dt;
    if (this.trailTimer > 0.02) {
      this.trailTimer = 0;
      particles.push(new Particle(this.x, this.y, {
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        size: 4 + Math.random() * 4,
        color: this.color,
        life: 0.25
      }));
    }

    // Check collision with walls
    if (dungeon.isSolid(this.x, this.y)) {
      this.life = 0;
      return true; // Collided
    }
    return this.life <= 0;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Glowing orb
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 1.5);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Telegraph Ground Zone ---
class GroundTelegraph {
  constructor(x, y, radius, delay = 1.0, onTrigger = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.delay = delay;
    this.maxDelay = delay;
    this.onTrigger = onTrigger;
    this.triggered = false;
  }

  update(dt) {
    this.delay -= dt;
    if (this.delay <= 0 && !this.triggered) {
      this.triggered = true;
      if (this.onTrigger) this.onTrigger(this);
      return true; // remove
    }
    return false;
  }

  render(ctx) {
    const progress = 1 - Math.max(0, this.delay / this.maxDelay);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * progress, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.fill();
    ctx.restore();
  }
}

// --- Hero Classes & Archetypes ---
const HERO_CLASSES = {
  WARRIOR: {
    id: 'WARRIOR',
    name: 'Shadow Knight',
    icon: '🛡️',
    title: 'Indomitable Melee Juggernaut',
    desc: 'Heavy plate armor, brutal broadswords, and cleaving strikes.',
    baseMaxHp: 380,
    baseMaxMana: 90,
    baseAtk: 18,
    baseDef: 14,
    baseCrit: 6,
    baseSpeed: 180,
    baseMagic: 8,
    skills: {
      dash: { cd: 2.5, currentCd: 0, cost: 10, name: 'Bull Rush', icon: '🐂', keyHint: 'Q' },
      skill1: { cd: 2.2, currentCd: 0, cost: 16, name: 'Whirlwind Blade', icon: '🌪️', keyHint: '1' },
      skill2: { cd: 4.8, currentCd: 0, cost: 24, name: 'Seismic Stomp', icon: '💥', keyHint: '2' },
      skill3: { cd: 8.0, currentCd: 0, cost: 35, name: 'Battle Roar', icon: '🦁', keyHint: '3' }
    }
  },
  MAGE: {
    id: 'MAGE',
    name: 'Void Sorcerer',
    icon: '🔮',
    title: 'Master of Cataclysmic Arcana',
    desc: 'Devastating elemental spells: Hellfire, Frost Nova, and Lightning.',
    baseMaxHp: 240,
    baseMaxMana: 180,
    baseAtk: 12,
    baseDef: 8,
    baseCrit: 8,
    baseSpeed: 195,
    baseMagic: 24,
    skills: {
      dash: { cd: 2.0, currentCd: 0, cost: 14, name: 'Arcane Blink', icon: '✨', keyHint: 'Q' },
      skill1: { cd: 1.5, currentCd: 0, cost: 18, name: 'Hellfire Orb', icon: '🔥', keyHint: '1' },
      skill2: { cd: 4.2, currentCd: 0, cost: 28, name: 'Frost Nova', icon: '❄️', keyHint: '2' },
      skill3: { cd: 6.5, currentCd: 0, cost: 40, name: 'Cataclysm Thunder', icon: '⚡', keyHint: '3' }
    }
  },
  ROGUE: {
    id: 'ROGUE',
    name: 'Abyssal Assassin',
    icon: '🗡️',
    title: 'Lethal Shadow Stalker',
    desc: 'Extreme attack speed, high critical chance, poison daggers, and smoke.',
    baseMaxHp: 270,
    baseMaxMana: 110,
    baseAtk: 16,
    baseDef: 9,
    baseCrit: 20,
    baseSpeed: 220,
    baseMagic: 12,
    skills: {
      dash: { cd: 1.8, currentCd: 0, cost: 8, name: 'Shadow Step', icon: '💨', keyHint: 'Q' },
      skill1: { cd: 1.6, currentCd: 0, cost: 14, name: 'Poison Daggers', icon: '🗡️', keyHint: '1' },
      skill2: { cd: 4.5, currentCd: 0, cost: 22, name: 'Smoke Bomb', icon: '🌫️', keyHint: '2' },
      skill3: { cd: 6.0, currentCd: 0, cost: 32, name: 'Shadow Assassination', icon: '💀', keyHint: '3' }
    }
  }
};
window.HERO_CLASSES = HERO_CLASSES;

// --- Player Entity ---
class Player {
  constructor(x, y, heroClass = 'WARRIOR') {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.angle = 0;
    this.heroClass = heroClass || 'WARRIOR';
    const classData = HERO_CLASSES[this.heroClass] || HERO_CLASSES.WARRIOR;

    this.baseSpeed = classData.baseSpeed;
    this.speed = this.baseSpeed;

    // RPG Stats & Progression
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.gold = 0;
    this.shardsEarnedThisRun = 0;
    this.buffTimer = 0;
    this.buffAtkMult = 1.0;
    this.isInvisible = false;

    const sanctumBonuses = window.StorageManager ? window.StorageManager.getSanctumStatBonuses() : {};
    this.healthPotions = 5 + (sanctumBonuses.bonusPotions || 0);
    this.manaPotions = 3 + (sanctumBonuses.bonusPotions || 0);

    this.baseMaxHp = classData.baseMaxHp;
    this.baseMaxMana = classData.baseMaxMana;
    this.baseAtk = classData.baseAtk;
    this.baseDef = classData.baseDef;
    this.baseCrit = classData.baseCrit;
    this.baseMagic = classData.baseMagic;

    this.equipped = {
      weapon: null,
      armor: null,
      ring: null,
      amulet: null
    };

    this.inventory = [];

    // Movement & state
    this.isMoving = false;
    this.walkCycle = 0;
    this.invulnerableTimer = 0;

    // Combat & Skills Cooldowns
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackCooldown = (this.heroClass === 'ROGUE') ? 0.24 : ((this.heroClass === 'WARRIOR') ? 0.38 : 0.32);
    this.attackCdTimer = 0;
    this.attackSwingAngle = 0;

    this.setupClassSkills();

    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.22;
    this.dashSpeed = 520;
    this.dashDir = { x: 0, y: 0 };

    this.recalculateStats();

    // Give class-appropriate starter weapon and starter armor
    if (window.ItemSystem) {
      let starterWeaponName = 'Iron Broadsword';
      if (this.heroClass === 'MAGE') starterWeaponName = 'Archmage Staff';
      else if (this.heroClass === 'ROGUE') starterWeaponName = 'Twin Shadow Daggers';

      const starterWeapon = window.ItemSystem.createSpecificItem
        ? window.ItemSystem.createSpecificItem('weapon', starterWeaponName, 'COMMON')
        : window.ItemSystem.createItem('weapon', 1, 'COMMON');
      this.equipItem(starterWeapon);

      const starterArmor = window.ItemSystem.createItem('armor', 1, 'COMMON');
      this.equipItem(starterArmor);
    }
    this.hp = this.maxHp;
    this.mana = this.maxMana;
  }

  setupClassSkills() {
    const classData = HERO_CLASSES[this.heroClass] || HERO_CLASSES.WARRIOR;
    this.skills = JSON.parse(JSON.stringify(classData.skills));
  }

  recalculateStats() {
    let extraHp = 0;
    let extraMana = 0;
    let extraAtk = 0;
    let extraDef = 0;
    let extraCrit = 0;
    let extraSpeed = 0;
    let extraMagic = 0;

    // Level scaling (more generous survival bonuses)
    const lvlBonus = (this.level - 1);
    extraHp += lvlBonus * 35;
    extraMana += lvlBonus * 15;
    extraAtk += lvlBonus * 3.5;
    extraDef += lvlBonus * 2.5;

    // Equipment bonuses
    for (const slot in this.equipped) {
      const it = this.equipped[slot];
      if (it && it.stats) {
        if (it.stats.maxHp) extraHp += it.stats.maxHp;
        if (it.stats.maxMana) extraMana += it.stats.maxMana;
        if (it.stats.atk) extraAtk += it.stats.atk;
        if (it.stats.def) extraDef += it.stats.def;
        if (it.stats.crit) extraCrit += it.stats.crit;
        if (it.stats.speed) extraSpeed += it.stats.speed;
        if (it.stats.magic) extraMagic += it.stats.magic;
      }
    }

    // Sanctum Meta-Upgrades
    if (window.StorageManager) {
      const bonuses = window.StorageManager.getSanctumStatBonuses();
      extraHp += bonuses.maxHp || 0;
      extraMana += bonuses.maxMana || 0;
      extraAtk += bonuses.atk || 0;
      extraDef += bonuses.def || 0;
      extraCrit += bonuses.crit || 0;
      extraSpeed += bonuses.speed || 0;
    }

    const prevMaxHp = this.maxHp || this.baseMaxHp;
    this.maxHp = Math.round(this.baseMaxHp + extraHp);
    this.maxMana = Math.round(this.baseMaxMana + extraMana);
    this.atk = Math.round(this.baseAtk + extraAtk);
    this.def = Math.round(this.baseDef + extraDef);
    this.crit = Math.min(65, Math.round(this.baseCrit + extraCrit));
    this.speed = Math.round(this.baseSpeed + extraSpeed);
    this.magic = Math.round(this.baseMagic + extraMagic);

    // If max hp increased, grant proportionate current HP
    if (this.hp) {
      this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMaxHp));
    }
  }

  get attack() { return this.atk; }
  get defense() { return this.def; }

  serialize() {
    return {
      heroClass: this.heroClass,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      gold: this.gold,
      shardsEarnedThisRun: this.shardsEarnedThisRun || 0,
      healthPotions: this.healthPotions,
      manaPotions: this.manaPotions,
      hp: this.hp,
      mana: this.mana,
      equipped: this.equipped,
      inventory: this.inventory
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.heroClass && HERO_CLASSES[data.heroClass]) {
      this.heroClass = data.heroClass;
      const classData = HERO_CLASSES[this.heroClass];
      this.baseMaxHp = classData.baseMaxHp;
      this.baseMaxMana = classData.baseMaxMana;
      this.baseAtk = classData.baseAtk;
      this.baseDef = classData.baseDef;
      this.baseCrit = classData.baseCrit;
      this.baseSpeed = classData.baseSpeed;
      this.baseMagic = classData.baseMagic;
      this.setupClassSkills();
    }
    this.level = data.level || 1;
    this.xp = data.xp || 0;
    this.xpToNext = data.xpToNext || 100;
    this.gold = data.gold || 0;
    this.shardsEarnedThisRun = data.shardsEarnedThisRun || 0;
    this.healthPotions = data.healthPotions !== undefined ? data.healthPotions : 5;
    this.manaPotions = data.manaPotions !== undefined ? data.manaPotions : 3;
    this.equipped = data.equipped || { weapon: null, armor: null, ring: null, amulet: null };
    this.inventory = data.inventory || [];
    this.recalculateStats();
    this.hp = Math.min(this.maxHp, data.hp !== undefined ? data.hp : this.maxHp);
    this.mana = Math.min(this.maxMana, data.mana !== undefined ? data.mana : this.maxMana);
  }

  equipItem(item) {
    const slot = item.slot;
    const oldItem = this.equipped[slot];
    this.equipped[slot] = item;
    // Remove from inventory if present
    const idx = this.inventory.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      this.inventory.splice(idx, 1);
    }
    // Return old item to inventory
    if (oldItem) {
      this.inventory.push(oldItem);
    }
    this.recalculateStats();
    if (window.gameInstance) window.gameInstance.requestAutoSave();
  }

  unequipItem(slot) {
    const item = this.equipped[slot];
    if (item && this.inventory.length < 16) {
      this.equipped[slot] = null;
      this.inventory.push(item);
      this.recalculateStats();
      if (window.gameInstance) window.gameInstance.requestAutoSave();
    }
  }

  addXp(amount, floatingTexts) {
    this.xp += amount;
    floatingTexts.push(new FloatingText(this.x, this.y - 25, `+${amount} XP`, '#38bdf8'));
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp(floatingTexts);
    }
  }

  levelUp(floatingTexts) {
    this.level++;
    this.xpToNext = Math.round(this.xpToNext * 1.5);
    this.recalculateStats();
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    floatingTexts.push(new FloatingText(this.x, this.y - 45, '★ LEVEL UP! ★', '#fbbf24', true));
    if (window.soundEngine) window.soundEngine.playLevelUp();
  }

  useHealthPotion(floatingTexts) {
    if (this.healthPotions <= 0 || this.hp >= this.maxHp) return false;
    this.healthPotions--;
    const healAmount = Math.round(this.maxHp * 0.65); // Generous 65% heal
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    floatingTexts.push(new FloatingText(this.x, this.y - 25, `+${healAmount} HP`, '#10b981', true));
    if (window.soundEngine) window.soundEngine.playHeal();
    return true;
  }

  useManaPotion(floatingTexts) {
    if (this.manaPotions <= 0 || this.mana >= this.maxMana) return false;
    this.manaPotions--;
    const manaAmount = Math.round(this.maxMana * 0.65);
    this.mana = Math.min(this.maxMana, this.mana + manaAmount);
    floatingTexts.push(new FloatingText(this.x, this.y - 25, `+${manaAmount} MP`, '#38bdf8', true));
    if (window.soundEngine) window.soundEngine.playHeal();
    return true;
  }

  update(dt, input, dungeon, particles, floatingTexts) {
    // Passive health & mana recovery (+ Sanctum mana regen bonus)
    const bonusRegen = window.StorageManager ? (window.StorageManager.getSanctumStatBonuses().manaRegen || 0) : 0;
    this.hp = Math.min(this.maxHp, this.hp + 3.0 * dt);
    this.mana = Math.min(this.maxMana, this.mana + (4.5 + bonusRegen) * dt);

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.attackCdTimer > 0) this.attackCdTimer -= dt;
    if (this.buffTimer > 0) {
      this.buffTimer -= dt;
      if (this.buffTimer <= 0) this.buffAtkMult = 1.0;
    }
    if (this.invisibleTimer > 0) {
      this.invisibleTimer -= dt;
      if (this.invisibleTimer <= 0) this.isInvisible = false;
    }
    for (const key in this.skills) {
      if (this.skills[key].currentCd > 0) {
        this.skills[key].currentCd = Math.max(0, this.skills[key].currentCd - dt);
      }
    }

    // Handle Dash state
    if (this.isDashing) {
      this.dashTimer -= dt;
      const moveX = this.dashDir.x * this.dashSpeed * dt;
      const moveY = this.dashDir.y * this.dashSpeed * dt;

      if (!dungeon.checkCollision(this.x + moveX, this.y, this.radius)) this.x += moveX;
      if (!dungeon.checkCollision(this.x, this.y + moveY, this.radius)) this.y += moveY;

      // Dash ghost particles
      particles.push(new Particle(this.x, this.y, {
        vx: 0, vy: 0,
        size: 14,
        color: this.heroClass === 'ROGUE' ? 'rgba(124, 58, 237, 0.4)' : (this.heroClass === 'MAGE' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.4)'),
        life: 0.15
      }));

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
      return;
    }

    // Process Movement: Combine Keyboard + Virtual Joystick + Xbox Gamepad
    let mx = 0;
    let my = 0;

    // Keyboard
    if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

    // Virtual Joystick pad integration
    if (input.joystick && (input.joystick.active || (input.joystick.vector && input.joystick.vector.active))) {
      const jx = input.joystick.x !== undefined ? input.joystick.x : input.joystick.vector.x;
      const jy = input.joystick.y !== undefined ? input.joystick.y : input.joystick.vector.y;
      mx += jx;
      my += jy;
    }

    // Xbox Controller Left Analog Stick & D-Pad
    if (input.gamepad && input.gamepad.leftStick.active) {
      mx += input.gamepad.leftStick.x;
      my += input.gamepad.leftStick.y;
    }

    const dist = Math.hypot(mx, my);
    if (dist > 0.1) {
      const normX = mx / Math.max(1, dist);
      const normY = my / Math.max(1, dist);
      const effectiveSpeed = this.isInvisible ? (this.speed * 1.35) : this.speed;
      const moveDist = effectiveSpeed * Math.min(1, dist) * dt;

      const nextX = this.x + normX * moveDist;
      const nextY = this.y + normY * moveDist;

      // Separate X and Y for smooth wall sliding
      if (!dungeon.checkCollision(nextX, this.y, this.radius)) {
        this.x = nextX;
      }
      if (!dungeon.checkCollision(this.x, nextY, this.radius)) {
        this.y = nextY;
      }

      this.isMoving = true;
      this.walkCycle += dt * 10;
    } else {
      this.isMoving = false;
    }

    // Aiming angle priority
    if (input.gamepad && input.gamepad.rightStick.active) {
      this.angle = input.gamepad.rightStick.angle;
    } else if (input.gamepad && input.gamepad.leftStick.active && dist > 0.12) {
      this.angle = input.gamepad.leftStick.angle;
    } else if (input.joystick && (input.joystick.active || (input.joystick.vector && input.joystick.vector.active))) {
      this.angle = input.joystick.angle !== undefined ? input.joystick.angle : input.joystick.vector.angle;
    } else if (dist > 0.12) {
      this.angle = Math.atan2(my, mx);
    } else if (input.mouseWorld) {
      this.angle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);
    }

    // Attack animation timer
    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackTimer >= 0.22) {
        this.isAttacking = false;
      }
    }
  }

  triggerPrimaryAttack(enemies, particles, floatingTexts, projectiles, urns) {
    if (this.attackCdTimer > 0) return false;
    this.attackCdTimer = this.attackCooldown;
    this.isAttacking = true;
    this.attackTimer = 0;

    // Check breaking urns in close melee range
    if (urns && urns.length) {
      urns.forEach(u => {
        if (!u.broken && Math.hypot(this.x - u.x, this.y - u.y) <= 65) {
          u.break(this, floatingTexts, particles);
        }
      });
    }

    if (this.heroClass === 'MAGE') {
      // Mage fires Arcane Staff Bolt
      if (window.soundEngine && window.soundEngine.playFireballCast) window.soundEngine.playFireballCast();
      const targetX = this.x + Math.cos(this.angle) * 320;
      const targetY = this.y + Math.sin(this.angle) * 320;
      const spellDmg = Math.round((this.magic * 1.35 + this.atk * 0.45) * (this.buffAtkMult || 1));

      if (projectiles) {
        projectiles.push(new Projectile(this.x, this.y, targetX, targetY, {
          damage: spellDmg,
          speed: 430,
          color: '#818cf8',
          radius: 9,
          isPlayer: true,
          splashRadius: 40
        }));
      }
      return true;
    }

    // Warrior & Rogue Melee Attacks
    if (window.soundEngine) window.soundEngine.playSwordSlash();

    const sweepRange = (this.heroClass === 'WARRIOR') ? 68 : 52;
    const sweepAngleRange = (this.heroClass === 'WARRIOR') ? 1.15 : 0.95;

    enemies.forEach(enemy => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= sweepRange + enemy.radius) {
        const angleToEnemy = Math.atan2(dy, dx);
        let diff = Math.abs(angleToEnemy - this.angle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

        if (diff <= sweepAngleRange) {
          const isCrit = Math.random() * 100 < this.crit;
          let dmg = Math.round(this.atk * (this.heroClass === 'WARRIOR' ? 1.1 : 0.95) * (this.buffAtkMult || 1));
          if (isCrit) dmg = Math.round(dmg * 1.85);

          enemy.takeDamage(dmg, isCrit, this, floatingTexts, particles);
          if (window.gameInstance && window.gameInstance.gamepad) {
            window.gameInstance.gamepad.vibrate(isCrit ? 140 : 70, isCrit ? 0.6 : 0.3, isCrit ? 0.4 : 0.1);
          }
        }
      }
    });

    // Slash spark particles in front
    const frontX = this.x + Math.cos(this.angle) * 35;
    const frontY = this.y + Math.sin(this.angle) * 35;
    const sparkColor = (this.heroClass === 'ROGUE') ? '#34d399' : '#f8fafc';
    for (let i = 0; i < 6; i++) {
      particles.push(new Particle(frontX, frontY, {
        vx: Math.cos(this.angle + (Math.random() - 0.5)) * 140,
        vy: Math.sin(this.angle + (Math.random() - 0.5)) * 140,
        size: 3,
        color: sparkColor,
        life: 0.15
      }));
    }

    return true;
  }

  triggerDash(particles) {
    const skill = this.skills.dash;
    if (skill.currentCd > 0 || this.mana < skill.cost || this.isDashing) return false;
    this.mana -= skill.cost;
    skill.currentCd = skill.cd;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashDir = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
    this.invulnerableTimer = this.dashDuration + 0.1;

    if (window.soundEngine) window.soundEngine.playDash();
    return true;
  }

  triggerSkill1(enemies, projectiles, particles, floatingTexts) {
    const skill = this.skills.skill1;
    if (!skill || skill.currentCd > 0 || this.mana < skill.cost) return false;
    this.mana -= skill.cost;
    skill.currentCd = skill.cd;

    if (this.heroClass === 'WARRIOR') {
      // Whirlwind Blade: 360 spin
      if (window.soundEngine && window.soundEngine.playSwordSlash) window.soundEngine.playSwordSlash();
      const spinRadius = 90;
      enemies.forEach(enemy => {
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d <= spinRadius + enemy.radius) {
          const isCrit = Math.random() * 100 < this.crit;
          let dmg = Math.round(this.atk * 1.65 * (this.buffAtkMult || 1));
          if (isCrit) dmg = Math.round(dmg * 1.85);
          enemy.takeDamage(dmg, isCrit, this, floatingTexts, particles);
        }
      });
      if (window.gameInstance && window.gameInstance.dungeon && window.gameInstance.dungeon.urns) {
        window.gameInstance.dungeon.urns.forEach(u => {
          if (!u.broken && Math.hypot(this.x - u.x, this.y - u.y) <= spinRadius) {
            u.break(this, floatingTexts, particles);
          }
        });
      }
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        particles.push(new Particle(this.x + Math.cos(ang) * 40, this.y + Math.sin(ang) * 40, {
          vx: Math.cos(ang) * 160,
          vy: Math.sin(ang) * 160,
          size: 4,
          color: '#fbbf24',
          life: 0.25
        }));
      }
    } else if (this.heroClass === 'MAGE') {
      // Hellfire Orb
      const targetX = this.x + Math.cos(this.angle) * 300;
      const targetY = this.y + Math.sin(this.angle) * 300;
      const spellDmg = Math.round((this.atk * 0.7 + this.magic * 1.6) * (this.buffAtkMult || 1));

      if (projectiles) {
        projectiles.push(new Projectile(this.x, this.y, targetX, targetY, {
          damage: spellDmg,
          speed: 430,
          color: '#f97316',
          isPlayer: true,
          splashRadius: 75
        }));
      }
      if (window.soundEngine && window.soundEngine.playFireballCast) window.soundEngine.playFireballCast();
    } else if (this.heroClass === 'ROGUE') {
      // Poison Daggers: 3 fan daggers
      if (window.soundEngine && window.soundEngine.playSwordSlash) window.soundEngine.playSwordSlash();
      const spreadAngles = [-0.22, 0, 0.22];
      spreadAngles.forEach(offset => {
        const ang = this.angle + offset;
        const targetX = this.x + Math.cos(ang) * 280;
        const targetY = this.y + Math.sin(ang) * 280;
        const dagDmg = Math.round((this.atk * 0.95 + this.magic * 0.5) * (this.buffAtkMult || 1));
        if (projectiles) {
          projectiles.push(new Projectile(this.x, this.y, targetX, targetY, {
            damage: dagDmg,
            speed: 520,
            radius: 6,
            color: '#10b981',
            isPlayer: true,
            splashRadius: 25
          }));
        }
      });
    }
    return true;
  }

  triggerSkill2(enemies, particles, floatingTexts, camera) {
    const skill = this.skills.skill2;
    if (!skill || skill.currentCd > 0 || this.mana < skill.cost) return false;
    this.mana -= skill.cost;
    skill.currentCd = skill.cd;

    if (this.heroClass === 'WARRIOR') {
      // Seismic Stomp
      if (window.soundEngine && window.soundEngine.playExplosion) window.soundEngine.playExplosion();
      if (camera) camera.shake(12, 0.25);
      const stompRadius = 130;
      enemies.forEach(enemy => {
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d <= stompRadius + enemy.radius) {
          const dmg = Math.round(this.atk * 1.4 * (this.buffAtkMult || 1));
          enemy.takeDamage(dmg, false, this, floatingTexts, particles);
          enemy.applySlow(3.5, 0.40);
        }
      });
      if (window.gameInstance && window.gameInstance.dungeon && window.gameInstance.dungeon.urns) {
        window.gameInstance.dungeon.urns.forEach(u => {
          if (!u.broken && Math.hypot(this.x - u.x, this.y - u.y) <= stompRadius) {
            u.break(this, floatingTexts, particles);
          }
        });
      }
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        particles.push(new Particle(this.x + Math.cos(ang) * 25, this.y + Math.sin(ang) * 25, {
          vx: Math.cos(ang) * 200,
          vy: Math.sin(ang) * 200,
          size: 5,
          color: '#d97706',
          life: 0.35,
          gravity: 40
        }));
      }
    } else if (this.heroClass === 'MAGE') {
      // Frost Nova
      if (window.soundEngine && window.soundEngine.playFrostNova) window.soundEngine.playFrostNova();
      const novaRadius = 145;
      enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (dist <= novaRadius + enemy.radius) {
          const dmg = Math.round(this.magic * 1.45 * (this.buffAtkMult || 1));
          enemy.takeDamage(dmg, false, this, floatingTexts, particles);
          enemy.applySlow(4.0, 0.45);
        }
      });
      for (let i = 0; i < 28; i++) {
        const ang = (i / 28) * Math.PI * 2;
        particles.push(new Particle(this.x + Math.cos(ang) * 20, this.y + Math.sin(ang) * 20, {
          vx: Math.cos(ang) * 220,
          vy: Math.sin(ang) * 220,
          size: 5,
          color: '#38bdf8',
          life: 0.4
        }));
      }
    } else if (this.heroClass === 'ROGUE') {
      // Smoke Bomb
      if (window.soundEngine && window.soundEngine.playDash) window.soundEngine.playDash();
      this.isInvisible = true;
      this.invisibleTimer = 3.5;
      floatingTexts.push(new FloatingText(this.x, this.y - 28, '🌫️ INVISIBLE!', '#a855f7', true));
      for (let i = 0; i < 35; i++) {
        particles.push(new Particle(this.x, this.y, {
          vx: (Math.random() - 0.5) * 160,
          vy: (Math.random() - 0.5) * 160,
          size: 8 + Math.random() * 8,
          color: Math.random() < 0.5 ? '#1e293b' : '#64748b',
          life: 0.65
        }));
      }
    }
    return true;
  }

  triggerSkill3(enemies, projectiles, particles, floatingTexts, camera) {
    const skill = this.skills.skill3;
    if (!skill || skill.currentCd > 0 || this.mana < skill.cost) return false;
    this.mana -= skill.cost;
    skill.currentCd = skill.cd;

    if (this.heroClass === 'WARRIOR') {
      // Battle Roar
      if (window.soundEngine && window.soundEngine.playBossRoar) window.soundEngine.playBossRoar();
      if (camera) camera.shake(10, 0.3);
      const healAmt = Math.round(this.maxHp * 0.28);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.buffTimer = 8.0;
      this.buffAtkMult = 1.6;
      floatingTexts.push(new FloatingText(this.x, this.y - 25, `+${healAmt} HP`, '#10b981', true));
      floatingTexts.push(new FloatingText(this.x, this.y - 45, '🦁 BATTLE ROAR (+60% ATK)!', '#fbbf24', true));
      enemies.forEach(e => {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < 120) {
          const ang = Math.atan2(e.y - this.y, e.x - this.x);
          e.x += Math.cos(ang) * 45;
          e.y += Math.sin(ang) * 45;
        }
      });
      for (let i = 0; i < 20; i++) {
        particles.push(new Particle(this.x, this.y, {
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220,
          size: 6,
          color: '#f59e0b',
          life: 0.5
        }));
      }
    } else if (this.heroClass === 'MAGE') {
      // Cataclysm Thunder
      let target = null;
      let minDist = 380;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist && !e.isDead) {
          minDist = d;
          target = e;
        }
      });
      const strikeX = target ? target.x : this.x + Math.cos(this.angle) * 160;
      const strikeY = target ? target.y : this.y + Math.sin(this.angle) * 160;
      if (target) {
        const dmg = Math.round((this.atk * 0.6 + this.magic * 2.5) * 1.5 * (this.buffAtkMult || 1));
        target.takeDamage(dmg, true, this, floatingTexts, particles);
      }
      if (window.soundEngine && window.soundEngine.playThunderStrike) window.soundEngine.playThunderStrike();
      if (camera) camera.shake(14, 0.3);
      for (let i = 0; i < 25; i++) {
        particles.push(new Particle(strikeX + (Math.random() - 0.5) * 30, strikeY + (Math.random() - 0.5) * 30, {
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220,
          size: 4,
          color: '#e0e7ff',
          life: 0.35,
          shape: 'spark'
        }));
      }
    } else if (this.heroClass === 'ROGUE') {
      // Shadow Assassination
      let target = null;
      let minDist = 320;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist && !e.isDead) {
          minDist = d;
          target = e;
        }
      });
      if (target) {
        const behindX = target.x - Math.cos(target.angle || 0) * 28;
        const behindY = target.y - Math.sin(target.angle || 0) * 28;
        this.x = behindX;
        this.y = behindY;
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);

        const critDmg = Math.round(this.atk * 3.2 * 1.85 * (this.buffAtkMult || 1));
        target.takeDamage(critDmg, true, this, floatingTexts, particles);
        floatingTexts.push(new FloatingText(target.x, target.y - 40, '💀 ASSASSINATION!', '#dc2626', true));
        if (window.soundEngine && window.soundEngine.playSwordSlash) window.soundEngine.playSwordSlash();
        if (camera) camera.shake(10, 0.2);

        for (let i = 0; i < 18; i++) {
          particles.push(new Particle(this.x, this.y, {
            vx: (Math.random() - 0.5) * 180,
            vy: (Math.random() - 0.5) * 180,
            size: 5,
            color: '#7c3aed',
            life: 0.4
          }));
        }
      } else {
        this.x += Math.cos(this.angle) * 140;
        this.y += Math.sin(this.angle) * 140;
      }
    }
    return true;
  }

  // Backward compatibility skill aliases
  triggerFireball(projectiles) {
    return this.triggerSkill1(window.gameInstance ? window.gameInstance.enemies : [], projectiles, window.gameInstance ? window.gameInstance.particles : [], window.gameInstance ? window.gameInstance.floatingTexts : []);
  }

  triggerFrostNova(enemies, particles, floatingTexts) {
    return this.triggerSkill2(enemies, particles, floatingTexts, window.gameInstance ? window.gameInstance.camera : null);
  }

  triggerThunder(enemies, particles, floatingTexts, camera) {
    return this.triggerSkill3(enemies, window.gameInstance ? window.gameInstance.projectiles : [], particles, floatingTexts, camera);
  }

  takeDamage(amount, floatingTexts, camera) {
    if (this.invulnerableTimer > 0) return 0;

    const reduction = this.def / (this.def + 40);
    const actualDmg = Math.max(1, Math.round(amount * (1 - reduction)));

    this.hp = Math.max(0, this.hp - actualDmg);
    this.invulnerableTimer = 0.65;

    floatingTexts.push(new FloatingText(this.x, this.y - 25, `-${actualDmg}`, '#ef4444', true));
    if (window.soundEngine) window.soundEngine.playHitImpact(true);
    if (camera) camera.shake(7, 0.2);
    if (window.gameInstance && window.gameInstance.gamepad) {
      window.gameInstance.gamepad.vibrate(220, 0.5, 0.6);
    }

    return actualDmg;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Buff aura
    if (this.buffTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Invisibility or invulnerability flash
    if (this.isInvisible) {
      ctx.globalAlpha = 0.38;
    } else if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, this.radius * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 5 : 0;

    if (this.heroClass === 'WARRIOR') {
      // WARRIOR: Heavy plate, iron helm, kite shield, greatsword
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -12 + legOffset, 5, 8);
      ctx.fillRect(-8, 4 - legOffset, 5, 8);

      // Crimson Cape
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-20 + (this.isMoving ? Math.sin(this.walkCycle) * 3 : 0), 0);
      ctx.lineTo(-10, 8);
      ctx.fill();

      // Steel Plate Torso
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Iron Horned Helmet
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(3, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Glowing red visor
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(4, -3, 3, 6);

      // Gold-trimmed Shield (left)
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Broadsword (right)
      const swingProgress = this.isAttacking ? (this.attackTimer / 0.22) : 0;
      const swordSwingOffset = this.isAttacking ? (-0.7 + swingProgress * 1.8) : 0;

      ctx.save();
      ctx.translate(8, 10);
      ctx.rotate(swordSwingOffset);

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(28, -2.5);
      ctx.lineTo(26, -5);
      ctx.lineTo(0, -2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#d97706';
      ctx.fillRect(-2, -6, 4, 9);
      ctx.restore();

      if (this.isAttacking) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 52, -0.7 + swingProgress * 0.4, 0.8 + swingProgress * 0.4);
        ctx.stroke();
        ctx.restore();
      }
    } else if (this.heroClass === 'MAGE') {
      // MAGE: Midnight purple robe, mystic cowl, archmage staff
      ctx.fillStyle = '#312e81';
      ctx.fillRect(-8, -10 + legOffset, 5, 7);
      ctx.fillRect(-8, 3 - legOffset, 5, 7);

      // Starry Void Cloak
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(-22 + (this.isMoving ? Math.sin(this.walkCycle) * 3 : 0), 0);
      ctx.lineTo(-10, 10);
      ctx.fill();

      // Robe Torso
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mystic Cowl
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(3, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Cyan Arcane Eyes
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, -3, 3, 2);
      ctx.fillRect(4, 1, 3, 2);

      // Archmage Staff (right)
      ctx.save();
      ctx.translate(6, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -18, 4, 30);

      // Glowing crystal orb
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, -20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (this.heroClass === 'ROGUE') {
      // ROGUE: Obsidian leather, shadow hood, dual daggers
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, -10 + legOffset, 4, 7);
      ctx.fillRect(-7, 3 - legOffset, 4, 7);

      // Shadow Mantle
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(-9, -7);
      ctx.lineTo(-18 + (this.isMoving ? Math.sin(this.walkCycle) * 3 : 0), 0);
      ctx.lineTo(-9, 7);
      ctx.fill();

      // Leather Armor Torso
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Assassin Hood
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(3, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Emerald Eyes
      ctx.fillStyle = '#34d399';
      ctx.fillRect(4, -2.5, 2.5, 2);
      ctx.fillRect(4, 1, 2.5, 2);

      // Dual Daggers
      const swingProgress = this.isAttacking ? (this.attackTimer / 0.22) : 0;
      const daggerOffset = this.isAttacking ? (-0.5 + swingProgress * 1.5) : 0;

      // Mainhand Dagger
      ctx.save();
      ctx.translate(8, 9);
      ctx.rotate(daggerOffset);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, 0);
      ctx.lineTo(18, -2);
      ctx.lineTo(0, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Offhand Dagger
      ctx.save();
      ctx.translate(8, -9);
      ctx.rotate(-daggerOffset * 0.7);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 0);
      ctx.lineTo(16, 2);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (this.isAttacking) {
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 42, -0.6 + swingProgress * 0.3, 0.7 + swingProgress * 0.3);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

// --- Enemy Entity ---
class Enemy {
  constructor(x, y, type = 'SLIME', floor = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.floor = floor;
    this.isDead = false;
    this.isElite = false;
    this.affix = null;
    this.moltenTimer = 0;

    // Type configurations
    if (type === 'SLIME') {
      this.name = 'Void Slime';
      this.radius = 15;
      this.maxHp = Math.round(35 * (1 + floor * 0.28));
      this.speed = 95 + Math.random() * 20;
      this.atk = Math.round(9 * (1 + floor * 0.22));
      this.xpValue = 25 * floor;
      this.color = '#8b5cf6';
      this.attackRange = 24;
      this.attackCd = 1.1;
    } else if (type === 'SKELETON') {
      this.name = 'Crypt Skeleton';
      this.radius = 16;
      this.maxHp = Math.round(60 * (1 + floor * 0.3));
      this.speed = 120 + Math.random() * 25;
      this.atk = Math.round(15 * (1 + floor * 0.25));
      this.xpValue = 45 * floor;
      this.color = '#e2e8f0';
      this.attackRange = 36;
      this.attackCd = 1.3;
    } else if (type === 'SORCERER') {
      this.name = 'Shadow Cultist';
      this.radius = 16;
      this.maxHp = Math.round(45 * (1 + floor * 0.25));
      this.speed = 85;
      this.atk = Math.round(18 * (1 + floor * 0.28));
      this.xpValue = 60 * floor;
      this.color = '#ef4444';
      this.attackRange = 240;
      this.attackCd = 2.4;
    } else if (type === 'BOSS') {
      this.name = 'Abyss Overlord';
      this.radius = 32;
      this.maxHp = Math.round(550 * (1 + floor * 0.4));
      this.speed = 105;
      this.atk = Math.round(28 * (1 + floor * 0.3));
      this.xpValue = 400 * floor;
      this.color = '#dc2626';
      this.attackRange = 60;
      this.attackCd = 1.5;
      this.isBoss = true;
      this.specialTimer = 4.0;
    }

    // Elite Monster Chance (22% chance on floor >= 2)
    if (!this.isBoss && floor >= 2 && Math.random() < 0.24) {
      this.makeElite();
    }

    this.hp = this.maxHp;
    this.cdTimer = Math.random() * 0.5;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.angle = 0;
    this.hitTimer = 0;
    this.bounceTimer = Math.random() * 10;
  }

  makeElite(specificAffix = null) {
    this.isElite = true;
    const affixes = ['MOLTEN', 'SWIFT', 'VAMPIRIC', 'BULWARK'];
    this.affix = specificAffix || affixes[Math.floor(Math.random() * affixes.length)];
    const affixName = this.affix.charAt(0) + this.affix.slice(1).toLowerCase();
    this.name = `${affixName} ${this.name}`;
    this.maxHp = Math.round(this.maxHp * 2.2);
    this.hp = this.maxHp;
    this.atk = Math.round(this.atk * 1.35);
    this.xpValue = Math.round(this.xpValue * 2.5);

    if (this.affix === 'SWIFT') {
      this.speed = Math.round(this.speed * 1.5);
      this.attackCd = Math.max(0.6, this.attackCd * 0.7);
    }
  }

  takeDamage(amount, isCrit, player, floatingTexts, particles) {
    if (this.isDead) return;

    // Bulwark affix takes 40% reduced damage
    let finalDmg = amount;
    if (this.isElite && this.affix === 'BULWARK') {
      finalDmg = Math.max(1, Math.round(amount * 0.60));
    }

    this.hp -= finalDmg;
    this.hitTimer = 0.15;

    floatingTexts.push(new FloatingText(
      this.x,
      this.y - this.radius - 8,
      isCrit ? `CRIT! -${finalDmg}` : `-${finalDmg}`,
      isCrit ? '#fbbf24' : '#f87171',
      isCrit
    ));

    if (window.soundEngine) window.soundEngine.playHitImpact(isCrit);

    for (let i = 0; i < (isCrit ? 10 : 5); i++) {
      particles.push(new Particle(this.x, this.y, {
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        size: 3 + Math.random() * 3,
        color: this.color,
        life: 0.35
      }));
    }

    if (this.hp <= 0) {
      this.die(player, floatingTexts, particles);
    }
  }

  applySlow(duration, factor) {
    this.slowTimer = duration;
    this.slowFactor = factor;
  }

  die(player, floatingTexts, particles) {
    this.isDead = true;
    player.addXp(this.xpValue, floatingTexts);

    // Drop Soul Shards based on enemy tier
    let shardCount = 1;
    if (this.type === 'SLIME') shardCount = Math.floor(1 + Math.random() * 2);
    else if (this.type === 'SKELETON') shardCount = Math.floor(2 + Math.random() * 2);
    else if (this.type === 'SORCERER') shardCount = Math.floor(4 + Math.random() * 3);
    else if (this.isBoss) shardCount = Math.floor(40 + Math.random() * 25);

    // Elite bonus rewards
    if (this.isElite) {
      shardCount += Math.floor(3 + Math.random() * 3);
      const bonusGold = 25 + Math.floor(Math.random() * 35);
      player.gold += bonusGold;
      floatingTexts.push(new FloatingText(this.x, this.y - 48, `+${bonusGold} 🪙`, '#fbbf24', true));

      // 60% chance to drop Rare/Epic equipment from Elite
      if (Math.random() < 0.60 && player.inventory.length < 16 && window.ItemSystem) {
        const itemRarity = Math.random() < 0.25 ? 'EPIC' : 'RARE';
        const slots = ['weapon', 'armor', 'ring', 'amulet'];
        const drop = window.ItemSystem.createItem(slots[Math.floor(Math.random() * slots.length)], this.floor, itemRarity);
        player.inventory.push(drop);
        floatingTexts.push(new FloatingText(this.x, this.y - 64, `Drop: ${drop.name}!`, '#c084fc', true));
      }
    }

    if (window.StorageManager) {
      window.StorageManager.addSoulShards(shardCount);
      window.StorageManager.recordEnemyKill(this.type);
    }
    player.shardsEarnedThisRun = (player.shardsEarnedThisRun || 0) + shardCount;
    floatingTexts.push(new FloatingText(this.x, this.y - 32, `+${shardCount} 💎`, '#c084fc', true));
    if (window.soundEngine && window.soundEngine.playShardCollect) {
      window.soundEngine.playShardCollect();
    }

    for (let i = 0; i < 18; i++) {
      particles.push(new Particle(this.x, this.y, {
        vx: (Math.random() - 0.5) * 240,
        vy: (Math.random() - 0.5) * 240,
        size: 4 + Math.random() * 4,
        color: this.color,
        life: 0.55
      }));
    }
  }

  update(dt, player, dungeon, projectiles, telegraphs, particles, floatingTexts, camera) {
    if (this.isDead) return;

    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.cdTimer > 0) this.cdTimer -= dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    this.bounceTimer += dt * 4;

    // Molten elite affix leaves fire trail particles & burns player
    if (this.isElite && this.affix === 'MOLTEN') {
      this.moltenTimer += dt;
      if (this.moltenTimer > 0.35) {
        this.moltenTimer = 0;
        particles.push(new Particle(this.x, this.y, {
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 6,
          color: '#f97316',
          life: 0.8
        }));
        if (Math.hypot(player.x - this.x, player.y - this.y) < 32) {
          player.takeDamage(5, floatingTexts, camera);
        }
      }
    }

    // If player is invisible (from Rogue Smoke Bomb), enemies do not pursue!
    if (player.isInvisible) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    const aggroRange = this.isBoss ? 800 : 360;
    if (distToPlayer > aggroRange) return;

    const curSpeed = this.speed * this.slowFactor;

    if (this.type === 'SORCERER') {
      if (distToPlayer < 140) {
        const escapeX = this.x - Math.cos(this.angle) * curSpeed * dt;
        const escapeY = this.y - Math.sin(this.angle) * curSpeed * dt;
        if (!dungeon.checkCollision(escapeX, this.y, this.radius)) this.x = escapeX;
        if (!dungeon.checkCollision(this.x, escapeY, this.radius)) this.y = escapeY;
      } else if (distToPlayer > 200) {
        const stepX = this.x + Math.cos(this.angle) * curSpeed * dt;
        const stepY = this.y + Math.sin(this.angle) * curSpeed * dt;
        if (!dungeon.checkCollision(stepX, this.y, this.radius)) this.x = stepX;
        if (!dungeon.checkCollision(this.x, stepY, this.radius)) this.y = stepY;
      }

      if (this.cdTimer <= 0 && distToPlayer <= this.attackRange) {
        this.cdTimer = this.attackCd;
        projectiles.push(new Projectile(this.x, this.y, player.x, player.y, {
          speed: 260,
          radius: 8,
          damage: this.atk,
          color: '#a855f7',
          isPlayer: false,
          splashRadius: 30
        }));
        if (window.soundEngine) window.soundEngine.playFireballCast();
      }
    } else if (this.isBoss) {
      this.specialTimer -= dt;

      const stepX = this.x + Math.cos(this.angle) * curSpeed * dt;
      const stepY = this.y + Math.sin(this.angle) * curSpeed * dt;
      if (!dungeon.checkCollision(stepX, this.y, this.radius)) this.x = stepX;
      if (!dungeon.checkCollision(this.x, stepY, this.radius)) this.y = stepY;

      if (distToPlayer <= this.attackRange && this.cdTimer <= 0) {
        this.cdTimer = this.attackCd;
        player.takeDamage(this.atk, floatingTexts, camera);
      }

      if (this.specialTimer <= 0) {
        this.specialTimer = 5.0;
        if (Math.random() > 0.5) {
          if (window.soundEngine) window.soundEngine.playBossRoar();
          for (let i = 0; i < 8; i++) {
            const radAngle = (i / 8) * Math.PI * 2;
            projectiles.push(new Projectile(
              this.x, this.y,
              this.x + Math.cos(radAngle) * 300,
              this.y + Math.sin(radAngle) * 300,
              { speed: 220, radius: 10, damage: Math.round(this.atk * 0.75), color: '#ef4444', isPlayer: false }
            ));
          }
        } else {
          telegraphs.push(new GroundTelegraph(player.x, player.y, 65, 1.2, (zone) => {
            if (window.soundEngine) window.soundEngine.playExplosion();
            if (camera) camera.shake(12, 0.3);
            const dist = Math.hypot(player.x - zone.x, player.y - zone.y);
            if (dist <= zone.radius + player.radius) {
              player.takeDamage(Math.round(this.atk * 1.4), floatingTexts, camera);
            }
            for (let i = 0; i < 20; i++) {
              particles.push(new Particle(zone.x, zone.y, {
                vx: (Math.random() - 0.5) * 220,
                vy: (Math.random() - 0.5) * 220,
                size: 5,
                color: '#f97316',
                life: 0.45
              }));
            }
          }));
        }
      }
    } else {
      // Melee enemies
      if (distToPlayer > this.attackRange * 0.7) {
        const stepX = this.x + Math.cos(this.angle) * curSpeed * dt;
        const stepY = this.y + Math.sin(this.angle) * curSpeed * dt;
        if (!dungeon.checkCollision(stepX, this.y, this.radius)) this.x = stepX;
        if (!dungeon.checkCollision(this.x, stepY, this.radius)) this.y = stepY;
      }

      if (distToPlayer <= this.attackRange && this.cdTimer <= 0) {
        this.cdTimer = this.attackCd;
        const dealt = player.takeDamage(this.atk, floatingTexts, camera);

        // Vampiric affix leeches health back
        if (this.isElite && this.affix === 'VAMPIRIC' && dealt > 0) {
          const leech = Math.round(dealt * 0.6);
          this.hp = Math.min(this.maxHp, this.hp + leech);
          floatingTexts.push(new FloatingText(this.x, this.y - 15, `+${leech} HP`, '#10b981'));
        }
      }
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Elite Aura Glow
    if (this.isElite) {
      let auraColor = '#f97316';
      if (this.affix === 'SWIFT') auraColor = '#06b6d4';
      else if (this.affix === 'VAMPIRIC') auraColor = '#dc2626';
      else if (this.affix === 'BULWARK') auraColor = '#eab308';

      ctx.save();
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hit flash
    if (this.hitTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else if (this.slowTimer > 0) {
      ctx.fillStyle = '#38bdf8';
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.7, this.radius * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Health bar & Elite Affix Name above head
    if (!this.isBoss && (this.hp < this.maxHp || this.isElite)) {
      const barW = this.isElite ? 38 : 28;
      const barH = 4;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW, barH);
      ctx.fillStyle = this.isElite ? '#f59e0b' : '#ef4444';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW * pct, barH);

      if (this.isElite) {
        ctx.font = 'bold 9px "Cinzel", "Outfit", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`[${this.affix}]`, 0, -this.radius - 16);
      }
    }

    ctx.rotate(this.angle);

    if (this.type === 'SLIME') {
      const squish = 1 + Math.sin(this.bounceTimer) * 0.15;
      ctx.scale(squish, 2 - squish);
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'SKELETON') {
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : '#f1f5f9';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(4, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, 6, 16, 3);
    } else if (this.type === 'SORCERER') {
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : '#4c1d95';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c084fc';
      ctx.fillRect(5, -4, 3, 2);
      ctx.fillRect(5, 2, 3, 2);

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(14, 10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'BOSS') {
      ctx.fillStyle = this.hitTimer > 0 ? '#ffffff' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-10, -28);
      ctx.lineTo(-4, -18);
      ctx.lineTo(-16, -18);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-10, 28);
      ctx.lineTo(-4, 18);
      ctx.lineTo(-16, 18);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(10, -7, 6, 4);
      ctx.fillRect(10, 3, 6, 4);
    }

    ctx.restore();
  }
}

// --- Interactive Dungeon Environment Classes ---

// Breakable Urn
class Urn {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.broken = false;
  }

  break(player, floatingTexts = [], particles = []) {
    if (this.broken) return;
    this.broken = true;

    if (window.soundEngine && window.soundEngine.playUrnBreak) {
      window.soundEngine.playUrnBreak();
    }

    // Clay ceramic debris particles
    const clayColors = ['#b45309', '#d97706', '#78350f', '#f59e0b'];
    for (let i = 0; i < 14; i++) {
      particles.push(new Particle(this.x, this.y, {
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        size: 3 + Math.random() * 4,
        color: clayColors[Math.floor(Math.random() * clayColors.length)],
        life: 0.45,
        gravity: 60,
        shape: 'spark'
      }));
    }

    // Loot drops: 50% Gold, 15% Potion, 15% Shards, 20% Empty
    const roll = Math.random();
    if (roll < 0.50) {
      const goldAmt = 5 + Math.floor(Math.random() * 15);
      player.gold += goldAmt;
      floatingTexts.push(new FloatingText(this.x, this.y - 18, `+${goldAmt} 🪙`, '#fbbf24'));
      if (window.soundEngine && window.soundEngine.playCoinPickup) window.soundEngine.playCoinPickup();
    } else if (roll < 0.65) {
      if (Math.random() < 0.5) {
        player.healthPotions++;
        floatingTexts.push(new FloatingText(this.x, this.y - 18, '+1 HP Potion', '#ef4444', true));
      } else {
        player.manaPotions++;
        floatingTexts.push(new FloatingText(this.x, this.y - 18, '+1 MP Potion', '#38bdf8', true));
      }
    } else if (roll < 0.80) {
      const shardAmt = 1 + Math.floor(Math.random() * 2);
      if (window.StorageManager) window.StorageManager.addSoulShards(shardAmt);
      player.shardsEarnedThisRun = (player.shardsEarnedThisRun || 0) + shardAmt;
      floatingTexts.push(new FloatingText(this.x, this.y - 18, `+${shardAmt} 💎`, '#c084fc', true));
      if (window.soundEngine && window.soundEngine.playShardCollect) window.soundEngine.playShardCollect();
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.broken) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -4, 5, 3);
      ctx.fillRect(3, -6, 4, 4);
      ctx.fillRect(-2, 4, 6, 3);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-5, 2, 4, 2);
      ctx.fillRect(4, 3, 3, 3);
      ctx.restore();
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Terracotta clay pot
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.quadraticCurveTo(-14, 0, -10, 8);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(14, 0, 9, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Urn rim & decorative band
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-11, -12, 22, 3);
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(-11, -12, 22, 3);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(10, -2);
    ctx.stroke();

    ctx.restore();
  }
}

// Floor Spike Trap
class SpikeTrap {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 36;
    this.state = 'IDLE'; // IDLE -> ARMING -> ACTIVE -> COOLDOWN
    this.timer = 1.0 + Math.random() * 2.0;
  }

  update(dt, player, enemies, floatingTexts, particles, camera) {
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state === 'IDLE') {
        this.state = 'ARMING';
        this.timer = 0.55;
      } else if (this.state === 'ARMING') {
        this.state = 'ACTIVE';
        this.timer = 0.45;
        if (window.soundEngine && window.soundEngine.playTrapSnap) {
          window.soundEngine.playTrapSnap();
        }
        // Damage player if on trap
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (distToPlayer < 24) {
          player.takeDamage(22, floatingTexts, camera);
        }
        // Damage enemies on trap
        if (enemies) {
          enemies.forEach(e => {
            if (!e.isDead && Math.hypot(e.x - this.x, e.y - this.y) < 26) {
              e.takeDamage(35, true, player, floatingTexts, particles);
            }
          });
        }
      } else if (this.state === 'ACTIVE') {
        this.state = 'COOLDOWN';
        this.timer = 1.3;
      } else if (this.state === 'COOLDOWN') {
        this.state = 'IDLE';
        this.timer = 1.8 + Math.random() * 1.5;
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Iron grate floor plate
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-17, -17, 34, 34);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(-17, -17, 34, 34);

    // Grate slots
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-12, -12, 6, 6);
    ctx.fillRect(6, -12, 6, 6);
    ctx.fillRect(-12, 6, 6, 6);
    ctx.fillRect(6, 6, 6, 6);
    ctx.fillRect(-3, -3, 6, 6);

    if (this.state === 'ARMING') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === 'ACTIVE') {
      const spikePositions = [
        { x: -9, y: -9 }, { x: 9, y: -9 },
        { x: -9, y: 9 }, { x: 9, y: 9 },
        { x: 0, y: 0 }
      ];
      spikePositions.forEach(p => {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(p.x - 3, p.y + 3);
        ctx.lineTo(p.x, p.y - 12);
        ctx.lineTo(p.x + 3, p.y + 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(p.x - 1.5, p.y - 6);
        ctx.lineTo(p.x, p.y - 12);
        ctx.lineTo(p.x + 1.5, p.y - 6);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.restore();
  }
}

// Mystical Shrine
class Shrine {
  constructor(x, y, type = 'ARCANA') {
    this.x = x;
    this.y = y;
    this.type = type; // 'BLOOD', 'ARCANA', 'GREED'
    this.used = false;
    this.pulse = 0;
  }

  activate(player, floatingTexts = [], particles = [], enemies = []) {
    if (this.used) return false;
    this.used = true;

    if (window.soundEngine && window.soundEngine.playShrineBuff) {
      window.soundEngine.playShrineBuff();
    }

    if (this.type === 'BLOOD') {
      const hpSacrifice = Math.max(15, Math.round(player.hp * 0.25));
      player.hp = Math.max(1, player.hp - hpSacrifice);
      player.baseAtk += 8;
      player.recalculateStats();
      if (window.StorageManager) window.StorageManager.addSoulShards(12);
      player.shardsEarnedThisRun = (player.shardsEarnedThisRun || 0) + 12;

      floatingTexts.push(new FloatingText(this.x, this.y - 30, `Blood Pact: -${hpSacrifice} HP`, '#ef4444', true));
      floatingTexts.push(new FloatingText(this.x, this.y - 50, '+8 Permanent ATK! +12 💎', '#fbbf24', true));
    } else if (this.type === 'ARCANA') {
      player.mana = player.maxMana;
      player.buffTimer = 60;
      player.buffAtkMult = 1.4;
      player.healthPotions = Math.min(10, player.healthPotions + 2);

      floatingTexts.push(new FloatingText(this.x, this.y - 30, 'Arcane Surge! Full MP restored', '#38bdf8', true));
      floatingTexts.push(new FloatingText(this.x, this.y - 50, '+40% Spell Power for 60s!', '#818cf8', true));
    } else if (this.type === 'GREED') {
      const goldAmt = 120 + Math.floor(Math.random() * 100);
      player.gold += goldAmt;
      if (window.ItemSystem) {
        const rareItem = window.ItemSystem.createItem(
          ['weapon', 'armor', 'ring', 'amulet'][Math.floor(Math.random() * 4)],
          Math.max(2, window.gameInstance ? window.gameInstance.dungeon.floor : 1),
          'RARE'
        );
        if (player.inventory.length < 16) {
          player.inventory.push(rareItem);
        }
        floatingTexts.push(new FloatingText(this.x, this.y - 50, `Found: ${rareItem.name}!`, '#c084fc', true));
      }
      floatingTexts.push(new FloatingText(this.x, this.y - 30, `Greed Bounty: +${goldAmt} 🪙!`, '#fbbf24', true));

      if (enemies && window.Enemy) {
        const sk1 = new Enemy(this.x - 45, this.y - 30, 'SKELETON', window.gameInstance ? window.gameInstance.dungeon.floor : 1);
        sk1.makeElite('SWIFT');
        const sk2 = new Enemy(this.x + 45, this.y + 30, 'SKELETON', window.gameInstance ? window.gameInstance.dungeon.floor : 1);
        sk2.makeElite('MOLTEN');
        enemies.push(sk1, sk2);
      }
    }

    const shrineColor = this.type === 'BLOOD' ? '#ef4444' : (this.type === 'ARCANA' ? '#38bdf8' : '#fbbf24');
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(this.x, this.y - 10, {
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        size: 4 + Math.random() * 4,
        color: shrineColor,
        life: 0.6
      }));
    }
    return true;
  }

  render(ctx) {
    this.pulse += 0.05;
    ctx.save();
    ctx.translate(this.x, this.y);

    const baseColor = this.used ? '#475569' : (this.type === 'BLOOD' ? '#ef4444' : (this.type === 'ARCANA' ? '#38bdf8' : '#fbbf24'));

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.used ? '#334155' : baseColor;
    ctx.lineWidth = 2;
    ctx.fillRect(-18, -10, 36, 24);
    ctx.strokeRect(-18, -10, 36, 24);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-22, 10, 44, 8);
    ctx.strokeRect(-22, 10, 44, 8);

    if (!this.used) {
      const hoverY = -22 + Math.sin(this.pulse) * 4;
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(0, hoverY - 12);
      ctx.lineTo(8, hoverY);
      ctx.lineTo(0, hoverY + 12);
      ctx.lineTo(-8, hoverY);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -10, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 10px "Cinzel", "Outfit", sans-serif';
    ctx.fillStyle = this.used ? '#64748b' : '#f8fafc';
    ctx.textAlign = 'center';
    const title = this.type === 'BLOOD' ? 'Altar of Blood' : (this.type === 'ARCANA' ? 'Fountain of Arcana' : 'Shrine of Greed');
    ctx.fillText(this.used ? `${title} (Drained)` : title, 0, 32);

    ctx.restore();
  }
}

// Wandering Merchant Garrick
class Merchant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.name = 'Garrick the Void Broker';
    this.bob = 0;
  }

  render(ctx) {
    this.bob += 0.04;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Carpet underneath
    ctx.fillStyle = '#831843';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-28, -20, 56, 40);
    ctx.strokeRect(-28, -20, 56, 40);

    // Wares on display
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -14, 8, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-10, -14, 8, 10);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(18, -9, 5, 0, Math.PI * 2);
    ctx.fill();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Robe
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Golden Cloak trim
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hood & glowing eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -4, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-4, -6, 2.5, 2);
    ctx.fillRect(2, -6, 2.5, 2);

    // Merchant name banner
    ctx.font = 'bold 11px "Cinzel", "Outfit", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('Garrick (Merchant)', 0, -22);

    ctx.restore();
  }
}

window.Player = Player;
window.Enemy = Enemy;
window.Projectile = Projectile;
window.GroundTelegraph = GroundTelegraph;
window.Particle = Particle;
window.FloatingText = FloatingText;
window.Urn = Urn;
window.SpikeTrap = SpikeTrap;
window.Shrine = Shrine;
window.Merchant = Merchant;

