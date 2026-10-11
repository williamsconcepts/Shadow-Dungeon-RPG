// Procedural Dungeon Generator & Tilemap Engine

const TILE = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  WALL_TOP: 3,
  DOOR: 4,
  STAIRS: 5
};

class DungeonRoom {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.cx = Math.floor(x + w / 2);
    this.cy = Math.floor(y + h / 2);
  }

  intersects(other, padding = 2) {
    return (
      this.x - padding < other.x + other.w &&
      this.x + this.w + padding > other.x &&
      this.y - padding < other.y + other.h &&
      this.y + this.h + padding > other.y
    );
  }
}

class Dungeon {
  constructor(floorNumber = 1) {
    this.floor = floorNumber;
    this.isBossFloor = (floorNumber % 3 === 0);
    this.width = this.isBossFloor ? 48 : 64;
    this.height = this.isBossFloor ? 48 : 64;
    this.tileSize = 48; // Canvas pixels per tile

    this.tiles = [];
    this.rooms = [];
    this.torches = [];
    this.chests = [];
    this.urns = [];
    this.traps = [];
    this.shrines = [];
    this.merchant = null;
    this.stairs = { x: 0, y: 0 };
    this.playerStart = { x: 0, y: 0 };
    this.enemySpawns = [];
    this.decorations = []; // urns, rubble, blood stains, runes

    // Fog of War exploration tracking
    this.explored = Array.from({ length: this.height }, () =>
      Array(this.width).fill(false)
    );

    this.generate();
  }

  generate() {
    // Initialize empty grid
    this.tiles = Array.from({ length: this.height }, () =>
      Array(this.width).fill(TILE.WALL)
    );

    if (this.isBossFloor) {
      this.generateBossArena();
    } else {
      this.generateStandardDungeon();
    }

    this.computeWallTops();
    this.placeTorchesAndDecorations();
  }

  generateStandardDungeon() {
    const minRoomSize = 6;
    const maxRoomSize = 13;
    const maxAttempts = 50;
    const targetRoomCount = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < maxAttempts && this.rooms.length < targetRoomCount; i++) {
      const w = Math.floor(minRoomSize + Math.random() * (maxRoomSize - minRoomSize));
      const h = Math.floor(minRoomSize + Math.random() * (maxRoomSize - minRoomSize));
      const x = Math.floor(2 + Math.random() * (this.width - w - 4));
      const y = Math.floor(2 + Math.random() * (this.height - h - 4));

      const room = new DungeonRoom(x, y, w, h);
      const overlaps = this.rooms.some(r => r.intersects(room, 2));

      if (!overlaps) {
        this.rooms.push(room);
        this.carveRoom(room);
      }
    }

    // Connect rooms via corridors
    for (let i = 1; i < this.rooms.length; i++) {
      const prev = this.rooms[i - 1];
      const curr = this.rooms[i];
      this.carveCorridor(prev.cx, prev.cy, curr.cx, curr.cy);
    }

    // Player starts in room 0
    const startRoom = this.rooms[0];
    this.playerStart = {
      x: (startRoom.cx + 0.5) * this.tileSize,
      y: (startRoom.cy + 0.5) * this.tileSize
    };

    // Stairs in furthest room
    const exitRoom = this.rooms[this.rooms.length - 1];
    this.stairs = { x: exitRoom.cx, y: exitRoom.cy };
    this.tiles[exitRoom.cy][exitRoom.cx] = TILE.STAIRS;

    // Merchant spawns on Floor 2, 4, 6... in room 1 (Safe Alcove)
    if (this.floor % 2 === 0 && this.rooms.length > 2) {
      const shopRoom = this.rooms[1];
      this.merchant = {
        x: (shopRoom.cx + 0.5) * this.tileSize,
        y: (shopRoom.cy + 0.5) * this.tileSize,
        roomIndex: 1
      };
    }

