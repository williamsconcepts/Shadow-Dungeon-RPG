// Game Engine & Loop Orchestrator

class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffset = { x: 0, y: 0 };
  }

  shake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  update(targetX, targetY, dt, dungeon) {
    // Smooth camera lag
    const lerpSpeed = 8.0;
    this.x += (targetX - this.width / 2 - this.x) * lerpSpeed * dt;
    this.y += (targetY - this.height / 2 - this.y) * lerpSpeed * dt;

    // Bounds clamp
    const maxCameraX = dungeon.width * dungeon.tileSize - this.width;
    const maxCameraY = dungeon.height * dungeon.tileSize - this.height;
    this.x = Math.max(0, Math.min(this.x, Math.max(0, maxCameraX)));
    this.y = Math.max(0, Math.min(this.y, Math.max(0, maxCameraY)));

    // Process Trauma screen shake (if enabled)
    const shakeAllowed = window.StorageManager ? window.StorageManager.getSettings().screenShake !== false : true;
    if (this.shakeDuration > 0 && shakeAllowed) {
      this.shakeDuration -= dt;
      this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Offscreen lighting canvas for smooth dynamic shadows
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');

    this.floorNumber = 1;
    this.monstersDefeated = 0;
    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'TRANSITION', 'GAME_OVER', 'VICTORY'

    this.gamepad = new window.GamepadManager(this);

    this.input = {
      keys: {},
      mouseScreen: { x: 0, y: 0 },
      mouseWorld: { x: 0, y: 0 },
      isTouchMode: false,
      joystick: null,
      gamepad: this.gamepad
    };

    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.lastTime = 0;

    this.dungeon = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.telegraphs = [];
    this.lootDrops = [];
    this.bossEnemy = null;
    this.autoSaveTimer = 0;
    this.selectedHeroClass = 'WARRIOR';
    this.urns = [];
    this.traps = [];
    this.shrines = [];
    this.merchant = null;
    this.nextFloor = this.descendFloor.bind(this);
    window.gameInstance = this;

    this.setupWindow();
    this.setupInput();
    this.setupJoystick();

    this.ui = new window.UIManager(this);
  }

  setupWindow() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.lightCanvas.width = this.width;
      this.lightCanvas.height = this.height;

      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);

      this.camera.width = this.width;
      this.camera.height = this.height;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resize(); });
    resize();
  }

  setupJoystick() {
    const joystickArea = document.getElementById('joystick-container');
    if (joystickArea && window.VirtualJoystick) {
      this.input.joystick = new window.VirtualJoystick(joystickArea, {
        maxRadius: 46,
        deadzone: 0.08,
        allowLeftScreenTouch: true
      });
    }
  }

  setupInput() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Start audio on first interaction
      if (window.soundEngine && !window.soundEngine.isInitialized) {
        window.soundEngine.init();
      }

      if (this.state !== 'PLAYING') return;

      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.ui.toggleInventory();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.checkInteractOrAttack();
      } else if (e.code === 'ShiftLeft' || e.code === 'KeyQ') {
        this.player.triggerDash(this.particles);
      } else if (e.code === 'Digit1' || e.code === 'KeyE') {
        this.player.triggerSkill1(this.enemies, this.projectiles, this.particles, this.floatingTexts);
      } else if (e.code === 'Digit2' || e.code === 'KeyR') {
        this.player.triggerSkill2(this.enemies, this.particles, this.floatingTexts, this.camera);
      } else if (e.code === 'Digit3' || e.code === 'KeyF') {
        this.player.triggerSkill3(this.enemies, this.projectiles, this.particles, this.floatingTexts, this.camera);
      } else if (e.code === 'Digit4' || e.code === 'KeyC') {
        this.player.useHealthPotion(this.floatingTexts);
      } else if (e.code === 'Digit5' || e.code === 'KeyV') {
        this.player.useManaPotion(this.floatingTexts);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse aiming & attack
    this.canvas.addEventListener('mousemove', (e) => {
      this.input.mouseScreen.x = e.clientX;
      this.input.mouseScreen.y = e.clientY;
      this.input.mouseWorld.x = e.clientX + this.camera.x;
      this.input.mouseWorld.y = e.clientY + this.camera.y;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.state === 'PLAYING') {
        if (window.soundEngine && !window.soundEngine.isInitialized) {
          window.soundEngine.init();
        }
        this.checkInteractOrAttack();
      }
    });

    // Mobile Canvas Touch Aiming (Right half touches update world aim)
    const handleCanvasTouch = (e) => {
      this.input.isTouchMode = true;
      if (window.soundEngine && !window.soundEngine.isInitialized) {
        window.soundEngine.init();
      }
      if (e.touches && e.touches.length > 0) {
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t.clientX > window.innerWidth * 0.44) {
            this.input.mouseScreen.x = t.clientX;
            this.input.mouseScreen.y = t.clientY;
            this.input.mouseWorld.x = t.clientX + this.camera.x;
            this.input.mouseWorld.y = t.clientY + this.camera.y;
            break;
          }
        }
      }
    };
    this.canvas.addEventListener('touchstart', handleCanvasTouch, { passive: true });
    this.canvas.addEventListener('touchmove', handleCanvasTouch, { passive: true });

    // Touch detection
    window.addEventListener('touchstart', () => {
      this.input.isTouchMode = true;
      if (window.soundEngine && !window.soundEngine.isInitialized) {
        window.soundEngine.init();
      }
    }, { once: true });
  }

  handleGamepadGameplay() {
    if (!this.gamepad || !this.gamepad.connected) return;

    // Toggle Inventory with View/Back or Start/Menu
    if (this.gamepad.isJustPressed('View') || this.gamepad.isJustPressed('Menu')) {
      this.ui.toggleInventory();
    }

    // Check if shop modal is open
    const isShopOpen = this.ui.shopModal && !this.ui.shopModal.classList.contains('hidden');
    if (isShopOpen) {
      if (this.gamepad.isJustPressed('B')) {
        this.ui.closeShopModal();
      }
      return;
    }

    // Check if inventory is currently open
    const isInvOpen = this.ui.inventoryModal && !this.ui.inventoryModal.classList.contains('hidden');
    if (isInvOpen) {
      // 'B' button closes inventory
      if (this.gamepad.isJustPressed('B')) {
        this.ui.toggleInventory(false);
      }
      return; // Do not execute combat while managing equipment
    }

    // Primary Attack / Interact: 'A' or 'RT' (Right Trigger)
    if (this.gamepad.isJustPressed('A') || this.gamepad.isJustPressed('RT') || (this.gamepad.isDown('RT') && this.player.attackCdTimer <= 0)) {
      this.checkInteractOrAttack();
    }

    // Dash: 'B'
    if (this.gamepad.isJustPressed('B')) {
      if (this.player.triggerDash(this.particles)) {
        this.gamepad.vibrate(100, 0.3, 0.1);
      }
    }

    // Skill 1: 'X'
    if (this.gamepad.isJustPressed('X')) {
      if (this.player.triggerSkill1(this.enemies, this.projectiles, this.particles, this.floatingTexts)) {
        this.gamepad.vibrate(140, 0.4, 0.2);
      }
    }

    // Skill 2: 'Y'
    if (this.gamepad.isJustPressed('Y')) {
      if (this.player.triggerSkill2(this.enemies, this.particles, this.floatingTexts, this.camera)) {
        this.gamepad.vibrate(200, 0.3, 0.5);
      }
    }

    // Skill 3: 'RB' (Right Bumper)
    if (this.gamepad.isJustPressed('RB')) {
      if (this.player.triggerSkill3(this.enemies, this.projectiles, this.particles, this.floatingTexts, this.camera)) {
        this.gamepad.vibrate(280, 0.7, 0.8);
      }
    }

    // Health Potion: 'LB' (Left Bumper)
    if (this.gamepad.isJustPressed('LB')) {
      if (this.player.useHealthPotion(this.floatingTexts)) {
        this.gamepad.vibrate(100, 0.2, 0.2);
      }
    }

    // Mana Potion: 'LT' (Left Trigger)
    if (this.gamepad.isJustPressed('LT')) {
      if (this.player.useManaPotion(this.floatingTexts)) {
        this.gamepad.vibrate(100, 0.2, 0.2);
      }
    }
  }

  checkInteractOrAttack() {
    // 1. Check if near Merchant Garrick
    if (this.merchant) {
      const dm = Math.hypot(this.player.x - this.merchant.x, this.player.y - this.merchant.y);
      if (dm < 58) {
        this.ui.openShopModal(this.player, this.floorNumber);
        return;
      }
    }

    // 2. Check if near Mystical Shrine
    if (this.shrines) {
      for (const shrine of this.shrines) {
        if (!shrine.used) {
          const ds = Math.hypot(this.player.x - shrine.x, this.player.y - shrine.y);
          if (ds < 50) {
            shrine.activate(this.player, this.floatingTexts, this.particles, this.enemies);
            return;
          }
        }
      }
    }

    // 3. Check if near unopened chest
    for (const chest of this.dungeon.chests) {
      if (!chest.opened) {
        const d = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
        if (d < 45) {
          chest.opened = true;
          this.openChest(chest);
          return;
        }
      }
    }

    // 4. Check if on stairs
    const stairsWorldX = (this.dungeon.stairs.x + 0.5) * this.dungeon.tileSize;
    const stairsWorldY = (this.dungeon.stairs.y + 0.5) * this.dungeon.tileSize;
    const distToStairs = Math.hypot(this.player.x - stairsWorldX, this.player.y - stairsWorldY);
    if (distToStairs < 38) {
      if (this.dungeon.isBossFloor && this.bossEnemy && !this.bossEnemy.isDead) {
        this.floatingTexts.push(new window.FloatingText(this.player.x, this.player.y - 25, 'Defeat the Overlord first!', '#ef4444'));
        return;
      }
      this.descendFloor();
      return;
    }

    // 5. Otherwise standard primary attack (also breaks urns)
    this.player.triggerPrimaryAttack(this.enemies, this.particles, this.floatingTexts, this.projectiles, this.urns);
  }

  openChest(chest) {
    if (window.soundEngine) window.soundEngine.playChestOpen();

    // Chest sparkle burst
    for (let i = 0; i < 22; i++) {
      this.particles.push(new window.Particle(chest.x, chest.y, {
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        size: 4,
        color: '#fbbf24',
        life: 0.5
      }));
    }

    // Drop loot
    const drop = window.ItemSystem.generateLootDrop(this.floorNumber, false);
    if (drop.type === 'gold') {
      this.player.gold += drop.amount;
      this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 25, `+${drop.amount} Gold!`, '#fbbf24', true));
      if (window.soundEngine) window.soundEngine.playCoin();
    } else if (drop.type === 'potion') {
      if (drop.potionType === 'health') {
        this.player.healthPotions++;
        this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 25, `+1 Health Potion!`, '#ef4444', true));
      } else {
        this.player.manaPotions++;
        this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 25, `+1 Mana Potion!`, '#38bdf8', true));
      }
    } else if (drop.type === 'equipment') {
      this.player.inventory.push(drop.item);
      this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 25, `Found: ${drop.item.name}!`, drop.item.color, true));
      this.ui.refreshInventoryUI();
    }

    // Bonus Soul Shards drop from chests
    const shardDrop = Math.floor(6 + Math.random() * 6 * this.floorNumber);
    if (window.StorageManager) window.StorageManager.addSoulShards(shardDrop);
    this.player.shardsEarnedThisRun = (this.player.shardsEarnedThisRun || 0) + shardDrop;
    this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 45, `+${shardDrop} 💎 Shards!`, '#c084fc', true));
    if (window.soundEngine) window.soundEngine.playShardCollect();

    this.requestAutoSave();
  }

  startNewGame(heroClass = null) {
    if (window.StorageManager) {
      window.StorageManager.clearActiveRun();
    }
    if (heroClass) {
      this.selectedHeroClass = heroClass;
    }
    this.floorNumber = 1;
    this.monstersDefeated = 0;
    this.loadFloor(this.floorNumber, true);
    this.state = 'PLAYING';

    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('mobile-controls')?.classList.remove('hidden');

    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    this.ui.refreshInventoryUI();
    this.requestAutoSave();
    this.showSaveToast('Expedition Commenced');
  }

  resumeSavedGame() {
    const run = window.StorageManager ? window.StorageManager.getActiveRun() : null;
    if (!run || !run.playerData) {
      this.startNewGame();
      return;
    }

    this.floorNumber = run.floorNumber || 1;
    this.monstersDefeated = run.monstersDefeated || 0;
    this.loadFloor(this.floorNumber, false);
    this.player.deserialize(run.playerData);
    if (typeof run.shardsEarnedThisRun === 'number') {
      this.player.shardsEarnedThisRun = run.shardsEarnedThisRun;
    }

    this.state = 'PLAYING';
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('mobile-controls')?.classList.remove('hidden');

    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    this.ui.refreshInventoryUI();
    this.showSaveToast(`✦ Resumed Depth ${this.floorNumber}`);
  }

  requestAutoSave() {
    if (this.state === 'PLAYING' && this.player && this.player.hp > 0 && window.StorageManager) {
      window.StorageManager.saveActiveRun(this);
      this.showSaveToast('✦ Progress Auto-Saved');
    }
  }

  showSaveToast(msg = '✦ Progress Auto-Saved') {
    const toast = document.getElementById('save-toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.remove('hidden');
      toast.classList.add('visible');
      clearTimeout(this._saveToastTimer);
      this._saveToastTimer = setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.classList.add('hidden'), 350);
      }, 2200);
    }
  }

  saveAndExitToTitle() {
    if (this.state === 'PLAYING') {
      this.requestAutoSave();
    }
    this.state = 'START';
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobile-controls')?.classList.add('hidden');
    this.ui.inventoryModal?.classList.add('hidden');
    document.getElementById('start-screen')?.classList.remove('hidden');
    this.ui.updateTitleScreen();
    this.showSaveToast('✦ Saved & Exited to Title');
  }

  restartGame() {
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.victoryScreen.classList.add('hidden');
    this.startNewGame();
  }

  loadFloor(floorNum, isFirstFloor = false) {
    this.floorNumber = floorNum;
    this.dungeon = new window.Dungeon(floorNum);

    if (isFirstFloor || !this.player) {
      const heroClass = this.selectedHeroClass || 'WARRIOR';
      this.player = new window.Player(this.dungeon.playerStart.x, this.dungeon.playerStart.y, heroClass);
    } else {
      this.player.x = this.dungeon.playerStart.x;
      this.player.y = this.dungeon.playerStart.y;
    }

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.telegraphs = [];
    this.bossEnemy = null;

    // Interactive Entities
    this.urns = this.dungeon.urns.map(u => new window.Urn(u.x, u.y));
    this.traps = this.dungeon.traps.map(t => new window.SpikeTrap(t.x, t.y));
    this.shrines = this.dungeon.shrines.map(s => new window.Shrine(s.x, s.y, s.type));
    this.merchant = this.dungeon.merchant ? new window.Merchant(this.dungeon.merchant.x, this.dungeon.merchant.y) : null;

    if (this.dungeon.isBossFloor) {
      // Spawn Boss
      this.bossEnemy = new window.Enemy(this.dungeon.bossSpawn.x, this.dungeon.bossSpawn.y, 'BOSS', floorNum);
      this.enemies.push(this.bossEnemy);
    } else {
      // Spawn standard room mobs
      this.dungeon.enemySpawns.forEach(spawn => {
        const roll = Math.random();
        let type = 'SLIME';
        if (roll > 0.65) type = 'SORCERER';
        else if (roll > 0.3) type = 'SKELETON';
        this.enemies.push(new window.Enemy(spawn.x, spawn.y, type, floorNum));
      });
    }

    // Initial Fog of War Exploration Reveal
    this.dungeon.updateExploration(this.player.x, this.player.y, 8.5);

    // Set camera immediately to player
    this.camera.x = this.player.x - this.camera.width / 2;
    this.camera.y = this.player.y - this.camera.height / 2;
  }

  descendFloor() {
    this.state = 'TRANSITION';
    const transitionOverlay = document.getElementById('level-transition');
    if (transitionOverlay) {
      transitionOverlay.classList.remove('hidden');
      transitionOverlay.style.opacity = '1';
    }

    if (window.soundEngine) window.soundEngine.playLevelUp();

    setTimeout(() => {
      this.loadFloor(this.floorNumber + 1);
      setTimeout(() => {
        if (transitionOverlay) {
          transitionOverlay.style.opacity = '0';
          setTimeout(() => transitionOverlay.classList.add('hidden'), 400);
        }
        this.state = 'PLAYING';
        this.requestAutoSave();
      }, 300);
    }, 600);
  }

  update(dt) {
    if (this.gamepad) {
      this.gamepad.poll();
    }

    if (this.state === 'START') {
      if (this.gamepad && (this.gamepad.isJustPressed('A') || this.gamepad.isJustPressed('Menu') || this.gamepad.isJustPressed('RT'))) {
        this.startNewGame();
      }
      return;
    }

    if (this.state === 'GAME_OVER') {
      if (this.gamepad && (this.gamepad.isJustPressed('A') || this.gamepad.isJustPressed('Menu'))) {
        this.restartGame();
      }
      return;
    }

    if (this.state === 'VICTORY') {
      if (this.gamepad && (this.gamepad.isJustPressed('A') || this.gamepad.isJustPressed('Menu'))) {
        this.ui.victoryScreen.classList.add('hidden');
        this.descendFloor();
      }
      return;
    }

    if (this.state !== 'PLAYING') return;

    // Periodic Auto-Save
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 22) {
      this.autoSaveTimer = 0;
      this.requestAutoSave();
    }

    // Handle Gamepad combat & menu actions
    this.handleGamepadGameplay();

    // Update mouse world position
    this.input.mouseWorld.x = this.input.mouseScreen.x + this.camera.x;
    this.input.mouseWorld.y = this.input.mouseScreen.y + this.camera.y;

    // Update Player
    this.player.update(dt, this.input, this.dungeon, this.particles, this.floatingTexts);

    // Update Spike Traps
    if (this.traps) {
      this.traps.forEach(trap => {
        trap.update(dt, this.player, this.enemies, this.floatingTexts, this.particles, this.camera);
      });
    }

    // Update Exploration Fog of War
    if (this.dungeon && this.player) {
      this.dungeon.updateExploration(this.player.x, this.player.y, 8.5);
    }

    // Player Death Check
    if (this.player.hp <= 0) {
      this.state = 'GAME_OVER';
      const shardsEarned = this.player.shardsEarnedThisRun || 0;
      if (window.StorageManager) {
        window.StorageManager.recordRunEnd({
          floor: this.floorNumber,
          level: this.player.level,
          monstersDefeated: this.monstersDefeated,
          gold: this.player.gold,
          shardsEarned: shardsEarned,
          outcome: 'PERISHED'
        });
        window.StorageManager.clearActiveRun();
      }
      this.ui.showGameOver({
        floor: this.floorNumber,
        level: this.player.level,
        monstersDefeated: this.monstersDefeated,
        gold: this.player.gold,
        shardsEarned: shardsEarned
      });
      return;
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player, this.dungeon, this.projectiles, this.telegraphs, this.particles, this.floatingTexts, this.camera);
      if (enemy.isDead) {
        this.monstersDefeated++;
        // Check if boss died
        if (enemy.isBoss) {
          this.floatingTexts.push(new window.FloatingText(enemy.x, enemy.y - 40, 'ABYSS OVERLORD SLAIN!', '#fbbf24', true));
          // Drop massive loot
          const bossLoot = window.ItemSystem.generateLootDrop(this.floorNumber, true);
          this.player.inventory.push(bossLoot.item);
          this.player.gold += bossLoot.gold;
          if (bossLoot.shards && window.StorageManager) {
            window.StorageManager.addSoulShards(bossLoot.shards);
            this.player.shardsEarnedThisRun = (this.player.shardsEarnedThisRun || 0) + bossLoot.shards;
          }
          this.ui.refreshInventoryUI();
          if (window.StorageManager) {
            window.StorageManager.recordRunEnd({
              floor: this.floorNumber,
              level: this.player.level,
              monstersDefeated: this.monstersDefeated,
              gold: this.player.gold,
              shardsEarned: this.player.shardsEarnedThisRun || 0,
              bossSlain: true,
              outcome: 'VICTORY'
            });
            window.StorageManager.clearActiveRun();
          }
          this.ui.showVictory(this.player.shardsEarnedThisRun || 0);
        }
        this.enemies.splice(i, 1);
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const hitWall = p.update(dt, this.dungeon, this.particles);

      let collided = hitWall;
      if (!hitWall) {
        if (p.isPlayer) {
          // Check collision against enemies
          for (const e of this.enemies) {
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
              collided = true;
              e.takeDamage(p.damage, false, this.player, this.floatingTexts, this.particles);
              break;
            }
          }
          // Check collision against breakable urns
          if (!collided && this.urns) {
            for (const u of this.urns) {
              if (!u.broken && Math.hypot(p.x - u.x, p.y - u.y) < p.radius + u.radius) {
                u.break(this.player, this.floatingTexts, this.particles);
                collided = true;
                break;
              }
            }
          }
        } else {
          // Enemy projectile hitting player
          const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
          if (dist < p.radius + this.player.radius) {
            collided = true;
            this.player.takeDamage(p.damage, this.floatingTexts, this.camera);
          }
        }
      }

      if (collided) {
        // Splash explosion
        if (p.type === 'fireball' && window.soundEngine) {
          window.soundEngine.playExplosion();
        }
        for (let j = 0; j < 14; j++) {
          this.particles.push(new window.Particle(p.x, p.y, {
            vx: (Math.random() - 0.5) * 140,
            vy: (Math.random() - 0.5) * 140,
            size: 4,
            color: p.color,
            life: 0.3
          }));
        }
        this.projectiles.splice(i, 1);
      }
    }

    // Update Telegraph Zones
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      if (this.telegraphs[i].update(dt)) {
        this.telegraphs.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(dt);
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Camera follow player
    this.camera.update(this.player.x, this.player.y, dt, this.dungeon);

    // Update HUD
    this.ui.updateHUD(this.player, this.dungeon, this.bossEnemy);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.state === 'START') {
      return;
    }

    ctx.save();
    // Apply camera translate + shake offset
    ctx.translate(
      -Math.round(this.camera.x + this.camera.shakeOffset.x),
      -Math.round(this.camera.y + this.camera.shakeOffset.y)
    );

    // 1. Render Dungeon Tiles
    this.renderDungeonTiles(ctx);

    // 2. Render Chests & Stairs
    this.renderObjects(ctx);

    // 3. Render Ground Telegraph Danger Zones
    this.telegraphs.forEach(t => t.render(ctx));

    // 4. Render Enemies
    this.enemies.forEach(e => e.render(ctx));

    // 5. Render Player
    this.player.render(ctx);

    // 6. Render Projectiles
    this.projectiles.forEach(p => p.render(ctx));

    // 7. Render Particles
    this.particles.forEach(pt => pt.render(ctx));

    // 8. Render Floating Texts
    this.floatingTexts.forEach(ft => ft.render(ctx));

    ctx.restore();

    // 9. Render Dynamic 2D Lighting Mask
    this.renderLighting();
  }

  renderDungeonTiles(ctx) {
    const ts = this.dungeon.tileSize;
    const minTx = Math.max(0, Math.floor(this.camera.x / ts));
    const maxTx = Math.min(this.dungeon.width - 1, Math.ceil((this.camera.x + this.camera.width) / ts));
    const minTy = Math.max(0, Math.floor(this.camera.y / ts));
    const maxTy = Math.min(this.dungeon.height - 1, Math.ceil((this.camera.y + this.camera.height) / ts));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const tile = this.dungeon.tiles[ty][tx];
        const px = tx * ts;
        const py = ty * ts;

        if (tile === window.TILE.FLOOR) {
          // Stone slab texture variation
          const variation = (tx * 17 + ty * 31) % 4;
          ctx.fillStyle = variation === 0 ? '#131826' : (variation === 1 ? '#101420' : '#151b2b');
          ctx.fillRect(px, py, ts, ts);

          // Tile seam lines
          ctx.strokeStyle = '#0d111a';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (tile === window.TILE.WALL) {
          // Wall Front (Facing floor)
          ctx.fillStyle = '#1e2438';
          ctx.fillRect(px, py, ts, ts);
          // Dark drop shadow at base
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(px, py + ts - 8, ts, 8);
          // Wall brick lines
          ctx.strokeStyle = '#2d3748';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, ts, ts);
        } else if (tile === window.TILE.WALL_TOP) {
          // Wall Top (flat ceiling block)
          ctx.fillStyle = '#0f1320';
          ctx.fillRect(px, py, ts, ts);
        } else if (tile === window.TILE.STAIRS) {
          // Floor base
          ctx.fillStyle = '#101420';
          ctx.fillRect(px, py, ts, ts);
          // Glowing portal stairs
          ctx.fillStyle = '#065f46';
          ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);
          // Step bars
          ctx.fillStyle = '#34d399';
          ctx.fillRect(px + 10, py + 12, ts - 20, 4);
          ctx.fillRect(px + 10, py + 22, ts - 20, 4);
          ctx.fillRect(px + 10, py + 32, ts - 20, 4);
        }
      }
    }
  }

  renderObjects(ctx) {
    const ts = this.dungeon.tileSize;
    const time = Date.now() / 1000;

    // Render Torches on walls
    this.dungeon.torches.forEach(t => {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(t.x - 2, t.y, 4, 10);
      const flicker = Math.sin(time * 8 + t.flicker) * 2;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 2 + flicker, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 2 + flicker, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Floor Spike Traps (underneath entities)
    if (this.traps) {
      this.traps.forEach(t => t.render(ctx));
    }

    // Mystical Shrines
    if (this.shrines) {
      this.shrines.forEach(s => s.render(ctx));
    }

    // Wandering Merchant Garrick
    if (this.merchant) {
      this.merchant.render(ctx);
    }

    // Treasure Chests
    this.dungeon.chests.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);

      ctx.fillStyle = c.opened ? '#451a03' : '#78350f';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -8, 24, 16);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-3, -2, 6, 6);

      if (c.opened) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-14, -14, 28, 6);
      } else {
        if (Math.sin(time * 3) > 0.6) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(6, -6, 2, 2);
        }
      }
      ctx.restore();
    });

    // Breakable Urns
    if (this.urns) {
      this.urns.forEach(u => u.render(ctx));
    }
  }

  renderLighting() {
    const lCtx = this.lightCtx;
    lCtx.clearRect(0, 0, this.width, this.height);

    // Deep dungeon ambient darkness
    lCtx.fillStyle = 'rgba(4, 6, 12, 0.84)';
    lCtx.fillRect(0, 0, this.width, this.height);

    // Set composite mode to cut out light holes
    lCtx.globalCompositeOperation = 'destination-out';

    // 1. Player lantern light radius
    const screenPx = this.player.x - this.camera.x;
    const screenPy = this.player.y - this.camera.y;
    const playerRadius = 245 + Math.sin(Date.now() / 250) * 8;

    const pGrad = lCtx.createRadialGradient(screenPx, screenPy, 30, screenPx, screenPy, playerRadius);
    pGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    pGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.7)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    lCtx.fillStyle = pGrad;
    lCtx.beginPath();
    lCtx.arc(screenPx, screenPy, playerRadius, 0, Math.PI * 2);
    lCtx.fill();

    // 2. Wall Torches light radii
    this.dungeon.torches.forEach(t => {
      const tx = t.x - this.camera.x;
      const ty = t.y - this.camera.y;
      if (tx >= -150 && tx <= this.width + 150 && ty >= -150 && ty <= this.height + 150) {
        const torchR = t.radius + Math.sin(Date.now() / 150 + t.flicker) * 10;
        const tGrad = lCtx.createRadialGradient(tx, ty, 10, tx, ty, torchR);
        tGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        tGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        lCtx.fillStyle = tGrad;
        lCtx.beginPath();
        lCtx.arc(tx, ty, torchR, 0, Math.PI * 2);
        lCtx.fill();
      }
    });

    // 3. True Fog of War: Unexplored dungeon tiles are pitch black
    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = '#020408';

    const ts = this.dungeon.tileSize;
    const minTx = Math.max(0, Math.floor(this.camera.x / ts));
    const maxTx = Math.min(this.dungeon.width - 1, Math.ceil((this.camera.x + this.camera.width) / ts));
    const minTy = Math.max(0, Math.floor(this.camera.y / ts));
    const maxTy = Math.min(this.dungeon.height - 1, Math.ceil((this.camera.y + this.camera.height) / ts));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.dungeon.isExplored(tx, ty)) {
          const sx = tx * ts - this.camera.x;
          const sy = ty * ts - this.camera.y;
          lCtx.fillRect(sx, sy, ts + 1, ts + 1);
        }
      }
    }

    // Reset composite operation and stamp lighting onto main canvas
    this.ctx.drawImage(this.lightCanvas, 0, 0);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.Game = Game;
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
  window.gameInstance.start();

  const startBtn = document.getElementById('btn-start-game');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      window.gameInstance.startNewGame();
    });
  }
});
