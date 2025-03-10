// client/auth/ConnectionManager.js
import { AuthManager } from './AuthManager';
import { CharacterManager } from './CharacterManager';
import { GameClient } from '../game/index';

export class ConnectionManager {
  constructor() {
    this.gameClient = null;
    this.authManager = new AuthManager();
    this.characterManager = new CharacterManager(this.authManager);
    
    // Setup callbacks
    this.authManager.setAuthStateChangedCallback(this.handleAuthStateChanged.bind(this));
    this.characterManager.setCharacterSelectedCallback(this.handleCharacterSelected.bind(this));
    
    // UI element references
    this.loadingScreen = null;
    this.loginScreen = null;
    this.characterScreen = null;

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the connection manager
   */
  initialize() {
    // Get UI elements
    this.loadingScreen = document.getElementById('loading-screen');
    this.loginScreen = document.getElementById('login-screen');
    this.characterScreen = document.getElementById('character-screen');
    
    // Setup UI event listeners
    this.setupLoginUI();
    this.setupCharacterUI();
    
    // Check authentication state and proceed accordingly
    this.checkAuthState();
  }

  /**
   * Check the current authentication state and proceed accordingly
   */
  async checkAuthState() {
    this.updateLoadingStatus('Checking authentication...', 10);
    
    if (this.authManager.isLoggedIn()) {
      // User is authenticated, proceed to character selection
      await this.showCharacterSelection();
    } else {
      // User is not authenticated, show login screen
      this.showLoginScreen();
    }
  }

  /**
   * Handle authentication state changes
   * @param {boolean} isAuthenticated 
   */
  async handleAuthStateChanged(isAuthenticated) {
    if (isAuthenticated) {
      // User just logged in, show character selection
      await this.showCharacterSelection();
    } else {
      // User logged out, show login screen
      this.showLoginScreen();
      
      // Destroy game client if it exists
      if (this.gameClient) {
        // Clean up game client resources
        this.gameClient = null;
      }
    }
  }

  /**
   * Handle character selection
   * @param {Object} character 
   */
  handleCharacterSelected(character) {
    // Character was selected, start the game
    this.startGame();
  }

  /**
   * Show the login screen
   */
  showLoginScreen() {
    if (this.loadingScreen) this.loadingScreen.style.display = 'none';
    if (this.characterScreen) this.characterScreen.style.display = 'none';
    if (this.loginScreen) this.loginScreen.style.display = 'flex';
  }

  /**
   * Show the character selection screen
   */
  async showCharacterSelection() {
    try {
      this.updateLoadingStatus('Loading characters...', 60);
      
      // Fetch characters
      await this.characterManager.fetchCharacters();
      
      // In the background, fetch classes and birthstones for character creation
      this.characterManager.fetchClasses();
      this.characterManager.fetchBirthstones();
      
      // If a character was previously selected, proceed to game
      if (this.characterManager.getSelectedCharacter()) {
        this.startGame();
        return;
      }
      
      // Hide other screens
      if (this.loadingScreen) this.loadingScreen.style.display = 'none';
      if (this.loginScreen) this.loginScreen.style.display = 'none';
      
      // Show character screen
      if (this.characterScreen) {
        this.characterScreen.style.display = 'flex';
        
        // Update character list UI
        this.updateCharacterListUI();
      }
    } catch (error) {
      console.error('Error showing character selection:', error);
      this.showLoginScreen();
    }
  }

  /**
   * Start the game with the selected character
   */
  startGame() {
    const character = this.characterManager.getSelectedCharacter();
    
    if (!character) {
      console.error('No character selected');
      this.showCharacterSelection();
      return;
    }
    
    this.updateLoadingStatus('Starting game...', 90);
    
    try {
      // Hide screens
      if (this.loginScreen) this.loginScreen.style.display = 'none';
      if (this.characterScreen) this.characterScreen.style.display = 'none';
      
      // Create game client if it doesn't exist
      if (!this.gameClient) {
        this.gameClient = new GameClient();
      }
      
      // Pass authentication credentials to game client
      this.gameClient.connectionState = {
        isConnected: false,
        token: this.authManager.getToken(),
        characterId: character.character_id
      };
      
      // Connect to game server
      this.gameClient.connectToGameServer();
      
      // Hide loading screen when game is ready
      setTimeout(() => {
        if (this.loadingScreen) this.loadingScreen.style.display = 'none';
      }, 1000);
    } catch (error) {
      console.error('Error starting game:', error);
      this.updateLoadingStatus('Failed to start game', 0);
    }
  }

  /**
   * Set up login screen UI interactions
   */
  setupLoginUI() {
    if (!this.loginScreen) return;
    
    // Tab switching
    const loginTabs = this.loginScreen.querySelectorAll('.tab');
    loginTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        loginTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all tab content
        const tabContents = this.loginScreen.querySelectorAll('.tab-content');
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Show selected tab content
        const tabName = tab.getAttribute('data-tab');
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) tabContent.classList.add('active');
      });
    });
    
    // Login button
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        
        // Validate input
        if (!username || !password) {
          if (loginError) loginError.textContent = 'Please enter username and password';
          return;
        }
        
        // Disable button during login
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        
        // Attempt login
        const result = await this.authManager.login(username, password);
        
        // Re-enable button
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
        
        // Handle result
        if (!result.success) {
          if (loginError) loginError.textContent = result.error || 'Login failed';
        }
      });
    }
    
    // Register button
    const registerButton = document.getElementById('register-button');
    if (registerButton) {
      registerButton.addEventListener('click', async () => {
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;
        const registerError = document.getElementById('register-error');
        
        // Validate input
        if (!username || !email || !password) {
          if (registerError) registerError.textContent = 'Please fill all required fields';
          return;
        }
        
        if (password !== confirmPassword) {
          if (registerError) registerError.textContent = 'Passwords do not match';
          return;
        }
        
        // Disable button during registration
        registerButton.disabled = true;
        registerButton.textContent = 'Registering...';
        
        // Attempt registration
        const result = await this.authManager.register(username, email, password);
        
        // Re-enable button
        registerButton.disabled = false;
        registerButton.textContent = 'Register';
        
        // Handle result
        if (!result.success) {
          if (registerError) registerError.textContent = result.error || 'Registration failed';
        }
      });
    }
  }

  /**
   * Set up character screen UI interactions
   */
  setupCharacterUI() {
    if (!this.characterScreen) return;
    
    // Tab switching
    const characterTabs = this.characterScreen.querySelectorAll('.tab');
    characterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        characterTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all tab content
        const tabContents = this.characterScreen.querySelectorAll('.tab-content');
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Show selected tab content
        const tabName = tab.getAttribute('data-tab');
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) tabContent.classList.add('active');
      });
    });
    
    // Select character button
    const selectCharacterButton = document.getElementById('select-character-button');
    if (selectCharacterButton) {
      selectCharacterButton.addEventListener('click', () => {
        const characterList = document.getElementById('character-list');
        const selectedCharacter = characterList.querySelector('.character-card.selected');
        const selectError = document.getElementById('select-error');
        
        if (!selectedCharacter) {
          if (selectError) selectError.textContent = 'Please select a character';
          return;
        }
        
        const characterId = selectedCharacter.getAttribute('data-character-id');
        const result = this.characterManager.selectCharacter(characterId);
        
        if (!result.success) {
          if (selectError) selectError.textContent = result.error || 'Failed to select character';
        }
      });
    }
    
    // Create character button
    const createCharacterButton = document.getElementById('create-character-button');
    if (createCharacterButton) {
      createCharacterButton.addEventListener('click', async () => {
        const charName = document.getElementById('char-name').value;
        const charClass = document.getElementById('char-class').value;
        const birthstoneOne = document.getElementById('birthstone-one').value;
        const birthstoneTwo = document.getElementById('birthstone-two').value;
        const createError = document.getElementById('create-error');
        
        // Validate input
        if (!charName || !charClass || !birthstoneOne || !birthstoneTwo) {
          if (createError) createError.textContent = 'Please fill all required fields';
          return;
        }
        
        // Disable button during creation
        createCharacterButton.disabled = true;
        createCharacterButton.textContent = 'Creating...';
        
        // Attempt character creation
        const result = await this.characterManager.createCharacter({
          name: charName,
          class: charClass,
          birthstoneOne: birthstoneOne,
          birthstoneTwo: birthstoneTwo
        });
        
        // Re-enable button
        createCharacterButton.disabled = false;
        createCharacterButton.textContent = 'Create Character';
        
        // Handle result
        if (!result.success) {
          if (createError) createError.textContent = result.error || 'Failed to create character';
        } else {
          // Update character list with new character
          this.updateCharacterListUI();
          
          // Switch to select tab
          const selectTab = this.characterScreen.querySelector('.tab[data-tab="select"]');
          if (selectTab) selectTab.click();
        }
      });
    }
  }

  /**
   * Update the character list in the UI
   */
  updateCharacterListUI() {
    const characterList = document.getElementById('character-list');
    if (!characterList) return;
    
    // Clear current list
    characterList.innerHTML = '';
    
    // Get characters from character manager
    const characters = this.characterManager.characters;
    
    if (characters.length === 0) {
      characterList.innerHTML = '<div class="no-characters-message">No characters found. Create a new character to start playing.</div>';
      return;
    }
    
    // Add each character to the list
    characters.forEach(character => {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.setAttribute('data-character-id', character.character_id);
      
      card.innerHTML = `
        <h3>${character.name}</h3>
        <p>Class: ${character.class}</p>
        <p>Level: ${character.level}</p>
      `;
      
      // Add click handler
      card.addEventListener('click', () => {
        // Remove selection from all cards
        characterList.querySelectorAll('.character-card').forEach(c => 
          c.classList.remove('selected')
        );
        
        // Add selection to clicked card
        card.classList.add('selected');
      });
      
      characterList.appendChild(card);
    });
  }

  /**
   * Update the loading status display
   * @param {string} message 
   * @param {number} progress 
   */
  updateLoadingStatus(message, progress = 0) {
    const loadingText = document.getElementById('loading-text');
    const loadingProgress = document.getElementById('loading-progress');
    
    if (loadingText) loadingText.textContent = message;
    if (loadingProgress) loadingProgress.style.width = `${progress}%`;
    
    // Show loading screen
    if (this.loadingScreen) this.loadingScreen.style.display = 'flex';
  }

  /**
   * Logout the current user
   */
  logout() {
    this.authManager.logout();
    this.characterManager.clearSelectedCharacter();
    
    // Show login screen
    this.showLoginScreen();
  }
}