    // Spawn 1 Mystical Shrine (70% chance per floor)
    if (Math.random() < 0.70 && this.rooms.length > 3) {
      const shrineRoomIdx = 2 + Math.floor(Math.random() * (this.rooms.length - 3));
      const sRoom = this.rooms[shrineRoomIdx];
      const types = ['BLOOD', 'ARCANA', 'GREED'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      this.shrines.push({
        x: (sRoom.cx + 0.5) * this.tileSize,
        y: (sRoom.cy + 0.5) * this.tileSize,
        type: chosenType,
        used: false
      });
    }

    // Place chests, urns, spike traps & enemy spawns in intermediate rooms
    for (let i = 1; i < this.rooms.length; i++) {
      const r = this.rooms[i];
      const isShopRoom = (this.merchant && this.merchant.roomIndex === i);

      // Place 2-5 Breakable Urns in room corners
      const cornerOffsets = [
        { x: r.x + 1, y: r.y + 1 },
        { x: r.x + r.w - 2, y: r.y + 1 },
        { x: r.x + 1, y: r.y + r.h - 2 },
        { x: r.x + r.w - 2, y: r.y + r.h - 2 }
      ];
      cornerOffsets.forEach(pos => {
        if (Math.random() < 0.65 && this.tiles[pos.y][pos.x] === TILE.FLOOR) {
          this.urns.push({
            x: (pos.x + 0.5) * this.tileSize,
            y: (pos.y + 0.5) * this.tileSize,
            broken: false,
            radius: 14
          });
        }
      });

      // 60% chance for chest in room (skip shop room)
      if (!isShopRoom && Math.random() < 0.65 && i !== this.rooms.length - 1) {
        this.chests.push({
          x: (r.cx + (Math.random() > 0.5 ? 1 : -1)) * this.tileSize,
          y: (r.cy + (Math.random() > 0.5 ? 1 : -1)) * this.tileSize,
          opened: false
        });
      }

      // Spike traps (50% chance in room)
      if (!isShopRoom && Math.random() < 0.50 && i !== 0 && i !== this.rooms.length - 1) {
        this.traps.push({
          x: (r.cx + 0.5) * this.tileSize,
          y: (r.cy + 0.5) * this.tileSize,
          size: 34,
          state: 'IDLE',
          timer: Math.random() * 2.5
        });
      }

      // Enemy spawns per room (skip shop room to keep merchant safe)
      if (!isShopRoom) {
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(this.floor * 0.7);
        for (let j = 0; j < count; j++) {
          const ex = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
          const ey = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
          if (this.tiles[ey][ex] === TILE.FLOOR && (ex !== this.stairs.x || ey !== this.stairs.y)) {
            this.enemySpawns.push({
              x: (ex + 0.5) * this.tileSize,
              y: (ey + 0.5) * this.tileSize,
              roomIndex: i
            });
          }
        }
      }
    }

    // Ensure at least 1 spike trap exists on standard dungeon floor
    if (this.traps.length === 0 && this.rooms.length > 2) {
      const tr = this.rooms[1];
      this.traps.push({
        x: (tr.cx + 0.5) * this.tileSize,
        y: (tr.cy + 0.5) * this.tileSize,
        size: 34,
        state: 'IDLE',
        timer: 1.5
      });
    }
  }

