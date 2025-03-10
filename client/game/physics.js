// client/game/physics.js
import * as THREE from 'three';

export class PhysicsSystem {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.gravity = 9.8;
    this.groundLevel = 0;
    this.colliders = [];
    this.collisionMask = new THREE.Box3();
    this.playerBox = new THREE.Box3();
    this.playerSize = new THREE.Vector3(0.6, 1.6, 0.6);
  }

  initialize() {
    // Initialize physics system
    console.log('Physics system initialized');
  }

  addCollider(object, size) {
    // Add a collision object to the world
    this.colliders.push({
      object,
      box: new THREE.Box3().setFromCenterAndSize(
        object.position,
        size || new THREE.Vector3(1, 1, 1)
      )
    });
  }

  removeCollider(object) {
    // Remove a collision object from the world
    const index = this.colliders.findIndex(c => c.object === object);
    if (index !== -1) {
      this.colliders.splice(index, 1);
    }
  }

  updateColliders() {
    // Update all collider boxes based on their objects' positions
    this.colliders.forEach(collider => {
      collider.box.setFromCenterAndSize(
        collider.object.position,
        collider.box.getSize(new THREE.Vector3())
      );
    });
  }

  updatePlayerPhysics(deltaTime) {
    const player = this.gameClient.player;
    
    // Apply gravity if not on ground
    if (!player.onGround) {
      player.velocity.y -= this.gravity * deltaTime;
    }
    
    // Calculate new position
    const movement = new THREE.Vector3(
      player.velocity.x * deltaTime,
      player.velocity.y * deltaTime,
      player.velocity.z * deltaTime
    );
    
    // Update player's collision box
    this.playerBox.setFromCenterAndSize(
      player.position.clone().add(new THREE.Vector3(0, this.playerSize.y / 2, 0)),
      this.playerSize
    );
    
    // Check collision with ground
    if (player.position.y + movement.y <= this.groundLevel) {
      player.position.y = this.groundLevel;
      player.velocity.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }
    
    // Check collision with voxel world
    this.checkVoxelCollision(player, movement);
    
    // Check collision with other objects
    this.checkObjectCollision(player, movement);
    
    // Apply movement
    player.position.add(movement);
    
    // Apply drag to horizontal movement
    if (player.onGround) {
      player.velocity.x *= 0.9;
      player.velocity.z *= 0.9;
    } else {
      player.velocity.x *= 0.98;
      player.velocity.z *= 0.98;
    }
    
    // Cap terminal velocity
    const terminalVelocity = 20;
    player.velocity.y = Math.max(player.velocity.y, -terminalVelocity);
  }

  checkVoxelCollision(player, movement) {
    // Collision with voxel world
    if (!this.gameClient.voxelRenderer) return;
    
    const voxelSize = 1;
    const checkPositions = [
      // Check in 8 directions around player
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(1, 0, -1),
      new THREE.Vector3(-1, 0, 1),
      new THREE.Vector3(-1, 0, -1),
      // Check below and above
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 1, 0)
    ];
    
    // Predicted next position
    const nextPos = player.position.clone().add(movement);
    
    checkPositions.forEach(dir => {
      const checkPos = nextPos.clone().add(
        dir.clone().multiplyScalar(this.playerSize.x / 2)
      );
      
      // Convert to voxel coordinates
      const voxelX = Math.floor(checkPos.x / voxelSize);
      const voxelY = Math.floor(checkPos.y / voxelSize);
      const voxelZ = Math.floor(checkPos.z / voxelSize);
      
      // Check if solid voxel exists at this position
      const voxelType = this.gameClient.voxelRenderer.getVoxelType(voxelX, voxelY, voxelZ);
      
      if (voxelType && voxelType !== 0) {
        // Collision detected, adjust movement
        if (dir.y !== 0) {
          // Vertical collision
          if (dir.y < 0) {
            // Bottom collision
            movement.y = 0;
            player.velocity.y = 0;
            player.onGround = true;
          } else {
            // Top collision
            movement.y = Math.min(movement.y, 0);
            player.velocity.y = Math.min(player.velocity.y, 0);
          }
        } else {
          // Horizontal collision
          if (dir.x !== 0) {
            movement.x = 0;
            player.velocity.x = 0;
          }
          if (dir.z !== 0) {
            movement.z = 0;
            player.velocity.z = 0;
          }
        }
      }
    });
  }

  checkObjectCollision(player, movement) {
    // Predict next player box position
    const nextPlayerBox = this.playerBox.clone();
    nextPlayerBox.translate(movement);
    
    // Check against all colliders
    for (const collider of this.colliders) {
      if (nextPlayerBox.intersectsBox(collider.box)) {
        // Collision detected, adjust movement
        const playerCenter = this.playerBox.getCenter(new THREE.Vector3());
        const colliderCenter = collider.box.getCenter(new THREE.Vector3());
        
        // Determine direction of collision
        const direction = new THREE.Vector3().subVectors(playerCenter, colliderCenter).normalize();
        
        // Adjust movement based on collision direction
        if (Math.abs(direction.y) > Math.abs(direction.x) && Math.abs(direction.y) > Math.abs(direction.z)) {
          // Vertical collision is dominant
          if (direction.y > 0) {
            // Bottom collision
            movement.y = 0;
            player.velocity.y = 0;
            player.onGround = true;
          } else {
            // Top collision
            movement.y = Math.min(movement.y, 0);
            player.velocity.y = Math.min(player.velocity.y, 0);
          }
        } else {
          // Horizontal collision
          if (Math.abs(direction.x) > Math.abs(direction.z)) {
            // X-axis collision
            movement.x = 0;
            player.velocity.x = 0;
          } else {
            // Z-axis collision
            movement.z = 0;
            player.velocity.z = 0;
          }
        }
      }
    }
  }

  applyImpulse(entity, direction, force) {
    entity.velocity.add(direction.normalize().multiplyScalar(force));
  }

  raycast(origin, direction, maxDistance = 100) {
    // Simple raycast implementation for object selection/targeting
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
    
    // Check colliders
    const colliderObjects = this.colliders.map(c => c.object);
    const intersects = raycaster.intersectObjects(colliderObjects, true);
    
    if (intersects.length > 0) {
      return {
        hit: true,
        distance: intersects[0].distance,
        point: intersects[0].point,
        object: intersects[0].object
      };
    }
    
    // Check voxel world
    if (this.gameClient.voxelRenderer) {
      // Implementation depends on voxel renderer's API
      const voxelHit = this.raycastVoxels(origin, direction, maxDistance);
      if (voxelHit) {
        return voxelHit;
      }
    }
    
    return { hit: false };
  }

  raycastVoxels(origin, direction, maxDistance) {
    // Simplified voxel raycast (DDA algorithm)
    if (!this.gameClient.voxelRenderer) return null;
    
    const voxelSize = 1;
    
    // Current voxel coordinates
    let voxelX = Math.floor(origin.x / voxelSize);
    let voxelY = Math.floor(origin.y / voxelSize);
    let voxelZ = Math.floor(origin.z / voxelSize);
    
    // Direction sign (either 1 or -1)
    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;
    
    // Calculate distance to next voxel boundary
    const tMaxX = direction.x !== 0 ? 
      ((voxelX + (stepX > 0 ? 1 : 0)) * voxelSize - origin.x) / direction.x : Infinity;
    const tMaxY = direction.y !== 0 ? 
      ((voxelY + (stepY > 0 ? 1 : 0)) * voxelSize - origin.y) / direction.y : Infinity;
    const tMaxZ = direction.z !== 0 ? 
      ((voxelZ + (stepZ > 0 ? 1 : 0)) * voxelSize - origin.z) / direction.z : Infinity;
    
    // Calculate distance between voxel boundaries
    const tDeltaX = direction.x !== 0 ? voxelSize / Math.abs(direction.x) : Infinity;
    const tDeltaY = direction.y !== 0 ? voxelSize / Math.abs(direction.y) : Infinity;
    const tDeltaZ = direction.z !== 0 ? voxelSize / Math.abs(direction.z) : Infinity;
    
    let t = 0;
    let hitSide = null;
    
    // Traverse voxels until hit or max distance
    while (t < maxDistance) {
      // Check current voxel
      const voxelType = this.gameClient.voxelRenderer.getVoxelType(voxelX, voxelY, voxelZ);
      
      if (voxelType && voxelType !== 0) {
        // Hit a solid voxel
        const hitPoint = new THREE.Vector3(
          origin.x + direction.x * t,
          origin.y + direction.y * t,
          origin.z + direction.z * t
        );
        
        return {
          hit: true,
          distance: t,
          point: hitPoint,
          voxel: { x: voxelX, y: voxelY, z: voxelZ },
          voxelType,
          side: hitSide
        };
      }
      
      // Move to next voxel
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX;
        tMaxX += tDeltaX;
        voxelX += stepX;
        hitSide = stepX > 0 ? 'left' : 'right';
      } else if (tMaxY < tMaxZ) {
        t = tMaxY;
        tMaxY += tDeltaY;
        voxelY += stepY;
        hitSide = stepY > 0 ? 'bottom' : 'top';
      } else {
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        voxelZ += stepZ;
        hitSide = stepZ > 0 ? 'back' : 'front';
      }
    }
    
    return null;
  }
}