const { v4: uuidv4 } = require('uuid');

class EntityManager {
  constructor(dungeon) {
    this.dungeon = dungeon;
    this.players = new Map(); // characterId -> player data
    this.enemies = new Map(); // enemyId -> enemy data
    this.projectiles = new Map(); // projectileId -> projectile data
    this.lootDrops = new Map(); // dropId -> loot data
    
    // Initialize enemies from dungeon data
    this.initializeEnemies();
  }

  initializeEnemies() {
    // Add all enemies from dungeon rooms
    this.dungeon.layers.forEach(layer => {
      layer.rooms.forEach(room => {
        room.enemies.forEach(enemy => {
          // Calculate absolute position
          const absolutePosition = {
            x: room.position.x + enemy.position.x,
            y: room.position.y + enemy.position.y,
            z: room.position.z + enemy.position.z
          };
          
          // Create enemy entity
          const enemyEntity = {
            ...enemy,
            absolutePosition,
            roomId: `${layer.index}_${room.index}`
          };
          
          this.enemies.set(enemy.id, enemyEntity);
        });
      });
    });
  }

  async addPlayer(characterId, socketId, data) {
    // In a real implementation, we would load character data from database
    // For the prototype, we'll use the provided data
    
    const player = {
      id: characterId,
      socketId,
      name: data.name || `Player_${characterId.substring(0, 5)}`,
      class: data.class || 'Warrior',
      level: data.level || 1,
      health: data.health || 100,
      maxHealth: data.maxHealth || 100,
      energy: data.energy || 100,
      maxEnergy: data.maxEnergy || 100,
      position: data.position || this.dungeon.startPosition,
      rotation: data.rotation || { x: 0, y: 0, z: 0 },
      flasks: {
        health: {
          tier: data.healthFlaskTier || 1,
          charges: data.healthFlaskCharges || 3
        },
        energy: {
          tier: data.energyFlaskTier || 1,
          charges: data.energyFlaskCharges || 3
        }
      },
      inventory: [],
      equipment: {},
      stats: data.stats || {},
      abilities: data.abilities || []
    };
    
    this.players.set(characterId, player);
    return player;
  }

