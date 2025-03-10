// client/game/network.js
import io from 'socket.io-client';

export class GameNetwork {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.socket = null;
    this.connected = false;
    this.playerEntity = null;
    this.otherPlayers = new Map();
    this.enemies = new Map();
    this.characterId = null;
    this.token = null;
  }
  
  connect(token, characterId) {
    this.token = token;
    this.characterId = characterId;
    
    // Connect to world server
    this.socket = io({
      auth: {
        token,
        characterId
      }
    });
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.connected = true;
      
      // Join game world
      this.socket.emit('join_world', {
        characterId: this.characterId,
        position: this.gameClient.player ? this.gameClient.player.position : { x: 0, y: 2, z: 0 }
      });
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.connected = false;
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Game world events
    this.socket.on('world_state', (data) => {
      this.handleWorldState(data);
    });
    
    this.socket.on('player_joined', (data) => {
      this.handlePlayerJoined(data);
    });
    
    this.socket.on('player_left', (data) => {
      this.handlePlayerLeft(data);
    });
    
    this.socket.on('player_moved', (data) => {
      this.handlePlayerMoved(data);
    });
    
    this.socket.on('enemy_spawned', (data) => {
      this.handleEnemySpawned(data);
    });
    
    this.socket.on('enemy_moved', (data) => {
      this.handleEnemyMoved(data);
    });
    
    this.socket.on('enemy_attacked', (data) => {
      this.handleEnemyAttacked(data);
    });
    
    this.socket.on('enemy_defeated', (data) => {
      this.handleEnemyDefeated(data);
    });
    
    this.socket.on('dungeon_generated', (data) => {
      this.handleDungeonGenerated(data);
    });
    
    this.socket.on('enter_dungeon', (data) => {
      this.handleEnterDungeon(data);
    });
    
    this.socket.on('loot_dropped', (data) => {
      this.handleLootDropped(data);
    });
    
    this.socket.on('experience_gained', (data) => {
      this.handleExperienceGained(data);
    });
  }
  
  // Send player position update
  sendPlayerPosition(position, rotation) {
    if (!this.connected) return;
    
    this.socket.emit('player_move', {
      position,
      rotation
    });
  }
  
  // Send player attack
  sendPlayerAttack(attackData) {
    if (!this.connected) return;
    
    this.socket.emit('player_attack', attackData);
  }
  
  // Send ability use
  sendAbilityUse(abilityData) {
    if (!this.connected) return;
    
    this.socket.emit('use_ability', abilityData);
  }
  
  // Send flask use
  sendFlaskUse(flaskType) {
    if (!this.connected) return;
    
    this.socket.emit('use_flask', { type: flaskType });
  }
  
  // Request to join party
  sendJoinPartyRequest(partyId) {
    if (!this.connected) return;
    
    this.socket.emit('join_party', { partyId });
  }
  
  // Create a party
  sendCreatePartyRequest() {
    if (!this.connected) return;
    
    this.socket.emit('create_party');
  }
  
  // Start dungeon
  sendStartDungeonRequest(biomeId, difficulty) {
    if (!this.connected) return;
    
    this.socket.emit('start_dungeon', {
      biomeId,
      difficulty: difficulty || 1
    });
  }
  
  // Event handlers
  handleWorldState(data) {
    // Initialize player entity if not already
    if (!this.playerEntity && data.player) {
      this.playerEntity = data.player;
      if (this.gameClient.player) {
        this.gameClient.player.position.set(
          data.player.position.x,
          data.player.position.y,
          data.player.position.z
        );
      }
    }
    
    // Process other players
    if (data.players) {
      // Add new players, update existing ones
      data.players.forEach(player => {
        if (player.id !== this.characterId) {
          this.handlePlayerJoined(player);
        }
      });
      
      // Remove players not in the new state
      const currentPlayerIds = data.players.map(p => p.id);
      for (const playerId of this.otherPlayers.keys()) {
        if (!currentPlayerIds.includes(playerId)) {
          this.handlePlayerLeft({ id: playerId });
        }
      }
    }
    
    // Process enemies
    if (data.enemies) {
      // Add new enemies, update existing ones
      data.enemies.forEach(enemy => {
        this.handleEnemySpawned(enemy);
      });
      
      // Remove enemies not in the new state
      const currentEnemyIds = data.enemies.map(e => e.id);
      for (const enemyId of this.enemies.keys()) {
        if (!currentEnemyIds.includes(enemyId)) {
          this.handleEnemyDefeated({ id: enemyId });
        }
      }
    }
    
    // Update player stats
    if (data.playerStats) {
      this.gameClient.updatePlayerStats(data.playerStats);
    }
    
    // Update world chunks if available
    if (data.chunks) {
      data.chunks.forEach(chunk => {
        this.gameClient.voxelRenderer.createChunk(
          chunk.x, chunk.y, chunk.z, chunk.data
        );
      });
    }
  }
  
  handlePlayerJoined(data) {
    // Add or update other player
    if (data.id === this.characterId) return;
    
    if (!this.otherPlayers.has(data.id)) {
      // Create new player entity
      const otherPlayer = this.gameClient.createPlayerEntity(
        data.id, data.name, data.class
      );
      this.otherPlayers.set(data.id, otherPlayer);
      this.gameClient.scene.add(otherPlayer);
    }
    
    // Update position
    const otherPlayer = this.otherPlayers.get(data.id);
    if (otherPlayer && data.position) {
      otherPlayer.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }
  }
  
  handlePlayerLeft(data) {
    // Remove player from scene
    if (this.otherPlayers.has(data.id)) {
      const otherPlayer = this.otherPlayers.get(data.id);
      this.gameClient.scene.remove(otherPlayer);
      this.otherPlayers.delete(data.id);
    }
  }
  
  handlePlayerMoved(data) {
    // Update player position
    if (this.otherPlayers.has(data.id)) {
      const otherPlayer = this.otherPlayers.get(data.id);
      
      // Interpolate to new position
      this.gameClient.addTween(otherPlayer.position, {
        x: data.position.x,
        y: data.position.y,
        z: data.position.z
      }, 100); // 100ms interpolation
      
      // Update rotation
      if (data.rotation) {
        otherPlayer.rotation.set(
          data.rotation.x,
          data.rotation.y,
          data.rotation.z
        );
      }
    }
  }
  
  handleEnemySpawned(data) {
    // Add or update enemy
    if (!this.enemies.has(data.id)) {
      // Create new enemy entity
      const enemy = this.gameClient.createEnemyEntity(
        data.id, data.type, data.name
      );
      this.enemies.set(data.id, enemy);
      this.gameClient.scene.add(enemy);
    }
    
    // Update position
    const enemy = this.enemies.get(data.id);
    if (enemy && data.position) {
      enemy.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }
    
    // Update health bar
    if (data.health && data.maxHealth) {
      this.gameClient.updateEnemyHealth(
        data.id, data.health, data.maxHealth
      );
    }
  }
  
  handleEnemyMoved(data) {
    // Update enemy position
    if (this.enemies.has(data.id)) {
      const enemy = this.enemies.get(data.id);
      
      // Interpolate to new position
      this.gameClient.addTween(enemy.position, {
        x: data.position.x,
        y: data.position.y,
        z: data.position.z
      }, 100); // 100ms interpolation
      
      // Update rotation
      if (data.rotation) {
        enemy.rotation.set(
          data.rotation.x,
          data.rotation.y,
          data.rotation.z
        );
      }
    }
  }
  
  handleEnemyAttacked(data) {
    // Add visual effect for enemy attack
    this.gameClient.createAttackEffect(
      data.position, data.targetPosition, data.attackType
    );
  }
  
  handleEnemyDefeated(data) {
    // Remove enemy from scene
    if (this.enemies.has(data.id)) {
      const enemy = this.enemies.get(data.id);
      this.gameClient.scene.remove(enemy);
      this.enemies.delete(data.id);
      
      // Play death animation or particle effect
      this.gameClient.createDeathEffect(data.position);
    }
  }
  
  handleDungeonGenerated(data) {
    // Clear current scene
    this.gameClient.clearScene();
    
    // Store dungeon data
    this.gameClient.dungeonData = data;
    
    // Initialize dungeon visualization
    if (data.chunks) {
      data.chunks.forEach(chunk => {
        this.gameClient.voxelRenderer.createChunk(
          chunk.x, chunk.y, chunk.z, chunk.data
        );
      });
    }
  }
  
  handleEnterDungeon(data) {
    // Update player position
    if (this.gameClient.player && data.startPosition) {
      this.gameClient.player.position.set(
        data.startPosition.x,
        data.startPosition.y,
        data.startPosition.z
      );
      
      // Update camera
      this.gameClient.camera.position.copy(this.gameClient.player.position);
      this.gameClient.camera.position.y += 1.6; // Eye height
    }
    
    // Show dungeon info in UI
    this.gameClient.showDungeonInfo(data);
  }
  
  handleLootDropped(data) {
    // Create loot visual at position
    this.gameClient.createLootDrop(data.position, data.items);
  }
  
  handleExperienceGained(data) {
    // Show experience gained and update UI
    this.gameClient.showExperienceGained(data.amount, data.totalExperience, data.level);
    
    // Handle level up
    if (data.leveledUp) {
      this.gameClient.showLevelUp(data.level);
    }
  }
}