  generateBossArena() {
    // Grand rectangular hall
    const margin = 8;
    const w = this.width - margin * 2;
    const h = this.height - margin * 2;
    const arena = new DungeonRoom(margin, margin, w, h);
    this.rooms.push(arena);
    this.carveRoom(arena);

    // Pillars inside the arena for cover
    const pillarPositions = [
      { x: arena.cx - 7, y: arena.cy - 7 },
      { x: arena.cx + 7, y: arena.cy - 7 },
      { x: arena.cx - 7, y: arena.cy + 7 },
      { x: arena.cx + 7, y: arena.cy + 7 },
    ];
    pillarPositions.forEach(p => {
      this.tiles[p.y][p.x] = TILE.WALL;
      this.tiles[p.y + 1][p.x] = TILE.WALL;
      this.tiles[p.y][p.x + 1] = TILE.WALL;
      this.tiles[p.y + 1][p.x + 1] = TILE.WALL;
    });

    // Player spawns at bottom entrance
    this.playerStart = {
      x: (arena.cx + 0.5) * this.tileSize,
      y: (arena.y + arena.h - 3) * this.tileSize
    };

    // Boss spawns near top center
    this.bossSpawn = {
      x: (arena.cx + 0.5) * this.tileSize,
      y: (arena.y + 5) * this.tileSize
    };

    // Stairs spawn initially hidden or locked at top center
    this.stairs = { x: arena.cx, y: arena.y + 2 };
    this.tiles[this.stairs.y][this.stairs.x] = TILE.STAIRS;
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.tiles[y][x] = TILE.FLOOR;
      }
    }
  }

  carveCorridor(x1, y1, x2, y2) {
    // Horizontal then vertical or vice versa
    let cx = x1;
    let cy = y1;

    while (cx !== x2) {
      this.tiles[cy][cx] = TILE.FLOOR;
      if (cy + 1 < this.height) this.tiles[cy + 1][cx] = TILE.FLOOR; // 2 tiles wide corridor
      cx += (x2 > cx) ? 1 : -1;
    }
    while (cy !== y2) {
      this.tiles[cy][cx] = TILE.FLOOR;
      if (cx + 1 < this.width) this.tiles[cy][cx + 1] = TILE.FLOOR;
      cy += (y2 > cy) ? 1 : -1;
    }
  }

  computeWallTops() {
    // Distinguish wall fronts from wall tops for nice 2.5D visual depth
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x] === TILE.WALL) {
          // If the tile below is a floor, this is a wall front face
          if (y + 1 < this.height && this.tiles[y + 1][x] === TILE.FLOOR) {
            this.tiles[y][x] = TILE.WALL;
          } else {
            this.tiles[y][x] = TILE.WALL_TOP;
          }
        }
      }
    }
  }

  placeTorchesAndDecorations() {
    // Torches mounted on wall faces facing floors
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.tiles[y][x] === TILE.WALL && this.tiles[y + 1][x] === TILE.FLOOR) {
          if (Math.random() < 0.2) {
            this.torches.push({
              x: (x + 0.5) * this.tileSize,
              y: (y + 0.8) * this.tileSize,
              flicker: Math.random() * Math.PI * 2,
              radius: 140 + Math.random() * 40
            });
          }
        } else if (this.tiles[y][x] === TILE.FLOOR) {
          // Chance for decorative urns or floor runes
          if (Math.random() < 0.03) {
            this.decorations.push({
              type: Math.random() > 0.4 ? 'urn' : 'rune',
              x: (x + 0.5) * this.tileSize,
              y: (y + 0.5) * this.tileSize,
              broken: false
            });
          }
        }
      }
    }
  }

  isSolid(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
    const tile = this.tiles[ty][tx];
    return tile === TILE.WALL || tile === TILE.WALL_TOP;
  }

  checkCollision(entityX, entityY, radius = 16) {
    // Circle vs Tile AABB check
    const minTx = Math.floor((entityX - radius) / this.tileSize);
    const maxTx = Math.floor((entityX + radius) / this.tileSize);
    const minTy = Math.floor((entityY - radius) / this.tileSize);
    const maxTy = Math.floor((entityY + radius) / this.tileSize);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        const tile = this.tiles[ty][tx];
        if (tile === TILE.WALL || tile === TILE.WALL_TOP) {
          // Find closest point on tile AABB
          const closestX = Math.max(tx * this.tileSize, Math.min(entityX, (tx + 1) * this.tileSize));
          const closestY = Math.max(ty * this.tileSize, Math.min(entityY, (ty + 1) * this.tileSize));
          const distX = entityX - closestX;
          const distY = entityY - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Fog of War exploration updater
  updateExploration(playerX, playerY, visionRadius = 8.5) {
    const centerTx = Math.floor(playerX / this.tileSize);
    const centerTy = Math.floor(playerY / this.tileSize);
    const radSq = visionRadius * visionRadius;

    const minTx = Math.max(0, Math.floor(centerTx - visionRadius));
    const maxTx = Math.min(this.width - 1, Math.ceil(centerTx + visionRadius));
    const minTy = Math.max(0, Math.floor(centerTy - visionRadius));
    const maxTy = Math.min(this.height - 1, Math.ceil(centerTy + visionRadius));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const dx = tx - centerTx;
        const dy = ty - centerTy;
        if (dx * dx + dy * dy <= radSq) {
          this.explored[ty][tx] = true;
        }
      }
    }
  }

  isExplored(tx, ty) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return !!this.explored[ty][tx];
  }
}

window.Dungeon = Dungeon;
window.TILE = TILE;
