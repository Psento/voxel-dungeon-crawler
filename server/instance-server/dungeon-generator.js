// server/instance-server/dungeon-generator.js
const { v4: uuidv4 } = require('uuid');

class DungeonGenerator {
  constructor(biome, difficulty, layerCount) {
    this.biome = biome;
    this.difficulty = difficulty || 1;
    this.layerCount = layerCount || 3;
    this.seed = Math.floor(Math.random() * 1000000);
    this.rng = this.createRNG(this.seed);
  }
  
  createRNG(seed) {
    // Simple seeded random number generator
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  generateDungeon() {
    const dungeon = {
      id: uuidv4(),
      seed: this.seed,
      biome: this.biome,
      difficulty: this.difficulty,
      layers: [],
      startPosition: { x: 0, y: 2, z: 0 },
      bossRoom: null
    };
    
    // Generate each layer
    for (let i = 0; i < this.layerCount; i++) {
      const isLastLayer = i === this.layerCount - 1;
      const layer = this.generateLayer(i, isLastLayer);
      dungeon.layers.push(layer);
      
      // Set boss room location for the last layer
      if (isLastLayer) {
        dungeon.bossRoom = {
          layerIndex: i,
          roomIndex: layer.rooms.length - 1
        };
      }
    }
    
    // Connect layers with stairs or portals
    this.connectLayers(dungeon);
    
    return dungeon;
  }
  
  generateLayer(layerIndex, isLastLayer) {
    // Determine number of rooms based on difficulty and layer
    const baseRoomCount = 3 + Math.floor(this.difficulty / 2);
    const variableRooms = Math.floor(this.rng() * 3);
    const roomCount = baseRoomCount + variableRooms + layerIndex;
    
    const layer = {
      index: layerIndex,
      rooms: [],
      connections: []
    };
    
    // Generate room layouts
    this.generateRooms(layer, roomCount, isLastLayer);
    
    return layer;
  }
  
  generateRooms(layer, roomCount, isLastLayer) {
    // Generate a sequence of rooms with increasing difficulty
    for (let i = 0; i < roomCount; i++) {
      const isLastRoom = i === roomCount - 1;
      const isBossRoom = isLastLayer && isLastRoom;
      
      // Room size increases with importance
      let width = 10 + Math.floor(this.rng() * 6);
      let height = 4 + Math.floor(this.rng() * 2);
      let depth = 10 + Math.floor(this.rng() * 6);
      
      if (isBossRoom) {
        // Boss rooms are larger
        width += 8;
        height += 2;
        depth += 8;
      }
      
      const room = {
        index: i,
        position: this.calculateRoomPosition(i, layer.index),
        size: { width, height, depth },
        isBossRoom,
        enemies: [],
        treasures: [],
        obstacles: []
      };
      
      // Add room entrance/exit
      if (i === 0) {
        room.entrance = {
          position: { x: 2, y: 0, z: 2 },
          type: 'spawn'
        };
      }
      
      if (isLastRoom) {
        room.exit = {
          position: { x: width - 2, y: 0, z: depth - 2 },
          type: isLastLayer ? 'portal' : 'stairs'
        };
      }
      
      // Add room contents
      this.populateRoom(room, layer.index);
      
      // Add room to layer
      layer.rooms.push(room);
      
      // Connect rooms in sequence
      if (i > 0) {
        layer.connections.push({
          roomA: i - 1,
          roomB: i,
          type: 'door'
        });
      }
    }
    
    // Add some additional connections for larger layers
    if (roomCount > 4) {
      const extraConnections = Math.floor(roomCount / 4);
      
      for (let i = 0; i < extraConnections; i++) {
        const roomA = Math.floor(this.rng() * (roomCount - 2));
        const roomB = roomA + 2 + Math.floor(this.rng() * (roomCount - roomA - 2));
        
        // Avoid duplicate connections
        const exists = layer.connections.some(conn => 
          (conn.roomA === roomA && conn.roomB === roomB) || 
          (conn.roomA === roomB && conn.roomB === roomA)
        );
        
        if (!exists) {
          layer.connections.push({
            roomA,
            roomB,
            type: 'door'
          });
        }
      }
    }
  }
  
  calculateRoomPosition(roomIndex, layerIndex) {
    // Position rooms in a grid-like pattern with some randomness
    const gridSize = 40; // Space between rooms
    const layerHeight = 30; // Vertical space between layers
    
    // Calculate grid position (spiral-like)
    let x, z;
    
    if (roomIndex === 0) {
      // First room centered
      x = 0;
      z = 0;
    } else {
      // Subsequent rooms in a spiral pattern
      const angle = (roomIndex / 8) * Math.PI * 2;
      const radius = Math.floor(roomIndex / 8) + 1;
      
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    }
    
    // Scale to grid size
    x = Math.round(x * gridSize);
    z = Math.round(z * gridSize);
    
    // Add some randomness
    x += Math.floor(this.rng() * 10) - 5;
    z += Math.floor(this.rng() * 10) - 5;
    
    // Set y based on layer
    const y = layerIndex * layerHeight;
    
    return { x, y, z };
  }
  
  populateRoom(room, layerIndex) {
    // Calculate enemy count based on room size and difficulty
    const area = room.size.width * room.size.depth;
    const baseEnemyCount = this.difficulty + layerIndex;
    let enemyCount = Math.floor(area / 25) + baseEnemyCount;
    
    // Boss room has boss + fewer minions
    if (room.isBossRoom) {
      // Add boss
      const boss = this.generateBoss(layerIndex);
      boss.position = {
        x: Math.floor(room.size.width / 2),
        y: 0,
        z: Math.floor(room.size.depth / 2)
      };
      room.enemies.push(boss);
      
      // Reduce minions for boss room
      enemyCount = Math.floor(enemyCount * 0.6);
    }
    
    // Add regular enemies
    for (let i = 0; i < enemyCount; i++) {
      const enemy = this.generateEnemy(layerIndex);
      
      // Find valid position
      let validPosition = false;
      let position;
      let attempts = 0;
      
      while (!validPosition && attempts < 10) {
        position = {
          x: Math.floor(this.rng() * (room.size.width - 4)) + 2,
          y: 0,
          z: Math.floor(this.rng() * (room.size.depth - 4)) + 2
        };
        
        // Check if position is not too close to entrance/exit or other enemies
        validPosition = this.isValidEnemyPosition(position, room);
        attempts++;
      }
      
      if (validPosition) {
        enemy.position = position;
        room.enemies.push(enemy);
      }
    }
    
    // Add obstacles
    const obstacleCount = Math.floor(area / 40);
    
    for (let i = 0; i < obstacleCount; i++) {
      const obstacle = {
        id: uuidv4(),
        type: this.rng() > 0.5 ? 'rock' : 'pillar',
        size: this.rng() > 0.7 ? 2 : 1
      };
      
      // Find valid position
      let validPosition = false;
      let position;
      let attempts = 0;
      
      while (!validPosition && attempts < 10) {
        position = {
          x: Math.floor(this.rng() * (room.size.width - 4)) + 2,
          y: 0,
          z: Math.floor(this.rng() * (room.size.depth - 4)) + 2
        };
        
        validPosition = this.isValidObstaclePosition(position, room, obstacle.size);
        attempts++;
      }
      
      if (validPosition) {
        obstacle.position = position;
        room.obstacles.push(obstacle);
      }
    }
    
    // Add treasures
    const treasureCount = Math.floor(area / 80) + (room.isBossRoom ? 2 : 0);
    
    for (let i = 0; i < treasureCount; i++) {
      const treasure = {
        id: uuidv4(),
        type: this.rng() > 0.8 ? 'rare_chest' : 'chest'
      };
      
      // Find valid position
      let validPosition = false;
      let position;
      let attempts = 0;
      
      while (!validPosition && attempts < 10) {
        position = {
          x: Math.floor(this.rng() * (room.size.width - 4)) + 2,
          y: 0,
          z: Math.floor(this.rng() * (room.size.depth - 4)) + 2
        };
        
        validPosition = this.isValidTreasurePosition(position, room);
        attempts++;
      }
      
      if (validPosition) {
        treasure.position = position;
        room.treasures.push(treasure);
      }
    }
  }
  
  isValidEnemyPosition(position, room) {
    // Check distance from entrance/exit
    if (room.entrance) {
      const dx = position.x - room.entrance.position.x;
      const dz = position.z - room.entrance.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 4) return false;
    }
    
    if (room.exit) {
      const dx = position.x - room.exit.position.x;
      const dz = position.z - room.exit.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 4) return false;
    }
    
