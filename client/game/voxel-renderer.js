// client/game/voxel-renderer.js
import * as THREE from 'three';

export class VoxelRenderer {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 16;
    this.materials = this.createMaterials();
    this.geometries = {};
  }

  createMaterials() {
    // Create a texture atlas for different voxel types
    const textureLoader = new THREE.TextureLoader();
    const textureAtlas = textureLoader.load('/assets/textures/voxel_atlas.png');
    textureAtlas.magFilter = THREE.NearestFilter;
    textureAtlas.minFilter = THREE.NearestFilter;
    
    // Create array of materials for different voxel types
    return [
      new THREE.MeshLambertMaterial({ visible: false }), // air (invisible)
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0x888888 }), // stone
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0x8B4513 }), // dirt
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0x44AA44 }), // grass
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0x8B5A2B }), // wood
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0x4444AA, transparent: true, opacity: 0.7 }), // water
      new THREE.MeshLambertMaterial({ map: textureAtlas, color: 0xDD4422, emissive: 0x552211 }) // lava
    ];
  }

  createChunk(chunkX, chunkY, chunkZ, voxelData) {
    const key = `${chunkX},${chunkY},${chunkZ}`;
    
    // Remove existing chunk if present
    if (this.chunks.has(key)) {
      const oldChunk = this.chunks.get(key);
      this.scene.remove(oldChunk);
    }
    
    // Create geometry for each voxel type
    const geometries = Array(this.materials.length).fill(null).map(() => []);
    
    // Extract voxel faces based on neighbors
    for (let y = 0; y < this.chunkSize; y++) {
      for (let z = 0; z < this.chunkSize; z++) {
        for (let x = 0; x < this.chunkSize; x++) {
          const voxelIndex = (y * this.chunkSize * this.chunkSize) + (z * this.chunkSize) + x;
          const voxelType = voxelData[voxelIndex];
          
          // Skip air blocks
          if (voxelType === 0) continue;
          
          // Check each of the six faces
          this.addFacesForVoxel(
            voxelType,
            geometries[voxelType],
            x, y, z,
            voxelData,
            this.chunkSize
          );
        }
      }
    }
    
    // Create mesh for each voxel type with faces
    const chunkGroup = new THREE.Group();
    
    for (let voxelType = 1; voxelType < geometries.length; voxelType++) {
      const geometry = geometries[voxelType];
      if (geometry.length === 0) continue;
      
      // Create buffer geometry
      const bufferGeometry = this.createBufferGeometry(geometry);
      
      // Create mesh
      const mesh = new THREE.Mesh(bufferGeometry, this.materials[voxelType]);
      mesh.position.set(
        chunkX * this.chunkSize,
        chunkY * this.chunkSize,
        chunkZ * this.chunkSize
      );
      
      chunkGroup.add(mesh);
    }
    
    // Add chunk to scene and store in chunks map
    this.scene.add(chunkGroup);
    this.chunks.set(key, chunkGroup);
    
    return chunkGroup;
  }

  addFacesForVoxel(voxelType, geometry, x, y, z, voxelData, size) {
    // Check each of the six faces
    const checkNeighbor = (nx, ny, nz) => {
      if (nx < 0 || ny < 0 || nz < 0 || nx >= size || ny >= size || nz >= size) {
        return 0; // Treat out of bounds as air for simplicity
      }
      
      const index = (ny * size * size) + (nz * size) + nx;
      return voxelData[index];
    };
    
    // Add top face (positive Y)
    if (checkNeighbor(x, y + 1, z) === 0) {
      this.addFace(geometry, x, y, z, 'top');
    }
    
    // Add bottom face (negative Y)
    if (checkNeighbor(x, y - 1, z) === 0) {
      this.addFace(geometry, x, y, z, 'bottom');
    }
    
    // Add front face (positive Z)
    if (checkNeighbor(x, y, z + 1) === 0) {
      this.addFace(geometry, x, y, z, 'front');
    }
    
    // Add back face (negative Z)
    if (checkNeighbor(x, y, z - 1) === 0) {
      this.addFace(geometry, x, y, z, 'back');
    }
    
    // Add right face (positive X)
    if (checkNeighbor(x + 1, y, z) === 0) {
      this.addFace(geometry, x, y, z, 'right');
    }
    
    // Add left face (negative X)
    if (checkNeighbor(x - 1, y, z) === 0) {
      this.addFace(geometry, x, y, z, 'left');
    }
  }

  addFace(geometry, x, y, z, face) {
    // Define vertices for cube face
    const vertices = [];
    const normals = [];
    const uvs = [];
    
    switch (face) {
      case 'top':
        vertices.push(
          // Top face (positive Y)
          x, y + 1, z,
          x + 1, y + 1, z,
          x + 1, y + 1, z + 1,
          x, y + 1, z + 1
        );
        normals.push(
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0
        );
        break;
      case 'bottom':
        vertices.push(
          // Bottom face (negative Y)
          x, y, z + 1,
          x + 1, y, z + 1,
          x + 1, y, z,
          x, y, z
        );
        normals.push(
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0
        );
        break;
      case 'front':
        vertices.push(
          // Front face (positive Z)
          x, y, z + 1,
          x, y + 1, z + 1,
          x + 1, y + 1, z + 1,
          x + 1, y, z + 1
        );
        normals.push(
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1
        );
        break;
      case 'back':
        vertices.push(
          // Back face (negative Z)
          x + 1, y, z,
          x + 1, y + 1, z,
          x, y + 1, z,
          x, y, z
        );
        normals.push(
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1
        );
        break;
      case 'right':
        vertices.push(
          // Right face (positive X)
          x + 1, y, z + 1,
          x + 1, y + 1, z + 1,
          x + 1, y + 1, z,
          x + 1, y, z
        );
        normals.push(
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0
        );
        break;
      case 'left':
        vertices.push(
          // Left face (negative X)
          x, y, z,
          x, y + 1, z,
          x, y + 1, z + 1,
          x, y, z + 1
        );
        normals.push(
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0
        );
        break;
    }
    
    // Standard UVs for now (can be improved with texture atlas later)
    uvs.push(
      0, 0,
      0, 1,
      1, 1,
      1, 0
    );
    
    // Store face data in geometry
    geometry.push({
      vertices,
      normals,
      uvs,
      indices: [0, 1, 2, 0, 2, 3]
    });
  }

  createBufferGeometry(faceData) {
    let vertexCount = 0;
    let indexCount = 0;
    
    // Count total vertices and indices
    for (const face of faceData) {
      vertexCount += face.vertices.length / 3;
      indexCount += face.indices.length;
    }
    
    // Create buffers
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(indexCount);
    
    let vertexOffset = 0;
    let indexOffset = 0;
    
    // Fill buffers
    for (const face of faceData) {
      const vertexCount = face.vertices.length / 3;
      
      // Add vertices
      for (let i = 0; i < face.vertices.length; i++) {
        positions[vertexOffset * 3 + i] = face.vertices[i];
      }
      
      // Add normals
      for (let i = 0; i < face.normals.length; i++) {
        normals[vertexOffset * 3 + i] = face.normals[i];
      }
      
      // Add UVs
      for (let i = 0; i < face.uvs.length; i++) {
        uvs[vertexOffset * 2 + i] = face.uvs[i];
      }
      
      // Add indices (with offset)
      for (let i = 0; i < face.indices.length; i++) {
        indices[indexOffset + i] = face.indices[i] + vertexOffset;
      }
      
      vertexOffset += vertexCount;
      indexOffset += face.indices.length;
    }
    
    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    return geometry;
  }

  updateChunks(playerPosition, renderDistance = 2) {
    // Get player chunk coordinates
    const playerChunkX = Math.floor(playerPosition.x / this.chunkSize);
    const playerChunkY = Math.floor(playerPosition.y / this.chunkSize);
    const playerChunkZ = Math.floor(playerPosition.z / this.chunkSize);
    
    // Track which chunks we want to keep
    const chunksToKeep = new Set();
    
    // Request chunks within render distance
    for (let y = playerChunkY - renderDistance; y <= playerChunkY + renderDistance; y++) {
      for (let z = playerChunkZ - renderDistance; z <= playerChunkZ + renderDistance; z++) {
        for (let x = playerChunkX - renderDistance; x <= playerChunkX + renderDistance; x++) {
          const key = `${x},${y},${z}`;
          chunksToKeep.add(key);
          
          // If chunk doesn't exist, request it
          if (!this.chunks.has(key)) {
            this.requestChunk(x, y, z);
          }
        }
      }
    }
    
    // Remove chunks outside render distance
    for (const key of this.chunks.keys()) {
      if (!chunksToKeep.has(key)) {
        const chunk = this.chunks.get(key);
        this.scene.remove(chunk);
        this.chunks.delete(key);
      }
    }
  }

  requestChunk(x, y, z) {
    // This function would make a request to the server for chunk data
    // For now, we'll generate a simple test chunk
    const voxelData = this.generateTestChunk(x, y, z);
    this.createChunk(x, y, z, voxelData);
  }

  generateTestChunk(chunkX, chunkY, chunkZ) {
    const size = this.chunkSize;
    const data = new Uint8Array(size * size * size);
    
    // Fill with air
    for (let i = 0; i < data.length; i++) {
      data[i] = 0;
    }
    
    // Generate test terrain
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          const worldY = chunkY * size + y;
          
          // Simple terrain with stone/dirt/grass layers
          if (worldY < 0) {
            // Stone layer
            data[(y * size * size) + (z * size) + x] = 1;
          } else if (worldY === 0) {
            // Grass layer at y=0
            data[(y * size * size) + (z * size) + x] = 3;
          } else if (worldY < 0 && worldY > -3) {
            // Dirt layer
            data[(y * size * size) + (z * size) + x] = 2;
          }
          
          // Add some randomness
          if (worldY < 3 && Math.random() < 0.1) {
            data[(y * size * size) + (z * size) + x] = Math.random() < 0.5 ? 4 : 5;
          }
        }
      }
    }
    
    return data;
  }
