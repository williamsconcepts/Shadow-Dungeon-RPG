// Test runner for Mobile Life Bars UI, Layout, Specificity & Rendering
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING MOBILE LIFE BARS TEST SUITE ===\n');

// 1. Verify HTML Structure
console.log('--- 1. Testing index.html Structure ---');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');

assert(html.includes('id="low-hp-vignette"'), 'low-hp-vignette element must exist in index.html');
console.log('✅ PASSED: low-hp-vignette exists in HTML');

assert(html.includes('id="hp-bar-ghost"'), 'hp-bar-ghost element must exist in index.html');
console.log('✅ PASSED: hp-bar-ghost exists in HTML');

assert(html.includes('id="mana-bar-ghost"'), 'mana-bar-ghost element must exist in index.html');
console.log('✅ PASSED: mana-bar-ghost exists in HTML');

assert(html.includes('id="boss-bar-ghost"'), 'boss-bar-ghost element must exist in index.html');
console.log('✅ PASSED: boss-bar-ghost exists in HTML');

assert(html.includes('id="boss-hp-text"'), 'boss-hp-text element must exist in index.html');
console.log('✅ PASSED: boss-hp-text exists in HTML');

assert(html.includes('class="bar-icon-hint"'), 'bar-icon-hint icons must exist in index.html');
console.log('✅ PASSED: bar-icon-hint icons exist in HTML');


// 2. Verify CSS Rules & Responsive Layout
console.log('\n--- 2. Testing style.css Responsive Styles & Specificity ---');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf-8');

assert(css.includes('.bar-wrapper.hp-wrapper'), '.bar-wrapper.hp-wrapper high-specificity selector must exist in CSS');
console.log('✅ PASSED: Specificity fix (.bar-wrapper.hp-wrapper) present');

assert(css.includes('.hp-ghost') && css.includes('.boss-ghost'), 'Ghost bar styling must exist');
console.log('✅ PASSED: Ghost damage bar styles present');

assert(css.includes('.critical-hp'), 'Critical HP pulse animation class must exist');
console.log('✅ PASSED: Critical HP animation present');

assert(css.includes('.low-hp-vignette'), 'Low HP vignette styles present');
console.log('✅ PASSED: Low HP vignette styling present');

assert(css.includes('.pulse-potion'), 'Potion recommendation pulse animation present');
console.log('✅ PASSED: Potion pulse animation present');

// Verify that in max-width: 768px, boss bar is stacked below top bar
const media768Index = css.indexOf('@media (max-width: 768px)');
assert(media768Index !== -1, '@media (max-width: 768px) must exist');
const media768Block = css.slice(media768Index, media768Index + 3000);

assert(media768Block.includes('.hud-top-center'), 'hud-top-center must be styled in 768px media query');
assert(media768Block.includes('top: calc('), 'hud-top-center must have offset top on mobile to avoid overlapping player bar');
console.log('✅ PASSED: Boss bar mobile positioning avoids top-left player health bar collision');


// 3. Test UIManager Runtime Behavior
console.log('\n--- 3. Testing UIManager Runtime Updates & Critical HP Warning ---');

function createMockEl(id, className = '') {
  const classListSet = new Set(className ? className.split(' ') : []);
  return {
    id,
    className,
    style: {},
    textContent: '',
    innerHTML: '',
    classList: {
      add: (c) => classListSet.add(c),
      remove: (c) => classListSet.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classListSet.has(c)) classListSet.delete(c); else classListSet.add(c);
        } else if (force) {
          classListSet.add(c);
        } else {
          classListSet.delete(c);
        }
      },
      contains: (c) => classListSet.has(c)
    },
    querySelector: () => null
  };
}

const mockElements = {
  'hp-bar-fill': createMockEl('hp-bar-fill'),
  'hp-bar-ghost': createMockEl('hp-bar-ghost'),
  'hp-text': createMockEl('hp-text'),
  'mana-bar-fill': createMockEl('mana-bar-fill'),
  'mana-bar-ghost': createMockEl('mana-bar-ghost'),
  'mana-text': createMockEl('mana-text'),
  'xp-bar-fill': createMockEl('xp-bar-fill'),
  'level-badge': createMockEl('level-badge'),
  'gold-text': createMockEl('gold-text'),
  'shard-text': createMockEl('shard-text'),
  'depthBadge': createMockEl('depth-badge'),
  'depth-badge': createMockEl('depth-badge'),
  'boss-bar-container': createMockEl('boss-bar-container', 'hidden'),
  'boss-bar-fill': createMockEl('boss-bar-fill'),
  'boss-bar-ghost': createMockEl('boss-bar-ghost'),
  'boss-hp-text': createMockEl('boss-hp-text'),
  'boss-name-text': createMockEl('boss-name-text'),
  'low-hp-vignette': createMockEl('low-hp-vignette', 'hidden'),
  'btn-potion-hp': createMockEl('btn-potion-hp'),
  'btn-potion-mp': createMockEl('btn-potion-mp'),
  'potion-hp-count': createMockEl('potion-hp-count'),
  'potion-mp-count': createMockEl('potion-mp-count'),
  'btn-attack': createMockEl('btn-attack'),
  'btn-dash': createMockEl('btn-dash'),
  'btn-fireball': createMockEl('btn-fireball'),
  'btn-frost': createMockEl('btn-frost'),
  'btn-thunder': createMockEl('btn-thunder'),
  'game-over-screen': createMockEl('game-over-screen', 'hidden'),
  'victory-screen': createMockEl('victory-screen', 'hidden')
};

