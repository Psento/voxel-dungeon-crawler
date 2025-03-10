class TerrainGenerator {
    constructor(seed) {
      this.seed = seed || Math.floor(Math.random() * 1000000);
      this.noise = new SimplexNoise(this.seed.toString());
      this.biomes = this.defineBiomes();
    }
    
    defineBiomes() {
      return {
        'forest': {
          baseHeight: 0.4,
          heightVariation: 0.2,
          trees: 0.8,
          temperature: 0.6,
          humidity: 0.7
        },
        'mountains': {
          baseHeight: 0.8,
          heightVariation: 0.5,
          trees: 0.3,
          temperature: 0.4,
          humidity: 0.5
        },
        'desert': {
          baseHeight: 0.3,
          heightVariation: 0.1,
          trees: 0.1,
          temperature: 0.9,
          humidity: 0.1
        },
        'plains': {
          baseHeight: 0.3,
          heightVariation: 0.1,
          trees: 0.2,
          temperature: 0.7,
          humidity: 0.4
        },
        'cave': {
          baseHeight: 0.2,
          heightVariation: 0.8,
          trees: 0.0,
          temperature: 0.3,
          humidity: 0.6,
          cavern: true
        }
      };
    }
    
    getBiomeAt(x, z) {
      // Determine biome based on temperature and humidity noise
      const scale = 0.01;
      const temperatureNoise = this.noise.noise2D(x * scale, z * scale);
      const humidityNoise = this.noise.noise2D(x * scale + 1000, z * scale + 1000);
      
      const temperature = (temperatureNoise + 1) * 0.5;
      const humidity = (humidityNoise + 1) * 0.5;
      
      // Find the closest matching biome
      let closestBiome = 'plains';
      let closestDistance = Number.MAX_VALUE;
      
      for (const [biomeName, biome] of Object.entries(this.biomes)) {
        const tempDiff = temperature - biome.temperature;
        const humidityDiff = humidity - biome.humidity;
        const distance = Math.sqrt(tempDiff * tempDiff + humidityDiff * humidityDiff);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestBiome = biomeName;
        }
      }
      
      return closestBiome;
    }
    
    generateChunkData(chunkX, chunkY, chunkZ, chunkSize) {
      const voxelData = new Uint8Array(chunkSize * chunkSize * chunkSize);
      
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          for (let x = 0; x < chunkSize; x++) {
            // Convert to world coordinates
            const worldX = chunkX * chunkSize + x;
            const worldY = chunkY * chunkSize + y;
            const worldZ = chunkZ * chunkSize + z;
            
            // Get biome at this position
            const biomeName = this.getBiomeAt(worldX, worldZ);
            const biome = this.biomes[biomeName];
            
            // Generate height map with multiple frequencies of noise
            let height = this.getTerrainHeight(worldX, worldZ, biome);
            height = Math.floor(height * (chunkSize * 4)) + (chunkY * chunkSize);
            
            // Basic terrain shape
            let voxelType = 0; // Default to air
            
            if (biome.cavern) {
              // Underground biome with cave systems
              if (worldY < height) {
                // Potential cave area
                const caveNoise = this.getCaveNoise(worldX, worldY, worldZ);
                if (caveNoise > 0.2) {
                  voxelType = this.getTerrainType(worldX, worldY, worldZ, biomeName);
                }
              }
            } else {
              // Surface biome
              if (worldY < height - 4) {
                // Deep underground - stone
                voxelType = 1;
              } else if (worldY < height - 1) {
                // Near surface - dirt
                voxelType = 2;
              } else if (worldY < height) {
                // Surface - grass, sand, etc. based on biome
                voxelType = biomeName === 'desert' ? 5 : 3;
              } else if (worldY === height && biomeName === 'plains' && Math.random() < 0.01) {
                // Occasional flowers on plains
                voxelType = 6;
              }
              
              // Add caves underground
              if (voxelType !== 0 && worldY < height - 5) {
                const caveNoise = this.getCaveNoise(worldX, worldY, worldZ);
                if (caveNoise < 0.2) {
                  voxelType = 0; // Hollow out for caves
                }
              }
            }
            
            // Calculate array index
            const index = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
            voxelData[index] = voxelType;
          }
        }
      }
      
      // Add structures and features
      this.addStructures(voxelData, chunkX, chunkY, chunkZ, chunkSize);
      
      return voxelData;
    }
    
    getTerrainHeight(x, z, biome) {
      // Combine multiple noise frequencies for natural-looking terrain
      // Use 4 octaves of noise with different frequencies and amplitudes
      const baseScale = 0.007;
      
      let height = 0;
      
      // Base continental shape
      height += (this.noise.noise2D(x * baseScale * 0.2, z * baseScale * 0.2) + 1) * 0.5 * 0.6;
      
      // Hills and valleys
      height += (this.noise.noise2D(x * baseScale, z * baseScale) + 1) * 0.5 * 0.3;
      
      // Small details
      height += (this.noise.noise2D(x * baseScale * 4, z * baseScale * 4) + 1) * 0.5 * 0.1;
      
      // Apply biome-specific modifications
      height = height * biome.heightVariation + biome.baseHeight;
      
      // Clamp height between 0 and 1
      return Math.max(0, Math.min(1, height));
    }
    
    getCaveNoise(x, y, z) {
      // 3D noise for cave generation
      const caveScale = 0.03;
      
      // Combine multiple noise frequencies
      let caveNoise = (this.noise.noise3D(
        x * caveScale,
        y * caveScale,
        z * caveScale
      ) + 1) * 0.5;
      
      // Make caves more likely at lower depths
      caveNoise += Math.min(1, Math.max(0, y / 20)) * 0.5;
      
      return caveNoise;
    }
    
    getTerrainType(x, y, z, biomeName) {
      // Determine voxel type based on depth and biome
      if (biomeName === 'desert') {
        return 5; // Sand
      } else if (biomeName === 'mountains' && y < 40) {
        return 1; // Stone
      } else if (y < 20) {
        return 1; // Stone
      } else {
        return 2; // Dirt
      }
    }
    
    addStructures(voxelData, chunkX, chunkY, chunkZ, chunkSize) {
      // Add trees, rocks, and other structures
      const worldSeedX = chunkX * 16519;
      const worldSeedZ = chunkZ * 18181;
      
      // Deterministic random generator for structures
      const structureRandom = new Math.seedrandom(`${this.seed}-${chunkX}-${chunkZ}`);
      
      // Add trees in forest biomes
      for (let z = 0; z < chunkSize; z++) {
        for (let x = 0; x < chunkSize; x++) {
          const worldX = chunkX * chunkSize + x;
          const worldZ = chunkZ * chunkSize + z;
          
          const biomeName = this.getBiomeAt(worldX, worldZ);
          const biome = this.biomes[biomeName];
          
          // Find surface height
          const surfaceHeight = Math.floor(this.getTerrainHeight(worldX, worldZ, biome) * (chunkSize * 4)) + (chunkY * chunkSize);
          
          // Only place trees on the surface
          if (surfaceHeight >= chunkY * chunkSize && surfaceHeight < (chunkY + 1) * chunkSize) {
            const localY = surfaceHeight - (chunkY * chunkSize);
            
            // Chance to spawn tree based on biome
            if (biomeName === 'forest' && structureRandom() < 0.03 * biome.trees) {
              this.placeTree(voxelData, x, localY, z, chunkSize, structureRandom());
            } else if (biomeName === 'mountains' && structureRandom() < 0.01) {
              this.placeRock(voxelData, x, localY, z, chunkSize, structureRandom());
            }
          }
        }
      }
    }
    
    placeTree(voxelData, x, y, z, chunkSize, randomValue) {
      // Place a tree at the given position
      const index = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
      
      // Make sure we're placing on solid ground
      if (y < chunkSize - 5 && this.isVoxelSolid(voxelData, x, y, z, chunkSize)) {
        // Tree trunk
        const trunkHeight = 4 + Math.floor(randomValue * 3);
        for (let ty = 1; ty <= trunkHeight; ty++) {
          if (y + ty < chunkSize) {
            voxelData[(y + ty) * chunkSize * chunkSize + z * chunkSize + x] = 4; // Wood
          }
        }
        
        // Tree leaves
        const leafStartY = y + Math.floor(trunkHeight * 0.7);
        const leafRadius = 2;
        
        for (let ly = 0; ly < 3; ly++) {
          const leafY = leafStartY + ly;
          if (leafY >= chunkSize) continue;
          
          for (let lz = -leafRadius; lz <= leafRadius; lz++) {
            for (let lx = -leafRadius; lx <= leafRadius; lx++) {
              const leafX = x + lx;
              const leafZ = z + lz;
              
              // Check if within chunk bounds
              if (leafX >= 0 && leafX < chunkSize && 
                  leafY >= 0 && leafY < chunkSize && 
                  leafZ >= 0 && leafZ < chunkSize) {
                
                // Spherical leaves shape
                const distance = Math.sqrt(lx*lx + (ly-1)*(ly-1) + lz*lz);
                
                if (distance <= leafRadius) {
                  const leafIndex = leafY * chunkSize * chunkSize + leafZ * chunkSize + leafX;
                  
                  // Only place leaves in empty space
                  if (voxelData[leafIndex] === 0) {
                    voxelData[leafIndex] = 7; // Leaves
                  }
                }
              }
            }
          }
        }
      }
    }
    
    placeRock(voxelData, x, y, z, chunkSize, randomValue) {
      // Place a rock formation at the given position
      const rockRadius = 1 + Math.floor(randomValue * 2);
      
      for (let ry = 0; ry < rockRadius; ry++) {
        for (let rz = -rockRadius + ry; rz <= rockRadius - ry; rz++) {
          for (let rx = -rockRadius + ry; rx <= rockRadius - ry; rx++) {
            const rockX = x + rx;
            const rockY = y + ry;
            const rockZ = z + rz;
            
            // Check if within chunk bounds
            if (rockX >= 0 && rockX < chunkSize && 
                rockY >= 0 && rockY < chunkSize && 
                rockZ >= 0 && rockZ < chunkSize) {
              
              const rockIndex = rockY * chunkSize * chunkSize + rockZ * chunkSize + rockX;
              voxelData[rockIndex] = 1; // Stone
            }
          }
        }
      }
    }
    
    isVoxelSolid(voxelData, x, y, z, chunkSize) {
      if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
        return false;
      }
      
      const index = (y * chunkSize * chunkSize) + (z * chunkSize) + x;
      return voxelData[index] !== 0;
    }
  }