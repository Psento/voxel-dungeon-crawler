// tests/server/dungeon-generator.test.js
const { DungeonGenerator } = require('../../server/instance-server/dungeon-generator');

describe('DungeonGenerator', () => {
  let generator;
  
  beforeEach(() => {
    // Create a test biome
    const testBiome = {
      id: 'test-biome',
      name: 'Test Biome',
      description: 'Test biome for testing',
      minDifficulty: 1,
      maxDifficulty: 10,
      minLayers: 2,
      maxLayers: 5,
      enemyTypes: [
        { id: 'goblin', name: 'Goblin', health: 30, damage: 5, speed: 2.0, type: 'normal', difficulty: 1 },
        { id: 'orc', name: 'Orc', health: 60, damage: 10, speed: 1.5, type: 'normal', difficulty: 3 },
        { id: 'boss', name: 'Boss', health: 200, damage: 20, speed: 1.0, type: 'boss', isBoss: true, difficulty: 5 }
      ]
    };
    
    generator = new DungeonGenerator(testBiome, 1, 3);
  });
  
  test('should generate a dungeon with the correct number of layers', () => {
    const dungeon = generator.generateDungeon();
    
    expect(dungeon).toBeDefined();
    expect(dungeon.layers).toHaveLength(3);
  });
  
  test('should generate rooms in each layer', () => {
    const dungeon = generator.generateDungeon();
    
    dungeon.layers.forEach(layer => {
      expect(layer.rooms.length).toBeGreaterThan(0);
    });
  });
  
  test('should have a boss in the last room of the last layer', () => {
    const dungeon = generator.generateDungeon();
    
    const lastLayer = dungeon.layers[dungeon.layers.length - 1];
    const lastRoom = lastLayer.rooms[lastLayer.rooms.length - 1];
    
    expect(lastRoom.isBossRoom).toBe(true);
    
    const bossEnemies = lastRoom.enemies.filter(e => e.type === 'boss');
    expect(bossEnemies.length).toBe(1);
  });
  
  test('should connect rooms within a layer', () => {
    const dungeon = generator.generateDungeon();
    
    dungeon.layers.forEach(layer => {
      // Each layer should have at least one connection (rooms - 1)
      expect(layer.connections.length).toBeGreaterThanOrEqual(layer.rooms.length - 1);
    });
  });
  
  test('should connect layers with stairs or portals', () => {
    const dungeon = generator.generateDungeon();
    
    // Each layer except the last should have an exit
    for (let i = 0; i < dungeon.layers.length - 1; i++) {
      const layer = dungeon.layers[i];
      const lastRoom = layer.rooms[layer.rooms.length - 1];
      
      expect(lastRoom.exit).toBeDefined();
      expect(lastRoom.exit.targetLayer).toBe(i + 1);
    }
    
    // Each layer except the first should have an entrance
    for (let i = 1; i < dungeon.layers.length; i++) {
      const layer = dungeon.layers[i];
      const firstRoom = layer.rooms[0];
      
      expect(firstRoom.entrance).toBeDefined();
      expect(firstRoom.entrance.targetLayer).toBe(i - 1);
    }
  });
});