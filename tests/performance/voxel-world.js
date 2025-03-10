// tests/performance/voxel-world.js
const { VoxelRenderer } = require('../../client/game/voxel-renderer');

// Mock Three.js
jest.mock('three', () => {
  return {
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      position: { set: jest.fn() }
    })),
    BoxGeometry: jest.fn(),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      setAttribute: jest.fn(),
      setIndex: jest.fn()
    })),
    BufferAttribute: jest.fn(),
    MeshLambertMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    TextureLoader: jest.fn().mockImplementation(() => ({
      load: jest.fn().mockReturnValue({
        magFilter: null,
        minFilter: null
      })
    }))
  };
});

describe('Voxel World Performance', () => {
  let renderer;
  let mockScene;
  
  beforeEach(() => {
    // Create a mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };
    
    // Create the voxel renderer
    renderer = new VoxelRenderer(mockScene);
  });
  
  test('should efficiently generate chunks', () => {
    // Create a 16x16x16 chunk filled mostly with air
    const chunkSize = 16;
    const voxelData = new Uint8Array(chunkSize * chunkSize * chunkSize);
    
    // Add some voxels (10% of the chunk)
    const voxelCount = Math.floor(chunkSize * chunkSize * chunkSize * 0.1);
    for (let i = 0; i < voxelCount; i++) {
      const x = Math.floor(Math.random() * chunkSize);
      const y = Math.floor(Math.random() * chunkSize);
      const z = Math.floor(Math.random() * chunkSize);
      const index = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
      voxelData[index] = 1 + Math.floor(Math.random() * 5); // Random voxel type
    }
    
    // Measure performance
    const startTime = performance.now();
    
    // Generate the chunk 10 times
    for (let i = 0; i < 10; i++) {
      renderer.createChunk(0, 0, 0, voxelData);
    }
    
    const endTime = performance.now();
    const averageTime = (endTime - startTime) / 10;
    
    console.log(`Average chunk generation time: ${averageTime.toFixed(2)}ms`);
    
    // Ensure it's reasonably fast (under 50ms per chunk)
    expect(averageTime).toBeLessThan(50);
  });
  
  test('should handle large view distances efficiently', () => {
    // Mock updateChunks method
    const originalUpdateChunks = renderer.updateChunks;
    renderer.updateChunks = jest.fn().mockImplementation((playerPosition, renderDistance) => {
      const startTime = performance.now();
      
      // Generate chunks around player
      const chunksGenerated = (renderDistance * 2 + 1) ** 3;
      
      const endTime = performance.now();
      return { time: endTime - startTime, chunksGenerated };
    });
    
    // Test with various render distances
    const distances = [1, 2, 3, 4, 5];
    
    distances.forEach(distance => {
      const result = renderer.updateChunks({ x: 0, y: 0, z: 0 }, distance);
      console.log(`Render distance ${distance}: ${result.time.toFixed(2)}ms for ${result.chunksGenerated} chunks`);
      
      // Ensure performance scales reasonably (should be roughly linear with chunk count)
      expect(result.time / result.chunksGenerated).toBeLessThan(10); // Less than 10ms per chunk
    });
    
    // Restore original method
    renderer.updateChunks = originalUpdateChunks;
  });
});