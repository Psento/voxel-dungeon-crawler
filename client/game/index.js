// client/game/index.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ChunkManager } from './chunk-manager';
import { LightingSystem } from './lighting-system';
import { ObjectPool } from './object-pool';
import { GameObjectFactory } from './game-object-factory';
import { TerrainGenerator } from './terrain-generator';
import { PerformanceMonitor } from './performance-monitor';

export class GameClient {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.player = {
      position: new THREE.Vector3(0, 10, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      onGround: false
    };
    
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };
    
    this.lastTime = 0;
    
    // Game objects
    this.activeProjectiles = [];
    this.activeParticles = [];
    this.activeEnemies = [];
    
    // Connection state will be provided by ConnectionManager
    this.connectionState = {
      isConnected: false,
      token: null,
      characterId: null
    };
    
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize systems
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.setupControls();
    this.setupEventListeners();
    
    // Initialize terrain generator with a seed
    this.terrainGenerator = new TerrainGenerator(123456);
    
    // Initialize chunk manager
    this.chunkManager = new ChunkManager(this.scene, 5);
    
    // Initialize object pooling
    this.objectPool = new ObjectPool();
    this.gameObjectFactory = new GameObjectFactory(this.scene, this.objectPool);
    
    // Initialize lighting system
    this.lightingSystem = new LightingSystem(this.scene);
    
