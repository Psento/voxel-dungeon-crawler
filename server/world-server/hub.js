class HubWorld {
    constructor() {
      this.size = {
        width: 100,
        height: 20,
        depth: 100
      };
      this.spawnPoint = { x: 50, y: 2, z: 50 };
      this.features = [];
      
      this.generateHubFeatures();
    }
  
    generateHubFeatures() {
      // Central hub structure
      this.features.push({
        type: 'structure',
        name: 'central_platform',
        position: { x: 50, y: 0, z: 50 },
        size: { width: 20, height: 1, depth: 20 },
        material: 'stone'
      });
      
      // Spawn portal
      this.features.push({
        type: 'portal',
        name: 'spawn_portal',
        position: { x: 50, y: 1, z: 50 },
        destination: 'spawn',
        material: 'portal'
      });
      
      // Party formation area
      this.features.push({
        type: 'structure',
        name: 'party_area',
        position: { x: 60, y: 0, z: 60 },
        size: { width: 15, height: 1, depth: 15 },
        material: 'wood'
      });
      
      // Portal to different biomes
      const biomePortals = [
        { name: 'forest_portal', position: { x: 70, y: 1, z: 50 }, biome: 'forest' },
        { name: 'cave_portal', position: { x: 50, y: 1, z: 70 }, biome: 'cave' },
        { name: 'dungeon_portal', position: { x: 30, y: 1, z: 50 }, biome: 'dungeon' }
      ];
      
      biomePortals.forEach(portal => {
        this.features.push({
          type: 'portal',
          name: portal.name,
          position: portal.position,
          destination: 'biome',
          biomeId: portal.biome,
          material: 'portal'
        });
      });
      
      // Decorative elements
      for (let i = 0; i < 20; i++) {
        this.features.push({
          type: 'decoration',
          name: `tree_${i}`,
          position: {
            x: 20 + Math.floor(Math.random() * 60),
            y: 0,
            z: 20 + Math.floor(Math.random() * 60)
          },
          decoration: 'tree'
        });
      }
    }
  
    getHubData() {
      return {
        size: this.size,
        spawnPoint: this.spawnPoint,
        features: this.features
      };
    }
  
    getSpawnPosition() {
      // Add some randomness to avoid players spawning exactly on top of each other
      return {
        x: this.spawnPoint.x + (Math.random() * 4 - 2),
        y: this.spawnPoint.y,
        z: this.spawnPoint.z + (Math.random() * 4 - 2)
      };
    }
  
    // Convert hub to voxel data for client
    getVoxelData() {
      // Create empty voxel array
      const voxels = new Uint8Array(this.size.width * this.size.height * this.size.depth);
      
      // Set ground plane
      for (let x = 0; x < this.size.width; x++) {
        for (let z = 0; z < this.size.depth; z++) {
          const index = z * this.size.width + x;
          voxels[index] = 1; // Ground material
        }
      }
      
      // Add features
      this.features.forEach(feature => {
        if (feature.type === 'structure') {
          // Map materials to voxel types
          let material;
          switch (feature.material) {
            case 'stone': material = 2; break;
            case 'wood': material = 3; break;
            default: material = 2;
          }
          
          // Add structure voxels
          for (let y = 0; y < feature.size.height; y++) {
            for (let z = 0; z < feature.size.depth; z++) {
              for (let x = 0; x < feature.size.width; x++) {
                const vx = feature.position.x + x;
                const vy = feature.position.y + y;
                const vz = feature.position.z + z;
                
                if (vx >= 0 && vx < this.size.width &&
                    vy >= 0 && vy < this.size.height &&
                    vz >= 0 && vz < this.size.depth) {
                  const index = (vy * this.size.depth * this.size.width) + 
                                (vz * this.size.width) + vx;
                  voxels[index] = material;
                }
              }
            }
          }
        } else if (feature.type === 'portal') {
          // Add portal voxel
          const vx = feature.position.x;
          const vy = feature.position.y;
          const vz = feature.position.z;
          
          if (vx >= 0 && vx < this.size.width &&
              vy >= 0 && vy < this.size.height &&
              vz >= 0 && vz < this.size.depth) {
            const index = (vy * this.size.depth * this.size.width) + 
                          (vz * this.size.width) + vx;
            voxels[index] = 4; // Portal material
          }
        }
      });
      
      return voxels;
    }
  }
  
  module.exports = { HubWorld };