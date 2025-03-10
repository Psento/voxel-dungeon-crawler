// client/game/player.js
import * as THREE from 'three';

export class Player {
  constructor(gameClient, id, data = {}) {
    this.gameClient = gameClient;
    this.id = id || 'local';
    this.isLocalPlayer = id === 'local';
    
    // Player state
    this.position = new THREE.Vector3(0, 2, 0);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.isSprinting = false;
    this.isJumping = false;
    this.isReturning = false;
    this.returnHoldStartTime = 0;
    
    // Player stats
    this.name = data.name || 'Player';
    this.class = data.class || 'Warrior';
    this.level = data.level || 1;
    this.health = data.health || 100;
    this.maxHealth = data.maxHealth || 100;
    this.energy = data.energy || 100;
    this.maxEnergy = data.energy || 100;
    this.experience = data.experience || 0;
    this.experienceToLevel = 1000 * this.level;
    
    // Player equipment and items
    this.birthstones = data.birthstones || ['Ruby', 'Diamond'];
    this.equipment = data.equipment || {};
    this.inventory = data.inventory || [];
    
    // Flasks
    this.flasks = data.flasks || {
      health: { tier: 1, charges: 3, cooldown: 0 },
      energy: { tier: 1, charges: 3, cooldown: 0 }
    };
    
    // Abilities
    this.abilities = [];
    this.initializeAbilities();
    
    // Cooldowns and timers
    this.cooldowns = {
      ability1: 0,
      ability2: 0,
      ultimate: 0,
      healthFlask: 0,
      energyFlask: 0,
      jump: 0
    };
    
    // Visual components
    this.model = null;
    this.createModel();
    
    // Network related
    this.lastNetworkUpdate = 0;
    this.networkUpdateRate = 100; // ms
  }

  createModel() {
    // Create player model
    const group = new THREE.Group();
    
    // Create player body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: this.isLocalPlayer ? 0x00ff00 : 0xff0000 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8; // Center at player's position
    group.add(body);
    
    // Add head
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: this.isLocalPlayer ? 0x00aa00 : 0xaa0000 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8; // Position on top of body
    group.add(head);
    
    // Add weapon (basic shape based on class)
    const weaponGeometry = this.class === 'Warrior' ? 
      new THREE.BoxGeometry(0.1, 0.8, 0.1) : 
      (this.class === 'Mage' ? 
        new THREE.CylinderGeometry(0.05, 0.05, 1, 8) : 
        new THREE.BoxGeometry(0.1, 1, 0.1));
    
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.4, 1.2, 0.2);
    weapon.rotation.z = Math.PI / 4;
    group.add(weapon);
    
    // Add name label
    if (!this.isLocalPlayer) {
      // Name label would be implemented using HTML overlay or sprite
      // This is just a placeholder
      const labelGeometry = new THREE.PlaneGeometry(1, 0.3);
      const labelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.y = 2.3;
      label.rotation.x = -Math.PI / 2;
      group.add(label);
    }
    
    this.model = group;
    
    // Add hitbox visualization (only visible in debug mode)
    const hitboxGeometry = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.y = 0.8;
    hitbox.visible = false; // Hide by default
    this.hitboxMesh = hitbox;
    group.add(hitbox);
    