    // Start animation loop
    this.animate(0);
  }
  
  setupRenderer() {
    // Create renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue
    
    // Enable shadow maps with performance-optimized settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Optimize rendering
    this.renderer.physicallyCorrectLights = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    document.body.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.camera) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      }
    });
  }

  setupScene() {
    this.scene = new THREE.Scene();
    
    // Add fog for performance (hides distant chunks)
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);
  }

  setupLighting() {
    // Basic lighting is handled by the LightingSystem
    // Here we just add a skybox for environment
    
    // Simple skybox
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Right
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Left
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Top
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Bottom
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Front
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // Back
    ];
    
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    this.scene.add(skybox);
  }

  setupControls() {
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.controls = new PointerLockControls(this.camera, document.body);
  }
  
  setupEventListeners() {
    // Keyboard input handlers
    document.addEventListener('keydown', (e) => {
      switch(e.code) {
        case 'KeyW':
          this.keys.forward = true;
          break;
        case 'KeyS':
          this.keys.backward = true;
          break;
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
          this.keys.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'KeyQ':
          this.keys.ability1 = true;
          break;
        case 'KeyE':
          this.keys.ability2 = true;
          break;
        case 'KeyR':
          this.keys.ability3 = true;
          break;
        case 'KeyF':
          this.keys.interact = true;
          break;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'KeyW':
          this.keys.forward = false;
          break;
        case 'KeyS':
          this.keys.backward = false;
          break;
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
        case 'KeyQ':
          this.keys.ability1 = false;
          break;
        case 'KeyE':
          this.keys.ability2 = false;
          break;
        case 'KeyR':
          this.keys.ability3 = false;
          break;
        case 'KeyF':
          this.keys.interact = false;
          break;
      }
    });
    
    // Mouse click handler for pointer lock and attacks
    document.addEventListener('click', (e) => {
      // Lock pointer on first click
      if (!this.controls.isLocked) {
        this.controls.lock();
        return;
      }
      
      // Left click - attack
      if (e.button === 0) {
        this.playerAttack();
      }
    });
    
    // Mouse right click for alternate attack or block
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.controls.isLocked) {
        this.playerAlternateAction();
      }
    });
    
    // Pointer lock change event
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        console.log('Pointer locked');
      } else {
        console.log('Pointer unlocked');
      }
    });
  }
  
  update(deltaTime) {
    // Start performance monitoring for update cycle
    this.performanceMonitor.startTimer('update');
    
    // Update player physics
    this.updatePlayerPhysics(deltaTime);
    
    // Update camera position
    this.camera.position.copy(this.player.position);
    this.camera.position.y += 1.6; // Eye height
    
    // Update chunk system based on player position
    this.chunkManager.updateChunks(this.player.position);
    
    // Update performance stats for chunks
    this.performanceMonitor.updateChunkCount(this.chunkManager.chunks.size);
    
    // Update dynamic lighting
    this.lightingSystem.updateDynamicLights(deltaTime);
    
    // Update game objects with object pooling
    this.gameObjectFactory.update(deltaTime, this.player.position);
    
    // Update performance stats for entities
    this.performanceMonitor.updateEntityCount(
      this.gameObjectFactory.activeParticles.length + 
      this.gameObjectFactory.activeProjectiles.length + 
      this.gameObjectFactory.activeEnemies.length
    );
    
    // End performance monitoring for update cycle
    this.performanceMonitor.endTimer('update');
  }
  
  updatePlayerPhysics(deltaTime) {
    // Start performance monitoring for physics
    this.performanceMonitor.startTimer('physics');
    
    // Apply gravity
    if (!this.player.onGround) {
      this.player.velocity.y -= 9.8 * deltaTime;
    }
    
    // Apply player input
    let speed = 5.0 * deltaTime;
    
    // Apply sprint modifier
    if (this.keys.sprint) {
      speed *= 1.5;
    }
    
    const direction = new THREE.Vector3();
    
    if (this.keys.forward) direction.z -= 1;
    if (this.keys.backward) direction.z += 1;
    if (this.keys.left) direction.x -= 1;
    if (this.keys.right) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(speed);
    }
    
    // Apply camera direction to movement
    direction.applyQuaternion(this.camera.quaternion);
    direction.y = 0; // Keep movement on xz plane
    
    // Apply velocity to player position
    this.player.position.add(direction);
    this.player.position.y += this.player.velocity.y * deltaTime;
    
    // Check for collisions with terrain (voxel-based collision detection)
    this.handleTerrainCollision();
    
    // Handle jump
    if (this.keys.jump && this.player.onGround) {
      this.player.velocity.y = 5.0;
      this.player.onGround = false;
    }
    
    // Handle abilities
    if (this.keys.ability1) {
      this.useAbility(1);
      this.keys.ability1 = false; // Prevent continuous activation
    }
    
    if (this.keys.ability2) {
      this.useAbility(2);
      this.keys.ability2 = false;
    }
    
    if (this.keys.ability3) {
      this.useAbility(3);
      this.keys.ability3 = false;
    }
    
    // Handle interaction
    if (this.keys.interact) {
      this.interact();
      this.keys.interact = false;
    }
    
    // End performance monitoring for physics
    this.performanceMonitor.endTimer('physics');
  }
  
  handleTerrainCollision() {
    // Simple collision detection with ground
    // In a real implementation, this would check voxels in the chunk
    
    // Ground collision
    if (this.player.position.y < 1.0) {
      this.player.position.y = 1.0;
      this.player.velocity.y = 0;
      this.player.onGround = true;
    } else {
      // Check if there's a block below player
      const blockBelow = this.getVoxelAt(
        Math.floor(this.player.position.x),
        Math.floor(this.player.position.y - 0.1),
        Math.floor(this.player.position.z)
      );
      
      if (blockBelow !== 0) { // 0 = air
        this.player.onGround = true;
        this.player.velocity.y = 0;
      } else {
        this.player.onGround = false;
      }
    }
    
    // Check for collisions in all directions
    const playerRadius = 0.3;
    const playerHeight = 1.7;
    
    // Define collision check points around player
    const collisionPoints = [
      // Bottom points
      new THREE.Vector3(playerRadius, 0, 0),
      new THREE.Vector3(-playerRadius, 0, 0),
      new THREE.Vector3(0, 0, playerRadius),
      new THREE.Vector3(0, 0, -playerRadius),
      // Middle points
      new THREE.Vector3(playerRadius, playerHeight/2, 0),
      new THREE.Vector3(-playerRadius, playerHeight/2, 0),
      new THREE.Vector3(0, playerHeight/2, playerRadius),
      new THREE.Vector3(0, playerHeight/2, -playerRadius),
      // Top points
      new THREE.Vector3(playerRadius, playerHeight, 0),
      new THREE.Vector3(-playerRadius, playerHeight, 0),
      new THREE.Vector3(0, playerHeight, playerRadius),
      new THREE.Vector3(0, playerHeight, -playerRadius)
    ];
    
    // Check each point for collision
    for (const point of collisionPoints) {
      const checkPos = new THREE.Vector3().addVectors(this.player.position, point);
      const voxel = this.getVoxelAt(
        Math.floor(checkPos.x),
        Math.floor(checkPos.y),
        Math.floor(checkPos.z)
      );
      
      if (voxel !== 0) {
        // Collision detected, resolve by pushing away from block
        const blockCenter = new THREE.Vector3(
          Math.floor(checkPos.x) + 0.5,
          Math.floor(checkPos.y) + 0.5,
          Math.floor(checkPos.z) + 0.5
        );
        
        const pushDirection = new THREE.Vector3().subVectors(
          this.player.position,
          blockCenter
        ).normalize();
        
        // Only push horizontally
        pushDirection.y = 0;
        
        // Apply push
        this.player.position.addScaledVector(pushDirection, 0.1);
      }
    }
  }
  
  getVoxelAt(x, y, z) {
    // Get voxel from chunk manager
    // This is a simplified placeholder - in a real implementation,
    // we would get the voxel from the chunk data
    
    // For this implementation, just check if below ground level
    if (y < 0) {
      return 1; // Solid ground
    }
    
    return 0; // Air
  }
  
  playerAttack() {
    // Create a projectile attack
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    
    const spawnPos = new THREE.Vector3().copy(this.camera.position)
      .addScaledVector(direction, 0.5);
    
    // Create projectile through object pool
    this.gameObjectFactory.createProjectile(
      spawnPos,
      direction,
      20, // Speed
      10, // Damage
      'player'
    );
  }
  
  playerAlternateAction() {
    // Secondary action (block, alt fire, etc.)
    console.log('Alternate action');
  }
  
  useAbility(abilityIndex) {
    // Use ability based on index
    console.log(`Using ability ${abilityIndex}`);
  }
  
  interact() {
    // Interact with objects in the world
    console.log('Interact');
  }
  
  animate(time) {
    requestAnimationFrame(this.animate.bind(this));
    
    // Begin performance monitoring for frame
    this.performanceMonitor.startFrame();
    
    // Calculate delta time
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    // Skip large deltas (e.g. when tab is inactive)
    if (deltaTime > 0.1) return;
    
    // Update game state
    this.update(deltaTime);
    
    // Start performance monitoring for render
    this.performanceMonitor.startTimer('render');
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // End performance monitoring for render
    this.performanceMonitor.endTimer('render');
    
    // Update performance stats
    this.performanceMonitor.updateTriangleCount(this.renderer);
    this.performanceMonitor.updateMemoryUsage(this.renderer);
    
    // End performance monitoring for frame
    this.performanceMonitor.endFrame();
  }
  
  connectToGameServer() {
    // Start performance monitoring for network operations
    this.performanceMonitor.startTimer('network');
    
    // This would be used to connect to the server
    console.log('Connecting to game server...');
    console.log('Token:', this.connectionState.token);
    console.log('Character ID:', this.connectionState.characterId);
    
    // In a real implementation, this would establish a connection to the server
    
    // End performance monitoring for network operations
    this.performanceMonitor.endTimer('network');
  }
}