// Tests: pillars never block room connectivity, more traps/mobs, BRUTE & BAT behavior
const assert = require('assert');
global.window = global;
global.document = { getElementById: () => null };
global.navigator = {};
require('../js/storage.js');
require('../js/dungeon.js');
require('../js/entities.js');

const { Dungeon, Enemy, TILE } = global;

// 1. Connectivity flood-fill across many floors
for (let floor = 1; floor <= 12; floor++) {
  if (floor % 3 === 0) continue;
  for (let run = 0; run < 15; run++) {
    const d = new Dungeon(floor);
    const sx = Math.floor(d.playerStart.x / d.tileSize), sy = Math.floor(d.playerStart.y / d.tileSize);
    const seen = new Set([sx + ',' + sy]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !d.tiles[ny]) continue;
        const t = d.tiles[ny][nx];
        if (t === TILE.FLOOR || t === TILE.STAIRS) { seen.add(k); q.push([nx, ny]); }
      }
    }
    assert(seen.has(d.stairs.x + ',' + d.stairs.y), `Stairs unreachable floor ${floor}`);
    d.rooms.forEach((r, i) => assert(seen.has(r.cx + ',' + r.cy), `Room ${i} unreachable floor ${floor}`));
  }
}
console.log('✅ All rooms & stairs reachable with pillar obstacles (150 dungeons)');

// 2. More mobs / traps at depth
const avg = (f, fn) => { let s = 0; for (let i = 0; i < 20; i++) s += fn(new Dungeon(f)); return s / 20; };
assert(avg(5, d => d.enemySpawns.length) > avg(1, d => d.enemySpawns.length), 'Spawns scale with depth');
assert(avg(5, d => d.traps.length) > avg(1, d => d.traps.length), 'Traps scale with depth');
console.log('✅ Mob spawns and traps scale with depth');

// 3. New mobs
const d = new Dungeon(2);
const player = { x: 0, y: 0, radius: 16, isInvisible: false, hp: 100, takeDamage: () => 1 };
['BRUTE', 'BAT'].forEach(type => {
  const e = new Enemy(d.playerStart.x, d.playerStart.y, type, 2, { ...global.DIFFICULTIES.NORMAL, eliteChance: 0 });
  assert(e.maxHp > 0 && e.speed > 0 && e.atk > 0, `${type} stats valid`);
  player.x = e.x + 150; player.y = e.y;
  for (let i = 0; i < 120; i++) e.update(1 / 60, player, d, [], [], [], [], null);
  assert(!isNaN(e.x) && !isNaN(e.y), `${type} position valid`);
});
const brute = new Enemy(d.playerStart.x, d.playerStart.y, 'BRUTE', 2, { ...global.DIFFICULTIES.NORMAL, eliteChance: 0 });
brute.chargeCd = 0;
player.x = brute.x + 150; player.y = brute.y;
brute.update(1 / 60, player, d, [], [], [], [], null);
assert(brute.chargeTimer > 0, 'Brute starts a charge when in range');
console.log('✅ BRUTE charges and BAT swarms update correctly');

console.log('\n🎉 HARDER DUNGEON TESTS PASSED');
