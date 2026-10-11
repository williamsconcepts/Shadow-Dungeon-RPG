// ==========================================================================
// USER INTERFACE & HUD MANAGER
// Features: HUD Vitals & Minimap, Inventory Doll, Soul Sanctum Meta-Shop,
//           Hall of Records, Abyss Bestiary Codex, Settings & Run Persistence.
// ==========================================================================

class UIManager {
  constructor(game) {
    this.game = game;

    // HUD Elements
    this.hpBarFill = document.getElementById('hp-bar-fill');
    this.hpText = document.getElementById('hp-text');
    this.manaBarFill = document.getElementById('mana-bar-fill');
    this.manaText = document.getElementById('mana-text');
    this.xpBarFill = document.getElementById('xp-bar-fill');
    this.levelBadge = document.getElementById('level-badge');
    this.goldText = document.getElementById('gold-text');
    this.shardText = document.getElementById('shard-text');
    this.depthBadge = document.getElementById('depth-badge');

    // Boss Bar
    this.bossBarContainer = document.getElementById('boss-bar-container');
    this.bossBarFill = document.getElementById('boss-bar-fill');
    this.bossNameText = document.getElementById('boss-name-text');

    // Action / Skill Buttons
    this.btnAttack = document.getElementById('btn-attack');
    this.btnDash = document.getElementById('btn-dash');
    this.btnFireball = document.getElementById('btn-fireball');
    this.btnFrost = document.getElementById('btn-frost');
    this.btnThunder = document.getElementById('btn-thunder');
    this.btnPotionHp = document.getElementById('btn-potion-hp');
    this.btnPotionMp = document.getElementById('btn-potion-mp');
    this.potionHpCount = document.getElementById('potion-hp-count');
    this.potionMpCount = document.getElementById('potion-mp-count');

    // Modals
    this.inventoryModal = document.getElementById('inventory-modal');
    this.inventoryGrid = document.getElementById('inventory-grid');
    this.equipWeapon = document.getElementById('equip-weapon');
    this.equipArmor = document.getElementById('equip-armor');
    this.equipRing = document.getElementById('equip-ring');
    this.equipAmulet = document.getElementById('equip-amulet');
    this.itemTooltip = document.getElementById('item-tooltip');

    // Stats Panel Elements
    this.statAtk = document.getElementById('stat-atk');
    this.statDef = document.getElementById('stat-def');
    this.statCrit = document.getElementById('stat-crit');
    this.statSpeed = document.getElementById('stat-speed');
    this.statMagic = document.getElementById('stat-magic');

    // Meta-Progression & Hub Modals
    this.sanctumModal = document.getElementById('sanctum-modal');
    this.recordsModal = document.getElementById('records-modal');
    this.codexModal = document.getElementById('codex-modal');
    this.settingsModal = document.getElementById('settings-modal');

    // Title Screen Elements
    this.startScreen = document.getElementById('start-screen');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.activeRunPreview = document.getElementById('active-run-preview');
    this.activeRunStats = document.getElementById('active-run-stats');
    this.titleShardCount = document.getElementById('title-shard-count');

    // Screens
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.statsSummary = document.getElementById('game-over-stats');
    this.victoryStatsSummary = document.getElementById('victory-stats');

    // Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.bindButtons();
    this.bindHubModals();
    this.bindClassSelection();
    this.bindShopModal();
    this.updateTitleScreen();
  }

  bindClassSelection() {
    const classCards = document.querySelectorAll('.class-card');
    classCards.forEach(card => {
      card.addEventListener('click', () => {
        classCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const chosen = card.dataset.class;
        if (chosen) {
          this.game.selectedHeroClass = chosen;
          if (window.soundEngine && window.soundEngine.playBuy) {
            window.soundEngine.playBuy();
          }
        }
      });
    });
  }

