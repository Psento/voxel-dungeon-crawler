// server/instance-server/instance-worker.js
const { parentPort } = require('worker_threads');
const { DungeonGenerator } = require('./dungeon-generator');

// Respond to messages from the main thread
parentPort.on('message', async (task) => {
  try {
    if (task.action === 'generateDungeon') {
      // Get biome data (in a real implementation, this would fetch from a database)
      const biome = getMockBiome(task.biomeId);
      
      // Create dungeon generator
      const generator = new DungeonGenerator(biome, task.difficulty, task.layerCount);
      
      // Generate dungeon
      const dungeon = generator.generateDungeon();
      
      // Send result back to main thread
      parentPort.postMessage({
        success: true,
        dungeon
      });
    } else {
      throw new Error(`Unknown action: ${task.action}`);
    }
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
});

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