const hpWrapperMock = createMockEl('hp-wrapper', 'bar-wrapper hp-wrapper');

global.document = {
  getElementById: (id) => mockElements[id] || createMockEl(id),
  querySelector: (sel) => {
    if (sel === '.hp-wrapper') return hpWrapperMock;
    return null;
  },
  querySelectorAll: () => []
};

global.window = {
  document: global.document,
  innerWidth: 390,
  innerHeight: 844,
  StorageManager: { getProfile: () => ({ soulShards: 42 }) }
};

// Load dependencies
require('../js/storage.js');
require('../js/items.js');
require('../js/dungeon.js');
require('../js/entities.js');
require('../js/ui.js');

const ui = new global.window.UIManager({ difficulty: 'NORMAL', hardcore: false });

const dummyPlayer = {
  hp: 300,
  maxHp: 300,
  mana: 120,
  maxMana: 120,
  xp: 50,
  xpToNext: 100,
  level: 1,
  gold: 150,
  healthPotions: 3,
  manaPotions: 2,
  skills: {}
};

const dummyDungeon = { floor: 1, isBossFloor: false };

// Update HUD at full health
ui.updateHUD(dummyPlayer, dummyDungeon, null);

assert.strictEqual(ui.hpBarFill.style.width, '100%');
assert.strictEqual(ui.hpBarGhost.style.width, '100%');
assert.strictEqual(ui.hpText.textContent, '300 / 300');
assert(!hpWrapperMock.classList.contains('critical-hp'), 'Full HP must not trigger critical-hp class');
assert(ui.lowHpVignette.classList.contains('hidden'), 'Vignette must be hidden at full HP');
console.log('✅ PASSED: updateHUD sets correct widths & texts at 100% HP');

// Damage player to 20% (Critical HP)
dummyPlayer.hp = 60;
ui.updateHUD(dummyPlayer, dummyDungeon, null);

assert.strictEqual(ui.hpBarFill.style.width, '20%');
assert.strictEqual(ui.hpBarGhost.style.width, '20%');
assert.strictEqual(ui.hpText.textContent, '60 / 300');
assert(hpWrapperMock.classList.contains('critical-hp'), 'Critical HP (<=25%) must activate .critical-hp on wrapper');
assert(!ui.lowHpVignette.classList.contains('hidden'), 'Critical HP must reveal low-hp vignette');
assert(ui.btnPotionHp.classList.contains('pulse-potion'), 'Potion button must pulse when HP is critical and potions available');
console.log('✅ PASSED: Critical HP triggers pulsing wrapper, vignette and potion alert');

// Heal player back to 70%
dummyPlayer.hp = 210;
ui.updateHUD(dummyPlayer, dummyDungeon, null);
assert(!hpWrapperMock.classList.contains('critical-hp'), 'Healed HP must remove critical-hp');
assert(ui.lowHpVignette.classList.contains('hidden'), 'Healed HP must hide vignette');
assert(!ui.btnPotionHp.classList.contains('pulse-potion'), 'Healed HP must stop potion pulse');
console.log('✅ PASSED: Restored HP cleanly removes critical alerts');

// Test Boss Bar updates
const dummyBoss = {
  name: 'Arch-Demon Malok',
  hp: 750,
  maxHp: 1000,
  isDead: false
};
ui.updateHUD(dummyPlayer, dummyDungeon, dummyBoss);
assert(!ui.bossBarContainer.classList.contains('hidden'), 'Boss container must be visible when boss is alive');
assert.strictEqual(ui.bossNameText.textContent, 'Arch-Demon Malok');
assert.strictEqual(ui.bossBarFill.style.width, '75%');
assert.strictEqual(ui.bossBarGhost.style.width, '75%');
assert(ui.bossHpText.textContent.includes('750 / 1000 (75%)'), 'Boss HP text must show numbers and percentage');
console.log('✅ PASSED: Boss health bar updates with fill, ghost, and percentage text');

