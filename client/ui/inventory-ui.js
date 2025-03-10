// client/ui/inventory-ui.js
export class InventoryUI {
    constructor(gameClient, gameUI) {
      this.gameClient = gameClient;
      this.gameUI = gameUI;
      this.container = null;
      this.isVisible = false;
      this.selectedSlot = null;
      this.draggedItem = null;
      
      // Initialize UI
      this.initialize();
    }
  
    initialize() {
      // Create inventory container
      this.container = document.createElement('div');
      this.container.className = 'inventory-ui';
      this.container.style.display = 'none';
      
      // Create inventory structure
      this.createInventoryStructure();
      
      // Add to game UI
      this.gameUI.container.appendChild(this.container);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Add CSS styles
      this.addStyles();
    }
  
    createInventoryStructure() {
      this.container.innerHTML = `
        <div class="inventory-header">
          <h2>Inventory</h2>
          <button class="inventory-close-btn">×</button>
        </div>
        <div class="inventory-content">
          <div class="inventory-character">
            <div class="character-model"></div>
            <div class="character-stats">
              <div class="character-name">Character Name</div>
              <div class="character-level">Level 1</div>
              <div class="character-class">Warrior</div>
              <div class="character-stats-list">
                <div class="stat-item">Health: <span class="stat-value health">100</span></div>
                <div class="stat-item">Energy: <span class="stat-value energy">100</span></div>
                <div class="stat-item">Damage: <span class="stat-value damage">10</span></div>
                <div class="stat-item">Defense: <span class="stat-value defense">5</span></div>
              </div>
            </div>
            <div class="equipment-slots">
              <div class="equipment-slot head" data-slot="head"></div>
              <div class="equipment-slot chest" data-slot="chest"></div>
              <div class="equipment-slot hands" data-slot="hands"></div>
              <div class="equipment-slot feet" data-slot="feet"></div>
              <div class="equipment-slot mainhand" data-slot="mainhand"></div>
              <div class="equipment-slot offhand" data-slot="offhand"></div>
              <div class="equipment-slot neck" data-slot="neck"></div>
              <div class="equipment-slot finger" data-slot="finger"></div>
            </div>
          </div>
          <div class="inventory-items">
            <div class="inventory-tabs">
              <div class="inventory-tab active" data-tab="items">Items</div>
              <div class="inventory-tab" data-tab="abilities">Abilities</div>
              <div class="inventory-tab" data-tab="birthstones">Birthstones</div>
            </div>
            <div class="inventory-tab-content active" data-tab-content="items">
              <div class="inventory-grid">
                <!-- Inventory slots will be generated here -->
              </div>
            </div>
            <div class="inventory-tab-content" data-tab-content="abilities">
              <div class="abilities-list">
                <!-- Abilities will be listed here -->
              </div>
            </div>
            <div class="inventory-tab-content" data-tab-content="birthstones">
              <div class="birthstones-container">
                <div class="birthstone-slot">
                  <div class="birthstone-label">First Birthstone</div>
                  <div class="birthstone-value"></div>
                  <div class="birthstone-effect"></div>
                </div>
                <div class="birthstone-slot">
                  <div class="birthstone-label">Second Birthstone</div>
                  <div class="birthstone-value"></div>
                  <div class="birthstone-effect"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="item-details">
          <h3 class="item-name">No item selected</h3>
          <div class="item-description">Select an item to view details.</div>
          <div class="item-stats"></div>
          <div class="item-actions">
            <button class="item-action equip" style="display: none;">Equip</button>
            <button class="item-action unequip" style="display: none;">Unequip</button>
            <button class="item-action use" style="display: none;">Use</button>
            <button class="item-action drop" style="display: none;">Drop</button>
          </div>
        </div>
      `;
      
      // Generate inventory slots
      this.generateInventorySlots();
    }
  
    generateInventorySlots() {
      const inventoryGrid = this.container.querySelector('.inventory-grid');
      inventoryGrid.innerHTML = '';
      
      // Create 32 inventory slots (4 rows of 8)
      for (let i = 0; i < 32; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = i;
        inventoryGrid.appendChild(slot);
      }
    }
  
