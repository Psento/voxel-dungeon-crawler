// client/ui/game-ui.js
import { ChatUI } from './chat-ui';
import { InventoryUI } from './inventory-ui';
import { PartyUI } from './party-ui';

export class GameUI {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.container = null;
    this.chatUI = null;
    this.inventoryUI = null;
    this.partyUI = null;
    
    // UI state
    this.showingHUD = true;
    this.showingInventory = false;
    this.showingPartyMenu = false;
    this.showingDeathScreen = false;
    
    // Initialize UI
    this.initialize();
  }

  initialize() {
    // Create main UI container
    this.container = document.createElement('div');
    this.container.className = 'game-ui';
    document.body.appendChild(this.container);
    
    // Create HUD
    this.createHUD();
    
    // Create overlay UI elements
    this.createOverlays();
    
    // Create child UI components
    this.createChildComponents();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add CSS styles
    this.addStyles();
  }

  createHUD() {
    // Create HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'hud-container';
    this.container.appendChild(this.hudContainer);
    
    // Create health bar
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'health-bar';
    this.healthBar.innerHTML = `
      <div class="health-label">Health</div>
      <div class="health-bar-outer">
        <div class="health-bar-inner"></div>
      </div>
      <div class="health-text">100/100</div>
    `;
    this.hudContainer.appendChild(this.healthBar);
    
    // Create energy bar
    this.energyBar = document.createElement('div');
    this.energyBar.className = 'energy-bar';
    this.energyBar.innerHTML = `
      <div class="energy-label">Energy</div>
      <div class="energy-bar-outer">
        <div class="energy-bar-inner"></div>
      </div>
      <div class="energy-text">100/100</div>
    `;
    this.hudContainer.appendChild(this.energyBar);
    
    // Create XP bar
    this.xpBar = document.createElement('div');
    this.xpBar.className = 'xp-bar';
    this.xpBar.innerHTML = `
      <div class="xp-bar-outer">
        <div class="xp-bar-inner"></div>
      </div>
      <div class="xp-text">Level 1 - 0/1000 XP</div>
    `;
    this.hudContainer.appendChild(this.xpBar);
    
    // Create ability icons
    this.abilityContainer = document.createElement('div');
    this.abilityContainer.className = 'ability-container';
    
    // Create 3 ability slots (left click, ability 1, ability 2, ultimate)
    const abilityTypes = ['attack', 'ability1', 'ability2', 'ultimate'];
    const abilityKeys = ['LMB', '1', '2', '3'];
    
    this.abilitySlots = {};
    
    abilityTypes.forEach((type, index) => {
      const slot = document.createElement('div');
      slot.className = `ability-slot ${type}`;
      slot.innerHTML = `
        <div class="ability-key">${abilityKeys[index]}</div>
        <div class="ability-icon"></div>
        <div class="ability-cooldown" style="display: none;"></div>
      `;
      this.abilityContainer.appendChild(slot);
      this.abilitySlots[type] = slot;
    });
    
    this.hudContainer.appendChild(this.abilityContainer);
    
    // Create flask icons
    this.flaskContainer = document.createElement('div');
    this.flaskContainer.className = 'flask-container';
    
    // Create health and energy flask slots
    const flaskTypes = ['health', 'energy'];
    const flaskKeys = ['F', 'V'];
    
    this.flaskSlots = {};
    
    flaskTypes.forEach((type, index) => {
      const slot = document.createElement('div');
      slot.className = `flask-slot ${type}`;
      slot.innerHTML = `
        <div class="flask-key">${flaskKeys[index]}</div>
        <div class="flask-icon"></div>
        <div class="flask-charges">3</div>
        <div class="flask-cooldown" style="display: none;"></div>
      `;
      this.flaskContainer.appendChild(slot);
      this.flaskSlots[type] = slot;
    });
    
    this.hudContainer.appendChild(this.flaskContainer);
    
    // Create minimap
    this.minimap = document.createElement('div');
    this.minimap.className = 'minimap';
    this.minimap.innerHTML = `
      <div class="minimap-label">Map</div>
      <div class="minimap-content"></div>
    `;
    this.hudContainer.appendChild(this.minimap);
    
    // Create return to hub indicator
    this.returnIndicator = document.createElement('div');
    this.returnIndicator.className = 'return-indicator';
    this.returnIndicator.innerHTML = `
      <div class="return-key">R</div>
      <div class="return-text">Hold to Return</div>
      <div class="return-progress"></div>
    `;
    this.returnIndicator.style.display = 'none';
    this.hudContainer.appendChild(this.returnIndicator);
  }

  createOverlays() {
    // Create death screen overlay
    this.deathScreen = document.createElement('div');
    this.deathScreen.className = 'death-screen';
    this.deathScreen.innerHTML = `
      <div class="death-message">You have died</div>
      <button class="respawn-button">Respawn</button>
    `;
    this.deathScreen.style.display = 'none';
    this.container.appendChild(this.deathScreen);
    
    // Create level up overlay
    this.levelUpScreen = document.createElement('div');
    this.levelUpScreen.className = 'level-up-screen';
    this.levelUpScreen.innerHTML = `
      <div class="level-up-message">Level Up!</div>
      <div class="level-up-level">Level 2</div>
    `;
    this.levelUpScreen.style.display = 'none';
    this.container.appendChild(this.levelUpScreen);
    
    // Create dungeon completed overlay
    this.dungeonCompletedScreen = document.createElement('div');
    this.dungeonCompletedScreen.className = 'dungeon-completed-screen';
    this.dungeonCompletedScreen.innerHTML = `
      <div class="dungeon-completed-message">Dungeon Complete!</div>
      <div class="dungeon-rewards">
        <div class="reward-title">Rewards:</div>
        <div class="reward-list"></div>
      </div>
      <div class="dungeon-countdown">Returning to hub in 15 seconds...</div>
    `;
    this.dungeonCompletedScreen.style.display = 'none';
    this.container.appendChild(this.dungeonCompletedScreen);
    
    // Create notifications area
    this.notificationsArea = document.createElement('div');
    this.notificationsArea.className = 'notifications-area';
    this.container.appendChild(this.notificationsArea);
    
    // Create crosshair
    this.crosshair = document.createElement('div');
    this.crosshair.className = 'crosshair';
    this.container.appendChild(this.crosshair);
  }

  createChildComponents() {
    // Initialize sub-components
    if (this.gameClient.chatSystem) {
      this.chatUI = new ChatUI(this.gameClient.chatSystem, this);
    }
    
    this.inventoryUI = new InventoryUI(this.gameClient, this);
    this.partyUI = new PartyUI(this.gameClient, this);
  }

  setupEventListeners() {
    // Listen for player state changes
    if (this.gameClient.player) {
      // Update UI when player stats change
      this.updatePlayerStats();
      
      // Setup timer to periodically update UI
      setInterval(() => {
        this.updatePlayerStats();
        this.updateCooldowns();
      }, 100);
    }
    
    // Button event listeners
    const respawnButton = this.deathScreen.querySelector('.respawn-button');
    if (respawnButton) {
      respawnButton.addEventListener('click', () => {
        if (this.gameClient.player) {
          this.gameClient.player.respawn();
        }
      });
    }
    
    // Key event listeners are set in game client
  }

  addStyles() {
    // Add CSS styles for the UI
    const style = document.createElement('style');
    style.textContent = `
      .game-ui {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        font-family: Arial, sans-serif;
      }
      
      .hud-container {
        position: absolute;
        bottom: 20px;
        left: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        pointer-events: none;
      }
      
      /* Health and Energy Bars */
      .health-bar, .energy-bar {
        margin-bottom: 5px;
        display: flex;
        align-items: center;
      }
      
      .health-label, .energy-label {
        width: 60px;
        color: white;
        text-shadow: 1px 1px 2px black;
      }
      
      .health-bar-outer, .energy-bar-outer {
        flex-grow: 1;
        height: 20px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
        margin: 0 10px;
        overflow: hidden;
      }
      
      .health-bar-inner {
        height: 100%;
        width: 100%;
        background-color: #ff3333;
        border-radius: 10px;
        transition: width 0.3s;
      }
      
      .energy-bar-inner {
        height: 100%;
        width: 100%;
        background-color: #3333ff;
        border-radius: 10px;
        transition: width 0.3s;
      }
      
      .health-text, .energy-text {
        width: 80px;
        text-align: right;
        color: white;
        text-shadow: 1px 1px 2px black;
      }
      
      /* XP Bar */
      .xp-bar {
        margin-bottom: 10px;
      }
      
      .xp-bar-outer {
        width: 100%;
        height: 10px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        overflow: hidden;
      }
      
      .xp-bar-inner {
        height: 100%;
        width: 0%;
        background-color: #ffff33;
        border-radius: 5px;
        transition: width 0.3s;
      }
      
      .xp-text {
        text-align: center;
        color: white;
        text-shadow: 1px 1px 2px black;
        font-size: 12px;
        margin-top: 2px;
      }
      
      /* Ability Icons */
      .ability-container {
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
      }
      
      .ability-slot {
        width: 60px;
        height: 60px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        margin: 0 5px;
        position: relative;
        border: 1px solid #666;
      }
      
      .ability-key {
        position: absolute;
        top: -10px;
        right: -10px;
        background-color: #444;
        color: white;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 12px;
        border: 1px solid #666;
      }
      
      .ability-icon {
        width: 100%;
        height: 100%;
        background-size: cover;
        border-radius: 4px;
      }
      
      .ability-cooldown {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
      }
      
      /* Flask Icons */
      .flask-container {
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
      }
      
      .flask-slot {
        width: 50px;
        height: 50px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        margin: 0 5px;
        position: relative;
        border: 1px solid #666;
      }
      
      .flask-key {
        position: absolute;
        top: -10px;
        right: -10px;
        background-color: #444;
        color: white;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 12px;
        border: 1px solid #666;
      }
      
      .flask-icon {
        width: 100%;
        height: 100%;
        background-size: cover;
        border-radius: 4px;
      }
      
      .health .flask-icon {
        background-color: #ff3333;
      }
      
      .energy .flask-icon {
        background-color: #3333ff;
      }
      
      .flask-charges {
        position: absolute;
        bottom: -10px;
        right: -10px;
        background-color: #444;
        color: white;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 12px;
        border: 1px solid #666;
      }
      
      .flask-cooldown {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      }
      
      /* Minimap */
      .minimap {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 200px;
        height: 200px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        border: 1px solid #666;
      }
      
      .minimap-label {
        text-align: center;
        color: white;
        font-size: 12px;
        padding: 2px;
        border-bottom: 1px solid #666;
      }
      
      .minimap-content {
        width: 100%;
        height: calc(100% - 20px);
        position: relative;
      }
      
      /* Return to Hub Indicator */
      .return-indicator {
        position: absolute;
        top: 20px;
        left: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #666;
        display: flex;
        align-items: center;
      }
      
      .return-key {
        background-color: #444;
        padding: 2px 5px;
        border-radius: 3px;
        margin-right: 10px;
        border: 1px solid #666;
      }
      
      .return-text {
        margin-right: 10px;
      }
      
      .return-progress {
        width: 100px;
        height: 5px;
        background-color: #333;
        border-radius: 3px;
        overflow: hidden;
        position: relative;
      }
      
      .return-progress::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0%;
        background-color: #00ffff;
        border-radius: 3px;
        transition: width 0.1s linear;
      }
      
      /* Death Screen */
      .death-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(80, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
      }
      
      .death-message {
        color: white;
        font-size: 40px;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px black;
      }
      
      .respawn-button {
        background-color: #ff3333;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 20px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      
      .respawn-button:hover {
        background-color: #ff6666;
      }
      
      /* Level Up Screen */
      .level-up-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 80, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        pointer-events: none;
      }
      
      .level-up-message {
        color: #ffff33;
        font-size: 40px;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px black;
      }
      
      .level-up-level {
        color: white;
        font-size: 30px;
        text-shadow: 2px 2px 4px black;
      }
      
      /* Dungeon Completed Screen */
      .dungeon-completed-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 80, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
      }
      
      .dungeon-completed-message {
        color: #ffff33;
        font-size: 40px;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px black;
      }
      
      .dungeon-rewards {
        background-color: rgba(0, 0, 0, 0.7);
        padding: 20px;
        border-radius: 5px;
        margin-bottom: 20px;
        max-width: 400px;
        width: 100%;
      }
      
      .reward-title {
        color: white;
        font-size: 20px;
        margin-bottom: 10px;
        text-align: center;
        text-shadow: 1px 1px 2px black;
      }
      
      .reward-list {
        color: white;
      }
      
      .dungeon-countdown {
        color: white;
        font-size: 20px;
        text-shadow: 1px 1px 2px black;
      }
      
      /* Notifications Area */
      .notifications-area {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 400px;
      }
      
      .notification {
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 10px;
        border: 1px solid #666;
        transition: opacity 0.3s;
      }
      
      /* Crosshair */
      .crosshair {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        pointer-events: none;
      }
      
      .crosshair::before, .crosshair::after {
        content: '';
        position: absolute;
        background-color: white;
      }
      
      .crosshair::before {
        top: 9px;
        left: 0;
        width: 20px;
        height: 2px;
      }
      
      .crosshair::after {
        top: 0;
        left: 9px;
        width: 2px;
        height: 20px;
      }
    `;
    
    document.head.appendChild(style);
  }

  updatePlayerStats() {
    if (!this.gameClient.player) return;
    
    const player = this.gameClient.player;
    
    // Update health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    const healthBar = this.healthBar.querySelector('.health-bar-inner');
    const healthText = this.healthBar.querySelector('.health-text');
    
    healthBar.style.width = `${healthPercent}%`;
    healthText.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
    
    // Update energy bar
    const energyPercent = (player.energy / player.maxEnergy) * 100;
    const energyBar = this.energyBar.querySelector('.energy-bar-inner');
    const energyText = this.energyBar.querySelector('.energy-text');
    
    energyBar.style.width = `${energyPercent}%`;
    energyText.textContent = `${Math.floor(player.energy)}/${player.maxEnergy}`;
    
    // Update XP bar
    const xpPercent = (player.experience / player.experienceToLevel) * 100;
    const xpBar = this.xpBar.querySelector('.xp-bar-inner');
    const xpText = this.xpBar.querySelector('.xp-text');
    
    xpBar.style.width = `${xpPercent}%`;
    xpText.textContent = `Level ${player.level} - ${player.experience}/${player.experienceToLevel} XP`;
    
    // Update flask charges
    if (player.flasks) {
      const healthCharges = this.flaskSlots.health.querySelector('.flask-charges');
      const energyCharges = this.flaskSlots.energy.querySelector('.flask-charges');
      
      healthCharges.textContent = player.flasks.health.charges;
      energyCharges.textContent = player.flasks.energy.charges;
    }
    
    // Update ability icons
    if (player.abilities) {
      // Basic attack
      const attackIcon = this.abilitySlots.attack.querySelector('.ability-icon');
      attackIcon.style.backgroundColor = player.class === 'Warrior' ? '#ff6666' :
                                        player.class === 'Mage' ? '#6666ff' :
                                        player.class === 'Archer' ? '#66ff66' : '#ffff66';
      
      // Class abilities
      if (player.abilities.length >= 3) {
        // Ability 1
        const ability1Icon = this.abilitySlots.ability1.querySelector('.ability-icon');
        ability1Icon.style.backgroundColor = player.class === 'Warrior' ? '#ff6666' :
                                           player.class === 'Mage' ? '#6666ff' :
                                           player.class === 'Archer' ? '#66ff66' : '#ffff66';
        
        // Ability 2
        const ability2Icon = this.abilitySlots.ability2.querySelector('.ability-icon');
        ability2Icon.style.backgroundColor = player.class === 'Warrior' ? '#ff6666' :
                                           player.class === 'Mage' ? '#6666ff' :
                                           player.class === 'Archer' ? '#66ff66' : '#ffff66';
        
        // Ultimate
        const ultimateIcon = this.abilitySlots.ultimate.querySelector('.ability-icon');
        ultimateIcon.style.backgroundColor = player.class === 'Warrior' ? '#ff9999' :
                                            player.class === 'Mage' ? '#9999ff' :
                                            player.class === 'Archer' ? '#99ff99' : '#ffff99';
      }
    }
  }

  updateCooldowns() {
    if (!this.gameClient.player) return;
    
    const player = this.gameClient.player;
    
    // Update ability cooldowns
    if (player.cooldowns) {
      // Ability 1
      const ability1Cooldown = this.abilitySlots.ability1.querySelector('.ability-cooldown');
      if (player.cooldowns.ability1 > 0) {
        ability1Cooldown.style.display = 'flex';
        ability1Cooldown.textContent = Math.ceil(player.cooldowns.ability1);
      } else {
        ability1Cooldown.style.display = 'none';
      }
      
      // Ability 2
      const ability2Cooldown = this.abilitySlots.ability2.querySelector('.ability-cooldown');
      if (player.cooldowns.ability2 > 0) {
        ability2Cooldown.style.display = 'flex';
        ability2Cooldown.textContent = Math.ceil(player.cooldowns.ability2);
      } else {
        ability2Cooldown.style.display = 'none';
      }
      
      // Ultimate
      const ultimateCooldown = this.abilitySlots.ultimate.querySelector('.ability-cooldown');
      if (player.cooldowns.ultimate > 0) {
        ultimateCooldown.style.display = 'flex';
        ultimateCooldown.textContent = Math.ceil(player.cooldowns.ultimate);
      } else {
        ultimateCooldown.style.display = 'none';
      }
      
      // Health flask
      const healthFlaskCooldown = this.flaskSlots.health.querySelector('.flask-cooldown');
      if (player.cooldowns.healthFlask > 0) {
        healthFlaskCooldown.style.display = 'flex';
        healthFlaskCooldown.textContent = Math.ceil(player.cooldowns.healthFlask);
      } else {
        healthFlaskCooldown.style.display = 'none';
      }
      
      // Energy flask
      const energyFlaskCooldown = this.flaskSlots.energy.querySelector('.flask-cooldown');
      if (player.cooldowns.energyFlask > 0) {
        energyFlaskCooldown.style.display = 'flex';
        energyFlaskCooldown.textContent = Math.ceil(player.cooldowns.energyFlask);
      } else {
        energyFlaskCooldown.style.display = 'none';
      }
    }
    
    // Update return to hub progress
    if (player.isReturning) {
      const holdTime = (Date.now() - player.returnHoldStartTime) / 1000;
      const progress = Math.min(holdTime / 1.8, 1) * 100;
      
      this.returnIndicator.style.display = 'flex';
      this.returnIndicator.querySelector('.return-progress').style.setProperty('--progress', `${progress}%`);
      this.returnIndicator.querySelector('.return-progress').style.width = `${progress}%`;
    } else {
      this.returnIndicator.style.display = 'none';
    }
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.notificationsArea.appendChild(notification);
    
    // Fade in
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        this.notificationsArea.removeChild(notification);
      }, 300);
    }, duration);
  }

  showDeathScreen() {
    this.showingDeathScreen = true;
    this.deathScreen.style.display = 'flex';
  }

  hideDeathScreen() {
    this.showingDeathScreen = false;
    this.deathScreen.style.display = 'none';
  }

  showLevelUp(level) {
    // Update level
    this.levelUpScreen.querySelector('.level-up-level').textContent = `Level ${level}`;
    
    // Show level up screen
    this.levelUpScreen.style.display = 'flex';
    
    // Hide after 3 seconds
    setTimeout(() => {
      this.levelUpScreen.style.display = 'none';
    }, 3000);
  }

  showDungeonCompleted(rewards, countdown = 15) {
    // Update rewards list
    const rewardList = this.dungeonCompletedScreen.querySelector('.reward-list');
    rewardList.innerHTML = '';
    
    if (rewards && rewards.length > 0) {
      rewards.forEach(reward => {
        const rewardItem = document.createElement('div');
        rewardItem.className = 'reward-item';
        rewardItem.textContent = reward.name;
        rewardItem.style.color = this.getRarityColor(reward.rarity);
        rewardList.appendChild(rewardItem);
      });
    } else {
      rewardList.textContent = 'No rewards found.';
    }
    
    // Update countdown
    const countdownElement = this.dungeonCompletedScreen.querySelector('.dungeon-countdown');
    countdownElement.textContent = `Returning to hub in ${countdown} seconds...`;
    
    // Show screen
    this.dungeonCompletedScreen.style.display = 'flex';
    
    // Start countdown
    let timeLeft = countdown;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      countdownElement.textContent = `Returning to hub in ${timeLeft} seconds...`;
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        this.dungeonCompletedScreen.style.display = 'none';
      }
    }, 1000);
  }

  getRarityColor(rarity) {
    switch (rarity) {
      case 'common': return '#aaaaaa';
      case 'uncommon': return '#55ff55';
      case 'rare': return '#5555ff';
      case 'epic': return '#aa55ff';
      case 'legendary': return '#ffaa00';
      default: return '#ffffff';
    }
  }

  updateMinimap(playerPosition, mapData) {
    const minimapContent = this.minimap.querySelector('.minimap-content');
    
    // Clear existing content
    minimapContent.innerHTML = '';
    
    // Create player marker
    const playerMarker = document.createElement('div');
    playerMarker.className = 'minimap-player';
    playerMarker.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      background-color: #00ff00;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    minimapContent.appendChild(playerMarker);
    
    // Create direction indicator
    const directionIndicator = document.createElement('div');
    directionIndicator.className = 'minimap-direction';
    directionIndicator.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 8px solid #00ff00;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%) rotate(${this.gameClient.camera.rotation.y}rad);
      transform-origin: bottom center;
    `;
    minimapContent.appendChild(directionIndicator);
    
    // Add other elements if map data is provided
    if (mapData) {
      // Map tiles would be rendered here
      // Other players would be rendered here
      // Points of interest would be rendered here
    }
  }

  toggleHUD() {
    this.showingHUD = !this.showingHUD;
    this.hudContainer.style.display = this.showingHUD ? 'flex' : 'none';
  }

  showChatNotification(count) {
    // Create indicator if not exists
    if (!this.chatNotification) {
      this.chatNotification = document.createElement('div');
      this.chatNotification.className = 'chat-notification';
      this.chatNotification.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background-color: #ff3333;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 12px;
        pointer-events: none;
      `;
      this.container.appendChild(this.chatNotification);
    }
    
    // Update count
    this.chatNotification.textContent = count;
    this.chatNotification.style.display = 'flex';
  }

  hideChatNotification() {
    if (this.chatNotification) {
      this.chatNotification.style.display = 'none';
    }
  }

  showExperienceGained(amount) {
    this.showNotification(`+${amount} XP`, 'experience', 2000);
  }

  updateAbilityTooltip(index) {
    if (!this.gameClient.player || !this.gameClient.player.abilities) return;
    
    const ability = this.gameClient.player.abilities[index];
    if (!ability) return;
    
    // Create tooltip if not exists
    if (!this.abilityTooltip) {
      this.abilityTooltip = document.createElement('div');
      this.abilityTooltip.className = 'ability-tooltip';
      this.abilityTooltip.style.cssText = `
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #666;
        pointer-events: none;
        z-index: 1000;
        width: 200px;
      `;
      this.container.appendChild(this.abilityTooltip);
    }
    
    // Update tooltip content
    this.abilityTooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${ability.name}</div>
      <div style="margin-bottom: 5px;">${ability.description}</div>
      <div>Energy Cost: ${ability.energyCost}</div>
      <div>Cooldown: ${ability.cooldown}s</div>
    `;
    
    // Position tooltip
    const slotType = index === 0 ? 'ability1' : (index === 1 ? 'ability2' : 'ultimate');
    const slot = this.abilitySlots[slotType];
    const rect = slot.getBoundingClientRect();
    
    this.abilityTooltip.style.left = `${rect.left}px`;
    this.abilityTooltip.style.top = `${rect.top - this.abilityTooltip.offsetHeight - 10}px`;
    this.abilityTooltip.style.display = 'block';
  }

  hideAbilityTooltip() {
    if (this.abilityTooltip) {
      this.abilityTooltip.style.display = 'none';
    }
  }
}