    return group;
  }

  initializeAbilities() {
    // Initialize abilities based on class
    switch (this.class) {
      case 'Warrior':
        this.abilities = [
          {
            id: 'warrior_whirlwind',
            name: 'Whirlwind',
            description: 'Spin in a circle, damaging all nearby enemies.',
            type: 'area',
            cooldown: 8,
            energyCost: 25,
            damage: 40,
            range: 5
          },
          {
            id: 'warrior_warcry',
            name: 'War Cry',
            description: 'Increase damage for you and nearby allies.',
            type: 'buff',
            cooldown: 15,
            energyCost: 30,
            duration: 10,
            effectAmount: 20
          },
          {
            id: 'warrior_berserk',
            name: 'Berserk',
            description: 'Enter a rage, increasing attack speed and damage.',
            type: 'ultimate',
            cooldown: 60,
            energyCost: 50,
            duration: 15,
            attackSpeedIncrease: 50,
            damageIncrease: 30
          }
        ];
        break;
        
      case 'Mage':
        this.abilities = [
          {
            id: 'mage_fireball',
            name: 'Fireball',
            description: 'Launch a ball of fire that explodes on impact.',
            type: 'projectile',
            cooldown: 5,
            energyCost: 30,
            damage: 50,
            radius: 3,
            speed: 15
          },
          {
            id: 'mage_frostnova',
            name: 'Frost Nova',
            description: 'Release a burst of cold that slows all nearby enemies.',
            type: 'area',
            cooldown: 12,
            energyCost: 35,
            damage: 20,
            range: 4,
            slowAmount: 40,
            slowDuration: 8
          },
          {
            id: 'mage_arcanebarrage',
            name: 'Arcane Barrage',
            description: 'Channel arcane energy to bombard an area.',
            type: 'ultimate',
            cooldown: 45,
            energyCost: 60,
            damage: 150,
            radius: 5,
            duration: 3
          }
        ];
        break;
        
      case 'Archer':
        this.abilities = [
          {
            id: 'archer_multishot',
            name: 'Multishot',
            description: 'Fire multiple arrows in a cone.',
            type: 'projectile',
            cooldown: 8,
            energyCost: 20,
            arrowCount: 5,
            damage: 25,
            spread: 30,
            speed: 20
          },
          {
            id: 'archer_trap',
            name: 'Trap',
            description: 'Place a trap that snares enemies.',
            type: 'trap',
            cooldown: 15,
            energyCost: 30,
            damage: 10,
            snareTime: 4,
            radius: 2,
            duration: 30
          },
          {
            id: 'archer_rainarrows',
            name: 'Rain of Arrows',
            description: 'Call down a hail of arrows on an area.',
            type: 'ultimate',
            cooldown: 40,
            energyCost: 45,
            damage: 120,
            radius: 6,
            duration: 3
          }
        ];
        break;
        
      case 'Cleric':
        this.abilities = [
          {
            id: 'cleric_heal',
            name: 'Heal',
            description: 'Restore health to yourself and nearby allies.',
            type: 'heal',
            cooldown: 8,
            energyCost: 30,
            healing: 40,
            radius: 5
          },
          {
            id: 'cleric_smite',
            name: 'Smite',
            description: 'Call down holy light to damage and weaken an enemy.',
            type: 'projectile',
            cooldown: 10,
            energyCost: 25,
            damage: 35,
            weakenAmount: 20,
            weakenDuration: 6
          },
          {
            id: 'cleric_divineshield',
            name: 'Divine Shield',
            description: 'Create a protective barrier around party members.',
            type: 'ultimate',
            cooldown: 60,
            energyCost: 50,
            shieldAmount: 100,
            duration: 8,
            radius: 8
          }
        ];
        break;
        
      default:
        // Default abilities if class not recognized
        this.abilities = [
          {
            id: 'basic_attack',
            name: 'Basic Attack',
            description: 'A simple attack that deals damage.',
            type: 'attack',
            cooldown: 0,
            energyCost: 0,
            damage: 10
          },
          {
            id: 'utility_skill',
            name: 'Utility Skill',
            description: 'A utility skill with various effects.',
            type: 'utility',
            cooldown: 10,
            energyCost: 20
          },
          {
            id: 'power_skill',
            name: 'Power Skill',
            description: 'A powerful skill with a long cooldown.',
            type: 'ultimate',
            cooldown: 30,
            energyCost: 40,
            damage: 50
          }
        ];
    }
  }

  update(deltaTime) {
    // Update cooldowns
    for (const [key, value] of Object.entries(this.cooldowns)) {
      if (value > 0) {
        this.cooldowns[key] = Math.max(0, value - deltaTime);
      }
    }
    
    // Regenerate energy over time
    if (this.energy < this.maxEnergy) {
      // Base regeneration rate
      let regenerationRate = 5 * deltaTime; 
      
      // Apply birthstone effects if any
      if (this.birthstones.includes('Amethyst')) {
        regenerationRate *= 1.2; // 20% faster with Amethyst
      }
      
      this.energy = Math.min(this.maxEnergy, this.energy + regenerationRate);
    }
    
    // Update return to hub timer
    if (this.isReturning) {
      const returnHoldTime = (Date.now() - this.returnHoldStartTime) / 1000;
      if (returnHoldTime >= 1.8) {
        this.completeReturnToHub();
      }
    }
    
    // Update model position and rotation
    if (this.model) {
      this.model.position.copy(this.position);
      this.model.rotation.y = this.rotation.y;
    }
    
    // Handle network updates for local player
    if (this.isLocalPlayer && this.gameClient.network && this.gameClient.network.connected) {
      const now = Date.now();
      if (now - this.lastNetworkUpdate > this.networkUpdateRate) {
        this.sendNetworkUpdate();
        this.lastNetworkUpdate = now;
      }
    }
  }

  moveForward(speed) {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    direction.y = 0;
    direction.normalize();
    
    this.velocity.x += direction.x * speed;
    this.velocity.z += direction.z * speed;
  }

  moveBackward(speed) {
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    direction.y = 0;
    direction.normalize();
    
    this.velocity.x += direction.x * speed;
    this.velocity.z += direction.z * speed;
  }

  moveLeft(speed) {
    const direction = new THREE.Vector3(-1, 0, 0);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    direction.y = 0;
    direction.normalize();
    
    this.velocity.x += direction.x * speed;
    this.velocity.z += direction.z * speed;
  }

  moveRight(speed) {
    const direction = new THREE.Vector3(1, 0, 0);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    direction.y = 0;
    direction.normalize();
    
    this.velocity.x += direction.x * speed;
    this.velocity.z += direction.z * speed;
  }

  jump() {
    if (this.onGround && this.cooldowns.jump <= 0) {
      this.velocity.y = 5.0; // Jump force
      this.onGround = false;
      this.isJumping = true;
      this.cooldowns.jump = 0.3; // Short cooldown to prevent spam
    }
  }

  attack() {
    // Basic attack (projectile 1 - left click)
    if (!this.gameClient.network) return;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    
    // Create attack data based on class
    const attackData = {
      type: this.class === 'Warrior' || this.class === 'Cleric' ? 'melee' : 'ranged',
      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z
      },
      position: {
        x: this.position.x,
        y: this.position.y + 1.6, // Eye height
        z: this.position.z
      }
    };
    
    // Perform raycast to find targets
    if (attackData.type === 'ranged') {
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(this.position.x, this.position.y + 1.6, this.position.z),
        direction,
        0,
        100
      );
      
      // Get targetable objects
      const targetObjects = [];
      this.gameClient.scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy) {
          targetObjects.push(obj);
        }
      });
      
      const hits = raycaster.intersectObjects(targetObjects);
      if (hits.length > 0) {
        attackData.targetIds = hits.map(hit => hit.object.userData.id);
      }
    }
    
    // Send attack to server
    this.gameClient.network.sendPlayerAttack(attackData);
  }

  useAbility(abilityIndex) {
    if (abilityIndex < 0 || abilityIndex >= this.abilities.length) return;
    
    const ability = this.abilities[abilityIndex];
    const cooldownKey = abilityIndex === 0 ? 'ability1' : (abilityIndex === 1 ? 'ability2' : 'ultimate');
    
    // Check cooldown
    if (this.cooldowns[cooldownKey] > 0) {
      console.log(`Ability ${ability.name} is on cooldown: ${this.cooldowns[cooldownKey].toFixed(1)}s`);
      return;
    }
    
    // Check energy
    if (this.energy < ability.energyCost) {
      console.log(`Not enough energy for ${ability.name}`);
      return;
    }
    
    // Use energy
    this.energy -= ability.energyCost;
    
    // Set cooldown
    this.cooldowns[cooldownKey] = ability.cooldown;
    
    // Create ability data
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.gameClient.camera.quaternion);
    
    const abilityData = {
      abilityId: ability.id,
      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z
      },
      position: {
        x: this.position.x,
        y: this.position.y + 1.6, // Eye height
        z: this.position.z
      }
    };
    
    // For targeted abilities, find valid targets
    if (ability.type === 'projectile' || ability.type === 'targeted') {
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(this.position.x, this.position.y + 1.6, this.position.z),
        direction,
        0,
        ability.range || 100
      );
      
      // Get targetable objects
      const targetObjects = [];
      this.gameClient.scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy) {
          targetObjects.push(obj);
        }
      });
      
      const hits = raycaster.intersectObjects(targetObjects);
      if (hits.length > 0) {
        abilityData.targetIds = hits.map(hit => hit.object.userData.id);
        abilityData.targetPosition = {
          x: hits[0].point.x,
          y: hits[0].point.y,
          z: hits[0].point.z
        };
      } else {
        // No direct hit, use a point in front of the player
        const targetPos = new THREE.Vector3().copy(direction).multiplyScalar(10).add(this.position);
        abilityData.targetPosition = {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z
        };
      }
    } else if (ability.type === 'area') {
      // For area abilities, target at a reasonable distance in front of player
      const targetPos = new THREE.Vector3().copy(direction).multiplyScalar(10).add(this.position);
      abilityData.targetPosition = {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z
      };
    }
    
    // Send ability use to server
    if (this.gameClient.network && this.gameClient.network.connected) {
      this.gameClient.network.sendAbilityUse(abilityData);
    }
    
    // Create visual effect
    this.createAbilityEffect(ability, abilityData);
  }
  
  createAbilityEffect(ability, abilityData) {
    // Create visual effects for abilities
    switch(ability.type) {
      case 'projectile':
        this.createProjectileEffect(ability, abilityData);
        break;
      case 'area':
        this.createAreaEffect(ability, abilityData);
        break;
      case 'buff':
      case 'heal':
        this.createBuffEffect(ability, abilityData);
        break;
      case 'ultimate':
        this.createUltimateEffect(ability, abilityData);
        break;
    }
  }
  
  createProjectileEffect(ability, abilityData) {
    // Create projectile effect
    const direction = new THREE.Vector3(
      abilityData.direction.x, 
      abilityData.direction.y, 
      abilityData.direction.z
    );
    
    // Create projectile mesh
    const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    let projectileMaterial;
    
    // Choose material based on class/ability
    if (this.class === 'Mage' && ability.id.includes('fireball')) {
      projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    } else if (this.class === 'Archer') {
      projectileMaterial = new THREE.MeshBasicMaterial({ color: 0x885500 });
    } else if (this.class === 'Cleric') {
      projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    } else {
      projectileMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    }
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Set initial position
    projectile.position.set(
      abilityData.position.x,
      abilityData.position.y,
      abilityData.position.z
    );
    
    // Add to scene
    this.gameClient.scene.add(projectile);
    
    // Store reference for tracking
    const projectileObj = {
      mesh: projectile,
      direction: direction,
      speed: ability.speed || 15,
      distance: 0,
      maxDistance: ability.range || 100,
      created: Date.now()
    };
    
    // Add to game client's projectiles array for updating
    if (!this.gameClient.projectiles) this.gameClient.projectiles = [];
    this.gameClient.projectiles.push(projectileObj);
    
    // Add light to projectile for effect
    const light = new THREE.PointLight(projectileMaterial.color, 1, 3);
    projectile.add(light);
  }
  
  createAreaEffect(ability, abilityData) {
    // Create area effect
    const position = abilityData.targetPosition || abilityData.position;
    const radius = ability.radius || 5;
    
    // Create circle geometry
    const circleGeometry = new THREE.CircleGeometry(radius, 32);
    circleGeometry.rotateX(-Math.PI / 2); // Rotate to lay flat
    
    // Create material based on ability
    let circleMaterial;
    
    if (this.class === 'Warrior' && ability.id.includes('whirlwind')) {
      circleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.3 
      });
    } else if (this.class === 'Mage' && ability.id.includes('frost')) {
      circleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.3 
      });
    } else {
      circleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.3 
      });
    }
    
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    
    // Position the effect
    circle.position.set(position.x, position.y + 0.1, position.z);
    
    // Add to scene
    this.gameClient.scene.add(circle);
    
    // Create fade-out animation
    const duration = ability.duration || 2;
    const startTime = Date.now();
    
    const fadeEffect = {
      mesh: circle,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(circle);
          return true; // Return true to indicate effect is complete
        }
        
        // Fade out opacity
        circleMaterial.opacity = 0.3 * (1 - progress);
        
        // Scale up slightly
        const scale = 1 + (progress * 0.5);
        circle.scale.set(scale, scale, scale);
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(fadeEffect);
  }
  
  createBuffEffect(ability, abilityData) {
    // Create buff/heal effect around the player
    const radius = ability.radius || 3;
    const isHeal = ability.type === 'heal';
    
    // Create particle system for buff effect
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Create random particles in a sphere
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const r = radius * Math.random();
      
      positions[i3] = r * Math.sin(angle1) * Math.cos(angle2);
      positions[i3 + 1] = r * Math.sin(angle1) * Math.sin(angle2);
      positions[i3 + 2] = r * Math.cos(angle1);
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Material color based on ability type
    const particleMaterial = new THREE.PointsMaterial({
      color: isHeal ? 0x00ff00 : 0xffff00,
      size: 0.2,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    
    // Position particles at player
    particles.position.copy(this.position);
    particles.position.y += 1; // Center at player's torso
    
    // Add to scene
    this.gameClient.scene.add(particles);
    
    // Create animation
    const duration = ability.duration || 2;
    const startTime = Date.now();
    
    const particleEffect = {
      mesh: particles,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(particles);
          return true; // Return true to indicate effect is complete
        }
        
        // Particles rise up and fade out
        particles.position.y += 0.01;
        particleMaterial.opacity = 0.8 * (1 - progress);
        
        // Rotate particles
        particles.rotation.y += 0.01;
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(particleEffect);
  }
  
  createUltimateEffect(ability, abilityData) {
    // Create more dramatic effect for ultimate abilities
    // This combines multiple effects for more impact
    
    // Add screen flash effect
    if (this.gameClient.renderer) {
      this.gameClient.renderer.setClearColor(0xffffff, 1);
      setTimeout(() => {
        this.gameClient.renderer.setClearColor(0x000000, 1);
      }, 100);
    }
    
    // Add particle burst
    const particleCount = 100;
    const burstGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Create particles with velocity
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at player position
      positions[i3] = this.position.x;
      positions[i3 + 1] = this.position.y + 1; // Center at player's torso
      positions[i3 + 2] = this.position.z;
      
      // Random colors based on class
      if (this.class === 'Warrior') {
        colors[i3] = 1.0; // red
        colors[i3 + 1] = 0.2 + 0.3 * Math.random(); // green
        colors[i3 + 2] = 0.2 + 0.3 * Math.random(); // blue
      } else if (this.class === 'Mage') {
        colors[i3] = 0.2 + 0.3 * Math.random(); // red
        colors[i3 + 1] = 0.2 + 0.3 * Math.random(); // green
        colors[i3 + 2] = 1.0; // blue
      } else if (this.class === 'Archer') {
        colors[i3] = 0.2 + 0.3 * Math.random(); // red
        colors[i3 + 1] = 1.0; // green
        colors[i3 + 2] = 0.2 + 0.3 * Math.random(); // blue
      } else if (this.class === 'Cleric') {
        colors[i3] = 1.0; // red
        colors[i3 + 1] = 1.0; // green
        colors[i3 + 2] = 0.2 + 0.3 * Math.random(); // blue
      }
    }
    
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    burstGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const burstMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1.0
    });
    
    const burst = new THREE.Points(burstGeometry, burstMaterial);
    
    // Add to scene
    this.gameClient.scene.add(burst);
    
    // Particle velocities for animation
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      
      velocities.push({
        x: speed * Math.sin(angle1) * Math.cos(angle2),
        y: speed * Math.sin(angle1) * Math.sin(angle2) + 2, // Add upward bias
        z: speed * Math.cos(angle1)
      });
    }
    
    // Create animation
    const duration = 2; // 2 seconds
    const startTime = Date.now();
    
    const burstEffect = {
      mesh: burst,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(burst);
          return true; // Return true to indicate effect is complete
        }
        
        // Update particle positions based on velocities
        const positions = burst.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          positions[i3] += velocities[i].x * 0.1;
          positions[i3 + 1] += velocities[i].y * 0.1;
          positions[i3 + 2] += velocities[i].z * 0.1;
          
          // Add gravity
          velocities[i].y -= 0.05;
        }
        
        burst.geometry.attributes.position.needsUpdate = true;
        
        // Fade out particles
        burstMaterial.opacity = 1.0 * (1 - progress);
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(burstEffect);
    
    // Also create appropriate area or projectile effect based on ability type
    if (ability.id.includes('whirlwind') || ability.id.includes('nova')) {
      this.createAreaEffect(ability, abilityData);
    } else if (ability.id.includes('barrage') || ability.id.includes('arrows')) {
      this.createProjectileEffect(ability, abilityData);
    } else if (ability.id.includes('shield')) {
      this.createBuffEffect(ability, abilityData);
    }
  }
  
  useFlask(type) {
    if (type !== 'health' && type !== 'energy') return;
    
    const flask = this.flasks[type];
    const cooldownKey = type === 'health' ? 'healthFlask' : 'energyFlask';
    
    // Check cooldown
    if (this.cooldowns[cooldownKey] > 0) {
      console.log(`${type} flask on cooldown: ${this.cooldowns[cooldownKey].toFixed(1)}s`);
      return;
    }
    
    // Check charges
    if (flask.charges <= 0) {
      console.log(`No ${type} flask charges remaining`);
      return;
    }
    
    // Calculate amount based on flask tier
    const baseAmount = 30;
    const tierMultiplier = 1 + (flask.tier - 1) * 0.5; // +50% per tier
    const amount = Math.floor(baseAmount * tierMultiplier);
    
    // Use flask
    flask.charges--;
    
    // Apply effect
    if (type === 'health') {
      this.health = Math.min(this.maxHealth, this.health + amount);
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + amount);
    }
    
    // Set cooldown (5 seconds)
    this.cooldowns[cooldownKey] = 5;
    
    // Create flask effect
    this.createFlaskEffect(type);
    
    // Send to server
    if (this.gameClient.network && this.gameClient.network.connected) {
      this.gameClient.network.sendFlaskUse({ type });
    }
  }
  
  createFlaskEffect(type) {
    // Create visual effect for flask use
    const color = type === 'health' ? 0xff0000 : 0x0000ff;
    
    // Create particle system
    const particleCount = 30;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Start particles at player
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = this.position.x + (Math.random() * 0.6 - 0.3);
      positions[i3 + 1] = this.position.y + 0.5 + (Math.random() * 0.6);
      positions[i3 + 2] = this.position.z + (Math.random() * 0.6 - 0.3);
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    
    // Add to scene
    this.gameClient.scene.add(particles);
    
    // Create animation
    const duration = 1.5; // 1.5 seconds
    const startTime = Date.now();
    
    const particleEffect = {
      mesh: particles,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(particles);
          return true; // Return true to indicate effect is complete
        }
        
        // Particles spiral upward
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          const angle = progress * 10 + (i * 0.1);
          const radius = 0.3 * (1 - progress);
          
          // Calculate new position
          positions[i3] = this.position.x + Math.cos(angle) * radius;
          positions[i3 + 1] += 0.02; // Rise up
          positions[i3 + 2] = this.position.z + Math.sin(angle) * radius;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Fade out
        particleMaterial.opacity = 0.8 * (1 - progress);
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(particleEffect);
  }
  
  startReturnToHub() {
    if (this.isReturning) return;
    
    this.isReturning = true;
    this.returnHoldStartTime = Date.now();
    
    // Create return indicator effect
    this.createReturnToHubEffect();
  }
  
  stopReturnToHub() {
    if (!this.isReturning) return;
    
    this.isReturning = false;
    this.returnHoldStartTime = 0;
    
    // Remove return indicator effect
    if (this.returnEffect) {
      this.gameClient.scene.remove(this.returnEffect);
      this.returnEffect = null;
    }
  }
  
  completeReturnToHub() {
    // Request server to return player to hub
    if (this.gameClient.network && this.gameClient.network.connected) {
      this.gameClient.network.socket.emit('return_to_hub');
    }
    
    this.isReturning = false;
    this.returnHoldStartTime = 0;
    
    // Remove return indicator effect
    if (this.returnEffect) {
      this.gameClient.scene.remove(this.returnEffect);
      this.returnEffect = null;
    }
  }
  
  createReturnToHubEffect() {
    // Create visual indicator for return to hub
    const ringGeometry = new THREE.RingGeometry(0.8, 1, 32);
    ringGeometry.rotateX(-Math.PI / 2); // Rotate to lay flat
    
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Position at player's feet
    ring.position.copy(this.position);
    ring.position.y += 0.05; // Just above ground
    
    // Add to scene
    this.gameClient.scene.add(ring);
    this.returnEffect = ring;
    
    // Add animation to update loop
    const startTime = Date.now();
    const returnDuration = 1.8; // Match the required hold time
    
    const returnAnimation = {
      mesh: ring,
      update: (time) => {
        if (!this.isReturning) {
          // Player canceled return, remove the effect
          this.gameClient.scene.remove(ring);
          return true;
        }
        
        const elapsed = (time - startTime) / 1000;
        const progress = Math.min(elapsed / returnDuration, 1);
        
        // Scale the ring to show progress
        const scale = 1 + progress * 0.5;
        ring.scale.set(scale, scale, scale);
        
        // Rotate the ring
        ring.rotation.z += 0.02;
        
        // Update opacity
        ringMaterial.opacity = 0.6 * (1 - progress * 0.5);
        
        // Update ring color from cyan to green as progress increases
        if (progress < 1) {
          const color = new THREE.Color(0x00ffff).lerp(new THREE.Color(0x00ff00), progress);
          ringMaterial.color = color;
        }
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(returnAnimation);
  }
  
  sendNetworkUpdate() {
    if (!this.gameClient.network || !this.gameClient.network.connected) return;
    
    this.gameClient.network.sendPlayerPosition(
      {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      },
      {
        x: this.rotation.x,
        y: this.rotation.y,
        z: this.rotation.z
      }
    );
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    // Create damage effect
    this.createDamageEffect(amount);
    
    // Check if dead
    if (this.health <= 0) {
      this.die();
    }
    
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      died: this.health <= 0
    };
  }
  
  createDamageEffect(amount) {
    // Flash player red
    if (this.model) {
      this.model.traverse(obj => {
        if (obj.isMesh) {
          obj.userData.originalMaterial = obj.material;
          obj.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        }
      });
      
      // Restore original material after a short time
      setTimeout(() => {
        this.model.traverse(obj => {
          if (obj.isMesh && obj.userData.originalMaterial) {
            obj.material = obj.userData.originalMaterial;
          }
        });
      }, 200);
    }
    
    // Create damage text that floats up
    // This would typically use HTML or a sprite, but for Three.js:
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw damage amount
    context.fillStyle = '#ff0000';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`-${amount}`, 64, 32);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(this.position);
    sprite.position.y += 2; // Above player's head
    sprite.scale.set(1, 0.5, 1);
    
    // Add to scene
    this.gameClient.scene.add(sprite);
    
    // Animate the damage text
    const startTime = Date.now();
    const duration = 1.0; // 1 second
    
    const damageEffect = {
      mesh: sprite,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(sprite);
          return true;
        }
        
        // Move upward
        sprite.position.y += 0.01;
        
        // Fade out
        spriteMaterial.opacity = 1 - progress;
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(damageEffect);
  }
  
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    // Create heal effect
    this.createHealEffect(amount);
    
    return {
      health: this.health,
      maxHealth: this.maxHealth
    };
  }
  
  createHealEffect(amount) {
    // Similar to damage effect but with green color
    if (this.model) {
      this.model.traverse(obj => {
        if (obj.isMesh) {
          obj.userData.originalMaterial = obj.material;
          obj.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        }
      });
      
      // Restore original material after a short time
      setTimeout(() => {
        this.model.traverse(obj => {
          if (obj.isMesh && obj.userData.originalMaterial) {
            obj.material = obj.userData.originalMaterial;
          }
        });
      }, 200);
    }
    
    // Create heal text that floats up
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw heal amount
    context.fillStyle = '#00ff00';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`+${amount}`, 64, 32);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(this.position);
    sprite.position.y += 2; // Above player's head
    sprite.scale.set(1, 0.5, 1);
    
    // Add to scene
    this.gameClient.scene.add(sprite);
    
    // Animate the heal text
    const startTime = Date.now();
    const duration = 1.0; // 1 second
    
    const healEffect = {
      mesh: sprite,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(sprite);
          return true;
        }
        
        // Move upward
        sprite.position.y += 0.01;
        
        // Fade out
        spriteMaterial.opacity = 1 - progress;
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(healEffect);
  }
  
  die() {
    console.log('Player died');
    
    // Create death effect
    this.createDeathEffect();
    
    // Disable movement
    this.isDead = true;
    
    // Show death UI (would be implemented in UI class)
    if (this.gameClient.ui) {
      this.gameClient.ui.showDeathScreen();
    }
  }
  
  createDeathEffect() {
    // Create particle explosion effect
    const particleCount = 50;
    const deathGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Start particles at player position
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = this.position.x;
      positions[i3 + 1] = this.position.y + 0.8; // Center of player
      positions[i3 + 2] = this.position.z;
    }
    
    deathGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const deathMaterial = new THREE.PointsMaterial({
      color: 0xff0000,
      size: 0.2,
      transparent: true,
      opacity: 1.0
    });
    
    const particles = new THREE.Points(deathGeometry, deathMaterial);
    
    // Add to scene
    this.gameClient.scene.add(particles);
    
    // Particle velocities for animation
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      
      velocities.push({
        x: speed * Math.sin(angle1) * Math.cos(angle2),
        y: speed * Math.sin(angle1) * Math.sin(angle2),
        z: speed * Math.cos(angle1)
      });
    }
    
    // Create animation
    const duration = 2; // 2 seconds
    const startTime = Date.now();
    
    const deathEffect = {
      mesh: particles,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(particles);
          return true;
        }
        
        // Update particle positions based on velocities
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          positions[i3] += velocities[i].x * 0.1;
          positions[i3 + 1] += velocities[i].y * 0.1;
          positions[i3 + 2] += velocities[i].z * 0.1;
          
          // Add gravity
          velocities[i].y -= 0.05;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Fade out particles
        deathMaterial.opacity = 1.0 * (1 - progress);
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(deathEffect);
    
    // Hide player model
    if (this.model) {
      this.model.visible = false;
    }
  }
  
  respawn() {
    // Reset player state
    this.isDead = false;
    this.health = this.maxHealth;
    this.energy = this.maxEnergy;
    
    // Reset position
    this.position.set(0, 2, 0);
    this.velocity.set(0, 0, 0);
    
    // Show player model
    if (this.model) {
      this.model.visible = true;
    }
    
    // Create respawn effect
    this.createRespawnEffect();
    
    // Hide death UI (would be implemented in UI class)
    if (this.gameClient.ui) {
      this.gameClient.ui.hideDeathScreen();
    }
  }
  
  createRespawnEffect() {
    // Create respawn light pillar effect
    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 16, 1, true);
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.copy(this.position);
    cylinder.position.y += 2.5; // Center vertically
    
    // Add to scene
    this.gameClient.scene.add(cylinder);
    
    // Create animation
    const duration = 1.5; // 1.5 seconds
    const startTime = Date.now();
    
    const respawnEffect = {
      mesh: cylinder,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(cylinder);
          return true;
        }
        
        // Rotate the cylinder
        cylinder.rotation.y += 0.05;
        
        // Scale the cylinder
        const scale = 1 - progress * 0.5;
        cylinder.scale.set(scale, 1, scale);
        
        // Fade out
        cylinderMaterial.opacity = 0.5 * (1 - progress);
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(respawnEffect);
  }
  
  gainExperience(amount) {
    this.experience += amount;
    
    // Check for level up
    if (this.experience >= this.experienceToLevel) {
      this.levelUp();
    }
    
    // Create experience gain effect
    this.createExperienceEffect(amount);
    
    return {
      experience: this.experience,
      experienceToLevel: this.experienceToLevel,
      level: this.level
    };
  }
  
  levelUp() {
    this.level++;
    this.experience -= this.experienceToLevel;
    this.experienceToLevel = 1000 * this.level;
    
    // Increase stats
    this.maxHealth += 10;
    this.health = this.maxHealth;
    this.maxEnergy += 5;
    this.energy = this.maxEnergy;
    
    // Create level up effect
    this.createLevelUpEffect();
    
    // Show level up UI (would be implemented in UI class)
    if (this.gameClient.ui) {
      this.gameClient.ui.showLevelUp(this.level);
    }
    
    console.log(`Level up! Now level ${this.level}`);
  }
  
  createExperienceEffect(amount) {
    // Create a floating text for XP gained
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw XP amount
    context.fillStyle = '#ffff00';
    context.font = 'bold 36px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`+${amount} XP`, 64, 32);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(this.position);
    sprite.position.y += 2.3; // Above player's head
    sprite.scale.set(1, 0.5, 1);
    
    // Add to scene
    this.gameClient.scene.add(sprite);
    
    // Animate the XP text
    const startTime = Date.now();
    const duration = 1.5; // 1.5 seconds
    
    const xpEffect = {
      mesh: sprite,
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove the effect when done
          this.gameClient.scene.remove(sprite);
          return true;
        }
        
        // Move upward
        sprite.position.y += 0.01;
        
        // Fade out
        spriteMaterial.opacity = 1 - progress;
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(xpEffect);
  }
  
  createLevelUpEffect() {
    // Create dramatic level up effect
    
    // Light pillar
    const cylinderGeometry = new THREE.CylinderGeometry(0.8, 0.8, 10, 32, 1, true);
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.copy(this.position);
    cylinder.position.y += 5; // Center vertically
    
    // Particle burst
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Start particles at player position
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = this.position.x;
      positions[i3 + 1] = this.position.y + 1; // Player center
      positions[i3 + 2] = this.position.z;
      
      // Gold/yellow particles
      colors[i3] = 1.0; // red
      colors[i3 + 1] = 0.8 + 0.2 * Math.random(); // green
      colors[i3 + 2] = 0.0; // blue
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1.0
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    
    // Add to scene
    this.gameClient.scene.add(cylinder);
    this.gameClient.scene.add(particles);
    
    // Add text for "Level Up!"
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Draw level up text
    context.fillStyle = '#ffff00';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`LEVEL UP!`, 128, 64);
    context.fillText(`${this.level}`, 128, 104);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(this.position);
    sprite.position.y += 3; // Above player's head
    sprite.scale.set(2, 1, 1);
    
    // Add to scene
    this.gameClient.scene.add(sprite);
    
    // Particle velocities for animation
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      
      velocities.push({
        x: speed * Math.sin(angle1) * Math.cos(angle2),
        y: speed * Math.sin(angle1) * Math.sin(angle2),
        z: speed * Math.cos(angle1)
      });
    }
    
    // Create animation for all effects
    const duration = 3; // 3 seconds
    const startTime = Date.now();
    
    const levelUpEffect = {
      update: (time) => {
        const elapsed = (time - startTime) / 1000;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          // Remove all effects when done
          this.gameClient.scene.remove(cylinder);
          this.gameClient.scene.remove(particles);
          this.gameClient.scene.remove(sprite);
          return true;
        }
        
        // Update cylinder
        cylinder.rotation.y += 0.02;
        cylinderMaterial.opacity = 0.5 * (1 - Math.pow(progress, 2));
        
        // Update particles
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          positions[i3] += velocities[i].x * 0.1;
          positions[i3 + 1] += velocities[i].y * 0.1;
          positions[i3 + 2] += velocities[i].z * 0.1;
          
          // Add gravity after initial burst
          if (progress > 0.3) {
            velocities[i].y -= 0.05;
          }
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        particleMaterial.opacity = 1.0 * (1 - progress);
        
        // Update sprite
        if (progress < 0.2) {
          // Scale up
          const scale = 1 + progress * 5;
          sprite.scale.set(scale * 2, scale, 1);
        } else {
          // Hold then fade
          spriteMaterial.opacity = progress < 0.7 ? 1.0 : 1.0 * (1 - ((progress - 0.7) / 0.3));
        }
        
        return false;
      }
    };
    
    // Add to game client's effects array for updating
    if (!this.gameClient.effects) this.gameClient.effects = [];
    this.gameClient.effects.push(levelUpEffect);
  }
}