// client/game/chunk-manager.js
import * as THREE from 'three';

export class ChunkManager {
  constructor(scene, viewDistance = 5) {
    this.scene = scene;
    this.chunks = new Map();
    this.viewDistance = viewDistance;
    this.playerPosition = new THREE.Vector3();
    this.chunkSize = 16;
    this.lodLevels = 3; // Number of LOD levels
    this.voxelCache = new Map(); // Cache for voxel data
    this.meshCache = new Map(); // Cache for optimized chunk geometries
    this.maxCacheSize = 100; // Maximum chunks to keep in cache
    this.maxProcessPerFrame = 2; // Max chunks to process in one frame
    this.chunkGenQueue = []; // Chunks to generate
    this.frustumCulling = true; // Enable frustum culling
    this.frustum = new THREE.Frustum(); // For culling
  }
  
  updateChunks(playerPosition, camera) {
    this.playerPosition.copy(playerPosition);
    
    // Update frustum for culling
    if (camera && this.frustumCulling) {
      const matrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(matrix);
    }
    
    // Get player's chunk coordinates
    const playerChunkX = Math.floor(playerPosition.x / this.chunkSize);
    const playerChunkY = Math.floor(playerPosition.y / this.chunkSize);
    const playerChunkZ = Math.floor(playerPosition.z / this.chunkSize);
    
    // Track which chunks to keep at which LOD level
    const chunksToKeep = new Map();
    
    // Calculate chunks to load with appropriate LOD level
    for (let y = playerChunkY - this.viewDistance; y <= playerChunkY + this.viewDistance; y++) {
      for (let z = playerChunkZ - this.viewDistance; z <= playerChunkZ + this.viewDistance; z++) {
        for (let x = playerChunkX - this.viewDistance; x <= playerChunkX + this.viewDistance; x++) {
          // Calculate Manhattan distance for LOD determination
          const distance = Math.abs(x - playerChunkX) + 
                          Math.abs(y - playerChunkY) + 
                          Math.abs(z - playerChunkZ);
          
          // Skip chunks that are too far
          if (distance > this.viewDistance) continue;
          
          // Determine LOD level based on distance
          let lodLevel = 0;
          if (distance > this.viewDistance * 0.7) {
            lodLevel = 2; // Far - low detail
          } else if (distance > this.viewDistance * 0.4) {
            lodLevel = 1; // Medium distance - medium detail
          }
          
          // Perform frustum culling
          if (this.frustumCulling) {
            const chunkWorldPos = new THREE.Vector3(
              x * this.chunkSize + this.chunkSize / 2,
              y * this.chunkSize + this.chunkSize / 2,
              z * this.chunkSize + this.chunkSize / 2
            );
            
            // Create bounding sphere for chunk
            const boundingSphere = new THREE.Sphere(
              chunkWorldPos,
              this.chunkSize * Math.sqrt(3) / 2
            );
            
            // Skip chunks outside frustum
            if (!this.frustum.intersectsSphere(boundingSphere)) {
              continue;
            }
          }
          
          const chunkKey = `${x},${y},${z}`;
          chunksToKeep.set(chunkKey, lodLevel);
        }
      }
    }
    
    // Unload distant chunks
    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunksToKeep.has(key)) {
        this.unloadChunk(key);
      }
    }
    
    // Process up to maxProcessPerFrame chunks per frame
    // This prevents frame rate drops when many chunks need updating
    this.chunkGenQueue = [];
    
    // Load or update chunks
    for (const [key, lodLevel] of chunksToKeep.entries()) {
      if (!this.chunks.has(key)) {
        // Queue chunk for generation
        this.chunkGenQueue.push({ key, lodLevel });
      } else {
        // Update LOD if needed
        const existingChunk = this.chunks.get(key);
        if (existingChunk.lodLevel !== lodLevel) {
          this.chunkGenQueue.push({ key, lodLevel });
        }
      }
    }
    
    // Process some chunks from queue
    for (let i = 0; i < Math.min(this.maxProcessPerFrame, this.chunkGenQueue.length); i++) {
      const { key, lodLevel } = this.chunkGenQueue.shift();
      
      // If already loaded at different LOD, update it
      if (this.chunks.has(key)) {
        this.updateChunkLOD(key, lodLevel);
      } else {
        // Otherwise, load it
        this.loadChunk(key, lodLevel);
      }
    }
  }
  
  loadChunk(chunkKey, lodLevel) {
    // Parse coordinates from key
    const [x, y, z] = chunkKey.split(',').map(Number);
    
    // Generate or load chunk data
    const voxelData = this.getOrGenerateVoxelData(x, y, z);
    
    // Create mesh with appropriate LOD
    const mesh = this.createChunkMesh(voxelData, lodLevel, x, y, z);
    
    // Position the chunk in world space
    mesh.position.set(
      x * this.chunkSize,
      y * this.chunkSize,
      z * this.chunkSize
    );
    
    // Add to scene and store in chunks map
    this.scene.add(mesh);
    this.chunks.set(chunkKey, {
      mesh,
      lodLevel,
      lastAccessed: Date.now()
    });
  }
  
  unloadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey);
    if (chunk) {
      this.scene.remove(chunk.mesh);
      
      // Dispose geometries and materials to free memory
      if (chunk.mesh.geometry) {
        chunk.mesh.geometry.dispose();
      }
      
      if (chunk.mesh.material) {
        if (Array.isArray(chunk.mesh.material)) {
          chunk.mesh.material.forEach(material => material.dispose());
        } else {
          chunk.mesh.material.dispose();
        }
      }
      
      this.chunks.delete(chunkKey);
    }
  }
  
  updateChunkLOD(chunkKey, newLodLevel) {
    // Get the old chunk
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return;
    
    // If LOD is the same, no need to update
    if (chunk.lodLevel === newLodLevel) return;
    
    // Parse coordinates from key
    const [x, y, z] = chunkKey.split(',').map(Number);
    
    // Get cached voxel data
    const voxelData = this.getOrGenerateVoxelData(x, y, z);
    
    // Create new mesh with updated LOD
    const newMesh = this.createChunkMesh(voxelData, newLodLevel, x, y, z);
    newMesh.position.copy(chunk.mesh.position);
    
    // Replace in scene
    this.scene.remove(chunk.mesh);
    this.scene.add(newMesh);
    
    // Dispose old mesh resources
    if (chunk.mesh.geometry) {
      chunk.mesh.geometry.dispose();
    }
    
    if (chunk.mesh.material) {
      if (Array.isArray(chunk.mesh.material)) {
        chunk.mesh.material.forEach(material => material.dispose());
      } else {
        chunk.mesh.material.dispose();
      }
    }
    
    // Update chunk data
    this.chunks.set(chunkKey, {
      mesh: newMesh,
      lodLevel: newLodLevel,
      lastAccessed: Date.now()
    });
  }
  
  createChunkMesh(voxelData, lodLevel, chunkX, chunkY, chunkZ) {
    // First check if we have this mesh cached
    const cacheKey = `${chunkX},${chunkY},${chunkZ}_lod${lodLevel}`;
    
    if (this.meshCache.has(cacheKey)) {
      // Clone the cached geometry for reuse
      const cachedGeometry = this.meshCache.get(cacheKey);
      const material = this.getMaterial();
      return new THREE.Mesh(cachedGeometry.clone(), material);
    }
    
    // Different mesh creation based on LOD level
    let geometry;
    if (lodLevel === 0) {
      geometry = this.createHighDetailMesh(voxelData);
    } else if (lodLevel === 1) {
      geometry = this.createMediumDetailMesh(voxelData);
    } else {
      geometry = this.createLowDetailMesh(voxelData);
    }
    
    // Cache the generated geometry
    this.meshCache.set(cacheKey, geometry.clone());
    
    // Check cache size and prune if necessary
    if (this.meshCache.size > this.maxCacheSize) {
      this.pruneCache();
    }
    
    // Create and return mesh
    const material = this.getMaterial();
    return new THREE.Mesh(geometry, material);
  }
  
  getMaterial() {
    // Create or reuse materials based on voxel types
    // In a real implementation, you'd have different materials for different block types
    return new THREE.MeshLambertMaterial({ color: 0x8b5a2b, vertexColors: true });
  }
  
  createHighDetailMesh(voxelData) {
    // Use greedy meshing algorithm for optimal performance
    return this.createGreedyMesh(voxelData, 1); // No simplification
  }
  
  createMediumDetailMesh(voxelData) {
    // Simplify by merging some voxels
    const simplifiedData = this.simplifyVoxelData(voxelData, 2);
    return this.createGreedyMesh(simplifiedData, 2);
  }
  
  createLowDetailMesh(voxelData) {
    // Highly simplified for distant chunks
    const simplifiedData = this.simplifyVoxelData(voxelData, 4);
    return this.createGreedyMesh(simplifiedData, 4);
  }
  
  simplifyVoxelData(voxelData, factor) {
    // Combine voxels to reduce detail level
    const size = this.chunkSize;
    const simplifiedSize = Math.ceil(size / factor);
    const result = new Uint8Array(simplifiedSize * simplifiedSize * simplifiedSize);
    
    for (let y = 0; y < simplifiedSize; y++) {
      for (let z = 0; z < simplifiedSize; z++) {
        for (let x = 0; x < simplifiedSize; x++) {
          // Find most common voxel type in this region
          const types = {};
          let maxCount = 0;
          let maxType = 0;
          
          for (let dy = 0; dy < factor; dy++) {
            for (let dz = 0; dz < factor; dz++) {
              for (let dx = 0; dx < factor; dx++) {
                const sx = x * factor + dx;
                const sy = y * factor + dy;
                const sz = z * factor + dz;
                
                if (sx < size && sy < size && sz < size) {
                  const index = (sy * size * size) + (sz * size) + sx;
                  const type = voxelData[index];
                  
                  if (type === 0) continue; // Skip air
                  
                  types[type] = (types[type] || 0) + 1;
                  
                  if (types[type] > maxCount) {
                    maxCount = types[type];
                    maxType = type;
                  }
                }
              }
            }
          }
          
          const index = (y * simplifiedSize * simplifiedSize) + (z * simplifiedSize) + x;
          result[index] = maxType;
        }
      }
    }
    
    return result;
  }
  
  createGreedyMesh(voxelData, scale = 1) {
    // Greedy meshing implementation
    // This algorithm combines adjacent faces of the same voxel type
    // to significantly reduce vertex count
    
    const chunkSize = Math.ceil(this.chunkSize / scale);
    const geometry = new THREE.BufferGeometry();
    
    // Arrays to store vertex data
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    
    // Direction vectors for the 6 faces of a cube
    const FACES = [
      { dir: [0, 1, 0], corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] }, // top
      { dir: [0, -1, 0], corners: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] }, // bottom
      { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // front
      { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }, // back
      { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]] }, // right
      { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1]] }, // left
    ];
    
    // Process each face direction
    for (let faceIndex = 0; faceIndex < FACES.length; faceIndex++) {
      const face = FACES[faceIndex];
      const dir = face.dir;
      
      // Create mask showing which faces are visible
      const mask = new Uint8Array(chunkSize * chunkSize);
      
      // Loop through voxels in this direction
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          for (let x = 0; x < chunkSize; x++) {
            // Calculate current voxel index
            const voxelIndex = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
            const voxelType = voxelData[voxelIndex];
            
            // Skip empty voxels
            if (voxelType === 0) continue;
            
            // Check adjacent voxel in this face's direction
            let nx = x + dir[0];
            let ny = y + dir[1];
            let nz = z + dir[2];
            
            // If at chunk boundary or adjacent voxel is empty/different, create a face
            let shouldCreateFace = false;
            
            if (nx < 0 || nx >= chunkSize || 
                ny < 0 || ny >= chunkSize || 
                nz < 0 || nz >= chunkSize) {
              // At chunk boundary - create face
              shouldCreateFace = true;
            } else {
              // Check if adjacent voxel is different
              const adjIndex = (ny * chunkSize * chunkSize) + (nz * chunkSize) + nx;
              const adjVoxelType = voxelData[adjIndex];
              
              if (adjVoxelType === 0 || adjVoxelType !== voxelType) {
                shouldCreateFace = true;
              }
            }
            
            if (shouldCreateFace) {
              // Determine the 2D coordinates for the mask based on face direction
              let maskIndex;
              
              if (dir[0] !== 0) { // X direction
                maskIndex = y * chunkSize + z;
              } else if (dir[1] !== 0) { // Y direction
                maskIndex = z * chunkSize + x;
              } else { // Z direction
                maskIndex = y * chunkSize + x;
              }
              
              mask[maskIndex] = voxelType;
            }
          }
        }
      }
      
      // Now apply greedy meshing to the mask
      // Iterate through mask and find rectangles of same voxel type
      const visited = new Uint8Array(chunkSize * chunkSize);
      
      for (let j = 0; j < chunkSize; j++) {
        for (let i = 0; i < chunkSize; i++) {
          const maskIndex = j * chunkSize + i;
          
          // Skip empty or already visited cells
          if (mask[maskIndex] === 0 || visited[maskIndex] === 1) continue;
          
          // Get voxel type for this face
          const voxelType = mask[maskIndex];
          
          // Find width of rectangle (how many cells to the right share the same voxel type)
          let width = 1;
          while (i + width < chunkSize && 
                 mask[j * chunkSize + (i + width)] === voxelType && 
                 visited[j * chunkSize + (i + width)] === 0) {
            width++;
          }
          
          // Find height of rectangle (how many rows down share the same voxel type)
          let height = 1;
          let done = false;
          
          heightLoop: while (j + height < chunkSize && !done) {
            for (let dx = 0; dx < width; dx++) {
              const checkIndex = (j + height) * chunkSize + (i + dx);
              if (mask[checkIndex] !== voxelType || visited[checkIndex] === 1) {
                done = true;
                break heightLoop;
              }
            }
            height++;
          }
          
          // Mark these cells as visited
          for (let jj = 0; jj < height; jj++) {
            for (let ii = 0; ii < width; ii++) {
              visited[(j + jj) * chunkSize + (i + ii)] = 1;
            }
          }
          
          // Now create a face for this rectangle
          // We need to convert 2D mask coordinates back to 3D voxel coordinates
          let x1, y1, z1; // Bottom-left corner
          let x2, y2, z2; // Top-right corner
          
          if (dir[0] !== 0) { // X direction
            x1 = x2 = dir[0] > 0 ? chunkSize : -1;
            y1 = j;
            z1 = i;
            y2 = j + height;
            z2 = i + width;
          } else if (dir[1] !== 0) { // Y direction
            y1 = y2 = dir[1] > 0 ? chunkSize : -1;
            x1 = i;
            z1 = j;
            x2 = i + width;
            z2 = j + height;
          } else { // Z direction
            z1 = z2 = dir[2] > 0 ? chunkSize : -1;
            x1 = i;
            y1 = j;
            x2 = i + width;
            y2 = j + height;
          }
          
          // Adjust coordinates
          if (dir[0] < 0) x1++;
          if (dir[1] < 0) y1++;
          if (dir[2] < 0) z1++;
          
          // Create rectangle face
          this.addFace(vertices, normals, colors, indices, 
                      x1, y1, z1, 
                      x2, y2, z2, 
                      dir, voxelType, scale);
        }
      }
    }
    
    // Set buffer attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  addFace(vertices, normals, colors, indices, x1, y1, z1, x2, y2, z2, dir, voxelType, scale) {
    // Calculate vertex positions for this face
    const vertCount = vertices.length / 3;
    
    // Set face corners based on direction
    let corners;
    
    if (dir[0] !== 0) { // X direction
      corners = [
        [x1, y1, z1],
        [x1, y2, z1],
        [x1, y2, z2],
        [x1, y1, z2]
      ];
    } else if (dir[1] !== 0) { // Y direction
      corners = [
        [x1, y1, z1],
        [x1, y1, z2],
        [x2, y1, z2],
        [x2, y1, z1]
      ];
    } else { // Z direction
      corners = [
        [x1, y1, z1],
        [x2, y1, z1],
        [x2, y2, z1],
        [x1, y2, z1]
      ];
    }
    
    // Scale coordinates
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        corners[i][j] *= scale;
      }
    }
    
    // Add vertices
    for (const corner of corners) {
      vertices.push(corner[0], corner[1], corner[2]);
      normals.push(dir[0], dir[1], dir[2]);
      
      // Set color based on voxel type
      // A real implementation would use a color map
      switch (voxelType) {
        case 1: // Stone
          colors.push(0.5, 0.5, 0.5);
          break;
        case 2: // Dirt
          colors.push(0.6, 0.3, 0.1);
          break;
        case 3: // Grass
          colors.push(0.3, 0.7, 0.2);
          break;
        case 4: // Wood
          colors.push(0.6, 0.4, 0.2);
          break;
        case 5: // Sand
          colors.push(0.8, 0.8, 0.5);
          break;
        default:
          colors.push(1, 1, 1);
      }
    }
    
    // Add indices for triangles (two per face)
    indices.push(
      vertCount, vertCount + 1, vertCount + 2,
      vertCount, vertCount + 2, vertCount + 3
    );
  }
  
  getOrGenerateVoxelData(chunkX, chunkY, chunkZ) {
    // Check cache first
    const cacheKey = `${chunkX},${chunkY},${chunkZ}`;
    
    if (this.voxelCache.has(cacheKey)) {
      return this.voxelCache.get(cacheKey);
    }
    
    // Generate new voxel data if not in cache
    // In a real implementation, this would use a noise-based terrain generator
    // or load from server
    const voxelData = this.generateSimpleTerrain(chunkX, chunkY, chunkZ);
    
    // Cache the data
    this.voxelCache.set(cacheKey, voxelData);
    
    // Check cache size and prune if necessary
    if (this.voxelCache.size > this.maxCacheSize) {
      this.pruneCache();
    }
    
    return voxelData;
  }
  
  generateSimpleTerrain(chunkX, chunkY, chunkZ) {
    // Simple terrain generation for testing
    const size = this.chunkSize;
    const data = new Uint8Array(size * size * size);
    
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          // Convert to world coordinates
          const worldX = chunkX * size + x;
          const worldY = chunkY * size + y;
          const worldZ = chunkZ * size + z;
          
          // Generate simple terrain with a height function
          const height = this.getTerrainHeight(worldX, worldZ);
          
          // Determine voxel type
          let voxelType = 0; // Air by default
          
          if (worldY < height - 4) {
            voxelType = 1; // Stone
          } else if (worldY < height - 1) {
            voxelType = 2; // Dirt
          } else if (worldY < height) {
            voxelType = 3; // Grass
          }
          
          // Set voxel in data array
          const index = (y * size * size) + (z * size) + x;
          data[index] = voxelType;
        }
      }
    }
    
    return data;
  }
  
  getTerrainHeight(x, z) {
    // Simple height function for testing
    // In a real implementation, this would use noise functions
    
    // Base height
    const baseHeight = 30;
    
    // Add some hills
    const hills = Math.sin(x * 0.1) * 5 + Math.cos(z * 0.1) * 5;
    
    // Add some small noise
    const noise = (Math.sin(x * 0.3 + z * 0.5) + Math.cos(x * 0.7 + z * 0.3)) * 2;
    
    return Math.floor(baseHeight + hills + noise);
  }
  
  pruneCache() {
    // Remove least recently used items from caches
    
    // Prune voxel cache
    if (this.voxelCache.size > this.maxCacheSize) {
      // Get all cache keys and sort by distance from player
      const keys = Array.from(this.voxelCache.keys());
      const playerChunkX = Math.floor(this.playerPosition.x / this.chunkSize);
      const playerChunkY = Math.floor(this.playerPosition.y / this.chunkSize);
      const playerChunkZ = Math.floor(this.playerPosition.z / this.chunkSize);
      
      // Sort by distance (furthest first)
      keys.sort((a, b) => {
        const [ax, ay, az] = a.split(',').map(Number);
        const [bx, by, bz] = b.split(',').map(Number);
        
        const distA = Math.sqrt(
          Math.pow(ax - playerChunkX, 2) + 
          Math.pow(ay - playerChunkY, 2) + 
          Math.pow(az - playerChunkZ, 2)
        );
        
        const distB = Math.sqrt(
          Math.pow(bx - playerChunkX, 2) + 
          Math.pow(by - playerChunkY, 2) + 
          Math.pow(bz - playerChunkZ, 2)
        );
        
        return distB - distA; // Furthest first
      });
      
      // Remove furthest chunks until we're back at half capacity
      const toRemove = keys.slice(0, Math.floor(this.maxCacheSize / 2));
      for (const key of toRemove) {
        this.voxelCache.delete(key);
      }
    }
    
    // Prune mesh cache
    if (this.meshCache.size > this.maxCacheSize) {
      // Get all cache keys and sort by distance from player
      const keys = Array.from(this.meshCache.keys());
      
      // Sort by distance (furthest first)
      keys.sort((a, b) => {
        // Extract chunk coordinates (ignore LOD part)
        const aCoords = a.split('_')[0];
        const bCoords = b.split('_')[0];
        
        const [ax, ay, az] = aCoords.split(',').map(Number);
        const [bx, by, bz] = bCoords.split(',').map(Number);
        
        const playerChunkX = Math.floor(this.playerPosition.x / this.chunkSize);
        const playerChunkY = Math.floor(this.playerPosition.y / this.chunkSize);
        const playerChunkZ = Math.floor(this.playerPosition.z / this.chunkSize);
        
        const distA = Math.sqrt(
          Math.pow(ax - playerChunkX, 2) + 
          Math.pow(ay - playerChunkY, 2) + 
          Math.pow(az - playerChunkZ, 2)
        );
        
        const distB = Math.sqrt(
          Math.pow(bx - playerChunkX, 2) + 
          Math.pow(by - playerChunkY, 2) + 
          Math.pow(bz - playerChunkZ, 2)
        );
        
        return distB - distA; // Furthest first
      });
      
      // Remove furthest chunks until we're back at half capacity
      const toRemove = keys.slice(0, Math.floor(this.maxCacheSize / 2));
      for (const key of toRemove) {
        const geometry = this.meshCache.get(key);
        geometry.dispose(); // Free memory
        this.meshCache.delete(key);
      }
    }
  }
}