// client/game/voxel-renderer.js (optimizations)

// Add these methods to the VoxelRenderer class

// 1. Use greedy meshing to reduce face count
greedyMesh(voxelData, chunkSize) {
    const faces = [];
    const visited = new Uint8Array(chunkSize * chunkSize * chunkSize);
    const directions = [
      { axis: 0, dir: 1, name: 'right' },   // +X
      { axis: 0, dir: -1, name: 'left' },   // -X
      { axis: 1, dir: 1, name: 'top' },     // +Y
      { axis: 1, dir: -1, name: 'bottom' }, // -Y
      { axis: 2, dir: 1, name: 'front' },   // +Z
      { axis: 2, dir: -1, name: 'back' }    // -Z
    ];
    
    for (const { axis, dir, name } of directions) {
      // Determine iteration order
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      const w = axis;
      
      const positiveDir = dir > 0;
      
      // Reset visited array
      visited.fill(0);
      
      // Iterate along the w axis (major axis of current face direction)
      for (let ww = positiveDir ? 0 : chunkSize - 1;
           positiveDir ? ww < chunkSize : ww >= 0;
           positiveDir ? ww++ : ww--) {
        
        // Skip already visited voxels
        if (visited[ww * chunkSize * chunkSize]) continue;
        
        // Iterate over the face (u and v axes)
        for (let vv = 0; vv < chunkSize; vv++) {
          for (let uu = 0; uu < chunkSize; uu++) {
            // Convert UVW coordinates to XYZ based on current face direction
            const x = axis === 0 ? ww : (axis === 1 ? uu : uu);
            const y = axis === 0 ? uu : (axis === 1 ? ww : vv);
            const z = axis === 0 ? vv : (axis === 1 ? vv : ww);
            
            // Calculate voxel index
            const index = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
            
            // Skip if already visited
            if (visited[index] === 1) continue;
            
            // Get current voxel type
            const voxelType = voxelData[index];
            
            // Skip air blocks
            if (voxelType === 0) continue;
            
            // Check if the face is visible (adjacent to air)
            const nx = x + (axis === 0 ? dir : 0);
            const ny = y + (axis === 1 ? dir : 0);
            const nz = z + (axis === 2 ? dir : 0);
            
            // Skip if neighbor is outside the chunk (will be handled by another chunk)
            if (nx < 0 || ny < 0 || nz < 0 || nx >= chunkSize || ny >= chunkSize || nz >= chunkSize) continue;
            
            const neighborIndex = (ny * chunkSize * chunkSize) + (nz * chunkSize) + nx;
            const neighborType = voxelData[neighborIndex];
            
            // Skip if neighbor is not air (face is not visible)
            if (neighborType !== 0) continue;
            
            // Start growing a quad
            let width = 1;
            let height = 1;
            
            // Grow width (along u axis)
            let canGrowWidth = true;
            while (canGrowWidth && uu + width < chunkSize) {
              // Check the next column of voxels
              for (let h = 0; h < height; h++) {
                // Calculate coordinates for the next voxel
                const ux = axis === 0 ? ww : (axis === 1 ? (uu + width) : (uu + width));
                const uy = axis === 0 ? (uu + width) : (axis === 1 ? ww : (vv + h));
                const uz = axis === 0 ? (vv + h) : (axis === 1 ? (vv + h) : ww);
                
                const uIndex = (uy * chunkSize * chunkSize) + (uz * chunkSize) + ux;
                
                // Check if it's the same type and has an air neighbor
                if (voxelData[uIndex] !== voxelType || visited[uIndex] === 1) {
                  canGrowWidth = false;
                  break;
                }
                
                // Check if the face is visible
                const unx = ux + (axis === 0 ? dir : 0);
                const uny = uy + (axis === 1 ? dir : 0);
                const unz = uz + (axis === 2 ? dir : 0);
                
                if (unx < 0 || uny < 0 || unz < 0 || unx >= chunkSize || uny >= chunkSize || unz >= chunkSize) {
                  canGrowWidth = false;
                  break;
                }
                
                const uNeighborIndex = (uny * chunkSize * chunkSize) + (unz * chunkSize) + unx;
                if (voxelData[uNeighborIndex] !== 0) {
                  canGrowWidth = false;
                  break;
                }
              }
              
              if (canGrowWidth) {
                width++;
              }
            }
            
            // Grow height (along v axis)
            let canGrowHeight = true;
            while (canGrowHeight && vv + height < chunkSize) {
              // Check the next row of voxels
              for (let w = 0; w < width; w++) {
                // Calculate coordinates for the next voxel
                const vx = axis === 0 ? ww : (axis === 1 ? (uu + w) : (uu + w));
                const vy = axis === 0 ? (uu + w) : (axis === 1 ? ww : (vv + height));
                const vz = axis === 0 ? (vv + height) : (axis === 1 ? (vv + height) : ww);
                
                const vIndex = (vy * chunkSize * chunkSize) + (vz * chunkSize) + vx;
                
                // Check if it's the same type and has an air neighbor
                if (voxelData[vIndex] !== voxelType || visited[vIndex] === 1) {
                  canGrowHeight = false;
                  break;
                }
                
                // Check if the face is visible
                const vnx = vx + (axis === 0 ? dir : 0);
                const vny = vy + (axis === 1 ? dir : 0);
                const vnz = vz + (axis === 2 ? dir : 0);
                
                if (vnx < 0 || vny < 0 || vnz < 0 || vnx >= chunkSize || vny >= chunkSize || vnz >= chunkSize) {
                  canGrowHeight = false;
                  break;
                }
                
                const vNeighborIndex = (vny * chunkSize * chunkSize) + (vnz * chunkSize) + vnx;
                if (voxelData[vNeighborIndex] !== 0) {
                  canGrowHeight = false;
                  break;
                }
              }
              
              if (canGrowHeight) {
                height++;
              }
            }
            
            // Mark all voxels in the quad as visited
            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                const mx = axis === 0 ? ww : (axis === 1 ? (uu + w) : (uu + w));
                const my = axis === 0 ? (uu + w) : (axis === 1 ? ww : (vv + h));
                const mz = axis === 0 ? (vv + h) : (axis === 1 ? (vv + h) : ww);
                
                const mIndex = (my * chunkSize * chunkSize) + (mz * chunkSize) + mx;
                visited[mIndex] = 1;
              }
            }
            
            // Create face
            faces.push({
              voxelType,
              direction: name,
              x, y, z,
              width, height,
              axis, dir
            });
          }
        }
      }
    }
    
    return faces;
  }
  
  // 2. Add a Level of Detail system
  createLODChunk(chunkX, chunkY, chunkZ, voxelData, lodLevel) {
    // Level 0 is full detail, each higher level reduces detail
    if (lodLevel === 0) {
      return this.createChunk(chunkX, chunkY, chunkZ, voxelData);
    }
    
    const key = `${chunkX},${chunkY},${chunkZ}_lod${lodLevel}`;
    
    // Remove existing chunk if present
    if (this.chunks.has(key)) {
      const oldChunk = this.chunks.get(key);
      this.scene.remove(oldChunk);
    }
    
    // For LOD levels > 0, simplify by merging voxels
    const skipFactor = Math.pow(2, lodLevel);
    const lodSize = Math.ceil(this.chunkSize / skipFactor);
    const lodData = new Uint8Array(lodSize * lodSize * lodSize);
    
    // Simplify voxel data
    for (let y = 0; y < lodSize; y++) {
      for (let z = 0; z < lodSize; z++) {
        for (let x = 0; x < lodSize; x++) {
          // Each LOD voxel represents a skipFactor³ group of voxels
          // Take the most common non-air voxel type in the group
          const voxelTypes = {};
          let maxCount = 0;
          let maxType = 0;
          
          for (let dy = 0; dy < skipFactor; dy++) {
            for (let dz = 0; dz < skipFactor; dz++) {
              for (let dx = 0; dx < skipFactor; dx++) {
                const sx = x * skipFactor + dx;
                const sy = y * skipFactor + dy;
                const sz = z * skipFactor + dz;
                
                // Skip if out of bounds
                if (sx >= this.chunkSize || sy >= this.chunkSize || sz >= this.chunkSize) continue;
                
                const index = (sy * this.chunkSize * this.chunkSize) + (sz * this.chunkSize) + sx;
                const voxelType = voxelData[index];
                
                // Skip air blocks
                if (voxelType === 0) continue;
                
                // Count voxel types
                voxelTypes[voxelType] = (voxelTypes[voxelType] || 0) + 1;
                
                if (voxelTypes[voxelType] > maxCount) {
                  maxCount = voxelTypes[voxelType];
                  maxType = voxelType;
                }
              }
            }
          }
          
          // Set this LOD voxel to the most common type
          const lodIndex = (y * lodSize * lodSize) + (z * lodSize) + x;
          lodData[lodIndex] = maxType;
        }
      }
    }
    
    // Generate chunk with simplified data
    const chunkGroup = new THREE.Group();
    
    // Use standard meshing for the simplified chunk
    const geometries = Array(this.materials.length).fill(null).map(() => []);
    
    // Extract faces
    for (let y = 0; y < lodSize; y++) {
      for (let z = 0; z < lodSize; z++) {
        for (let x = 0; x < lodSize; x++) {
          const index = (y * lodSize * lodSize) + (z * lodSize) + x;
          const voxelType = lodData[index];
          
          // Skip air blocks
          if (voxelType === 0) continue;
          
          // Check faces
          this.addFacesForLODVoxel(
            voxelType,
            geometries[voxelType],
            x, y, z,
            lodData,
            lodSize,
            skipFactor
          );
        }
      }
    }
    
    // Create mesh for each voxel type with faces
    for (let voxelType = 1; voxelType < geometries.length; voxelType++) {
      const geometry = geometries[voxelType];
      if (geometry.length === 0) continue;
      
      // Create buffer geometry
      const bufferGeometry = this.createBufferGeometry(geometry);
      
      // Create mesh
      const mesh = new THREE.Mesh(bufferGeometry, this.materials[voxelType]);
      mesh.position.set(
        chunkX * this.chunkSize,
        chunkY * this.chunkSize,
        chunkZ * this.chunkSize
      );
      
      chunkGroup.add(mesh);
    }
    
    // Add chunk to scene and store in chunks map
    this.scene.add(chunkGroup);
    this.chunks.set(key, chunkGroup);
    
    return chunkGroup;
  }
  
  addFacesForLODVoxel(voxelType, geometry, x, y, z, voxelData, lodSize, scale) {
    // Similar to addFacesForVoxel but scaled up for LOD
    const checkNeighbor = (nx, ny, nz) => {
      if (nx < 0 || ny < 0 || nz < 0 || nx >= lodSize || ny >= lodSize || nz >= lodSize) {
        return 0; // Treat out of bounds as air
      }
      
      const index = (ny * lodSize * lodSize) + (nz * lodSize) + nx;
      return voxelData[index];
    };
    
    // Add top face (positive Y)
    if (checkNeighbor(x, y + 1, z) === 0) {
      this.addScaledFace(geometry, x, y, z, 'top', scale);
    }
    
    // Add bottom face (negative Y)
    if (checkNeighbor(x, y - 1, z) === 0) {
      this.addScaledFace(geometry, x, y, z, 'bottom', scale);
    }
    
    // Add front face (positive Z)
    if (checkNeighbor(x, y, z + 1) === 0) {
      this.addScaledFace(geometry, x, y, z, 'front', scale);
    }
    
    // Add back face (negative Z)
    if (checkNeighbor(x, y, z - 1) === 0) {
      this.addScaledFace(geometry, x, y, z, 'back', scale);
    }
    
    // Add right face (positive X)
    if (checkNeighbor(x + 1, y, z) === 0) {
      this.addScaledFace(geometry, x, y, z, 'right', scale);
    }
    
    // Add left face (negative X)
    if (checkNeighbor(x - 1, y, z) === 0) {
      this.addScaledFace(geometry, x, y, z, 'left', scale);
    }
  }
  
  addScaledFace(geometry, x, y, z, face, scale) {
    // Similar to addFace but with scaled vertices
    const vertices = [];
    const normals = [];
    const uvs = [];
    
    // Scale coordinates
    const sx = x * scale;
    const sy = y * scale;
    const sz = z * scale;
    const s = scale;
    
    switch (face) {
      case 'top':
        vertices.push(
          sx, sy + s, sz,
          sx + s, sy + s, sz,
          sx + s, sy + s, sz + s,
          sx, sy + s, sz + s
        );
        normals.push(
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0
        );
        break;
      case 'bottom':
        vertices.push(
          sx, sy, sz + s,
          sx + s, sy, sz + s,
          sx + s, sy, sz,
          sx, sy, sz
        );
        normals.push(
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0
        );
        break;
      case 'front':
        vertices.push(
          sx, sy, sz + s,
          sx, sy + s, sz + s,
          sx + s, sy + s, sz + s,
          sx + s, sy, sz + s
        );
        normals.push(
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1
        );
        break;
      case 'back':
        vertices.push(
          sx + s, sy, sz,
          sx + s, sy + s, sz,
          sx, sy + s, sz,
          sx, sy, sz
        );
        normals.push(
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1
        );
        break;
      case 'right':
        vertices.push(
          sx + s, sy, sz + s,
          sx + s, sy + s, sz + s,
          sx + s, sy + s, sz,
          sx + s, sy, sz
        );
        normals.push(
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0
        );
        break;
      case 'left':
        vertices.push(
          sx, sy, sz,
          sx, sy + s, sz,
          sx, sy + s, sz + s,
          sx, sy, sz + s
        );
        normals.push(
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0
        );
        break;
    }
    
    // Standard UVs
    uvs.push(
      0, 0,
      0, 1,
      1, 1,
      1, 0
    );
    
    // Store face data
    geometry.push({
      vertices,
      normals,
      uvs,
      indices: [0, 1, 2, 0, 2, 3]
    });
  }
  
  // 3. Implement chunk caching
  updateChunksWithCache(playerPosition, renderDistance) {
    // Get player chunk coordinates
    const playerChunkX = Math.floor(playerPosition.x / this.chunkSize);
    const playerChunkY = Math.floor(playerPosition.y / this.chunkSize);
    const playerChunkZ = Math.floor(playerPosition.z / this.chunkSize);
    
    // Track which chunks we want to keep and their LOD level
    const chunksToRender = new Map();
    
    // Maximum LOD level
    const maxLOD = 2;
    
    // Assign LOD levels based on distance from player
    for (let y = playerChunkY - renderDistance; y <= playerChunkY + renderDistance; y++) {
      for (let z = playerChunkZ - renderDistance; z <= playerChunkZ + renderDistance; z++) {
        for (let x = playerChunkX - renderDistance; x <= playerChunkX + renderDistance; x++) {
          // Skip out of bounds chunks
          if (x < 0 || y < 0 || z < 0) continue;
          
          // Calculate Manhattan distance to player chunk
          const distance = Math.abs(x - playerChunkX) + 
                           Math.abs(y - playerChunkY) + 
                           Math.abs(z - playerChunkZ);
          
          // Determine LOD level based on distance
          let lodLevel = 0;
          if (distance > renderDistance * 0.7) {
            lodLevel = 2; // Far chunks (low detail)
          } else if (distance > renderDistance * 0.4) {
            lodLevel = 1; // Medium distance chunks (medium detail)
          }
          
          // Store chunk with LOD level
          chunksToRender.set(`${x},${y},${z}`, lodLevel);
        }
      }
    }
    
    // Update visible chunks and their LOD levels
    for (const [key, lodLevel] of chunksToRender.entries()) {
      const [x, y, z] = key.split(',').map(Number);
      const lodKey = `${x},${y},${z}_lod${lodLevel}`;
      
      // Check if we already have this chunk at the right LOD level
      if (!this.chunks.has(lodKey)) {
        // Get or generate voxel data
        const voxelData = this.getOrGenerateVoxelData(x, y, z);
        
        // Create chunk with appropriate LOD
        this.createLODChunk(x, y, z, voxelData, lodLevel);
      }
    }
    
    // Remove chunks outside render distance
    const keysToKeep = new Set(chunksToRender.keys());
    
    for (const key of this.chunks.keys()) {
      // Extract base chunk key (without LOD suffix)
      const baseLodMatch = key.match(/^(.+)_lod\d+$/);
      const baseKey = baseLodMatch ? baseLodMatch[1] : key;
      
      if (!keysToKeep.has(baseKey)) {
        const chunk = this.chunks.get(key);
        this.scene.remove(chunk);
        this.chunks.delete(key);
      }
    }
  }
  
  // Helper to get or generate voxel data
  getOrGenerateVoxelData(x, y, z) {
    const key = `${x},${y},${z}_data`;
    
    // Check if we have cached voxel data
    if (this.voxelCache && this.voxelCache.has(key)) {
      return this.voxelCache.get(key);
    }
    
    // Generate new voxel data
    const voxelData = this.generateVoxelData(x, y, z);
    
    // Cache voxel data
    if (!this.voxelCache) {
      this.voxelCache = new Map();
    }
    
    this.voxelCache.set(key, voxelData);
    
    return voxelData;
    }
}