// client/game/index.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { VoxelRenderer } from './voxel-renderer';

export class GameClient {
  // In client/game/index.js
  constructor() {
  this.scene = null;
  this.camera = null;
  this.renderer = null;
  this.controls = null;
  this.voxelRenderer = null;
  
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
  
  // Connection state will be provided by ConnectionManager
  this.connectionState = {
    isConnected: false,
    token: null,
    characterId: null
  };
  
  this.init();
}
setupRenderer() {
  // Implementation as above
}

setupScene() {
  this.scene = new THREE.Scene();
}

setupLighting() {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x404040);
  this.scene.add(ambientLight);
  
  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(1, 1, 0.5).normalize();
  this.scene.add(directionalLight);
}

setupControls() {
  this.camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  this.controls = new PointerLockControls(this.camera, document.body);
}

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.setupControls();
    this.setupEventListeners();
    
    // Initialize voxel renderer
    this.voxelRenderer = new VoxelRenderer(this.scene);
    
    // Start animation loop
    this.animate(0);
  }
  
  // ... (rest of the GameClient class with setupRenderer, setupScene, etc.)
  
  update(deltaTime) {
    // Update player physics
    this.updatePlayerPhysics(deltaTime);
    
    // Update camera position
    this.camera.position.copy(this.player.position);
    this.camera.position.y += 1.6; // Eye height
    
    // Update voxel chunks around player
    this.voxelRenderer.updateChunks(this.player.position, 2);
  }
  
  updatePlayerPhysics(deltaTime) {
    // Apply gravity
    if (!this.player.onGround) {
      this.player.velocity.y -= 9.8 * deltaTime;
    }
    
    // Apply player input
    const speed = 5.0 * deltaTime;
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
    
    // Simple collision detection with ground
    if (this.player.position.y < 1.0) {
      this.player.position.y = 1.0;
      this.player.velocity.y = 0;
      this.player.onGround = true;
    } else {
      this.player.onGround = false;
    }
    
    // Handle jump
    if (this.keys.jump && this.player.onGround) {
      this.player.velocity.y = 5.0;
      this.player.onGround = false;
    }
  }
  
  animate(time) {
    requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    // Skip large deltas (e.g. when tab is inactive)
    if (deltaTime > 0.1) return;
    
    // Update game state
    this.update(deltaTime);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}