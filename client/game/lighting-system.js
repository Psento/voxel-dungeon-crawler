class LightingSystem {
    constructor(scene) {
      this.scene = scene;
      this.lightmaps = new Map();
      this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      this.dynamicLights = [];
      
      this.initialize();
    }
    
    initialize() {
      // Add base lighting
      this.scene.add(this.ambientLight);
      
      this.directionalLight.position.set(50, 200, 100);
      this.directionalLight.castShadow = true;
      
      // Configure shadow properties for better performance
      this.directionalLight.shadow.mapSize.width = 1024;
      this.directionalLight.shadow.mapSize.height = 1024;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 500;
      
      // Limit shadow camera frustum to improve performance
      const shadowSize = 100;
      this.directionalLight.shadow.camera.left = -shadowSize;
      this.directionalLight.shadow.camera.right = shadowSize;
      this.directionalLight.shadow.camera.top = shadowSize;
      this.directionalLight.shadow.camera.bottom = -shadowSize;
      
      this.scene.add(this.directionalLight);
    }
    
    bakeLightmapForChunk(chunkKey, voxelData) {
      // Create a lightmap for static lighting in this chunk
      const lightmapSize = 16; // Lightmap resolution per chunk
      const lightmap = new Uint8Array(lightmapSize * lightmapSize * lightmapSize * 3); // RGB values
      
      // Simulate lighting computation
      const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
      
      // For each position in the lightmap
      for (let y = 0; y < lightmapSize; y++) {
        for (let z = 0; z < lightmapSize; z++) {
          for (let x = 0; x < lightmapSize; x++) {
            // Calculate world position
            const worldX = chunkX * 16 + x * (16 / lightmapSize);
            const worldY = chunkY * 16 + y * (16 / lightmapSize);
            const worldZ = chunkZ * 16 + z * (16 / lightmapSize);
            
            // Compute ambient occlusion and direct lighting
            const occlusion = this.computeAmbientOcclusion(worldX, worldY, worldZ, voxelData);
            const directLight = this.computeDirectionalLighting(worldX, worldY, worldZ, voxelData);
            
            // Store lighting values in the lightmap
            const index = (y * lightmapSize * lightmapSize + z * lightmapSize + x) * 3;
            lightmap[index] = Math.max(0, Math.min(255, Math.floor(directLight.r * (1 - occlusion))));
            lightmap[index + 1] = Math.max(0, Math.min(255, Math.floor(directLight.g * (1 - occlusion))));
            lightmap[index + 2] = Math.max(0, Math.min(255, Math.floor(directLight.b * (1 - occlusion))));
          }
        }
      }
      
      // Create a THREE.DataTexture from the lightmap data
      const texture = new THREE.DataTexture(
        lightmap,
        lightmapSize,
        lightmapSize * lightmapSize,
        THREE.RGBFormat
      );
      texture.needsUpdate = true;
      
      // Store the lightmap
      this.lightmaps.set(chunkKey, texture);
      
      return texture;
    }
    
    computeAmbientOcclusion(x, y, z, voxelData) {
      // Compute ambient occlusion based on surrounding voxels
      // Returns a value between 0 (no occlusion) and 1 (fully occluded)
      
      // Sample a number of directions to check for occlusion
      const directions = [
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1],
        [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
        [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
        [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]
      ];
      
      let occludedDirections = 0;
      
      for (const [dx, dy, dz] of directions) {
        // Check if there's a solid voxel in this direction
        if (this.isVoxelSolid(x + dx, y + dy, z + dz, voxelData)) {
          occludedDirections++;
        }
      }
      
      // Return occlusion factor
      return occludedDirections / directions.length;
    }
    
    computeDirectionalLighting(x, y, z, voxelData) {
      // Simulate direct lighting from the directional light
      
      // Start with base light color
      const lightColor = {
        r: 255,
        g: 255,
        b: 255
      };
      
      // Check if point is in shadow by ray casting toward light direction
      const lightDir = [
        this.directionalLight.position.x - x,
        this.directionalLight.position.y - y,
        this.directionalLight.position.z - z
      ];
      
      // Normalize light direction
      const length = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
      lightDir[0] /= length;
      lightDir[1] /= length;
      lightDir[2] /= length;
      
      // Cast ray to check for shadows
      const shadowFactor = this.castShadowRay(x, y, z, lightDir, voxelData);
      
      // Apply shadow factor
      lightColor.r *= shadowFactor;
      lightColor.g *= shadowFactor;
      lightColor.b *= shadowFactor;
      
      return lightColor;
    }
    
    castShadowRay(startX, startY, startZ, direction, voxelData) {
      // Cast a ray in the given direction to check for shadows
      // Returns a factor between 0 (in shadow) and 1 (fully lit)
      
      const maxDistance = 32; // Maximum ray distance
      let x = startX;
      let y = startY;
      let z = startZ;
      
      for (let i = 0; i < maxDistance; i++) {
        x += direction[0];
        y += direction[1];
        z += direction[2];
        
        if (this.isVoxelSolid(Math.floor(x), Math.floor(y), Math.floor(z), voxelData)) {
          // Ray hit a solid voxel - point is in shadow
          return 0.5; // Return partial shadow for soft shadows
        }
      }
      
      // No obstacles found - point is fully lit
      return 1.0;
    }
    
    addDynamicLight(position, color, intensity, radius) {
      // Add a dynamic point light
      const light = new THREE.PointLight(color, intensity, radius);
      light.position.copy(position);
      
      // Use shadow map for this light only if it's important
      if (intensity > 1.0) {
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = radius;
      }
      
      this.scene.add(light);
      this.dynamicLights.push({
        light,
        flickerAmount: 0.2,
        originalIntensity: intensity
      });
      
      return light;
    }
    
    updateDynamicLights(deltaTime) {
      // Animate dynamic lights (flicker, pulse, etc.)
      for (const dynamicLight of this.dynamicLights) {
        if (dynamicLight.flickerAmount > 0) {
          // Apply random flicker effect to torch lights
          const flicker = 1.0 + (Math.random() * 2 - 1) * dynamicLight.flickerAmount;
          dynamicLight.light.intensity = dynamicLight.originalIntensity * flicker;
        }
      }
    }
    
    applyLightmapToMesh(mesh, chunkKey) {
      // Apply baked lightmap to a chunk mesh
      const lightmap = this.lightmaps.get(chunkKey);
      
      if (lightmap && mesh.material) {
        if (Array.isArray(mesh.material)) {
          // If the mesh has multiple materials
          for (const material of mesh.material) {
            material.lightMap = lightmap;
            material.needsUpdate = true;
          }
        } else {
          // Single material
          mesh.material.lightMap = lightmap;
          mesh.material.needsUpdate = true;
        }
      }
    }
    
    isVoxelSolid(x, y, z, voxelData) {
      // Check if the voxel at the given position is solid
      // This is a placeholder - implementation would depend on your voxel data structure
      
      // Convert world coordinates to chunk-local coordinates
      const chunkSize = 16;
      const localX = ((x % chunkSize) + chunkSize) % chunkSize;
      const localY = ((y % chunkSize) + chunkSize) % chunkSize;
      const localZ = ((z % chunkSize) + chunkSize) % chunkSize;
      
      const index = (localY * chunkSize * chunkSize) + (localZ * chunkSize) + localX;
      
      if (index >= 0 && index < voxelData.length) {
        return voxelData[index] !== 0; // 0 typically represents air
      }
      
      return false;
    }
  }