  // -------------------------------------------------------------
  // TITLE SCREEN & RUN PERSISTENCE
  // -------------------------------------------------------------
  updateTitleScreen() {
    const hasRun = window.StorageManager ? window.StorageManager.hasActiveRun() : false;
    const profile = window.StorageManager ? window.StorageManager.getProfile() : { soulShards: 0 };

    if (this.titleShardCount) {
      this.titleShardCount.textContent = profile.soulShards;
    }

    if (hasRun && this.btnResumeGame) {
      const run = window.StorageManager.getActiveRun();
      this.btnResumeGame.classList.remove('hidden');
      this.btnResumeGame.innerHTML = `<span class="btn-sparkle">✦</span> RESUME EXPEDITION (Depth ${run.floorNumber} • Lv ${run.playerData.level}) <span class="btn-sparkle">✦</span>`;

      if (this.btnStartGame) {
        this.btnStartGame.innerHTML = `<span class="btn-sparkle">⚔</span> NEW EXPEDITION <span class="btn-sparkle">⚔</span>`;
      }

      if (this.activeRunPreview && this.activeRunStats) {
        this.activeRunPreview.classList.remove('hidden');
        const eqCount = Object.values(run.playerData.equipped || {}).filter(Boolean).length;
        const invCount = (run.playerData.inventory || []).length;
        this.activeRunStats.innerHTML = `
          <span><strong>Depth:</strong> Floor ${run.floorNumber}</span>
          <span><strong>Hero:</strong> Level ${run.playerData.level} (${Math.ceil(run.playerData.hp)}/${run.playerData.maxHp} HP)</span>
          <span><strong>Spoils:</strong> ${run.playerData.gold} Gold • ${run.shardsEarnedThisRun || 0} 💎</span>
          <span><strong>Gear:</strong> ${eqCount} Equipped, ${invCount} in Pack</span>
        `;
      }
    } else {
      if (this.btnResumeGame) this.btnResumeGame.classList.add('hidden');
      if (this.btnStartGame) {
        this.btnStartGame.innerHTML = `<span class="btn-sparkle">✦</span> ENTER THE DUNGEON <span class="btn-sparkle">✦</span>`;
      }
      if (this.activeRunPreview) this.activeRunPreview.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------
  // CONTROLS & HUD BINDINGS
  // -------------------------------------------------------------
  bindButtons() {
    // Start / Resume Buttons
    if (this.btnResumeGame) {
      this.btnResumeGame.addEventListener('click', () => this.game.resumeSavedGame());
    }

    if (this.btnStartGame) {
      this.btnStartGame.addEventListener('click', () => {
        if (window.StorageManager && window.StorageManager.hasActiveRun()) {
          const proceed = confirm("Starting a new expedition will abandon your saved run in progress. Begin anew?");
          if (!proceed) return;
        }
        this.game.startNewGame();
      });
    }

    // Attack / Interact button
    if (this.btnAttack) {
      const triggerAttack = (e) => {
        e.preventDefault();
        this.game.checkInteractOrAttack();
      };
      this.btnAttack.addEventListener('touchstart', triggerAttack, { passive: false });
      this.btnAttack.addEventListener('mousedown', triggerAttack);
    }

    // Dash
    if (this.btnDash) {
      const triggerDash = (e) => {
        e.preventDefault();
        this.game.player.triggerDash(this.game.particles);
      };
      this.btnDash.addEventListener('touchstart', triggerDash, { passive: false });
      this.btnDash.addEventListener('mousedown', triggerDash);
    }

    // Skill 1 (Fireball / Whirlwind / Poison Daggers)
    if (this.btnFireball) {
      const triggerSkill1 = (e) => {
        e.preventDefault();
        this.game.player.triggerSkill1(this.game.enemies, this.game.projectiles, this.game.particles, this.game.floatingTexts);
      };
      this.btnFireball.addEventListener('touchstart', triggerSkill1, { passive: false });
      this.btnFireball.addEventListener('mousedown', triggerSkill1);
    }

    // Skill 2 (Frost Nova / Stomp / Smoke Bomb)
    if (this.btnFrost) {
      const triggerSkill2 = (e) => {
        e.preventDefault();
        this.game.player.triggerSkill2(this.game.enemies, this.game.particles, this.game.floatingTexts, this.game.camera);
      };
      this.btnFrost.addEventListener('touchstart', triggerSkill2, { passive: false });
      this.btnFrost.addEventListener('mousedown', triggerSkill2);
    }

    // Skill 3 (Thunder / Roar / Assassination)
    if (this.btnThunder) {
      const triggerSkill3 = (e) => {
        e.preventDefault();
        this.game.player.triggerSkill3(this.game.enemies, this.game.projectiles, this.game.particles, this.game.floatingTexts, this.game.camera);
      };
      this.btnThunder.addEventListener('touchstart', triggerSkill3, { passive: false });
      this.btnThunder.addEventListener('mousedown', triggerSkill3);
    }

    // Health Potion
    if (this.btnPotionHp) {
      const useHp = (e) => {
        e.preventDefault();
        this.game.player.useHealthPotion(this.game.floatingTexts);
      };
      this.btnPotionHp.addEventListener('touchstart', useHp, { passive: false });
      this.btnPotionHp.addEventListener('mousedown', useHp);
    }

    // Mana Potion
    if (this.btnPotionMp) {
      const useMp = (e) => {
        e.preventDefault();
        this.game.player.useManaPotion(this.game.floatingTexts);
      };
      this.btnPotionMp.addEventListener('touchstart', useMp, { passive: false });
      this.btnPotionMp.addEventListener('mousedown', useMp);
    }

    // Inventory Toggle button
    const btnInventory = document.getElementById('btn-inventory-toggle');
    if (btnInventory) {
      btnInventory.addEventListener('click', () => this.toggleInventory());
    }

    // Close Inventory
    const btnCloseInv = document.getElementById('btn-close-inv');
    if (btnCloseInv) {
      btnCloseInv.addEventListener('click', () => this.toggleInventory(false));
    }

    // Save & Exit Button (HUD)
    const btnSaveExit = document.getElementById('btn-save-exit');
    if (btnSaveExit) {
      btnSaveExit.addEventListener('click', () => this.game.saveAndExitToTitle());
    }

    // HUD Sanctum Button
    const btnHudSanctum = document.getElementById('btn-hud-sanctum');
    if (btnHudSanctum) {
      btnHudSanctum.addEventListener('click', () => this.openSanctumModal());
    }

    // Audio Mute Toggle
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        if (window.soundEngine) {
          const muted = window.soundEngine.toggleMute();
          btnAudio.innerHTML = muted ? '🔇' : '🔊';
        }
      });
    }

