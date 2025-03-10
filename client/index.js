import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import io from 'socket.io-client';
import { GameClient as VoxelGameClient } from './game/index';
import { ChatSystem } from './game/chat-system';
import { GameNetwork } from './game/network';
import './app.js';

class GameClient {
  constructor() {
    // Core game systems
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Networking
    this.socket = null;
    this.network = null;
    this.chatSystem = null;
    
    // State management
    this.connectionState = {
      isConnected: false,
      token: null,
      characterId: null
    };
    
    // Initialize loading screen
    this.initializeLoadingScreen();
    
    // Start authentication flow
    this.initializeAuthentication();
  }
  
  initializeLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    
    this.updateLoadingStatus = (message, progress = 0) => {
      if (loadingText) loadingText.textContent = message;
      if (loadingProgress) {
        loadingProgress.style.width = `${progress}%`;
      }
    };
  }
  
  initializeAuthentication() {
    // Check for existing authentication
    const token = localStorage.getItem('token');
    const characterId = localStorage.getItem('characterId');
    
    if (token && characterId) {
      this.connectionState.token = token;
      this.connectionState.characterId = characterId;
      this.connectToGameServer();
    } else {
      this.showLoginScreen();
    }
  }
  
  showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const loginButton = document.getElementById('login-button');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    
    loginButton.addEventListener('click', async () => {
      try {
        const response = await this.authenticateUser(
          usernameInput.value, 
          passwordInput.value
        );
        
        if (response.token) {
          localStorage.setItem('token', response.token);
          this.connectionState.token = response.token;
          this.showCharacterSelection(response.accountId);
        }
      } catch (error) {
        loginError.textContent = error.message || 'Login failed';
      }
    });
  }
  
  async authenticateUser(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }
  
  showCharacterSelection(accountId) {
    const loginScreen = document.getElementById('login-screen');
    const characterScreen = document.getElementById('character-screen');
    const characterList = document.getElementById('character-list');
    const selectCharacterButton = document.getElementById('select-character-button');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (characterScreen) characterScreen.style.display = 'flex';
    
    this.fetchCharacters(accountId)
      .then(characters => {
        characterList.innerHTML = characters.map(character => `
          <div class="character-card" data-character-id="${character.character_id}">
            <h3>${character.name}</h3>
            <p>Class: ${character.class}</p>
            <p>Level: ${character.level}</p>
          </div>
        `).join('');
        
        // Character selection handling
        characterList.addEventListener('click', (e) => {
          const card = e.target.closest('.character-card');
          if (card) {
            characterList.querySelectorAll('.character-card').forEach(c => 
              c.classList.remove('selected')
            );
            card.classList.add('selected');
          }
        });
        
        selectCharacterButton.addEventListener('click', () => {
          const selectedCharacter = characterList.querySelector('.selected');
          if (selectedCharacter) {
            const characterId = selectedCharacter.dataset.characterId;
            localStorage.setItem('characterId', characterId);
            this.connectionState.characterId = characterId;
            this.connectToGameServer();
          }
        });
      });
  }
  
  async fetchCharacters(accountId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/characters', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      
      const data = await response.json();
      return data.characters;
    } catch (error) {
      console.error('Character fetch error:', error);
      throw error;
    }
  }
  
  connectToGameServer() {
      this.updateLoadingStatus('Connecting to game server...', 50);
      
      // First ensure we have authentication credentials
      if (!this.connectionState.token || !this.connectionState.characterId) {
        console.error('Authentication credentials required');
        this.updateLoadingStatus('Authentication failed. Please log in again.', 0);
        return;
      }
      
      // Configure socket connection
      this.socket = io({
        path: '/socket.io',
        auth: {
          token: this.connectionState.token,
          characterId: this.connectionState.characterId
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Connect to world server
      this.network = new GameNetwork(this);
      this.network.connect(
        this.connectionState.token,
        this.connectionState.characterId
      );
      
      // Socket event handlers
      this.setupSocketEventHandlers();
    }
  
  setupSocketEventHandlers() {
    this.socket.on('connect', () => {
      this.updateLoadingStatus('Connected. Joining world...', 75);
      this.connectionState.isConnected = true;
      
      // Join world with initial character data
      this.socket.emit('join_world', {
        characterId: this.connectionState.characterId,
        position: { x: 0, y: 2, z: 0 }
      });
    });
    
    this.socket.on('world_state', (worldData) => {
      this.updateLoadingStatus('World loaded. Initializing game...', 90);
      this.initializeGameWorld(worldData);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleConnectionError(error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.handleDisconnection(reason);
    });
  }
  
  initializeGameWorld(worldData) {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    // Initialize game systems
    this.network = new GameNetwork(this);
    this.chatSystem = new ChatSystem(this.network);
    
    // Start game client
    new VoxelGameClient();
  }
  
  handleConnectionError(error) {
    this.updateLoadingStatus('Connection failed. Retrying...', 25);
    
    // Optionally show error to user
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <h2>Connection Error</h2>
        <p>${error.message || 'Unable to connect to game server'}</p>
        <button onclick="window.location.reload()">Retry</button>
      `;
    }
  }
  
  handleDisconnection(reason) {
    console.warn('Disconnected from game server:', reason);
    
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <h2>Disconnected</h2>
        <p>Reason: ${reason}</p>
        <button onclick="window.location.reload()">Reconnect</button>
      `;
    }
  }
}

// Initialize game client when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gameClient = new GameClient();
});