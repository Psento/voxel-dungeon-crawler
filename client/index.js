import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import io from 'socket.io-client';

// Game client setup
class GameClient {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.socket = null;
    this.player = null;
    this.otherPlayers = new Map();
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };

    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.setupControls();
    this.setupEventListeners();
    this.setupNetworking();
    this.createTestEnvironment();
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(0, 1.6, 5);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x666666);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5);
    this.scene.add(directionalLight);
  }

  setupControls() {
    this.controls = new PointerLockControls(this.camera, document.body);
    
    // Add instructions overlay
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.innerHTML = `
      <div class="instructions">
        <p>Click to play</p>
        <p>WASD to move, Space to jump</p>
        <p>Mouse to look around</p>
      </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', () => {
      this.controls.lock();
    });
    
    this.controls.addEventListener('lock', () => {
      overlay.style.display = 'none';
    });
    
    this.controls.addEventListener('unlock', () => {
      overlay.style.display = 'flex';
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
      }
    });
  }

  setupNetworking() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      
      // Create player
      this.player = this.createPlayer();
      this.scene.add(this.player);
      
      // Join game
      this.socket.emit('join_game', {
        position: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z
        }
      });
    });
    
    this.socket.on('player_joined', (playerData) => {
      console.log('Player joined:', playerData.id);
      const otherPlayer = this.createPlayer(0xff0000);
      otherPlayer.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
      );
      this.scene.add(otherPlayer);
      this.otherPlayers.set(playerData.id, otherPlayer);
    });
    
    this.socket.on('player_left', (playerData) => {
      console.log('Player left:', playerData.id);
      const otherPlayer = this.otherPlayers.get(playerData.id);
      if (otherPlayer) {
        this.scene.remove(otherPlayer);
        this.otherPlayers.delete(playerData.id);
      }
    });
    
    this.socket.on('player_moved', (playerData) => {
      const otherPlayer = this.otherPlayers.get(playerData.id);
      if (otherPlayer) {
        otherPlayer.position.set(
          playerData.position.x,
          playerData.position.y,
          playerData.position.z
        );
      }
    });
  }

  createPlayer(color = 0x00ff00) {
    const group = new THREE.Group();
    
    // Player body
    const geometry = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    const material = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(geometry, material);
    body.position.y = 0.8;
    group.add(body);
    
    return group;
  }

  createTestEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    
    // Test cubes
    for (let i = 0; i < 20; i++) {
      const size = 1 + Math.random() * 2;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshLambertMaterial({
        color: Math.random() * 0xffffff
      });
      const cube = new THREE.Mesh(geometry, material);
      
      cube.position.x = (Math.random() - 0.5) * 50;
      cube.position.y = size / 2;
      cube.position.z = (Math.random() - 0.5) * 50;
      
      this.scene.add(cube);
    }
  }

  update() {
    if (this.controls.isLocked) {
      const speed = 0.1;
      const direction = new THREE.Vector3();
      
      if (this.keys.forward) direction.z -= speed;
      if (this.keys.backward) direction.z += speed;
      if (this.keys.left) direction.x -= speed;
      if (this.keys.right) direction.x += speed;
      
      // Apply camera direction to movement
      direction.applyQuaternion(this.camera.quaternion);
      direction.y = 0; // Keep movement on xz plane
      
      // Update camera position
      this.camera.position.add(direction);
      
      // Update player position and emit to server
      if (this.player) {
        this.player.position.copy(this.camera.position);
        this.player.position.y -= 1.6; // Adjust for camera height
        
        this.socket.emit('player_move', {
          position: {
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z
          }
        });
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Add styles
const style = document.createElement('style');
style.textContent = `
  body { margin: 0; overflow: hidden; }
  #overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .instructions {
    background-color: #fff;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  }
`;
document.head.appendChild(style);

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new GameClient();
});