    // Restart & Victory Continue
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.game.restartGame());
    }

    const btnVictoryContinue = document.getElementById('btn-victory-continue');
    if (btnVictoryContinue) {
      btnVictoryContinue.addEventListener('click', () => {
        this.victoryScreen.classList.add('hidden');
        this.game.descendFloor();
      });
    }

    // Game Over & Victory "Enter Soul Sanctum" buttons
    const btnGameOverSanctum = document.getElementById('btn-gameover-sanctum');
    if (btnGameOverSanctum) {
      btnGameOverSanctum.addEventListener('click', () => {
        this.gameOverScreen.classList.add('hidden');
        this.openSanctumModal();
      });
    }

    const btnVictorySanctum = document.getElementById('btn-victory-sanctum');
    if (btnVictorySanctum) {
      btnVictorySanctum.addEventListener('click', () => {
        this.victoryScreen.classList.add('hidden');
        this.openSanctumModal();
      });
    }
  }

  // -------------------------------------------------------------
  // HUB MODALS: SOUL SANCTUM, RECORDS, CODEX, SETTINGS
  // -------------------------------------------------------------
  bindHubModals() {
    // Title screen buttons
    document.getElementById('btn-open-sanctum')?.addEventListener('click', () => this.openSanctumModal());
    document.getElementById('btn-open-records')?.addEventListener('click', () => this.openRecordsModal());
    document.getElementById('btn-open-codex')?.addEventListener('click', () => this.openCodexModal());
    document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSettingsModal());

    // Close buttons
    document.getElementById('btn-close-sanctum')?.addEventListener('click', () => this.closeModals());
    document.getElementById('btn-close-records')?.addEventListener('click', () => this.closeModals());
    document.getElementById('btn-close-codex')?.addEventListener('click', () => this.closeModals());
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeModals());

    // Close modal when clicking backdrop
    [this.sanctumModal, this.recordsModal, this.codexModal, this.settingsModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModals();
        });
      }
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals();
        this.toggleInventory(false);
      }
    });
  }

  closeModals() {
    this.sanctumModal?.classList.add('hidden');
    this.recordsModal?.classList.add('hidden');
    this.codexModal?.classList.add('hidden');
    this.settingsModal?.classList.add('hidden');
    this.updateTitleScreen();
  }

  // --- 1. SOUL SANCTUM UI ---
  openSanctumModal() {
    this.closeModals();
    this.renderSanctumUI();
    this.sanctumModal?.classList.remove('hidden');
  }

  renderSanctumUI() {
    if (!window.StorageManager) return;
    const profile = window.StorageManager.getProfile();
    const balanceEl = document.getElementById('sanctum-balance-text');
    if (balanceEl) balanceEl.textContent = profile.soulShards;

    const grid = document.getElementById('sanctum-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const upgrades = window.StorageManager.SANCTUM_UPGRADES;
    for (const key in upgrades) {
      const cfg = upgrades[key];
      const rank = profile.upgrades[key] || 0;
      const isMax = rank >= cfg.maxRank;
      const cost = isMax ? 0 : cfg.costs[rank];
      const canAfford = !isMax && profile.soulShards >= cost;

      const card = document.createElement('div');
      card.className = `sanctum-card glass-panel ${isMax ? 'maxed' : ''}`;

      // Build rank pips
      let pipsHtml = '';
      for (let i = 1; i <= cfg.maxRank; i++) {
        pipsHtml += `<span class="rank-pip ${i <= rank ? 'filled' : ''}"></span>`;
      }

      card.innerHTML = `
        <div class="sanctum-card-header">
          <span class="sanctum-icon">${cfg.icon}</span>
          <div class="sanctum-title-wrap">
            <h4>${cfg.name}</h4>
            <div class="rank-pips">${pipsHtml}</div>
          </div>
        </div>
        <p class="sanctum-desc">${cfg.desc}</p>
        <div class="sanctum-card-footer">
          <div class="sanctum-cost">
            ${isMax ? '<span class="max-badge">★ MAX RANK</span>' : `<span>Cost:</span> <strong>${cost} 💎</strong>`}
          </div>
          <button class="btn-sanctum-upgrade ${canAfford ? 'active' : ''}" ${!canAfford ? 'disabled' : ''}>
            ${isMax ? 'MAXED' : 'UPGRADE'}
          </button>
        </div>
      `;

      if (!isMax) {
        const btn = card.querySelector('.btn-sanctum-upgrade');
        btn.addEventListener('click', () => {
          const res = window.StorageManager.upgradeSanctum(key);
          if (res.success) {
            if (window.soundEngine) window.soundEngine.playSanctumUpgrade();
            this.renderSanctumUI();
            this.updateTitleScreen();
            if (this.game.player) {
              this.game.player.recalculateStats();
              this.refreshInventoryUI();
            }
          }
        });
      }

      grid.appendChild(card);
    }
  }

  // --- 2. HALL OF RECORDS UI ---
  openRecordsModal() {
    this.closeModals();
    this.renderRecordsUI();
    this.recordsModal?.classList.remove('hidden');
  }

  renderRecordsUI() {
    if (!window.StorageManager) return;
    const records = window.StorageManager.getRecords();

    document.getElementById('record-deepest-floor').textContent = `Depth ${records.deepestFloor}`;
    document.getElementById('record-highest-lvl').textContent = `LVL ${records.highestLevel}`;
    document.getElementById('record-total-runs').textContent = records.totalRuns;
    document.getElementById('record-victories').textContent = records.victories;
    document.getElementById('record-total-kills').textContent = records.totalKills;
    document.getElementById('record-total-gold').textContent = `${records.totalGold} 🪙`;
    document.getElementById('record-total-shards').textContent = `${records.totalShards} 💎`;

    const tbody = document.getElementById('records-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!records.recentRuns || records.recentRuns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No expeditions recorded yet. Enter the dungeon!</td></tr>`;
      return;
    }

    records.recentRuns.forEach(r => {
      const tr = document.createElement('tr');
      const isVic = r.outcome === 'VICTORY';
      tr.innerHTML = `
        <td>${r.date}</td>
        <td><span class="outcome-badge ${isVic ? 'outcome-victory' : 'outcome-perished'}">${r.outcome}</span></td>
        <td>Depth ${r.floor}</td>
        <td>Lv ${r.level}</td>
        <td>${r.gold} 🪙</td>
        <td>${r.shards} 💎</td>
        <td>${r.kills} 💀</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- 3. ABYSS CODEX UI ---
  openCodexModal() {
    this.closeModals();
    this.renderCodexUI();
    this.codexModal?.classList.remove('hidden');
  }

  renderCodexUI() {
    if (!window.StorageManager) return;
    const codex = window.StorageManager.getCodex();

    const bestiaryGrid = document.getElementById('bestiary-grid');
    if (bestiaryGrid) {
      bestiaryGrid.innerHTML = '';
      const monsters = [
        { key: 'SLIME', name: 'Abyssal Slime', icon: '🟢', desc: 'Ravenous amorphous ooze born from stagnant demonic bile. Slow but persistent.' },
        { key: 'SKELETON', name: 'Skeleton Warrior', icon: '💀', desc: 'Resurrected remain of fallen crusaders cursed to wander the endless depths.' },
        { key: 'SORCERER', name: 'Void Sorcerer', icon: '🧙‍♂️', desc: 'Corrupted chanters who cast seeking nether fireballs from distance.' },
        { key: 'BOSS', name: 'Abyss Overlord', icon: '👹', desc: 'Ancient demonic entity commanding the deepest catacombs with cataclysmic strikes.' }
      ];

      monsters.forEach(m => {
        const kills = codex.enemies[m.key] || 0;
        const card = document.createElement('div');
        card.className = 'bestiary-card glass-panel';
        card.innerHTML = `
          <div class="bestiary-icon">${m.icon}</div>
          <div class="bestiary-info">
            <h4>${m.name}</h4>
            <p>${m.desc}</p>
            <div class="bestiary-kills">Vanquished: <strong>${kills}</strong></div>
          </div>
        `;
        bestiaryGrid.appendChild(card);
      });
    }

    const relicsContainer = document.getElementById('discovered-relics-list');
    if (relicsContainer) {
      relicsContainer.innerHTML = '';
      if (!codex.discoveredItems || codex.discoveredItems.length === 0) {
        relicsContainer.innerHTML = `<div class="relic-empty">Open chests and defeat bosses to discover legendary relics!</div>`;
      } else {
        codex.discoveredItems.forEach(item => {
          const chip = document.createElement('div');
          chip.className = `relic-chip rarity-${item.rarity.toLowerCase()}`;
          chip.innerHTML = `<span>${item.icon}</span> <span>${item.name}</span>`;
          relicsContainer.appendChild(chip);
        });
      }
    }
  }

  // --- 4. SETTINGS UI ---
  openSettingsModal() {
    this.closeModals();
    this.renderSettingsUI();
    this.settingsModal?.classList.remove('hidden');
  }

  renderSettingsUI() {
    if (!window.StorageManager) return;
    const settings = window.StorageManager.getSettings();

    const volSlider = document.getElementById('setting-volume-slider');
    const volLabel = document.getElementById('setting-volume-label');
    const muteBox = document.getElementById('setting-mute-checkbox');
    const shakeBox = document.getElementById('setting-shake-checkbox');
    const vibBox = document.getElementById('setting-vibration-checkbox');
    const wipeBtn = document.getElementById('btn-wipe-data');

    if (volSlider && volLabel) {
      volSlider.value = Math.round((settings.volume || 0.7) * 100);
      volLabel.textContent = `${volSlider.value}%`;
      volSlider.oninput = (e) => {
        const val = parseInt(e.target.value, 10) / 100;
        volLabel.textContent = `${e.target.value}%`;
        if (window.soundEngine) window.soundEngine.setVolume(val);
      };
    }

    if (muteBox) {
      muteBox.checked = !!settings.soundMuted;
      muteBox.onchange = (e) => {
        if (window.soundEngine) window.soundEngine.setMuted(e.target.checked);
        const btnAudio = document.getElementById('btn-audio-toggle');
        if (btnAudio) btnAudio.innerHTML = e.target.checked ? '🔇' : '🔊';
      };
    }

    if (shakeBox) {
      shakeBox.checked = settings.screenShake !== false;
      shakeBox.onchange = (e) => {
        window.StorageManager.saveSettings({ screenShake: e.target.checked });
      };
    }

    if (vibBox) {
      vibBox.checked = settings.vibration !== false;
      vibBox.onchange = (e) => {
        window.StorageManager.saveSettings({ vibration: e.target.checked });
      };
    }

    if (wipeBtn) {
      wipeBtn.onclick = () => {
        const confirmed = confirm("⚠️ DANGER: This will permanently wipe all saved runs, Soul Sanctum upgrades, and lifetime records. Are you completely sure?");
        if (confirmed) {
          window.StorageManager.wipeAllData();
          location.reload();
        }
      };
    }
  }

  // -------------------------------------------------------------
  // IN-GAME HUD UPDATE
  // -------------------------------------------------------------
  updateHUD(player, dungeon, bossEnemy) {
    // Health Bar
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    this.hpBarFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    // Mana Bar
    const manaPct = Math.max(0, Math.min(100, (player.mana / player.maxMana) * 100));
    this.manaBarFill.style.width = `${manaPct}%`;
    this.manaText.textContent = `${Math.ceil(player.mana)} / ${player.maxMana}`;

    // XP Bar
    const xpPct = Math.max(0, Math.min(100, (player.xp / player.xpToNext) * 100));
    this.xpBarFill.style.width = `${xpPct}%`;
    this.levelBadge.textContent = `LVL ${player.level}`;

    // Gold & Shards & Depth
    this.goldText.textContent = `${player.gold}`;
    if (this.shardText && window.StorageManager) {
      this.shardText.textContent = window.StorageManager.getProfile().soulShards;
    }
    this.depthBadge.textContent = `Depth ${dungeon.floor}${dungeon.isBossFloor ? ' (Boss)' : ''}`;

    // Potions Count
    this.potionHpCount.textContent = player.healthPotions;
    this.potionMpCount.textContent = player.manaPotions;

    // Skill cooldown visual overlays & dynamic hero kit icons
    const sDash = player.skills.dash;
    const s1 = player.skills.skill1 || player.skills.fireball;
    const s2 = player.skills.skill2 || player.skills.frostNova;
    const s3 = player.skills.skill3 || player.skills.thunder;

    if (sDash && this.btnDash) {
      const iconSpan = this.btnDash.querySelector('.skill-icon');
      if (iconSpan && sDash.icon) iconSpan.textContent = sDash.icon;
      this.btnDash.title = `${sDash.name} (${sDash.keyHint || 'Q'} / B)`;
      this.updateSkillCooldown(this.btnDash, sDash, player.mana);
    }
    if (s1 && this.btnFireball) {
      const iconSpan = this.btnFireball.querySelector('.skill-icon');
      if (iconSpan && s1.icon) iconSpan.textContent = s1.icon;
      this.btnFireball.title = `${s1.name} (${s1.keyHint || '1'} / X)`;
      this.updateSkillCooldown(this.btnFireball, s1, player.mana);
    }
    if (s2 && this.btnFrost) {
      const iconSpan = this.btnFrost.querySelector('.skill-icon');
      if (iconSpan && s2.icon) iconSpan.textContent = s2.icon;
      this.btnFrost.title = `${s2.name} (${s2.keyHint || '2'} / Y)`;
      this.updateSkillCooldown(this.btnFrost, s2, player.mana);
    }
    if (s3 && this.btnThunder) {
      const iconSpan = this.btnThunder.querySelector('.skill-icon');
      if (iconSpan && s3.icon) iconSpan.textContent = s3.icon;
      this.btnThunder.title = `${s3.name} (${s3.keyHint || '3'} / RB)`;
      this.updateSkillCooldown(this.btnThunder, s3, player.mana);
    }

    // Boss Bar
    if (bossEnemy && !bossEnemy.isDead) {
      this.bossBarContainer.classList.remove('hidden');
      this.bossNameText.textContent = bossEnemy.name;
      const bPct = Math.max(0, (bossEnemy.hp / bossEnemy.maxHp) * 100);
      this.bossBarFill.style.width = `${bPct}%`;
    } else {
      this.bossBarContainer.classList.add('hidden');
    }

    // Render Minimap
    this.renderMinimap(player, dungeon);
  }

  updateSkillCooldown(btnEl, skill, currentMana) {
    if (!btnEl || !skill) return;
    const overlay = btnEl.querySelector('.cd-overlay');
    const cdText = btnEl.querySelector('.cd-text');

    if (skill.currentCd > 0) {
      const pct = (skill.currentCd / skill.cd) * 100;
      if (overlay) overlay.style.height = `${pct}%`;
      if (cdText) cdText.textContent = skill.currentCd.toFixed(1) + 's';
      btnEl.classList.add('on-cd');
    } else {
      if (overlay) overlay.style.height = '0%';
      if (cdText) cdText.textContent = '';
      btnEl.classList.remove('on-cd');
    }

    if (currentMana < skill.cost) {
      btnEl.classList.add('no-mana');
    } else {
      btnEl.classList.remove('no-mana');
    }
  }

  renderMinimap(player, dungeon) {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    // Pitch black background for unexplored darkness
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / dungeon.width;
    const scaleY = h / dungeon.height;

    // Only draw EXPLORED tiles!
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.isExplored(x, y)) {
          const tile = dungeon.tiles[y][x];
          if (tile === window.TILE.FLOOR) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
          } else if (tile === window.TILE.STAIRS) {
            ctx.fillStyle = '#10b981';
            ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX * 1.5), Math.ceil(scaleY * 1.5));
          } else if (tile === window.TILE.WALL) {
            ctx.fillStyle = '#334155';
            ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
          }
        }
      }
    }

    // Draw explored shrines
    if (this.game.shrines) {
      this.game.shrines.forEach(s => {
        const tx = Math.floor(s.x / dungeon.tileSize);
        const ty = Math.floor(s.y / dungeon.tileSize);
        if (dungeon.isExplored(tx, ty)) {
          ctx.fillStyle = s.used ? '#64748b' : '#38bdf8';
          const sx = (s.x / dungeon.tileSize) * scaleX;
          const sy = (s.y / dungeon.tileSize) * scaleY;
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      });
    }

    // Draw merchant if explored
    if (this.game.merchant) {
      const mx = Math.floor(this.game.merchant.x / dungeon.tileSize);
      const my = Math.floor(this.game.merchant.y / dungeon.tileSize);
      if (dungeon.isExplored(mx, my)) {
        ctx.fillStyle = '#fbbf24';
        const msx = (this.game.merchant.x / dungeon.tileSize) * scaleX;
        const msy = (this.game.merchant.y / dungeon.tileSize) * scaleY;
        ctx.beginPath();
        ctx.arc(msx, msy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw chests if explored
    dungeon.chests.forEach(c => {
      const tx = Math.floor(c.x / dungeon.tileSize);
      const ty = Math.floor(c.y / dungeon.tileSize);
      if (!c.opened && dungeon.isExplored(tx, ty)) {
        ctx.fillStyle = '#f59e0b';
        const cx = (c.x / dungeon.tileSize) * scaleX;
        const cy = (c.y / dungeon.tileSize) * scaleY;
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    });

    // Draw enemies if within explored tiles
    this.game.enemies.forEach(e => {
      if (!e.isDead) {
        const etx = Math.floor(e.x / dungeon.tileSize);
        const ety = Math.floor(e.y / dungeon.tileSize);
        if (dungeon.isExplored(etx, ety)) {
          ctx.fillStyle = e.isBoss ? '#dc2626' : (e.isElite ? '#f97316' : '#f87171');
          const ex = (e.x / dungeon.tileSize) * scaleX;
          const ey = (e.y / dungeon.tileSize) * scaleY;
          const sz = e.isBoss ? 5 : (e.isElite ? 3.5 : 2);
          ctx.fillRect(ex - sz / 2, ey - sz / 2, sz, sz);
        }
      }
    });

    // Draw player
    const px = (player.x / dungeon.tileSize) * scaleX;
    const py = (player.y / dungeon.tileSize) * scaleY;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // -------------------------------------------------------------
  // INVENTORY MODAL
  // -------------------------------------------------------------
  toggleInventory(forcedState = null) {
    const isCurrentlyOpen = !this.inventoryModal.classList.contains('hidden');
    const newState = (forcedState !== null) ? forcedState : !isCurrentlyOpen;

    if (newState) {
      this.inventoryModal.classList.remove('hidden');
      this.refreshInventoryUI();
    } else {
      this.inventoryModal.classList.add('hidden');
      if (this.itemTooltip) this.itemTooltip.classList.add('hidden');
    }
  }

  refreshInventoryUI() {
    const player = this.game.player;
    if (!player) return;

    // Update stats preview
    if (this.statAtk) this.statAtk.textContent = player.atk;
    if (this.statDef) this.statDef.textContent = player.def;
    if (this.statCrit) this.statCrit.textContent = `${player.crit}%`;
    if (this.statSpeed) this.statSpeed.textContent = player.speed;
    if (this.statMagic) this.statMagic.textContent = player.magic;

    // Equipped slots
    this.renderEquippedSlot(this.equipWeapon, player.equipped.weapon, 'weapon');
    this.renderEquippedSlot(this.equipArmor, player.equipped.armor, 'armor');
    this.renderEquippedSlot(this.equipRing, player.equipped.ring, 'ring');
    this.renderEquippedSlot(this.equipAmulet, player.equipped.amulet, 'amulet');

    // Bag grid (16 slots)
    this.inventoryGrid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'inv-slot';
      const item = player.inventory[i];

      if (item) {
        slotEl.classList.add(`rarity-${item.rarity.toLowerCase()}`);
        slotEl.innerHTML = `<span class="item-icon">${item.icon}</span>`;
        slotEl.addEventListener('click', () => {
          player.equipItem(item);
          this.refreshInventoryUI();
          if (window.soundEngine) window.soundEngine.playCoin();
        });
        slotEl.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
        slotEl.addEventListener('mouseleave', () => this.hideTooltip());
      } else {
        slotEl.classList.add('empty');
      }

      this.inventoryGrid.appendChild(slotEl);
    }
  }

  renderEquippedSlot(element, item, slotType) {
    if (!element) return;
    element.innerHTML = '';
    element.className = 'equip-slot';

    if (item) {
      element.classList.add(`rarity-${item.rarity.toLowerCase()}`);
      element.innerHTML = `<span class="item-icon">${item.icon}</span>`;
      element.onclick = () => {
        this.game.player.unequipItem(slotType);
        this.refreshInventoryUI();
      };
      element.onmouseenter = (e) => this.showTooltip(e, item);
      element.onmouseleave = () => this.hideTooltip();
    } else {
      element.classList.add('empty');
      element.innerHTML = `<span class="slot-placeholder">${slotType.substr(0, 3).toUpperCase()}</span>`;
      element.onclick = null;
      element.onmouseenter = null;
      element.onmouseleave = null;
    }
  }

  showTooltip(e, item) {
    if (!this.itemTooltip) return;
    let statLines = [];
    if (item.stats.atk) statLines.push(`+${item.stats.atk} Attack`);
    if (item.stats.def) statLines.push(`+${item.stats.def} Defense`);
    if (item.stats.maxHp) statLines.push(`+${item.stats.maxHp} Max HP`);
    if (item.stats.maxMana) statLines.push(`+${item.stats.maxMana} Max Mana`);
    if (item.stats.crit) statLines.push(`+${item.stats.crit}% Critical Strike`);
    if (item.stats.speed) statLines.push(`+${item.stats.speed} Movement Speed`);
    if (item.stats.magic) statLines.push(`+${item.stats.magic} Magic Power`);

    this.itemTooltip.innerHTML = `
      <div class="tooltip-header" style="color: ${item.color}">${item.name}</div>
      <div class="tooltip-rarity">${item.rarity} ${item.slot.toUpperCase()}</div>
      <div class="tooltip-stats">${statLines.map(s => `<div>${s}</div>`).join('')}</div>
      <div class="tooltip-tip">Click to ${item.slot in this.game.player.equipped && this.game.player.equipped[item.slot]?.id === item.id ? 'Unequip' : 'Equip'}</div>
    `;

    const rect = e.target.getBoundingClientRect();
    this.itemTooltip.style.left = `${Math.min(window.innerWidth - 200, rect.right + 10)}px`;
    this.itemTooltip.style.top = `${Math.max(10, rect.top)}px`;
    this.itemTooltip.classList.remove('hidden');
  }

  hideTooltip() {
    if (this.itemTooltip) this.itemTooltip.classList.add('hidden');
  }

  // -------------------------------------------------------------
  // GAME OVER & VICTORY
  // -------------------------------------------------------------
  showGameOver(stats) {
    if (this.gameOverScreen) {
      if (this.statsSummary) {
        this.statsSummary.innerHTML = `
          <div>Floor Reached: <strong>Depth ${stats.floor}</strong></div>
          <div>Hero Level: <strong>${stats.level}</strong></div>
          <div>Monsters Defeated: <strong>${stats.monstersDefeated}</strong></div>
          <div>Gold Accumulated: <strong>${stats.gold} 🪙</strong></div>
          <div class="summary-shards-row">Soul Shards Harvested: <strong>+${stats.shardsEarned || 0} 💎</strong></div>
        `;
      }
      this.gameOverScreen.classList.remove('hidden');
    }
  }

  showVictory(shardsEarned = 0) {
    if (this.victoryScreen) {
      if (this.victoryStatsSummary) {
        this.victoryStatsSummary.innerHTML = `
          <div>Abyss Overlord Slain!</div>
          <div class="summary-shards-row">Victory Soul Shards Harvested: <strong>+${shardsEarned} 💎</strong></div>
        `;
      }
      this.victoryScreen.classList.remove('hidden');
    }
  }
  // -------------------------------------------------------------
  // WANDERING MERCHANT SHOP MODAL
  // -------------------------------------------------------------
  bindShopModal() {
    this.shopModal = document.getElementById('shop-modal');
    this.btnCloseShop = document.getElementById('btn-close-shop');
    this.tabShopBuy = document.getElementById('tab-shop-buy');
    this.tabShopSell = document.getElementById('tab-shop-sell');
    this.shopBuyView = document.getElementById('shop-buy-view');
    this.shopSellView = document.getElementById('shop-sell-view');
    this.shopWaresGrid = document.getElementById('shop-wares-grid');
    this.shopSellGrid = document.getElementById('shop-sell-grid');
    this.shopPlayerGold = document.getElementById('shop-player-gold');
    this.shopPlayerShards = document.getElementById('shop-player-shards');

    if (this.btnCloseShop) {
      this.btnCloseShop.addEventListener('click', () => this.closeShopModal());
    }

    if (this.tabShopBuy) {
      this.tabShopBuy.addEventListener('click', () => {
        this.tabShopBuy.classList.add('active');
        this.tabShopSell?.classList.remove('active');
        this.shopBuyView?.classList.remove('hidden');
        this.shopSellView?.classList.add('hidden');
      });
    }

    if (this.tabShopSell) {
      this.tabShopSell.addEventListener('click', () => {
        this.tabShopSell.classList.add('active');
        this.tabShopBuy?.classList.remove('active');
        this.shopSellView?.classList.remove('hidden');
        this.shopBuyView?.classList.add('hidden');
        this.renderShopSellList(this.game.player);
      });
    }
  }

  openShopModal(player, floor) {
    if (!this.shopModal) return;
    this.shopModal.classList.remove('hidden');
    if (this.shopPlayerGold) this.shopPlayerGold.textContent = `${player.gold} 🪙`;
    if (this.shopPlayerShards && window.StorageManager) {
      this.shopPlayerShards.textContent = `${window.StorageManager.getProfile().soulShards} 💎`;
    }
    this.tabShopBuy?.click();
    this.renderShopWares(player, floor);
    if (window.soundEngine && window.soundEngine.playBuy) window.soundEngine.playBuy();
  }

  closeShopModal() {
    if (!this.shopModal) return;
    this.shopModal.classList.add('hidden');
    this.refreshInventoryUI();
    this.game.requestAutoSave();
  }

  renderShopWares(player, floor) {
    if (!this.shopWaresGrid) return;
    this.shopWaresGrid.innerHTML = '';

    const wares = [
      { id: 'hp_potion', name: 'Greater Health Potion', desc: 'Restores 65% Max Health', icon: '❤️', price: 30, type: 'hp' },
      { id: 'mp_potion', name: 'Greater Mana Potion', desc: 'Restores 65% Max Mana', icon: '🧪', price: 30, type: 'mp' },
      { id: 'atk_elixir', name: 'Elixir of Void Might', desc: 'Permanently increases ATK by +8', icon: '⚔️', price: 85, type: 'atk' },
      { id: 'def_elixir', name: 'Abyssal Aegis Flask', desc: 'Permanently increases DEF by +6', icon: '🛡️', price: 85, type: 'def' },
      { id: 'shard_bundle', name: 'Satchel of Soul Shards', desc: 'Harvested from deep entities (+15 💎)', icon: '💎', price: 160, type: 'shards' },
      { id: 'mystery_relic', name: 'Mystery Relic Chest', desc: `Rare/Epic equipment scaled to Depth ${floor}`, icon: '🎁', price: 130, type: 'gear' }
    ];

    wares.forEach(w => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      const canAfford = player.gold >= w.price;
      card.innerHTML = `
        <div class="shop-item-left">
          <div class="shop-item-icon">${w.icon}</div>
          <div class="shop-item-info">
            <span class="shop-item-title">${w.name}</span>
            <span class="shop-item-desc">${w.desc}</span>
          </div>
        </div>
        <div class="shop-item-right">
          <span class="shop-price-tag">${w.price} 🪙</span>
          <button class="btn-shop-action btn-shop-buy" ${canAfford ? '' : 'disabled'}>Buy</button>
        </div>
      `;

      const buyBtn = card.querySelector('.btn-shop-buy');
      buyBtn.addEventListener('click', () => {
        if (player.gold >= w.price) {
          player.gold -= w.price;

          if (w.type === 'hp') {
            player.healthPotions++;
          } else if (w.type === 'mp') {
            player.manaPotions++;
          } else if (w.type === 'atk') {
            player.baseAtk += 8;
            player.recalculateStats();
          } else if (w.type === 'def') {
            player.baseDef += 6;
            player.recalculateStats();
          } else if (w.type === 'shards') {
            if (window.StorageManager) window.StorageManager.addSoulShards(15);
            player.shardsEarnedThisRun = (player.shardsEarnedThisRun || 0) + 15;
          } else if (w.type === 'gear') {
            if (window.ItemSystem && player.inventory.length < 16) {
              const rarity = Math.random() < 0.35 ? 'EPIC' : 'RARE';
              const slots = ['weapon', 'armor', 'ring', 'amulet'];
              const item = window.ItemSystem.createItem(slots[Math.floor(Math.random() * slots.length)], floor, rarity);
              player.inventory.push(item);
            }
          }

          if (window.soundEngine && window.soundEngine.playBuy) window.soundEngine.playBuy();

          if (this.shopPlayerGold) this.shopPlayerGold.textContent = `${player.gold} 🪙`;
          if (this.goldText) this.goldText.textContent = `${player.gold}`;
          if (this.shopPlayerShards && window.StorageManager) {
            this.shopPlayerShards.textContent = `${window.StorageManager.getProfile().soulShards} 💎`;
          }
          this.renderShopWares(player, floor);
        }
      });

      this.shopWaresGrid.appendChild(card);
    });
  }

  renderShopSellList(player) {
    if (!this.shopSellGrid) return;
    this.shopSellGrid.innerHTML = '';

    if (!player.inventory || player.inventory.length === 0) {
      this.shopSellGrid.innerHTML = '<div class="shop-empty-state">No equipment or items in your backpack to sell.</div>';
      return;
    }

    player.inventory.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      const sellPrice = item.sellValue || Math.round(15 + item.level * 12);
      card.innerHTML = `
        <div class="shop-item-left">
          <div class="shop-item-icon">${item.icon || '⚔️'}</div>
          <div class="shop-item-info">
            <span class="shop-item-title" style="color: ${item.color || '#ffffff'}">${item.name}</span>
            <span class="shop-item-desc">${item.slot ? item.slot.toUpperCase() : 'GEAR'} • Lvl ${item.level}</span>
          </div>
        </div>
        <div class="shop-item-right">
          <span class="shop-price-tag">+${sellPrice} 🪙</span>
          <button class="btn-shop-action btn-shop-sell">Sell</button>
        </div>
      `;

      const sellBtn = card.querySelector('.btn-shop-sell');
      sellBtn.addEventListener('click', () => {
        player.inventory.splice(index, 1);
        player.gold += sellPrice;

        if (window.soundEngine && window.soundEngine.playSell) window.soundEngine.playSell();

        if (this.shopPlayerGold) this.shopPlayerGold.textContent = `${player.gold} 🪙`;
        if (this.goldText) this.goldText.textContent = `${player.gold}`;

        this.renderShopSellList(player);
      });

      this.shopSellGrid.appendChild(card);
    });
  }
}

window.UIManager = UIManager;
