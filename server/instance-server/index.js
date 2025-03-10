const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { DungeonGenerator } = require('./dungeon-generator');
const { EntityManager } = require('./entity-manager');
const { CombatSystem } = require('./combat-system');
const { LootSystem } = require('./loot-system');
const config = require('../../config');

function createInstanceServer(port) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server, {
    cors: {
      origin: config.server.corsOrigin,
      methods: ['GET', 'POST']
    }
  });
  
  let instanceId = null;
  let partyId = null;
  let dungeonData = null;
  let entityManager = null;
  let combatSystem = null;
  let lootSystem = null;
  
  // API endpoint to initialize the instance
  app.post('/initialize', express.json(), async (req, res) => {
    try {
      // Extract data from request
      const { instanceId: reqInstanceId, biomeId, difficulty, token, members } = req.body;
      
      // Verify instance token
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid instance token'
        });
      }
      
      // Check that instance ID matches
      if (decoded.instanceId !== reqInstanceId) {
        return res.status(403).json({
          success: false,
          message: 'Instance ID mismatch'
        });
      }
      
      console.log(`Initializing instance ${reqInstanceId} with biome ${biomeId} at difficulty ${difficulty}`);
      
      // Generate dungeon
      // In a real implementation, we'd load the biome from a database
      const biome = getMockBiome(biomeId);
      
      const generator = new DungeonGenerator(biome, difficulty, 3);
      const dungeon = generator.generateDungeon();
      
      // Initialize systems
      instanceId = reqInstanceId;
      partyId = decoded.partyId;
      dungeonData = dungeon;
      entityManager = new EntityManager(dungeon);
      combatSystem = new CombatSystem(entityManager);
      lootSystem = new LootSystem(dungeon.biome);
      
      res.json({
        success: true,
        message: 'Instance initialized successfully'
      });
    } catch (error) {
      console.error('Instance initialization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize instance'
      });
    }
  });
  
  // Socket.IO connection handler
  io.use((socket, next) => {
    // Authentication middleware
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check that token is for this instance
      if (decoded.instanceId !== instanceId) {
        return next(new Error('Invalid instance token'));
      }
      
      // Check that player is a member of the party
      if (!decoded.members.includes(socket.handshake.auth.characterId)) {
        return next(new Error('Not a member of this party'));
      }
      
      // Store character ID in socket
      socket.characterId = socket.handshake.auth.characterId;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`Player connected to instance ${instanceId}: ${socket.characterId}`);
    
    // Handle player joining instance
    socket.on('join_instance', async (data) => {
      try {
        // Add player to entity manager
        await entityManager.addPlayer(socket.characterId, socket.id, data);
        
        // Send initial dungeon state
        socket.emit('instance_joined', {
          instanceId,
          dungeon: getDungeonStateForClient(dungeonData),
          player: entityManager.getPlayerData(socket.characterId)
        });
        
        // Broadcast to other players
        socket.broadcast.emit('player_joined_instance', {
          characterId: socket.characterId,
          data: entityManager.getPlayerData(socket.characterId)
        });
      } catch (error) {
        console.error('Error joining instance:', error);
        socket.emit('error', { message: 'Failed to join instance' });
      }
    });
    
    // Handle player movement
    socket.on('player_move', (data) => {
      entityManager.updatePlayerPosition(socket.characterId, data.position, data.rotation);
      
      // Broadcast to other players
      socket.broadcast.emit('player_moved', {
        characterId: socket.characterId,
        position: data.position,
        rotation: data.rotation
      });
    });
    
    // Handle player attack
    socket.on('player_attack', (data) => {
      const attackResults = combatSystem.processPlayerAttack(socket.characterId, data);
      
      // Broadcast attack to all players
      io.emit('attack_executed', {
        characterId: socket.characterId,
        attackType: data.type,
        targetIds: data.targetIds,
        position: data.position,
        results: attackResults
      });
      
      // Check for enemy deaths
      const deadEnemies = attackResults.filter(r => r.killed).map(r => r.targetId);
      if (deadEnemies.length > 0) {
        handleEnemyDeaths(deadEnemies);
      }
    });
    
    // Handle ability use
    socket.on('use_ability', (data) => {
      const abilityResults = combatSystem.processAbilityUse(socket.characterId, data);
      
      // Broadcast ability use to all players
      io.emit('ability_used', {
        characterId: socket.characterId,
        abilityId: data.abilityId,
        position: data.position,
        targetPosition: data.targetPosition,
        results: abilityResults
      });
      
      // Check for enemy deaths
      const deadEnemies = abilityResults.filter(r => r.killed).map(r => r.targetId);
      if (deadEnemies.length > 0) {
        handleEnemyDeaths(deadEnemies);
      }
    });
    
    // Handle flask use
    socket.on('use_flask', (data) => {
      const flaskResult = entityManager.useFlask(socket.characterId, data.type);
      
      if (flaskResult.success) {
        // Notify player
        socket.emit('flask_used', {
          type: data.type,
          result: flaskResult
        });
        
        // Broadcast flask use to other players
        socket.broadcast.emit('player_used_flask', {
          characterId: socket.characterId,
          type: data.type
        });
      } else {
        socket.emit('error', { message: flaskResult.message });
      }
    });
    
    // Handle returning to hub
    socket.on('return_to_hub', () => {
      // Remove player from instance
      entityManager.removePlayer(socket.characterId);
      
      // Broadcast player left
      socket.broadcast.emit('player_left_instance', {
        characterId: socket.characterId
      });
      
      // Disconnect socket
      socket.disconnect();
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Player disconnected from instance ${instanceId}: ${socket.characterId}`);
      
      // Remove player from entity manager
      entityManager.removePlayer(socket.characterId);
      
      // Broadcast player left
      socket.broadcast.emit('player_left_instance', {
        characterId: socket.characterId
      });
      
      // Check if instance is empty
      if (entityManager.getPlayerCount() === 0) {
        console.log(`Instance ${instanceId} is empty, preparing for shutdown`);
        // In a production environment, this would notify a manager to shut down the instance
      }
    });
  });
  
  function handleEnemyDeaths(deadEnemyIds) {
    // Generate loot for each dead enemy
    const lootDrops = deadEnemyIds.map(enemyId => {
      const enemy = entityManager.getEnemyData(enemyId);
      if (!enemy) return null;
      
      const loot = lootSystem.generateLoot(enemy);
      return {
        enemyId,
        position: enemy.position,
        items: loot
      };
    }).filter(drop => drop !== null);
    
    // Remove dead enemies
    deadEnemyIds.forEach(enemyId => {
      entityManager.removeEnemy(enemyId);
    });
    
    // Broadcast enemy deaths and loot drops
    io.emit('enemies_defeated', {
      enemyIds: deadEnemyIds,
      lootDrops
    });
    
    // Check if boss is defeated
    const bossRoom = dungeonData.bossRoom;
    if (bossRoom) {
      const bossLayer = dungeonData.layers[bossRoom.layerIndex];
      const bossRoomData = bossLayer.rooms[bossRoom.roomIndex];
      
      const bossEnemies = bossRoomData.enemies.filter(e => e.type === 'boss');
      const bossIds = bossEnemies.map(e => e.id);
      
      const allBossesDead = bossIds.every(id => deadEnemyIds.includes(id) || !entityManager.getEnemyData(id));
      
      if (allBossesDead) {
        handleBossDefeated();
      }
    }
  }
  
  function handleBossDefeated() {
    console.log(`Boss defeated in instance ${instanceId}`);
    
    // Get boss room data
    const bossRoom = dungeonData.bossRoom;
    const bossLayer = dungeonData.layers[bossRoom.layerIndex];
    const bossRoomData = bossLayer.rooms[bossRoom.roomIndex];
    
    // Create portal to hub
    const portalPosition = {
      x: bossRoomData.position.x + Math.floor(bossRoomData.size.width / 2),
      y: bossRoomData.position.y,
      z: bossRoomData.position.z + Math.floor(bossRoomData.size.depth / 2)
    };
    
    // Send boss defeated event
    io.emit('boss_defeated', {
      portalPosition,
      countdownSeconds: 15
    });
    
    // Schedule instance shutdown
    setTimeout(() => {
      io.emit('dungeon_complete');
      
      // Wait for players to disconnect
      setTimeout(() => {
        // In a production environment, this would shut down the instance
        console.log(`Instance ${instanceId} completed, shutting down`);
      }, 5000);
    }, 15000);
  }
  
  function getDungeonStateForClient(dungeon) {
    // Create a simplified version of the dungeon without sensitive data
    return {
      id: dungeon.id,
      seed: dungeon.seed,
      biome: {
        id: dungeon.biome.id,
        name: dungeon.biome.name
      },
      startPosition: dungeon.startPosition,
      layers: dungeon.layers.map(layer => ({
        index: layer.index,
        rooms: layer.rooms.map(room => ({
          index: room.index,
          position: room.position,
          size: room.size,
          isBossRoom: room.isBossRoom
        })),
        connections: layer.connections
      }))
    };
  }
  
  function getMockBiome(biomeId) {
    // Mock biome data for testing
    const biomes = {
      'forest': {
        id: 'forest',
        name: 'Forest',
        minDifficulty: 1,
        maxDifficulty: 10,
        minLayers: 2,
        maxLayers: 5,
        enemyTypes: [
          { id: 'goblin', name: 'Goblin', health: 30, damage: 5, speed: 2.0, type: 'normal', difficulty: 1 },
          { id: 'wolf', name: 'Wolf', health: 40, damage: 7, speed: 2.5, type: 'normal', difficulty: 2 },
          { id: 'bandit', name: 'Bandit', health: 50, damage: 8, speed: 1.8, type: 'normal', difficulty: 3 },
          { id: 'orc', name: 'Orc', health: 70, damage: 12, speed: 1.5, type: 'normal', difficulty: 4 },
          { id: 'ogre', name: 'Ogre', health: 120, damage: 15, speed: 1.2, type: 'elite', difficulty: 6, isElite: true },
          { id: 'forest_guardian', name: 'Forest Guardian', health: 300, damage: 25, speed: 1.0, type: 'boss', difficulty: 10, isBoss: true }
        ]
      },
      'cave': {
        id: 'cave',
        name: 'Cave',
        minDifficulty: 3,
        maxDifficulty: 15,
        minLayers: 3,
        maxLayers: 6,
        enemyTypes: [
          { id: 'spider', name: 'Spider', health: 35, damage: 8, speed: 2.2, type: 'normal', difficulty: 3 },
          { id: 'bat', name: 'Bat Swarm', health: 25, damage: 6, speed: 3.0, type: 'normal', difficulty: 3 },
          { id: 'troll', name: 'Cave Troll', health: 100, damage: 18, speed: 1.2, type: 'normal', difficulty: 6 },
          { id: 'golem', name: 'Stone Golem', health: 150, damage: 20, speed: 1.0, type: 'elite', difficulty: 8, isElite: true },
          { id: 'dragon', name: 'Cave Dragon', health: 400, damage: 30, speed: 1.5, type: 'boss', difficulty: 15, isBoss: true }
        ]
      },
      'dungeon': {
        id: 'dungeon',
        name: 'Dungeon',
        minDifficulty: 5,
        maxDifficulty: 20,
        minLayers: 4,
        maxLayers: 7,
        enemyTypes: [
          { id: 'skeleton', name: 'Skeleton', health: 40, damage: 10, speed: 1.8, type: 'normal', difficulty: 5 },
          { id: 'zombie', name: 'Zombie', health: 60, damage: 12, speed: 1.2, type: 'normal', difficulty: 6 },
          { id: 'ghost', name: 'Ghost', health: 30, damage: 15, speed: 2.5, type: 'normal', difficulty: 7 },
          { id: 'knight', name: 'Undead Knight', health: 120, damage: 20, speed: 1.5, type: 'elite', difficulty: 10, isElite: true },
          { id: 'necromancer', name: 'Necromancer', health: 200, damage: 25, speed: 1.0, type: 'elite', difficulty: 12, isElite: true },
          { id: 'lich', name: 'Lich King', health: 500, damage: 35, speed: 1.3, type: 'boss', difficulty: 20, isBoss: true }
        ]
      }
    };
    
    return biomes[biomeId] || biomes['forest'];
  }
  
  // Start server
  server.listen(port, () => {
    console.log(`Instance server listening on port ${port}`);
  });
  
  return {
    server,
    app,
    io,
    close: (callback) => {
      server.close(callback);
    }
  };
}

// Start server if this file is executed directly
if (require.main === module) {
  const port = process.env.PORT || 3002;
  createInstanceServer(port);
}

module.exports = { createInstanceServer };