// Game Engine & Loop Orchestrator

const DIFFICULTIES = {
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
window.DIFFICULTIES = DIFFICULTIES;

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
      mouseMoved: false,
      isTouchMode: false,
      joystick: null,
      aimJoystick: null,
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
    this.hitstopTimer = 0;
    this.bossEnemy = null;
    this.autoSaveTimer = 0;
    this.selectedHeroClass = 'WARRIOR';
    this.difficulty = 'NORMAL';
    this.hardcore = false;
    this.floorCleared = false;
    this._lastStairWarn = 0;
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

  getDifficultyMultipliers() {
    const diff = window.DIFFICULTIES?.[this.difficulty] || window.DIFFICULTIES?.NORMAL;
    return diff || {
      hpMult: 1.0,
      dmgMult: 1.0,
      speedMult: 1.0,
      eliteChance: 0.20,
      goldMult: 1.0,
      shardMult: 1.0,
      xpMult: 1.0
    };
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
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'PLAYING') this.pauseGame();
      } else {
        resize();
      }
    });
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING') this.pauseGame();
    });
    resize();
  }

  setupJoystick() {
    const moveArea = document.getElementById('joystick-container');
    if (moveArea && window.VirtualJoystick) {
      this.input.joystick = new window.VirtualJoystick(moveArea, {
        maxRadius: 46,
        deadzone: 0.08,
        side: 'left',
        theme: 'move',
        allowLeftScreenTouch: true
      });
    }

    const aimArea = document.getElementById('aim-joystick-container');
    if (aimArea && window.VirtualJoystick) {
      this.input.aimJoystick = new window.VirtualJoystick(aimArea, {
        maxRadius: 46,
        deadzone: 0.08,
        side: 'right',
        theme: 'aim',
        allowLeftScreenTouch: false
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

      // Handle pause toggles (Escape, P)
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
        return;
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
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.ui.toggleMinimapMode();
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        this.ui.cycleRadarZoom();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse aiming & attack (Desktop)
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.input.isTouchMode) {
        this.input.mouseMoved = true;
      }
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

    // Touch detection & audio unlock
    const handleCanvasTouch = () => {
      this.input.isTouchMode = true;
      if (window.soundEngine && !window.soundEngine.isInitialized) {
        window.soundEngine.init();
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

    // Toggle Pause with Menu/Start
    if (this.gamepad.isJustPressed('Menu') || this.gamepad.isJustPressed('Start')) {
      this.togglePause();
      return;
    }

    // Toggle Inventory with View/Back
    if (this.gamepad.isJustPressed('View')) {
      this.ui.toggleInventory();
    }

    // Toggle Radar / Full Map mode with DPad-Up or R3
    if (this.gamepad.isJustPressed('DPadUp') || this.gamepad.isJustPressed('R3')) {
      this.ui.toggleMinimapMode();
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

  triggerHitstop(duration = 0.045) {
    this.hitstopTimer = Math.max(this.hitstopTimer, duration);
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

    // 4. Check if on stairs (Locked until all villains eliminated)
    const stairsWorldX = (this.dungeon.stairs.x + 0.5) * this.dungeon.tileSize;
    const stairsWorldY = (this.dungeon.stairs.y + 0.5) * this.dungeon.tileSize;
    const distToStairs = Math.hypot(this.player.x - stairsWorldX, this.player.y - stairsWorldY);
    if (distToStairs < 42) {
      const remainingEnemies = this.enemies.filter(e => !e.isDead).length;
      if (remainingEnemies > 0) {
        if (this.dungeon.isBossFloor) {
          this.floatingTexts.push(new window.FloatingText(this.player.x, this.player.y - 25, 'Defeat the Overlord first!', '#ef4444', true));
        } else {
          this.floatingTexts.push(new window.FloatingText(
            this.player.x,
            this.player.y - 25,
            `🔒 Portal Sealed! Slay remaining ${remainingEnemies} villain${remainingEnemies === 1 ? '' : 's'}!`,
            '#ef4444',
            true
          ));
        }
        if (window.soundEngine && window.soundEngine.playHitImpact) {
          window.soundEngine.playHitImpact(false);
        }
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
    const diff = this.getDifficultyMultipliers();
    const drop = window.ItemSystem.generateLootDrop(this.floorNumber, false);
    if (drop.type === 'gold') {
      const scaledGold = Math.max(1, Math.round(drop.amount * diff.goldMult));
      this.player.gold += scaledGold;
      this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 25, `+${scaledGold} Gold!`, '#fbbf24', true));
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

    // Bonus Soul Shards drop from chests (scaled by difficulty)
    const baseShardDrop = Math.floor(6 + Math.random() * 6 * this.floorNumber);
    const shardDrop = Math.max(1, Math.round(baseShardDrop * diff.shardMult));
    if (window.StorageManager) window.StorageManager.addSoulShards(shardDrop);
    this.player.shardsEarnedThisRun = (this.player.shardsEarnedThisRun || 0) + shardDrop;
    this.floatingTexts.push(new window.FloatingText(chest.x, chest.y - 45, `+${shardDrop} 💎 Shards!`, '#c084fc', true));
    if (window.soundEngine) window.soundEngine.playShardCollect();

    this.requestAutoSave();
  }

  startNewGame(heroClass = null, difficulty = null, hardcore = null) {
    if (window.StorageManager) {
      window.StorageManager.clearActiveRun();
    }
    if (heroClass) {
      this.selectedHeroClass = heroClass;
    }
    if (difficulty) {
      this.difficulty = difficulty;
    } else if (this.ui && this.ui.selectedDifficulty) {
      this.difficulty = this.ui.selectedDifficulty;
    } else {
      this.difficulty = 'NORMAL';
    }

    if (hardcore !== null && hardcore !== undefined) {
      this.hardcore = !!hardcore;
    } else if (this.ui && this.ui.selectedHardcore !== undefined) {
      this.hardcore = !!this.ui.selectedHardcore;
    } else {
      this.hardcore = false;
    }

    this.floorNumber = 1;
    this.monstersDefeated = 0;
    this.loadFloor(this.floorNumber, true);
    this.state = 'PLAYING';

    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('mobile-controls')?.classList.remove('hidden');
    this.ui.hidePauseModal?.();

    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    this.ui.refreshInventoryUI();
    this.requestAutoSave();
    const modeLabel = this.hardcore ? ' (Hardcore Permadeath)' : '';
    this.showSaveToast(`Expedition Commenced • ${this.difficulty}${modeLabel}`);
  }

  resumeSavedGame() {
    const run = window.StorageManager ? window.StorageManager.getActiveRun() : null;
    if (!run || !run.playerData) {
      this.startNewGame();
      return;
    }

    this.floorNumber = run.floorNumber || 1;
    this.monstersDefeated = run.monstersDefeated || 0;
    this.difficulty = run.difficulty || 'NORMAL';
    this.hardcore = !!run.hardcore;
    this.loadFloor(this.floorNumber, false);
    this.player.deserialize(run.playerData);
    if (this.player.hp <= 0 || this.player.isDead) {
      this.player.hp = this.player.maxHp;
      this.player.isDead = false;
    }
    if (typeof run.shardsEarnedThisRun === 'number') {
      this.player.shardsEarnedThisRun = run.shardsEarnedThisRun;
    }

    this.state = 'PLAYING';
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('mobile-controls')?.classList.remove('hidden');
    this.ui.hidePauseModal?.();

    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    this.ui.refreshInventoryUI();
    this.showSaveToast(`✦ Resumed Depth ${this.floorNumber} [${this.difficulty}]`);
  }

  requestAutoSave() {
    if ((this.state === 'PLAYING' || this.state === 'PAUSED') && this.player && this.player.hp > 0 && window.StorageManager) {
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
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.requestAutoSave();
    }
    this.state = 'START';
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('mobile-controls')?.classList.add('hidden');
    this.ui.pauseModal?.classList.add('hidden');
    this.ui.inventoryModal?.classList.add('hidden');
    this.ui.closeModals();
    this.ui.closeShopModal();
    document.getElementById('start-screen')?.classList.remove('hidden');
    this.ui.updateTitleScreen();
    this.showSaveToast('✦ Saved & Exited to Title');
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';

    // Completely halt active inputs and joystick drag
    this.input.keys = {};
    if (this.input.joystick) {
      this.input.joystick.reset();
    }
    if (this.input.aimJoystick) {
      this.input.aimJoystick.reset();
    }
    if (this.player) {
      this.player.isMoving = false;
    }
    if (this.gamepad) {
      this.gamepad.stopVibration?.();
    }

    if (this.ui) {
      this.ui.showPauseModal();
    }
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.lastTime = performance.now();

    if (this.ui) {
      this.ui.hidePauseModal();
      this.ui.closeModals();
      this.ui.toggleInventory(false);
      this.ui.closeShopModal();
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.pauseGame();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  onModalOpened() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.input.keys = {};
      if (this.input.joystick) this.input.joystick.reset();
      if (this.input.aimJoystick) this.input.aimJoystick.reset();
      if (this.player) this.player.isMoving = false;
      if (this.gamepad) this.gamepad.stopVibration?.();
    }
  }

  onModalClosed() {
    if (this.state === 'PAUSED') {
      if (this.ui && !this.ui.isAnyModalOpen()) {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
      }
    }
  }

  handlePausedInput() {
    if (!this.gamepad || !this.gamepad.connected) return;

    if (this.gamepad.isJustPressed('Menu') || this.gamepad.isJustPressed('Start') || this.gamepad.isJustPressed('B')) {
      if (this.ui) {
        if (this.ui.isAnyModalOpen()) {
          this.ui.closeModals();
          this.ui.toggleInventory(false);
          this.ui.closeShopModal();
          this.ui.hidePauseModal();
        }
      }
      this.resumeGame();
    } else if (this.gamepad.isJustPressed('A')) {
      if (this.ui && this.ui.pauseModal && !this.ui.pauseModal.classList.contains('hidden')) {
        this.resumeGame();
      }
    }
  }

  restartGame(fromCurrentFloor = true) {
    if (this.ui && this.ui.gameOverScreen) this.ui.gameOverScreen.classList.add('hidden');
    if (this.ui && this.ui.victoryScreen) this.ui.victoryScreen.classList.add('hidden');

    // If restarting from current floor depth and not hardcore permadeath:
    if (fromCurrentFloor && !this.hardcore && this.floorNumber >= 1 && this.player) {
      // Revive and heal player fully
      this.player.isDead = false;
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.player.invulnerableTimer = 2.0; // Grace invulnerability period upon spawning
      this.player.isMoving = false;
      this.player.isAttacking = false;
      this.player.isDashing = false;

      // Replenish emergency potions if depleted
      if ((this.player.healthPotions || 0) < 2) {
        this.player.healthPotions = 2;
      }
      if ((this.player.manaPotions || 0) < 2) {
        this.player.manaPotions = 2;
      }

      // Re-generate current floor depth afresh
      this.loadFloor(this.floorNumber, false);

      // Camera centering & state restoration
      this.camera.x = this.player.x - this.canvas.width / 2;
      this.camera.y = this.player.y - this.canvas.height / 2;
      this.state = 'PLAYING';

      // Refresh UI HUD and persist checkpoint
      if (this.ui) this.ui.updateHUD(this.player, this.floorNumber);
      if (window.StorageManager) {
        window.StorageManager.saveCheckpointRun(this);
      }

      // Audio feedback & notification
      if (window.soundEngine && typeof window.soundEngine.playHeal === 'function') {
        window.soundEngine.playHeal();
      }
      if (this.ui && typeof this.ui.showToast === 'function') {
        this.ui.showToast(`✦ Respawned at Depth ${this.floorNumber} • Life Restored!`, 3200);
      }
      return;
    }

    // Otherwise, start fresh from floor 1
    if (window.StorageManager) {
      window.StorageManager.clearActiveRun();
    }
    this.startNewGame();
  }

  handlePlayerDeath() {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';

    if (this.player) {
      this.player.hp = 0;
      this.player.isDead = true;
      this.player.isMoving = false;
      this.player.isAttacking = false;
      this.player.isDashing = false;
    }

    // Camera impact shake & gamepad rumble
    if (this.camera) this.camera.shake(16, 0.6);
    if (this.gamepad) this.gamepad.vibrate(500, 0.8, 1.0);

    // Audio cue: procedural low-frequency descending death impact & ethereal resonance
    if (window.soundEngine && typeof window.soundEngine.playPlayerDeath === 'function') {
      window.soundEngine.playPlayerDeath();
    } else if (window.soundEngine && typeof window.soundEngine.playHitImpact === 'function') {
      window.soundEngine.playHitImpact(true);
    }

    // Death burst particles: soul essence and crimson sparks
    if (this.particles && this.player) {
      for (let i = 0; i < 35; i++) {
        const ang = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.4;
        const spd = 60 + Math.random() * 120;
        const isSoul = i % 2 === 0;
        const color = isSoul ? '#a855f7' : '#ef4444';
        this.particles.push(new window.Particle(
          this.player.x,
          this.player.y,
          color,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          0.8 + Math.random() * 0.6,
          4 + Math.random() * 4
        ));
      }
    }

    const shardsEarned = (this.player && this.player.shardsEarnedThisRun) || 0;
    if (window.StorageManager) {
      window.StorageManager.recordRunEnd({
        floor: this.floorNumber,
        level: this.player ? this.player.level : 1,
        monstersDefeated: this.monstersDefeated,
        gold: this.player ? this.player.gold : 0,
        shardsEarned: shardsEarned,
        difficulty: this.difficulty,
        hardcore: this.hardcore,
        outcome: 'PERISHED'
      });

      // Save checkpoint at current depth so user can restart from where they stopped
      if (!this.hardcore) {
        window.StorageManager.saveCheckpointRun(this);
      } else {
        window.StorageManager.clearActiveRun();
      }
    }

    if (this.ui) {
      this.ui.showGameOver({
        floor: this.floorNumber,
        level: this.player ? this.player.level : 1,
        monstersDefeated: this.monstersDefeated,
        gold: this.player ? this.player.gold : 0,
        shardsEarned: shardsEarned,
        difficulty: this.difficulty,
        hardcore: this.hardcore
      });
    }
  }

  loadFloor(floorNum, isFirstFloor = false) {
    this.floorNumber = floorNum;
    this.floorCleared = false;
    this._lastStairWarn = 0;
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
    this.lootDrops = [];
    this.bossEnemy = null;

    // Interactive Entities
    this.urns = this.dungeon.urns.map(u => new window.Urn(u.x, u.y));
    this.traps = this.dungeon.traps.map(t => new window.SpikeTrap(t.x, t.y));
    this.shrines = this.dungeon.shrines.map(s => new window.Shrine(s.x, s.y, s.type));
    this.merchant = this.dungeon.merchant ? new window.Merchant(this.dungeon.merchant.x, this.dungeon.merchant.y) : null;

    const diffOpts = this.getDifficultyMultipliers();
    if (this.dungeon.isBossFloor) {
      // Spawn Boss
      this.bossEnemy = new window.Enemy(this.dungeon.bossSpawn.x, this.dungeon.bossSpawn.y, 'BOSS', floorNum, diffOpts);
      this.enemies.push(this.bossEnemy);
    } else {
      // Spawn standard room mobs
      this.dungeon.enemySpawns.forEach(spawn => {
        const roll = Math.random();
        let type = 'SLIME';
        if (roll > 0.65) type = 'SORCERER';
        else if (roll > 0.3) type = 'SKELETON';
        this.enemies.push(new window.Enemy(spawn.x, spawn.y, type, floorNum, diffOpts));
      });
    }

    // Initial Fog of War Exploration Reveal
    this.dungeon.updateExploration(this.player.x, this.player.y, 8.5);

    // Set camera immediately to player
    this.camera.x = this.player.x - this.camera.width / 2;
    this.camera.y = this.player.y - this.camera.height / 2;
  }

  onFloorCleared() {
    if (this.floorCleared) return;
    this.floorCleared = true;

    // Celebratory floating text
    this.floatingTexts.push(new window.FloatingText(
      this.player.x,
      this.player.y - 50,
      '★ STAGE CLEARED — PORTAL UNSEALED! ★',
      '#10b981',
      true
    ));

    // Sound effect
    if (window.soundEngine && window.soundEngine.playLevelUp) {
      window.soundEngine.playLevelUp();
    }

    // Portal sparkles at stairs location
    if (this.dungeon && this.dungeon.stairs) {
      const sx = (this.dungeon.stairs.x + 0.5) * this.dungeon.tileSize;
      const sy = (this.dungeon.stairs.y + 0.5) * this.dungeon.tileSize;
      for (let i = 0; i < 28; i++) {
        this.particles.push(new window.Particle(sx, sy, {
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          size: 4 + Math.random() * 3,
          color: Math.random() < 0.5 ? '#10b981' : '#38bdf8',
          life: 0.85
        }));
      }
    }

    this.showSaveToast('★ All Villains Slain • Portal Unsealed ★');
  }

  descendFloor() {
    this.state = 'TRANSITION';
    if (this.input.joystick) this.input.joystick.reset();
    if (this.input.aimJoystick) this.input.aimJoystick.reset();
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
        this.restartGame(true);
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

    // Completely halt all gameplay, combat, enemies, traps, and projectiles while paused!
    if (this.state === 'PAUSED') {
      this.handlePausedInput();
      return;
    }

    if (this.state !== 'PLAYING') return;

    // Hitstop micro-freeze (tactile frame pause on crits & boss/elite kills)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (this.camera) this.camera.update(dt, this.player);
      if (this.particles) this.particles.forEach(p => p.update(dt));
      if (this.floatingTexts) this.floatingTexts.forEach(ft => ft.update(dt));
      return;
    }

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

    // Continuous Hold-to-Attack
    if ((this.input.attackHeld || this.input.keys['Space']) && this.player && !this.player.isDead) {
      if (this.player.attackCdTimer <= 0) {
        this.player.triggerPrimaryAttack(this.enemies, this.particles, this.floatingTexts, this.projectiles, this.urns);
      }
    }

    // Update Physical Ground Loot Pickups
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      const collected = drop.update(dt, this.player, this.particles, this.floatingTexts);
      if (collected) {
        this.lootDrops.splice(i, 1);
        if (this.ui) this.ui.updateHUD(this.player, this.floorNumber);
      }
    }

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

    // Player Death Check failsafe
    if (this.player && (this.player.hp <= 0 || this.player.isDead)) {
      this.handlePlayerDeath();
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
          // Drop massive loot (scaled by difficulty)
          const diff = this.getDifficultyMultipliers();
          const bossLoot = window.ItemSystem.generateLootDrop(this.floorNumber, true);
          this.player.inventory.push(bossLoot.item);
          const scaledGold = Math.max(1, Math.round(bossLoot.gold * diff.goldMult));
          this.player.gold += scaledGold;
          if (bossLoot.shards && window.StorageManager) {
            const scaledShards = Math.max(1, Math.round(bossLoot.shards * diff.shardMult));
            window.StorageManager.addSoulShards(scaledShards);
            this.player.shardsEarnedThisRun = (this.player.shardsEarnedThisRun || 0) + scaledShards;
          }
          this.ui.refreshInventoryUI();
          if (window.StorageManager) {
            window.StorageManager.recordRunEnd({
              floor: this.floorNumber,
              level: this.player.level,
              monstersDefeated: this.monstersDefeated,
              gold: this.player.gold,
              shardsEarned: this.player.shardsEarnedThisRun || 0,
              difficulty: this.difficulty,
              hardcore: this.hardcore,
              bossSlain: true,
              outcome: 'VICTORY'
            });
            window.StorageManager.clearActiveRun();
          }
          this.ui.showVictory(this.player.shardsEarnedThisRun || 0, this.difficulty, this.hardcore);
        }
        this.enemies.splice(i, 1);

        // Check if all villains have been eliminated on this floor!
        if (this.enemies.length === 0 && !this.dungeon.isBossFloor) {
          this.onFloorCleared();
        }
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

    // Check stepping onto stairs: auto-descend if cleared, or warn if sealed
    if (this.dungeon && this.dungeon.stairs) {
      const stairsWorldX = (this.dungeon.stairs.x + 0.5) * this.dungeon.tileSize;
      const stairsWorldY = (this.dungeon.stairs.y + 0.5) * this.dungeon.tileSize;
      const distToStairs = Math.hypot(this.player.x - stairsWorldX, this.player.y - stairsWorldY);
      const remainingEnemies = this.enemies.filter(e => !e.isDead).length;

      if (distToStairs < 26) {
        if (this.floorCleared && remainingEnemies === 0 && !this.dungeon.isBossFloor) {
          this.descendFloor();
          return;
        } else if (remainingEnemies > 0 || !this.floorCleared) {
          if (!this._lastStairWarn || Date.now() - this._lastStairWarn > 2600) {
            this._lastStairWarn = Date.now();
            this.floatingTexts.push(new window.FloatingText(
              this.player.x,
              this.player.y - 25,
              `🔒 Portal Sealed! ${remainingEnemies} villain${remainingEnemies === 1 ? '' : 's'} remain`,
              '#ef4444',
              true
            ));
            if (window.soundEngine && window.soundEngine.playHitImpact) {
              window.soundEngine.playHitImpact(false);
            }
          }
        }
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

    // 2.5. Render Target Reticle & Ground Loot Drops
    this.renderTargetReticle(ctx);
    if (this.lootDrops && this.lootDrops.length) {
      this.lootDrops.forEach(ld => ld.render(ctx));
    }

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

  renderTargetReticle(ctx) {
    if (!this.player || this.player.isDead || !this.enemies || !this.enemies.length) return;
    
    // Find closest alive enemy within engagement range (320px)
    let closestEnemy = null;
    let closestDist = 320;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.isDead) {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }
    }

    if (!closestEnemy) return;

    ctx.save();
    ctx.translate(closestEnemy.x, closestEnemy.y);
    const now = Date.now();
    const rot = (now / 1400) % (Math.PI * 2);
    const pulse = Math.sin(now / 180) * 2;
    const rad = closestEnemy.radius + 12 + pulse;

    // Glowing target ring
    ctx.strokeStyle = closestEnemy.isBoss ? '#ef4444' : (closestEnemy.isElite ? '#fbbf24' : 'rgba(56, 189, 248, 0.75)');
    ctx.lineWidth = 1.8;
    ctx.shadowColor = closestEnemy.isBoss ? '#ef4444' : (closestEnemy.isElite ? '#fbbf24' : '#38bdf8');
    ctx.shadowBlur = 8;

    // 4 Corner Brackets
    ctx.rotate(rot);
    const bracketLen = 0.45;
    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI / 2) - bracketLen / 2;
      const endAngle = startAngle + bracketLen;
      ctx.beginPath();
      ctx.arc(0, 0, rad, startAngle, endAngle);
      ctx.stroke();
    }

    // Center targeting pip
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

          const remaining = this.enemies ? this.enemies.filter(e => !e.isDead).length : 0;
          const isLocked = remaining > 0;

          if (isLocked) {
            // LOCKED PORTAL (Crimson obsidian seal with chained runic barrier)
            ctx.fillStyle = '#26060c';
            ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);

            // Pulsing Runic Lock Barrier
            const lockPulse = (Math.sin(Date.now() / 250) + 1) * 0.5;
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + lockPulse * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + 10, py + 10);
            ctx.lineTo(px + ts - 10, py + ts - 10);
            ctx.moveTo(px + ts - 10, py + 10);
            ctx.lineTo(px + 10, py + ts - 10);
            ctx.stroke();

            // Lock Icon in center
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', px + ts / 2, py + ts / 2);
          } else {
            // UNSEALED PORTAL (Radiant emerald stairs with ascending portal energy)
            ctx.fillStyle = '#065f46';
            ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);

            // Step bars
            ctx.fillStyle = '#34d399';
            ctx.fillRect(px + 10, py + 12, ts - 20, 4);
            ctx.fillRect(px + 10, py + 22, ts - 20, 4);
            ctx.fillRect(px + 10, py + 32, ts - 20, 4);

            // Swirling Portal Light Ripple
            const openPulse = (Math.sin(Date.now() / 180) + 1) * 0.5;
            ctx.strokeStyle = `rgba(52, 211, 153, ${0.4 + openPulse * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, (ts / 2 - 4) * (0.8 + openPulse * 0.2), 0, Math.PI * 2);
            ctx.stroke();
          }
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