  removePlayer(characterId) {
    return this.players.delete(characterId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayerData(characterId) {
    return this.players.get(characterId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  updatePlayerPosition(characterId, position, rotation) {
    const player = this.players.get(characterId);
    if (!player) return false;
    
    player.position = position;
    if (rotation) {
      player.rotation = rotation;
    }
    
    return true;
  }

  updatePlayerHealth(characterId, healthChange) {
    const player = this.players.get(characterId);
    if (!player) return null;
    
    player.health = Math.max(0, Math.min(player.health + healthChange, player.maxHealth));
    
    const result = {
      currentHealth: player.health,
      maxHealth: player.maxHealth,
      change: healthChange
    };
    
    // Check if player is defeated
    if (player.health <= 0) {
      result.defeated = true;
    }
    
    return result;
  }

  updatePlayerEnergy(characterId, energyChange) {
    const player = this.players.get(characterId);
    if (!player) return null;
    
    player.energy = Math.max(0, Math.min(player.energy + energyChange, player.maxEnergy));
    
    return {
      currentEnergy: player.energy,
      maxEnergy: player.maxEnergy,
      change: energyChange
    };
  }

  useFlask(characterId, flaskType) {
    const player = this.players.get(characterId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    const flask = player.flasks[flaskType];
    if (!flask) {
      return { success: false, message: 'Invalid flask type' };
    }
    
    if (flask.charges <= 0) {
      return { success: false, message: 'No charges remaining' };
    }
    
    // Calculate amount based on tier
    const isHealth = flaskType === 'health';
    const baseAmount = 30;
    const tierMultiplier = 1 + (flask.tier - 1) * 0.5; // 50% more per tier
    const amount = Math.floor(baseAmount * tierMultiplier);
    
    // Apply flask effect
    if (isHealth) {
      const healthResult = this.updatePlayerHealth(characterId, amount);
      flask.charges--;
      
      return {
        success: true,
        type: 'health',
        result: healthResult,
        remainingCharges: flask.charges
      };
    } else {
      const energyResult = this.updatePlayerEnergy(characterId, amount);
      flask.charges--;
      
      return {
        success: true,
        type: 'energy',
        result: energyResult,
        remainingCharges: flask.charges
      };
    }
  }

  getEnemyData(enemyId) {
    return this.enemies.get(enemyId);
  }

  getAllEnemies() {
    return Array.from(this.enemies.values());
  }

  updateEnemyHealth(enemyId, healthChange) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return null;
    
    enemy.health = Math.max(0, enemy.health + healthChange);
    
    const result = {
      enemyId,
      currentHealth: enemy.health,
      maxHealth: enemy.maxHealth,
      change: healthChange
    };
    
    // Check if enemy is defeated
    if (enemy.health <= 0) {
      result.killed = true;
    }
    
    return result;
  }

  removeEnemy(enemyId) {
    return this.enemies.delete(enemyId);
  }

  addProjectile(data) {
    const projectileId = uuidv4();
    
    const projectile = {
      id: projectileId,
      ownerId: data.ownerId,
      type: data.type,
      position: data.position,
      direction: data.direction,
      speed: data.speed || 10,
      damage: data.damage || 10,
      radius: data.radius || 0.5,
      created: Date.now()
    };
    
    this.projectiles.set(projectileId, projectile);
    return projectile;
  }

  removeProjectile(projectileId) {
    return this.projectiles.delete(projectileId);
  }

  addLootDrop(position, items) {
    const dropId = uuidv4();
    
    const lootDrop = {
      id: dropId,
      position,
      items,
      created: Date.now()
    };
    
    this.lootDrops.set(dropId, lootDrop);
    return lootDrop;
  }

  collectLoot(dropId, characterId) {
    const lootDrop = this.lootDrops.get(dropId);
    if (!lootDrop) {
      return { success: false, message: 'Loot not found' };
    }
    
    const player = this.players.get(characterId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    // Add items to player inventory
    for (const item of lootDrop.items) {
      player.inventory.push(item);
    }
    
    // Remove loot drop
    this.lootDrops.delete(dropId);
    
    return {
      success: true,
      items: lootDrop.items
    };
  }

  updateEntities(deltaTime) {
    // Update enemy positions, projectiles, etc.
    // This would be called by a game loop
    
    // Update projectiles
    for (const [projectileId, projectile] of this.projectiles.entries()) {
      // Move projectile
      const moveDistance = projectile.speed * deltaTime;
      projectile.position.x += projectile.direction.x * moveDistance;
      projectile.position.y += projectile.direction.y * moveDistance;
      projectile.position.z += projectile.direction.z * moveDistance;
      
      // Check for collision with environment
      // In a real implementation, this would check against the voxel world
      
      // Check for collision with entities
      const collision = this.checkProjectileCollisions(projectile);
      
      if (collision) {
        // Handle collision
        this.removeProjectile(projectileId);
      }
      
      // Remove old projectiles
      const maxAge = 5000; // 5 seconds
      if (Date.now() - projectile.created > maxAge) {
        this.removeProjectile(projectileId);
      }
    }
  }

  checkProjectileCollisions(projectile) {
    // Check collision with enemies
    for (const [enemyId, enemy] of this.enemies.entries()) {
      const dx = enemy.absolutePosition.x - projectile.position.x;
      const dy = enemy.absolutePosition.y - projectile.position.y;
      const dz = enemy.absolutePosition.z - projectile.position.z;
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < projectile.radius + (enemy.radius || 1)) {
        // Collision detected
        return {
          type: 'enemy',
          entity: enemy
        };
      }
    }
    
    // Check collision with players (for enemy projectiles)
    if (projectile.ownerId.startsWith('enemy_')) {
      for (const [playerId, player] of this.players.entries()) {
        const dx = player.position.x - projectile.position.x;
        const dy = player.position.y - projectile.position.y;
        const dz = player.position.z - projectile.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < projectile.radius + 0.5) {
          // Collision detected
          return {
            type: 'player',
            entity: player
          };
        }
      }
    }
    
    return null;
  }
}

module.exports = { EntityManager };