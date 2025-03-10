// client/ui/index.js
import { GameUI } from './game-ui';
import { ChatUI } from './chat-ui';
import { InventoryUI } from './inventory-ui';
import { PartyUI } from './party-ui';

export class UI {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.gameUI = null;
    this.loadingScreen = null;
    this.loginScreen = null;
    this.characterScreen = null;
    
    // Initialize UI
    this.initialize();
  }

  initialize() {
    // Create loading screen UI
    this.initLoadingScreen();
    
    // Create login and character screens
    this.initLoginScreen();
    this.initCharacterScreen();
    
    // Listen for player state changes 
    this.setupEventListeners();
  }

  initLoadingScreen() {
    // Get existing loading screen from HTML
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingProgress = document.getElementById('loading-progress');
    this.loadingText = document.getElementById('loading-text');
    
    if (!this.loadingScreen) {
      // Create loading screen if not found in HTML
      this.loadingScreen = document.createElement('div');
      this.loadingScreen.id = 'loading-screen';
      this.loadingScreen.innerHTML = `
        <h1>Voxel Dungeon Crawler</h1>
        <div id="loading-bar">
          <div id="loading-progress"></div>
        </div>
        <p id="loading-text">Loading...</p>
      `;
      document.body.appendChild(this.loadingScreen);
      
      this.loadingProgress = document.getElementById('loading-progress');
      this.loadingText = document.getElementById('loading-text');
    }
  }

  initLoginScreen() {
    // Get existing login screen from HTML
    this.loginScreen = document.getElementById('login-screen');
    
    if (!this.loginScreen) {
      // Create login screen if not found in HTML
      this.loginScreen = document.createElement('div');
      this.loginScreen.id = 'login-screen';
      this.loginScreen.innerHTML = `
        <div class="form-container">
          <h2>Login</h2>
          <div class="tabs">
            <div class="tab active" data-tab="login">Login</div>
            <div class="tab" data-tab="register">Register</div>
          </div>
          <div class="tab-content active" id="login-tab">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" placeholder="Enter username">
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" placeholder="Enter password">
            </div>
            <button class="button" id="login-button">Login</button>
            <p id="login-error" style="color: red; margin-top: 10px;"></p>
          </div>
          <div class="tab-content" id="register-tab">
            <div class="form-group">
              <label for="reg-username">Username</label>
              <input type="text" id="reg-username" placeholder="Choose a username">
            </div>
            <div class="form-group">
              <label for="reg-email">Email</label>
              <input type="email" id="reg-email" placeholder="Enter your email">
            </div>
            <div class="form-group">
              <label for="reg-password">Password</label>
              <input type="password" id="reg-password" placeholder="Choose a password">
            </div>
            <div class="form-group">
              <label for="reg-confirm">Confirm Password</label>
            </div>`
    }
}
}