    // Check distance from other enemies
    for (const enemy of room.enemies) {
      const dx = position.x - enemy.position.x;
      const dz = position.z - enemy.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Ensure larger minimum distance for boss
      const minDistance = enemy.type === 'boss' ? 5 : 2;
      
      if (distance < minDistance) return false;
    }
    
    return true;
  }
  
  isValidObstaclePosition(position, room, size) {
    // Check distance from entrance/exit
    if (room.entrance) {
      const dx = position.x - room.entrance.position.x;
      const dz = position.z - room.entrance.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 3) return false;
    }
    
    if (room.exit) {
      const dx = position.x - room.exit.position.x;
      const dz = position.z - room.exit.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 3) return false;
    }
    
    // Check distance from enemies
    for (const enemy of room.enemies) {
      const dx = position.x - enemy.position.x;
      const dz = position.z - enemy.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      const minDistance = enemy.type === 'boss' ? 4 : 2;
      
      if (distance < minDistance) return false;
    }
    
    // Check distance from other obstacles
    for (const obstacle of room.obstacles) {
      const dx = position.x - obstacle.position.x;
      const dz = position.z - obstacle.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      const minDistance = size + obstacle.size;
      
      if (distance < minDistance) return false;
    }
    
    return true;
  }
  
  isValidTreasurePosition(position, room) {
    // Similar checks as obstacles
    if (room.entrance) {
      const dx = position.x - room.entrance.position.x;
      const dz = position.z - room.entrance.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 3) return false;
    }
    
    if (room.exit) {
      const dx = position.x - room.exit.position.x;
      const dz = position.z - room.exit.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 3) return false;
    }
    
    // Check distance from enemies
    for (const enemy of room.enemies) {
      const dx = position.x - enemy.position.x;
      const dz = position.z - enemy.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 2) return false;
    }
    
    // Check distance from obstacles
    for (const obstacle of room.obstacles) {
      const dx = position.x - obstacle.position.x;
      const dz = position.z - obstacle.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < obstacle.size + 1) return false;
    }
    
    // Check distance from other treasures
    for (const treasure of room.treasures) {
      const dx = position.x - treasure.position.x;
      const dz = position.z - treasure.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 3) return false;
    }
    
    return true;
  }
  
  generateEnemy(layerIndex) {
    // Select enemy type based on difficulty and layer
    const difficulty = this.difficulty + layerIndex;
    
    // Enemy types with increasing difficulty
    const enemyTypes = [
      { name: 'Goblin', health: 30, damage: 5, speed: 2.0, type: 'normal' },
      { name: 'Skeleton', health: 40, damage: 7, speed: 1.8, type: 'normal' },
      { name: 'Orc', health: 60, damage: 10, speed: 1.5, type: 'normal' },
      { name: 'Troll', health: 80, damage: 15, speed: 1.2, type: 'elite' },
      { name: 'Dark Knight', health: 100, damage: 20, speed: 1.7, type: 'elite' }
    ];
    
    // Select appropriate enemy types for this difficulty
    const availableTypes = enemyTypes.filter(e => 
      difficulty >= enemyTypes.indexOf(e) && 
      (e.type !== 'elite' || this.rng() < 0.2) // 20% chance for elite enemies
    );
    
    if (availableTypes.length === 0) {
      availableTypes.push(enemyTypes[0]); // Fallback to easiest enemy
    }
    
    const typeIndex = Math.floor(this.rng() * availableTypes.length);
    const baseEnemy = availableTypes[typeIndex];
    
    // Scale based on difficulty
    const scaleFactor = 1 + (difficulty * 0.1);
    
    return {
      id: uuidv4(),
      name: baseEnemy.name,
      type: baseEnemy.type,
      health: Math.floor(baseEnemy.health * scaleFactor),
      maxHealth: Math.floor(baseEnemy.health * scaleFactor),
      damage: Math.floor(baseEnemy.damage * scaleFactor),
      speed: baseEnemy.speed,
      position: { x: 0, y: 0, z: 0 }, // Will be set during placement
      behaviorType: 'melee' // Default behavior
    };
  }
  
  generateBoss(layerIndex) {
    // Boss types for each layer
    const bossTypes = [
      { name: 'Orc Chieftain', health: 200, damage: 15, speed: 1.2, abilities: ['charge', 'slam'] },
      { name: 'Necromancer', health: 250, damage: 20, speed: 1.0, abilities: ['summon', 'drain'] },
      { name: 'Dragon', health: 400, damage: 30, speed: 1.5, abilities: ['firebreath', 'tailswipe', 'wingbuffet'] }
    ];
    
    // Select boss based on layer, with fallback
    const bossIndex = Math.min(layerIndex, bossTypes.length - 1);
    const baseBoss = bossTypes[bossIndex];
    
    // Scale based on difficulty and layer
    const scaleFactor = 1 + (this.difficulty * 0.1) + (layerIndex * 0.2);
    
    return {
      id: uuidv4(),
      name: baseBoss.name,
      type: 'boss',
      health: Math.floor(baseBoss.health * scaleFactor),
      maxHealth: Math.floor(baseBoss.health * scaleFactor),
      damage: Math.floor(baseBoss.damage * scaleFactor),
      speed: baseBoss.speed,
      position: { x: 0, y: 0, z: 0 }, // Will be set during placement
      behaviorType: 'boss',
      abilities: baseBoss.abilities,
      phases: Math.min(3, 1 + Math.floor(layerIndex / 2)) // Bosses get more phases in deeper layers
    };
  }
  
  connectLayers(dungeon) {
    // Add connections between layers (stairs, portals, etc.)
    for (let i = 0; i < dungeon.layers.length - 1; i++) {
      const currentLayer = dungeon.layers[i];
      const nextLayer = dungeon.layers[i + 1];
      
      // Connect last room of current layer to first room of next layer
      const exitRoomIndex = currentLayer.rooms.length - 1;
      const exitRoom = currentLayer.rooms[exitRoomIndex];
      const entranceRoom = nextLayer.rooms[0];
      
      // Set exit in current layer
      if (!exitRoom.exit) {
        exitRoom.exit = {
          position: {
            x: Math.floor(exitRoom.size.width * 0.75),
            y: 0,
            z: Math.floor(exitRoom.size.depth * 0.75)
          },
          type: 'stairs',
          targetLayer: i + 1,
          targetRoom: 0
        };
      } else {
        exitRoom.exit.targetLayer = i + 1;
        exitRoom.exit.targetRoom = 0;
      }
      
      // Set entrance in next layer
      entranceRoom.entrance = {
        position: {
          x: Math.floor(entranceRoom.size.width * 0.25),
          y: 0,
          z: Math.floor(entranceRoom.size.depth * 0.25)
        },
        type: 'stairs',
        targetLayer: i,
        targetRoom: exitRoomIndex
      };
    }
  }
}

module.exports = { DungeonGenerator };