    setupEventListeners() {
      // Close button
      const closeBtn = this.container.querySelector('.inventory-close-btn');
      closeBtn.addEventListener('click', () => this.toggle(false));
      
      // Tab switching
      const tabs = this.container.querySelectorAll('.inventory-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Hide all tab content
          const tabContents = this.container.querySelectorAll('.inventory-tab-content');
          tabContents.forEach(tc => tc.classList.remove('active'));
          
          // Show selected tab content
          const tabContent = this.container.querySelector(`.inventory-tab-content[data-tab-content="${tab.dataset.tab}"]`);
          tabContent.classList.add('active');
        });
      });
      
      // Inventory slot selection
      const inventorySlots = this.container.querySelectorAll('.inventory-slot');
      inventorySlots.forEach(slot => {
        slot.addEventListener('click', () => {
          this.selectSlot(slot);
        });
        
        // Drag and drop functionality
        slot.addEventListener('dragstart', (e) => this.handleDragStart(e, slot));
        slot.addEventListener('dragover', (e) => this.handleDragOver(e, slot));
        slot.addEventListener('drop', (e) => this.handleDrop(e, slot));
        slot.addEventListener('dragend', () => this.handleDragEnd());
      });
      
      // Equipment slot selection
      const equipmentSlots = this.container.querySelectorAll('.equipment-slot');
      equipmentSlots.forEach(slot => {
        slot.addEventListener('click', () => {
          this.selectEquipmentSlot(slot);
        });
        
        // Drag and drop functionality
        slot.addEventListener('dragstart', (e) => this.handleDragStart(e, slot));
        slot.addEventListener('dragover', (e) => this.handleDragOver(e, slot));
        slot.addEventListener('drop', (e) => this.handleDrop(e, slot));
        slot.addEventListener('dragend', () => this.handleDragEnd());
      });
      
      // Item action buttons
      const equipBtn = this.container.querySelector('.item-action.equip');
      const unequipBtn = this.container.querySelector('.item-action.unequip');
      const useBtn = this.container.querySelector('.item-action.use');
      const dropBtn = this.container.querySelector('.item-action.drop');
      
      equipBtn.addEventListener('click', () => this.equipSelectedItem());
      unequipBtn.addEventListener('click', () => this.unequipSelectedItem());
      useBtn.addEventListener('click', () => this.useSelectedItem());
      dropBtn.addEventListener('click', () => this.dropSelectedItem());
      
      // Key binding for inventory toggle (typically 'I')
      document.addEventListener('keydown', (e) => {
        if (e.key === 'i' || e.key === 'I') {
          if (!this.isTyping()) {
            e.preventDefault();
            this.toggle();
          }
        }
        else if (e.key === 'Escape' && this.isVisible) {
          this.toggle(false);
        }
      });
    }
  
    isTyping() {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    }
  
    handleDragStart(e, slot) {
      // Start dragging an item
      if (!slot.dataset.itemId) return;
      
      this.draggedItem = {
        sourceSlot: slot,
        itemId: slot.dataset.itemId
      };
      
      e.dataTransfer.setData('text/plain', slot.dataset.itemId);
      e.dataTransfer.effectAllowed = 'move';
    }
  
    handleDragOver(e, slot) {
      // Allow dropping
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  
    handleDrop(e, slot) {
      // Drop item into slot
      e.preventDefault();
      
      if (!this.draggedItem) return;
      
      const sourceSlot = this.draggedItem.sourceSlot;
      const targetSlot = slot;
      
      // Check if target is an equipment slot
      if (targetSlot.classList.contains('equipment-slot')) {
        const slotType = targetSlot.dataset.slot;
        if (this.canEquipInSlot(this.draggedItem.itemId, slotType)) {
          this.equipItem(this.draggedItem.itemId, slotType);
        }
        return;
      }
      
      // Check if source is an equipment slot
      if (sourceSlot.classList.contains('equipment-slot')) {
        const slotType = sourceSlot.dataset.slot;
        this.unequipItem(this.draggedItem.itemId, slotType);
        return;
      }
      
      // Both are inventory slots, swap items
      this.swapItems(sourceSlot, targetSlot);
    }
  
    handleDragEnd() {
      this.draggedItem = null;
    }
  
    swapItems(sourceSlot, targetSlot) {
      // Swap items between two inventory slots
      const sourceItemId = sourceSlot.dataset.itemId;
      const targetItemId = targetSlot.dataset.itemId;
      
      // Get item indices
      const sourceIndex = parseInt(sourceSlot.dataset.index);
      const targetIndex = parseInt(targetSlot.dataset.index);
      
      // Update player inventory
      if (this.gameClient.player) {
        const inventory = this.gameClient.player.inventory;
        
        // Swap items in inventory array
        const temp = inventory[sourceIndex];
        inventory[sourceIndex] = inventory[targetIndex];
        inventory[targetIndex] = temp;
        
        // Update UI
        this.updateInventory();
      }
    }
  
    selectSlot(slot) {
      // Remove selection from all slots
      const allSlots = this.container.querySelectorAll('.inventory-slot, .equipment-slot');
      allSlots.forEach(s => s.classList.remove('selected'));
      
      // Add selection to clicked slot
      slot.classList.add('selected');
      this.selectedSlot = slot;
      
      // Show item details
      this.showItemDetails(slot.dataset.itemId);
    }
  
    selectEquipmentSlot(slot) {
      // Remove selection from all slots
      const allSlots = this.container.querySelectorAll('.inventory-slot, .equipment-slot');
      allSlots.forEach(s => s.classList.remove('selected'));
      
      // Add selection to clicked slot
      slot.classList.add('selected');
      this.selectedSlot = slot;
      
      // Show item details
      this.showItemDetails(slot.dataset.itemId);
    }
  
    showItemDetails(itemId) {
      const itemDetails = this.container.querySelector('.item-details');
      const itemName = itemDetails.querySelector('.item-name');
      const itemDescription = itemDetails.querySelector('.item-description');
      const itemStats = itemDetails.querySelector('.item-stats');
      const equipBtn = itemDetails.querySelector('.item-action.equip');
      const unequipBtn = itemDetails.querySelector('.item-action.unequip');
      const useBtn = itemDetails.querySelector('.item-action.use');
      const dropBtn = itemDetails.querySelector('.item-action.drop');
      
      // Hide all action buttons by default
      equipBtn.style.display = 'none';
      unequipBtn.style.display = 'none';
      useBtn.style.display = 'none';
      dropBtn.style.display = 'none';
      
      if (!itemId) {
        // No item selected
        itemName.textContent = 'No item selected';
        itemDescription.textContent = 'Select an item to view details.';
        itemStats.innerHTML = '';
        return;
      }
      
      // Get item data
      const item = this.getItemById(itemId);
      if (!item) {
        // Item not found
        itemName.textContent = 'Unknown item';
        itemDescription.textContent = 'Item data not found.';
        itemStats.innerHTML = '';
        return;
      }
      
      // Set item details
      itemName.textContent = item.name;
      itemName.style.color = this.getRarityColor(item.rarity);
      itemDescription.textContent = item.description || 'No description available.';
      
      // Build stats HTML
      let statsHtml = '';
      if (item.statModifiers) {
        statsHtml += '<div class="item-stats-list">';
        
        for (const [stat, value] of Object.entries(item.statModifiers)) {
          const formattedStat = stat.replace(/([A-Z])/g, ' $1').toLowerCase();
          statsHtml += `<div class="stat-item">${formattedStat}: <span class="stat-value ${value > 0 ? 'positive' : 'negative'}">${value > 0 ? '+' : ''}${value}</span></div>`;
        }
        
        statsHtml += '</div>';
      }
      
      if (item.level) {
        statsHtml += `<div class="item-level">Required Level: ${item.level}</div>`;
      }
      
      itemStats.innerHTML = statsHtml;
      
      // Show appropriate action buttons
      if (item.isEquippable) {
        // Check if the item is already equipped
        const isEquipped = this.selectedSlot && this.selectedSlot.classList.contains('equipment-slot');
        
        if (isEquipped) {
          unequipBtn.style.display = 'block';
        } else {
          equipBtn.style.display = 'block';
        }
      }
      
      if (item.type === 'potion' || item.type === 'scroll' || item.type === 'consumable') {
        useBtn.style.display = 'block';
      }
      
      // Always show drop button
      dropBtn.style.display = 'block';
    }
  
    getItemById(itemId) {
      // Find item in player's inventory or equipment
      if (!this.gameClient.player) return null;
      
      // Check inventory
      const inventoryItem = this.gameClient.player.inventory.find(item => item && item.id === itemId);
      if (inventoryItem) return inventoryItem;
      
      // Check equipment
      for (const [slot, item] of Object.entries(this.gameClient.player.equipment)) {
        if (item && item.id === itemId) return item;
      }
      
      return null;
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
  
    canEquipInSlot(itemId, slotType) {
      const item = this.getItemById(itemId);
      if (!item || !item.isEquippable) return false;
      
      // Check if item's equip slot matches the target slot
      return item.equipSlot === slotType;
    }
  
    equipSelectedItem() {
      if (!this.selectedSlot || !this.selectedSlot.dataset.itemId) return;
      
      const itemId = this.selectedSlot.dataset.itemId;
      const item = this.getItemById(itemId);
      
      if (item && item.isEquippable) {
        this.equipItem(itemId, item.equipSlot);
      }
    }
  
    equipItem(itemId, slotType) {
      // Get item from inventory
      const item = this.getItemById(itemId);
      if (!item) return;
      
      // Check if another item is already equipped in this slot
      const currentEquipped = this.gameClient.player.equipment[slotType];
      
      // Find item index in inventory
      const inventoryIndex = this.gameClient.player.inventory.findIndex(
        invItem => invItem && invItem.id === itemId
      );
      
      if (inventoryIndex === -1) return;
      
      // If another item is equipped, swap them
      if (currentEquipped) {
        // Move equipped item to inventory
        this.gameClient.player.inventory[inventoryIndex] = currentEquipped;
      } else {
        // Remove item from inventory
        this.gameClient.player.inventory[inventoryIndex] = null;
      }
      
      // Equip new item
      this.gameClient.player.equipment[slotType] = item;
      
      // Update player stats
      this.updatePlayerStats();
      
      // Update UI
      this.updateInventory();
      this.updateEquipment();
      
      // Show success message
      this.gameUI.showNotification(`Equipped ${item.name}`, 'success');
    }
  
    unequipSelectedItem() {
      if (!this.selectedSlot || !this.selectedSlot.classList.contains('equipment-slot')) return;
      
      const slotType = this.selectedSlot.dataset.slot;
      const itemId = this.selectedSlot.dataset.itemId;
      
      if (itemId) {
        this.unequipItem(itemId, slotType);
      }
    }
  
    unequipItem(itemId, slotType) {
      // Get item from equipment
      const item = this.gameClient.player.equipment[slotType];
      if (!item || item.id !== itemId) return;
      
      // Find empty slot in inventory
      const emptySlotIndex = this.gameClient.player.inventory.findIndex(invItem => !invItem);
      
      if (emptySlotIndex === -1) {
        // No empty slots
        this.gameUI.showNotification('Inventory is full', 'error');
        return;
      }
      
      // Move item to inventory
      this.gameClient.player.inventory[emptySlotIndex] = item;
      
      // Remove from equipment
      this.gameClient.player.equipment[slotType] = null;
      
      // Update player stats
      this.updatePlayerStats();
      
      // Update UI
      this.updateInventory();
      this.updateEquipment();
      
      // Show success message
      this.gameUI.showNotification(`Unequipped ${item.name}`, 'success');
    }
  
    useSelectedItem() {
      if (!this.selectedSlot || !this.selectedSlot.dataset.itemId) return;
      
      const itemId = this.selectedSlot.dataset.itemId;
      const item = this.getItemById(itemId);
      
      if (!item) return;
      
      if (item.type === 'potion') {
        this.usePotion(item);
      } else if (item.type === 'scroll') {
        this.useScroll(item);
      } else if (item.type === 'consumable') {
        this.useConsumable(item);
      }
    }
  
    usePotion(item) {
      // Apply potion effect based on type
      if (item.potionType === 'health') {
        this.gameClient.player.heal(item.value);
      } else if (item.potionType === 'energy') {
        this.gameClient.player.energy = Math.min(
          this.gameClient.player.maxEnergy,
          this.gameClient.player.energy + item.value
        );
      }
      
      // Remove item from inventory or reduce stack count
      this.consumeItem(item);
      
      // Show success message
      this.gameUI.showNotification(`Used ${item.name}`, 'success');
    }
  
    useScroll(item) {
      // Apply scroll effect
      console.log('Used scroll:', item.name);
      
      // Remove item from inventory
      this.consumeItem(item);
      
      // Show success message
      this.gameUI.showNotification(`Used ${item.name}`, 'success');
    }
  
    useConsumable(item) {
      // Apply consumable effect
      console.log('Used consumable:', item.name);
      
      // Remove item from inventory
      this.consumeItem(item);
      
      // Show success message
      this.gameUI.showNotification(`Used ${item.name}`, 'success');
    }
  
    consumeItem(item) {
      // Find item in inventory
      const inventoryIndex = this.gameClient.player.inventory.findIndex(
        invItem => invItem && invItem.id === item.id
      );
      
      if (inventoryIndex === -1) return;
      
      if (item.stackable && item.stackCount > 1) {
        // Reduce stack count
        item.stackCount--;
      } else {
        // Remove item from inventory
        this.gameClient.player.inventory[inventoryIndex] = null;
      }
      
      // Update UI
      this.updateInventory();
    }
  
    dropSelectedItem() {
      if (!this.selectedSlot || !this.selectedSlot.dataset.itemId) return;
      
      const itemId = this.selectedSlot.dataset.itemId;
      let item;
      
      // Check if item is from inventory or equipment
      if (this.selectedSlot.classList.contains('inventory-slot')) {
        const inventoryIndex = parseInt(this.selectedSlot.dataset.index);
        item = this.gameClient.player.inventory[inventoryIndex];
        
        if (item && item.id === itemId) {
          // Ask for confirmation
          if (confirm(`Are you sure you want to drop ${item.name}?`)) {
            // Remove from inventory
            this.gameClient.player.inventory[inventoryIndex] = null;
            
            // Update UI
            this.updateInventory();
            
            // Show success message
            this.gameUI.showNotification(`Dropped ${item.name}`, 'success');
          }
        }
      } else if (this.selectedSlot.classList.contains('equipment-slot')) {
        const slotType = this.selectedSlot.dataset.slot;
        item = this.gameClient.player.equipment[slotType];
        
        if (item && item.id === itemId) {
          // Ask for confirmation
          if (confirm(`Are you sure you want to drop ${item.name}?`)) {
            // Remove from equipment
            this.gameClient.player.equipment[slotType] = null;
            
            // Update player stats
            this.updatePlayerStats();
            
            // Update UI
            this.updateEquipment();
            
            // Show success message
            this.gameUI.showNotification(`Dropped ${item.name}`, 'success');
          }
        }
      }
    }
  
    updateInventory() {
      if (!this.gameClient.player) return;
      
      const inventorySlots = this.container.querySelectorAll('.inventory-slot');
      const inventory = this.gameClient.player.inventory;
      
      inventorySlots.forEach((slot, index) => {
        const item = inventory[index];
        
        if (item) {
          // Set item data
          slot.dataset.itemId = item.id;
          slot.title = item.name;
          slot.classList.add('has-item');
          slot.setAttribute('draggable', 'true');
          
          // Item appearance based on type and rarity
          slot.style.backgroundColor = this.getRarityColor(item.rarity);
          
          // Show item icon or placeholder
          let iconHtml = '';
          
          if (item.stackable && item.stackCount > 1) {
            iconHtml += `<div class="item-stack-count">${item.stackCount}</div>`;
          }
          
          slot.innerHTML = iconHtml;
        } else {
          // Clear slot
          slot.removeAttribute('data-item-id');
          slot.removeAttribute('title');
          slot.classList.remove('has-item');
          slot.removeAttribute('draggable');
          slot.style.backgroundColor = '';
          slot.innerHTML = '';
        }
      });
      
      // Update item details if selected item changed
      if (this.selectedSlot) {
        this.showItemDetails(this.selectedSlot.dataset.itemId);
      }
    }
  
    updateEquipment() {
      if (!this.gameClient.player) return;
      
      const equipment = this.gameClient.player.equipment;
      
      // Update each equipment slot
      for (const [slotType, item] of Object.entries(equipment)) {
        const slot = this.container.querySelector(`.equipment-slot[data-slot="${slotType}"]`);
        if (!slot) continue;
        
        if (item) {
          // Set item data
          slot.dataset.itemId = item.id;
          slot.title = item.name;
          slot.classList.add('has-item');
          slot.setAttribute('draggable', 'true');
          
          // Item appearance based on rarity
          slot.style.backgroundColor = this.getRarityColor(item.rarity);
          
          // Show item icon or placeholder
          slot.innerHTML = '';
        } else {
          // Clear slot
          slot.removeAttribute('data-item-id');
          slot.removeAttribute('title');
          slot.classList.remove('has-item');
          slot.removeAttribute('draggable');
          slot.style.backgroundColor = '';
          slot.innerHTML = '';
        }
      }
      
      // Update item details if selected item changed
      if (this.selectedSlot && this.selectedSlot.classList.contains('equipment-slot')) {
        this.showItemDetails(this.selectedSlot.dataset.itemId);
      }
    }
  
    updateCharacterInfo() {
      if (!this.gameClient.player) return;
      
      const player = this.gameClient.player;
      
      // Update character info
      const nameElement = this.container.querySelector('.character-name');
      const levelElement = this.container.querySelector('.character-level');
      const classElement = this.container.querySelector('.character-class');
      
      nameElement.textContent = player.name;
      levelElement.textContent = `Level ${player.level}`;
      classElement.textContent = player.class;
      
      // Update character stats
      const healthElement = this.container.querySelector('.stat-value.health');
      const energyElement = this.container.querySelector('.stat-value.energy');
      const damageElement = this.container.querySelector('.stat-value.damage');
      const defenseElement = this.container.querySelector('.stat-value.defense');
      
      healthElement.textContent = `${player.health}/${player.maxHealth}`;
      energyElement.textContent = `${player.energy}/${player.maxEnergy}`;
      
      // Calculate damage and defense from equipment
      let damage = 10; // Base damage
      let defense = 5; // Base defense
      
      for (const item of Object.values(player.equipment)) {
        if (!item) continue;
        
        if (item.statModifiers) {
          if (item.statModifiers.damage) damage += item.statModifiers.damage;
          if (item.statModifiers.magicDamage) damage += item.statModifiers.magicDamage;
          if (item.statModifiers.rangedDamage) damage += item.statModifiers.rangedDamage;
          if (item.statModifiers.armor) defense += item.statModifiers.armor;
          if (item.statModifiers.magicResist) defense += item.statModifiers.magicResist;
        }
      }
      
      damageElement.textContent = damage;
      defenseElement.textContent = defense;
    }
  
    updateAbilities() {
      if (!this.gameClient.player) return;
      
      const abilitiesList = this.container.querySelector('.abilities-list');
      const abilities = this.gameClient.player.abilities;
      
      // Clear current abilities
      abilitiesList.innerHTML = '';
      
      // Add each ability
      abilities.forEach(ability => {
        const abilityElement = document.createElement('div');
        abilityElement.className = 'ability-item';
        
        abilityElement.innerHTML = `
          <div class="ability-header">
            <div class="ability-name">${ability.name}</div>
            <div class="ability-type">${ability.type}</div>
          </div>
          <div class="ability-description">${ability.description}</div>
          <div class="ability-stats">
            <div class="ability-stat">Energy Cost: ${ability.energyCost}</div>
            <div class="ability-stat">Cooldown: ${ability.cooldown}s</div>
          </div>
        `;
        
        abilitiesList.appendChild(abilityElement);
      });
    }
  
    updateBirthstones() {
      if (!this.gameClient.player) return;
      
      const birthstones = this.gameClient.player.birthstones;
      const birthstoneSlots = this.container.querySelectorAll('.birthstone-slot');
      
      // Update each birthstone slot
      birthstones.forEach((birthstone, index) => {
        if (index >= birthstoneSlots.length) return;
        
        const slot = birthstoneSlots[index];
        const valueElement = slot.querySelector('.birthstone-value');
        const effectElement = slot.querySelector('.birthstone-effect');
        
        valueElement.textContent = birthstone;
        effectElement.textContent = this.getBirthstoneEffect(birthstone);
      });
    }
  
    getBirthstoneEffect(birthstone) {
      // Return effect description for each birthstone
      switch (birthstone) {
        case 'Ruby': return 'Increases damage dealt by 10%';
        case 'Sapphire': return 'Increases maximum energy by 15%';
        case 'Diamond': return 'Increases maximum health by 12%';
        case 'Emerald': return 'Reduces cooldown of abilities by 8%';
        case 'Amethyst': return 'Increases energy regeneration by 20%';
        case 'Aquamarine': return 'Reduces damage taken by 8%';
        default: return 'Unknown effect';
      }
    }
  
    updatePlayerStats() {
      // This would recalculate player stats based on equipment and birthstones
      // In a full implementation, this would apply stat modifiers from items
      
      if (!this.gameClient.player) return;
      
      // Recalculate base stats
      let baseHealth = 100 + (this.gameClient.player.level - 1) * 10;
      let baseEnergy = 100 + (this.gameClient.player.level - 1) * 5;
      
      // Apply birthstone effects
      for (const birthstone of this.gameClient.player.birthstones) {
        if (birthstone === 'Diamond') {
          baseHealth = Math.floor(baseHealth * 1.12); // +12% health
        }
        if (birthstone === 'Sapphire') {
          baseEnergy = Math.floor(baseEnergy * 1.15); // +15% energy
        }
      }
      
      // Apply equipment stat modifiers
      for (const item of Object.values(this.gameClient.player.equipment)) {
        if (!item || !item.statModifiers) continue;
        
        if (item.statModifiers.health) baseHealth += item.statModifiers.health;
        if (item.statModifiers.energy) baseEnergy += item.statModifiers.energy;
      }
      
      // Update player stats
      this.gameClient.player.maxHealth = baseHealth;
      this.gameClient.player.maxEnergy = baseEnergy;
      
      // Ensure current values don't exceed new maximums
      this.gameClient.player.health = Math.min(this.gameClient.player.health, baseHealth);
      this.gameClient.player.energy = Math.min(this.gameClient.player.energy, baseEnergy);
    }
  
    update() {
      if (this.isVisible) {
        this.updateCharacterInfo();
        this.updateInventory();
        this.updateEquipment();
        this.updateAbilities();
        this.updateBirthstones();
      }
    }
  
    toggle(visible = null) {
      this.isVisible = visible !== null ? visible : !this.isVisible;
      this.container.style.display = this.isVisible ? 'flex' : 'none';
      
      if (this.isVisible) {
        // Update all data when showing inventory
        this.update();
      } else {
        // Deselect any selected slot
        if (this.selectedSlot) {
          this.selectedSlot.classList.remove('selected');
          this.selectedSlot = null;
        }
      }
    }
  
    addStyles() {
      // Add CSS styles for the inventory UI
      const style = document.createElement('style');
      style.textContent = `
        .inventory-ui {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 900px;
          height: 600px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 10px;
          border: 1px solid #666;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          z-index: 1100;
        }
        
        .inventory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          border-bottom: 1px solid #666;
        }
        
        .inventory-header h2 {
          margin: 0;
        }
        
        .inventory-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        
        .inventory-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .inventory-character {
          width: 300px;
          padding: 20px;
          border-right: 1px solid #666;
          display: flex;
          flex-direction: column;
        }
        
        .character-model {
          height: 200px;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .character-stats {
          margin-bottom: 20px;
        }
        
        .character-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .character-level, .character-class {
          margin-bottom: 10px;
          color: #aaa;
        }
        
        .character-stats-list {
          margin-top: 10px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .stat-value.positive {
          color: #55ff55;
        }
        
        .stat-value.negative {
          color: #ff5555;
        }
        
        .equipment-slots {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-gap: 10px;
        }
        
        .equipment-slot {
          width: 100%;
          height: 50px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        
        .equipment-slot::before {
          content: attr(data-slot);
          position: absolute;
          top: -20px;
          left: 0;
          text-transform: capitalize;
          font-size: 12px;
          color: #aaa;
        }
        
        .inventory-items {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        
        .inventory-tabs {
          display: flex;
          margin-bottom: 20px;
        }
        
        .inventory-tab {
          padding: 10px 20px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px 5px 0 0;
          cursor: pointer;
          margin-right: 5px;
        }
        
        .inventory-tab.active {
          background-color: rgba(80, 80, 150, 0.3);
          border-bottom-color: transparent;
        }
        
        .inventory-tab-content {
          display: none;
          flex: 1;
          overflow-y: auto;
        }
        
        .inventory-tab-content.active {
          display: flex;
          flex-direction: column;
        }
        
        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-gap: 10px;
        }
        
        .inventory-slot {
          width: 100%;
          aspect-ratio: 1;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          position: relative;
        }
        
        .inventory-slot.has-item, .equipment-slot.has-item {
          cursor: pointer;
        }
        
        .inventory-slot.selected, .equipment-slot.selected {
          border: 2px solid #ffff00;
        }
        
        .item-stack-count {
          position: absolute;
          bottom: 5px;
          right: 5px;
          background-color: rgba(0, 0, 0, 0.7);
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 12px;
        }
        
        .abilities-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .ability-item {
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 10px;
        }
        
        .ability-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .ability-name {
          font-weight: bold;
        }
        
        .ability-type {
          color: #aaa;
          font-size: 12px;
        }
        
        .ability-description {
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .ability-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #aaa;
        }
        
        .birthstones-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .birthstone-slot {
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 10px;
        }
        
        .birthstone-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .birthstone-value {
          color: #ffaa00;
          margin-bottom: 5px;
        }
        
        .birthstone-effect {
          font-size: 14px;
          color: #aaa;
        }
        
        .item-details {
          padding: 20px;
          background-color: rgba(0, 0, 0, 0.5);
          border-top: 1px solid #666;
        }
        
        .item-name {
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        .item-description {
          margin-bottom: 10px;
          color: #aaa;
        }
        
        .item-stats-list {
          margin-bottom: 15px;
        }
        
        .item-level {
          color: #aaa;
          font-size: 12px;
          margin-bottom: 10px;
        }
        
        .item-actions {
          display: flex;
          gap: 10px;
        }
        
        .item-action {
          background-color: #4a9eff;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
        }
        
        .item-action:hover {
          background-color: #3a7edf;
        }
        
        .item-action.drop {
          background-color: #ff5555;
        }
        
        .item-action.drop:hover {
          background-color: #dd3333;
        }
      `;
      
      document.head.appendChild(style);
    }
  }