// Test Game Over hides vignette
dummyPlayer.hp = 20;
ui.updateHUD(dummyPlayer, dummyDungeon, null);
assert(!ui.lowHpVignette.classList.contains('hidden'), 'Vignette should be active at 20 HP');
ui.showGameOver({ floor: 1, level: 1, monstersDefeated: 5, gold: 50, shardsEarned: 2 });
assert(ui.lowHpVignette.classList.contains('hidden'), 'Vignette must be hidden when showGameOver is invoked');
console.log('✅ PASSED: showGameOver hides low HP vignette');


// 4. Test In-World Canvas Overhead Health Bars
console.log('\n--- 4. Testing Overhead Canvas Life Bars (Player & Enemies) ---');

const mockCtx = {
  calls: [],
  save() { this.calls.push('save'); },
  restore() { this.calls.push('restore'); },
  translate(x, y) { this.calls.push(`translate(${x},${y})`); },
  rotate(a) { this.calls.push(`rotate(${a})`); },
  beginPath() { this.calls.push('beginPath'); },
  roundRect(x, y, w, h, r) { this.calls.push(`roundRect(${x},${y},${w},${h},${r})`); },
  rect() {},
  fill() { this.calls.push(`fill(${this.fillStyle})`); },
  stroke() { this.calls.push(`stroke(${this.strokeStyle})`); },
  arc() {},
  ellipse() {},
  moveTo() {},
  lineTo() {},
  closePath() {},
  fillRect() {},
  strokeRect() {},
  fillText() {},
  createLinearGradient() { return { addColorStop: () => {} }; },
  createRadialGradient() { return { addColorStop: () => {} }; }
};

const PlayerClass = global.window.Player;
const playerObj = new PlayerClass(100, 100, 'WARRIOR');

// Case A: Full HP player does not draw overhead health bar
mockCtx.calls = [];
playerObj.hp = playerObj.maxHp;
playerObj.render(mockCtx);
const fullHpRoundRects = mockCtx.calls.filter(c => c.includes('roundRect'));
assert.strictEqual(fullHpRoundRects.length, 0, 'Full HP player must NOT render overhead health bar');
console.log('✅ PASSED: Full HP player keeps screen clean (no overhead bar)');

// Case B: Damaged player DOES draw overhead health bar
mockCtx.calls = [];
playerObj.hp = playerObj.maxHp * 0.7; // 70% HP
playerObj.render(mockCtx);
const damagedRoundRects = mockCtx.calls.filter(c => c.includes('roundRect'));
assert(damagedRoundRects.length >= 2, 'Damaged player must render background and fill overhead rounded rects');
// Check emerald fill for > 50% HP
const hasEmeraldFill = mockCtx.calls.some(c => c.includes('fill(#10b981)'));
assert(hasEmeraldFill, 'Damaged player (>50%) must use emerald green fill');
console.log('✅ PASSED: Injured player renders overhead bar with emerald fill');

// Case C: Critical player (<=25%) uses crimson fill and pulsing stroke
mockCtx.calls = [];
playerObj.hp = playerObj.maxHp * 0.2; // 20% HP
playerObj.render(mockCtx);
const hasCrimsonFill = mockCtx.calls.some(c => c.includes('fill(#ef4444)'));
assert(hasCrimsonFill, 'Critical player (<=25%) must use crimson fill');
const hasCrimsonStroke = mockCtx.calls.some(c => c.includes('stroke(#ef4444)'));
assert(hasCrimsonStroke, 'Critical player must stroke with crimson pulsing outline');
console.log('✅ PASSED: Critical player renders crimson pulsing overhead bar');

// Case D: Enemy overhead health bar sizing
const EnemyClass = global.window.Enemy;
const enemyObj = new EnemyClass(200, 200, 'SKELETON', 1);
enemyObj.hp = enemyObj.maxHp * 0.5; // Damaged

mockCtx.calls = [];
enemyObj.render(mockCtx);
const enemyBars = mockCtx.calls.filter(c => c.includes('roundRect'));
assert(enemyBars.length >= 2, 'Enemy must render overhead health bar when damaged');
// Verify upgraded dimensions: barW = 34, barH = 5
assert(enemyBars[0].includes('34,5,2.5'), 'Normal enemy must use enhanced mobile-friendly dimensions 34x5');
console.log('✅ PASSED: Enemy overhead health bar renders with mobile-tuned dimensions (34x5)');

// Elite enemy
const eliteEnemy = new EnemyClass(300, 300, 'ZOMBIE', 2);
eliteEnemy.isElite = true;
eliteEnemy.affix = 'Vampiric';
mockCtx.calls = [];
eliteEnemy.render(mockCtx);
const eliteBars = mockCtx.calls.filter(c => c.includes('roundRect'));
assert(eliteBars[0].includes('44,5,2.5'), 'Elite enemy must use enhanced mobile-friendly dimensions 44x5');
console.log('✅ PASSED: Elite enemy renders overhead health bar with 44x5 dimensions');

console.log('\n🎉 ALL 18/18 MOBILE LIFE BARS TESTS PASSED PERFECTLY!\n');
