class GameObjectFactory {
    constructor(scene, objectPool) {
      this.scene = scene;
      this.pool = objectPool;
      
      // Initialize pools for common game objects
      this.initializePools();
    }
    
    initializePools() {
      // Create particle pool
      this.pool.createPool('particle', () => {
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.visible = false;
        this.scene.add(mesh);
        
        return {
          mesh,
          velocity: new THREE.Vector3(),
          lifetime: 0,
          maxLifetime: 0,
          
          initialize(position, color, velocity, lifetime) {
            this.mesh.position.copy(position);
            this.mesh.material.color.set(color);
            this.velocity.copy(velocity);
            this.lifetime = 0;
            this.maxLifetime = lifetime;
            this.mesh.visible = true;
          },
          
          update(deltaTime) {
            this.lifetime += deltaTime;
            this.mesh.position.addScaledVector(this.velocity, deltaTime);
            
            // Fade out as lifetime progresses
            const alpha = 1 - (this.lifetime / this.maxLifetime);
            this.mesh.material.opacity = alpha;
            
            return this.lifetime < this.maxLifetime;
          },
          
          reset() {
            this.mesh.visible = false;
          }
        };
      }, 100); // Pre-allocate 100 particles
      
      // Create projectile pool
      this.pool.createPool('projectile', () => {
        const geometry = new THREE.ConeGeometry(0.2, 0.8, 8);
        geometry.rotateX(Math.PI / 2); // Point forward
        
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        this.scene.add(mesh);
        
        return {
          mesh,
          velocity: new THREE.Vector3(),
          damage: 0,
          ownerID: null,
          lifetime: 0,
          maxLifetime: 5, // Default 5 seconds
          
          initialize(position, direction, speed, damage, ownerID) {
            this.mesh.position.copy(position);
            
            // Orient projectile along direction
            this.mesh.lookAt(position.clone().add(direction));
            
            this.velocity.copy(direction).normalize().multiplyScalar(speed);
            this.damage = damage;
            this.ownerID = ownerID;
            this.lifetime = 0;
            this.mesh.visible = true;
          },
          
          update(deltaTime) {
            this.lifetime += deltaTime;
            this.mesh.position.addScaledVector(this.velocity, deltaTime);
            
            return this.lifetime < this.maxLifetime;
          },
          
          reset() {
            this.mesh.visible = false;
            this.velocity.set(0, 0, 0);
            this.damage = 0;
            this.ownerID = null;
            this.lifetime = 0;
          }
        };
      }, 20); // Pre-allocate 20 projectiles
      
      // Create enemy pool
      this.pool.createPool('enemy', () => {
        // Create base enemy object
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Create enemy container
        const container = new THREE.Group();
        container.add(body);
        container.visible = false;
        this.scene.add(container);
        
        return {
          container,
          body,
          health: 0,
          maxHealth: 0,
          type: '',
          speed: 0,
          targetPosition: new THREE.Vector3(),
          attackCooldown: 0,
          state: 'idle',
          id: null,
          
          initialize(position, type, health, speed) {
            this.container.position.copy(position);
            this.health = health;
            this.maxHealth = health;
            this.type = type;
            this.speed = speed;
            this.id = Math.random().toString(36).substring(2, 15);
            this.attackCooldown = 0;
            this.state = 'idle';
            
            // Customize appearance based on enemy type
            if (type === 'goblin') {
              this.body.material.color.set(0x00ff00);
              this.body.scale.set(0.8, 1.2, 0.8);
            } else if (type === 'troll') {
              this.body.material.color.set(0x885500);
              this.body.scale.set(1.5, 2.5, 1.5);
            } else if (type === 'skeleton') {
              this.body.material.color.set(0xcccccc);
              this.body.scale.set(0.9, 1.8, 0.7);
            }
            
            this.container.visible = true;
          },
          
          update(deltaTime, playerPosition) {
            // Update enemy AI and movement
            if (this.state === 'idle') {
              // Check if player is within detection range
              const distToPlayer = this.container.position.distanceTo(playerPosition);
              if (distToPlayer < 10) {
                this.state = 'chase';
                this.targetPosition.copy(playerPosition);
              }
            } else if (this.state === 'chase') {
              // Move toward player
              const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.container.position)
                .normalize();
              
              this.container.position.addScaledVector(direction, this.speed * deltaTime);
              
              // Look toward movement direction
              if (direction.length() > 0.1) {
                this.container.lookAt(
                  this.container.position.x + direction.x,
                  this.container.position.y,
                  this.container.position.z + direction.z
                );
              }
              
              // Update target position periodically
              this.targetPosition.copy(playerPosition);
              
              // Attack if close enough
              const distToPlayer = this.container.position.distanceTo(playerPosition);
              if (distToPlayer < 2 && this.attackCooldown <= 0) {
                this.state = 'attack';
                this.attackCooldown = 1.5; // Attack cooldown in seconds
              }
            } else if (this.state === 'attack') {
              // Attack animation would go here
              
              // Return to chase after attack
              this.state = 'chase';
            }
            
            // Update cooldowns
            if (this.attackCooldown > 0) {
              this.attackCooldown -= deltaTime;
            }
            
            return this.health > 0;
          },
          
          takeDamage(amount) {
            this.health -= amount;
            // Flash red when damaged
            this.body.material.emissive.set(0xff0000);
            setTimeout(() => {
              this.body.material.emissive.set(0x000000);
            }, 200);
            
            return this.health <= 0;
          },
          
          reset() {
            this.container.visible = false;
            this.health = 0;
            this.state = 'idle';
          }
        };
      }, 20); // Pre-allocate 20 enemies
    }
    
    createParticleExplosion(position, color, count = 20) {
      for (let i = 0; i < count; i++) {
        const particle = this.pool.get('particle', 
          position,
          color,
          new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          ),
          1 + Math.random() // Random lifetime between 1-2 seconds
        );
        
        this.activeParticles.push(particle);
      }
    }
    
    createProjectile(position, direction, speed, damage, ownerID) {
      const projectile = this.pool.get('projectile', 
        position, direction, speed, damage, ownerID
      );
      
      this.activeProjectiles.push(projectile);
      return projectile;
    }
    
    spawnEnemy(position, type) {
      // Configure enemy based on type
      let health, speed;
      
      if (type === 'goblin') {
        health = 30;
        speed = 3;
      } else if (type === 'troll') {
        health = 100;
        speed = 1.5;
      } else if (type === 'skeleton') {
        health = 50;
        speed = 2;
      } else {
        health = 50;
        speed = 2;
      }
      
      const enemy = this.pool.get('enemy', position, type, health, speed);
      this.activeEnemies.push(enemy);
      return enemy;
    }
    
    update(deltaTime, playerPosition) {
      // Update active particles
      for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const particle = this.activeParticles[i];
        const isActive = particle.update(deltaTime);
        
        if (!isActive) {
          this.pool.release('particle', particle);
          this.activeParticles.splice(i, 1);
        }
      }
      
      // Update active projectiles
      for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const projectile = this.activeProjectiles[i];
        const isActive = projectile.update(deltaTime);
        
        if (!isActive) {
            this.pool.release('projectile', projectile);
            this.activeProjectiles.splice(i, 1);
          }
          
          // Check for collisions with enemies
          for (const enemy of this.activeEnemies) {
            const distance = enemy.container.position.distanceTo(projectile.mesh.position);
            if (distance < 1) {
              // Collision detected
              const killed = enemy.takeDamage(projectile.damage);
              
              // Create particle effect at impact point
              this.createParticleExplosion(
                projectile.mesh.position,
                0xff0000,
                10
              );
              
              // Remove projectile
              this.pool.release('projectile', projectile);
              this.activeProjectiles.splice(i, 1);
              break;
            }
          }
        }
        
        // Update active enemies
        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
          const enemy = this.activeEnemies[i];
          const isActive = enemy.update(deltaTime, playerPosition);
          
          if (!isActive) {
            // Enemy was defeated
            this.createParticleExplosion(
              enemy.container.position,
              0xff0000,
              30
            );
            
            this.pool.release('enemy', enemy);
            this.activeEnemies.splice(i, 1);
          }
        }
      }
    }