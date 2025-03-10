// client/ui/party-ui.js
export class PartyUI {
    constructor(gameClient, gameUI) {
      this.gameClient = gameClient;
      this.gameUI = gameUI;
      this.container = null;
      this.partyListContainer = null;
      this.currentPartyContainer = null;
      this.isVisible = false;
      
      // Initialize UI
      this.initialize();
    }
  
    initialize() {
      // Create party UI container
      this.container = document.createElement('div');
      this.container.className = 'party-ui';
      this.container.style.display = 'none';
      
      // Create party UI structure
      this.createPartyUIStructure();
      
      // Add to game UI
      this.gameUI.container.appendChild(this.container);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Add CSS styles
      this.addStyles();
      
      // Initialize party frame in HUD
      this.createPartyFrame();
    }
  
    createPartyUIStructure() {
      this.container.innerHTML = `
        <div class="party-header">
          <h2>Party</h2>
          <button class="party-close-btn">×</button>
        </div>
        <div class="party-content">
          <div class="party-tabs">
            <div class="party-tab active" data-tab="current">Current Party</div>
            <div class="party-tab" data-tab="list">Party List</div>
          </div>
          <div class="party-tab-content active" data-tab-content="current">
            <div class="current-party">
              <div class="no-party-message">You are not in a party. Create or join a party to get started.</div>
              <div class="current-party-members"></div>
              <div class="current-party-controls">
                <button class="create-party-btn">Create Party</button>
                <button class="leave-party-btn" style="display: none;">Leave Party</button>
                <button class="start-dungeon-btn" style="display: none;">Start Dungeon</button>
              </div>
            </div>
          </div>
          <div class="party-tab-content" data-tab-content="list">
            <div class="party-list">
              <div class="party-list-filter">
                <input type="text" class="party-search" placeholder="Search parties...">
                <select class="party-filter">
                  <option value="all">All Parties</option>
                  <option value="forming">Forming</option>
                  <option value="ready">Ready</option>
                </select>
              </div>
              <div class="party-list-container"></div>
            </div>
          </div>
        </div>
      `;
      
      // Get references to containers
      this.partyListContainer = this.container.querySelector('.party-list-container');
      this.currentPartyContainer = this.container.querySelector('.current-party-members');
    }
  
    createPartyFrame() {
      // Create party frame in HUD
      this.partyFrame = document.createElement('div');
      this.partyFrame.className = 'party-frame';
      this.partyFrame.innerHTML = `
        <div class="party-frame-header">
          <div class="party-frame-title">Party</div>
          <button class="party-frame-btn">+</button>
        </div>
        <div class="party-frame-members"></div>
      `;
      
      // Add to game UI
      this.gameUI.hudContainer.appendChild(this.partyFrame);
      
      // Set up event listener for party button
      const partyButton = this.partyFrame.querySelector('.party-frame-btn');
      partyButton.addEventListener('click', () => {
        this.toggle();
      });
    }
  
    setupEventListeners() {
      // Close button
      const closeBtn = this.container.querySelector('.party-close-btn');
      closeBtn.addEventListener('click', () => this.toggle(false));
      
      // Tab switching
      const tabs = this.container.querySelectorAll('.party-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Hide all tab content
          const tabContents = this.container.querySelectorAll('.party-tab-content');
          tabContents.forEach(tc => tc.classList.remove('active'));
          
          // Show selected tab content
          const tabContent = this.container.querySelector(`.party-tab-content[data-tab-content="${tab.dataset.tab}"]`);
          tabContent.classList.add('active');
        });
      });
      
      // Party controls
      const createPartyBtn = this.container.querySelector('.create-party-btn');
      const leavePartyBtn = this.container.querySelector('.leave-party-btn');
      const startDungeonBtn = this.container.querySelector('.start-dungeon-btn');
      
      createPartyBtn.addEventListener('click', () => this.createParty());
      leavePartyBtn.addEventListener('click', () => this.leaveParty());
      startDungeonBtn.addEventListener('click', () => this.showStartDungeonDialog());
      
      // Party search and filter
      const partySearch = this.container.querySelector('.party-search');
      const partyFilter = this.container.querySelector('.party-filter');
      
      partySearch.addEventListener('input', () => this.filterParties());
      partyFilter.addEventListener('change', () => this.filterParties());
      
      // Key binding for party toggle (typically 'P')
      document.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P') {
          if (!this.isTyping()) {
            e.preventDefault();
            this.toggle();
          }
        }
        else if (e.key === 'Escape' && this.isVisible) {
          this.toggle(false);
        }
      });
      
      // Network event listeners
      if (this.gameClient.network && this.gameClient.network.socket) {
        const socket = this.gameClient.network.socket;
        
        socket.on('party_created', (data) => this.handlePartyCreated(data));
        socket.on('party_joined', (data) => this.handlePartyJoined(data));
        socket.on('party_updated', (data) => this.handlePartyUpdated(data));
        socket.on('party_member_joined', (data) => this.handlePartyMemberJoined(data));
        socket.on('party_member_left', (data) => this.handlePartyMemberLeft(data));
        socket.on('party_disbanded', (data) => this.handlePartyDisbanded(data));
        socket.on('parties_updated', (data) => this.handlePartiesUpdated(data));
        socket.on('dungeon_ready', (data) => this.handleDungeonReady(data));
      }
    }
  
    isTyping() {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    }
  
    createParty() {
      if (!this.gameClient.network || !this.gameClient.network.socket) {
        this.gameUI.showNotification('Network connection not available', 'error');
        return;
      }
      
      // Send create party request to server
      this.gameClient.network.socket.emit('create_party');
      
      // Show loading indicator
      this.showCreatePartyLoading(true);
    }
  
    leaveParty() {
      if (!this.gameClient.network || !this.gameClient.network.socket) {
        this.gameUI.showNotification('Network connection not available', 'error');
        return;
      }
      
      // Confirm leave
      if (confirm('Are you sure you want to leave this party?')) {
        // Send leave party request to server
        this.gameClient.network.socket.emit('leave_party');
      }
    }
  
    joinParty(partyId) {
      if (!this.gameClient.network || !this.gameClient.network.socket) {
        this.gameUI.showNotification('Network connection not available', 'error');
        return;
      }
      
      // Send join party request to server
      this.gameClient.network.socket.emit('join_party', { partyId });
      
      // Show loading indicator
      this.showJoinPartyLoading(partyId, true);
    }
  
    startDungeon(biomeId, difficulty) {
      if (!this.gameClient.network || !this.gameClient.network.socket) {
        this.gameUI.showNotification('Network connection not available', 'error');
        return;
      }
      
      // Send start dungeon request to server
      this.gameClient.network.socket.emit('start_dungeon', {
        biomeId,
        difficulty
      });
      
      // Show loading indicator
      this.container.querySelector('.start-dungeon-btn').disabled = true;
      this.container.querySelector('.start-dungeon-btn').textContent = 'Preparing dungeon...';
      
      // Close dialog if open
      const existingDialog = document.querySelector('.dungeon-dialog');
      if (existingDialog) {
        document.body.removeChild(existingDialog);
      }
    }
  
    showStartDungeonDialog() {
      // Create dialog element
      const dialog = document.createElement('div');
      dialog.className = 'dungeon-dialog';
      
      // Add dialog content
      dialog.innerHTML = `
        <div class="dungeon-dialog-header">
          <h3>Start Dungeon</h3>
          <button class="dungeon-dialog-close">×</button>
        </div>
        <div class="dungeon-dialog-content">
          <div class="dungeon-biome-selection">
            <h4>Select Biome</h4>
            <div class="dungeon-biomes">
              <div class="dungeon-biome selected" data-biome-id="forest">
                <div class="biome-name">Forest</div>
                <div class="biome-description">A dense forest with various wildlife and bandits.</div>
                <div class="biome-info">Difficulty: 1-10</div>
              </div>
              <div class="dungeon-biome" data-biome-id="cave">
                <div class="biome-name">Cave</div>
                <div class="biome-description">Dark caves with spiders, bats, and hidden treasures.</div>
                <div class="biome-info">Difficulty: 3-15</div>
              </div>
              <div class="dungeon-biome" data-biome-id="dungeon">
                <div class="biome-name">Dungeon</div>
                <div class="biome-description">Ancient ruins filled with undead and magical traps.</div>
                <div class="biome-info">Difficulty: 5-20</div>
              </div>
            </div>
          </div>
          <div class="dungeon-difficulty-selection">
            <h4>Select Difficulty</h4>
            <div class="dungeon-difficulty-slider">
              <input type="range" min="1" max="10" value="1" class="difficulty-slider">
              <div class="difficulty-value">1 - Easy</div>
            </div>
            <div class="difficulty-description">
              Enemies will be weaker, but rewards will be modest.
            </div>
          </div>
        </div>
        <div class="dungeon-dialog-footer">
          <button class="dungeon-dialog-cancel">Cancel</button>
          <button class="dungeon-dialog-start">Start Dungeon</button>
        </div>
      `;
      
      // Add dialog to document
      document.body.appendChild(dialog);
      
      // Set up event listeners
      const closeBtn = dialog.querySelector('.dungeon-dialog-close');
      const cancelBtn = dialog.querySelector('.dungeon-dialog-cancel');
      const startBtn = dialog.querySelector('.dungeon-dialog-start');
      const difficultySlider = dialog.querySelector('.difficulty-slider');
      const difficultyValue = dialog.querySelector('.difficulty-value');
      const difficultyDescription = dialog.querySelector('.difficulty-description');
      const biomes = dialog.querySelectorAll('.dungeon-biome');
      
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      startBtn.addEventListener('click', () => {
        const selectedBiome = dialog.querySelector('.dungeon-biome.selected');
        const biomeId = selectedBiome.dataset.biomeId;
        const difficulty = parseInt(difficultySlider.value);
        
        this.startDungeon(biomeId, difficulty);
      });
      
      difficultySlider.addEventListener('input', () => {
        const value = parseInt(difficultySlider.value);
        let description;
        
        // Update difficulty display
        if (value <= 3) {
          difficultyValue.textContent = `${value} - Easy`;
          description = 'Enemies will be weaker, but rewards will be modest.';
        } else if (value <= 7) {
          difficultyValue.textContent = `${value} - Medium`;
          description = 'Balanced challenge with appropriate rewards.';
        } else {
          difficultyValue.textContent = `${value} - Hard`;
          description = 'Tough challenge with better rewards and rare items.';
        }
        
        difficultyDescription.textContent = description;
      });
      
      biomes.forEach(biome => {
        biome.addEventListener('click', () => {
          // Remove selection from all biomes
          biomes.forEach(b => b.classList.remove('selected'));
          
          // Add selection to clicked biome
          biome.classList.add('selected');
          
          // Update max difficulty based on biome
          const biomeId = biome.dataset.biomeId;
          let maxDifficulty;
          
          switch (biomeId) {
            case 'forest':
              maxDifficulty = 10;
              break;
            case 'cave':
              maxDifficulty = 15;
              break;
            case 'dungeon':
              maxDifficulty = 20;
              break;
            default:
              maxDifficulty = 10;
          }
          
          // Adjust slider max value
          difficultySlider.max = maxDifficulty;
          difficultySlider.value = Math.min(difficultySlider.value, maxDifficulty);
          
          // Update difficulty display
          const value = parseInt(difficultySlider.value);
          let description;
          
          if (value <= Math.floor(maxDifficulty * 0.3)) {
            difficultyValue.textContent = `${value} - Easy`;
            description = 'Enemies will be weaker, but rewards will be modest.';
          } else if (value <= Math.floor(maxDifficulty * 0.7)) {
            difficultyValue.textContent = `${value} - Medium`;
            description = 'Balanced challenge with appropriate rewards.';
          } else {
            difficultyValue.textContent = `${value} - Hard`;
            description = 'Tough challenge with better rewards and rare items.';
          }
          
          difficultyDescription.textContent = description;
        });
      });
    }
  
    showCreatePartyLoading(isLoading) {
      const createPartyBtn = this.container.querySelector('.create-party-btn');
      
      if (isLoading) {
        createPartyBtn.disabled = true;
        createPartyBtn.textContent = 'Creating...';
      } else {
        createPartyBtn.disabled = false;
        createPartyBtn.textContent = 'Create Party';
      }
    }
  
    showJoinPartyLoading(partyId, isLoading) {
      const partyElement = this.partyListContainer.querySelector(`.party-item[data-party-id="${partyId}"]`);
      if (!partyElement) return;
      
      const joinButton = partyElement.querySelector('.join-party-btn');
      
      if (isLoading) {
        joinButton.disabled = true;
        joinButton.textContent = 'Joining...';
      } else {
        joinButton.disabled = false;
        joinButton.textContent = 'Join';
      }
    }
  
    updatePartyList(parties) {
      // Clear current list
      this.partyListContainer.innerHTML = '';
      
      if (!parties || parties.length === 0) {
        this.partyListContainer.innerHTML = '<div class="no-parties-message">No parties available. Create your own party!</div>';
        return;
      }
      
      // Add each party to the list
      parties.forEach(party => {
        const partyElement = document.createElement('div');
        partyElement.className = 'party-item';
        partyElement.dataset.partyId = party.id;
        partyElement.dataset.partyStatus = party.status;
        
        // Check if this player is already in a party
        const isInParty = this.gameClient.player && 
                         this.gameClient.player.partyId === party.id;
        
        // Check if party is full
        const isFull = party.memberCount >= party.maxSize;
        
        // Party status badge
        let statusBadge = '';
        if (party.status === 'forming') {
          statusBadge = '<span class="party-status forming">Forming</span>';
        } else if (party.status === 'ready') {
          statusBadge = '<span class="party-status ready">Ready</span>';
        } else if (party.status === 'in-dungeon') {
          statusBadge = '<span class="party-status in-dungeon">In Dungeon</span>';
        }
        
        partyElement.innerHTML = `
          <div class="party-item-info">
            <div class="party-item-header">
              <div class="party-item-leader">Leader: ${party.leaderName || 'Unknown'}</div>
              ${statusBadge}
            </div>
            <div class="party-item-members">
              <span class="party-item-count">${party.memberCount}/${party.maxSize} members</span>
            </div>
          </div>
          <div class="party-item-actions">
            <button class="join-party-btn" ${isInParty || isFull || party.status === 'in-dungeon' ? 'disabled' : ''}>
              ${isInParty ? 'Joined' : (isFull ? 'Full' : (party.status === 'in-dungeon' ? 'In Dungeon' : 'Join'))}
            </button>
          </div>
        `;
        
        // Add join button event listener
        const joinButton = partyElement.querySelector('.join-party-btn');
        if (!isInParty && !isFull && party.status !== 'in-dungeon') {
          joinButton.addEventListener('click', () => {
            this.joinParty(party.id);
          });
        }
        
        this.partyListContainer.appendChild(partyElement);
      });
    }
  
    updateCurrentParty(party) {
      const noPartyMessage = this.container.querySelector('.no-party-message');
      const memberContainer = this.container.querySelector('.current-party-members');
      const createPartyBtn = this.container.querySelector('.create-party-btn');
      const leavePartyBtn = this.container.querySelector('.leave-party-btn');
      const startDungeonBtn = this.container.querySelector('.start-dungeon-btn');
      
      // Clear loading states
      this.showCreatePartyLoading(false);
      
      if (!party) {
        // Not in a party
        noPartyMessage.style.display = 'block';
        memberContainer.innerHTML = '';
        memberContainer.style.display = 'none';
        createPartyBtn.style.display = 'block';
        leavePartyBtn.style.display = 'none';
        startDungeonBtn.style.display = 'none';
        
        // Update party frame in HUD
        this.updatePartyFrame(null);
        return;
      }
      
      // In a party
      noPartyMessage.style.display = 'none';
      memberContainer.style.display = 'block';
      createPartyBtn.style.display = 'none';
      leavePartyBtn.style.display = 'block';
      
      // Show start dungeon button if player is the leader and party status is not in-dungeon
      const isLeader = party.leader === this.gameClient.player.id;
      startDungeonBtn.style.display = isLeader && party.status !== 'in-dungeon' ? 'block' : 'none';
      
      // Update member list
      memberContainer.innerHTML = '';
      
      // Add each member
      party.members.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'party-member';
        
        // Check if member is online
        const isOnline = member.isOnline !== false; // Default to true if not specified
        
        // Check if member is the leader
        const isLeader = member.id === party.leader;
        
        // Check if member is the player
        const isPlayer = member.id === this.gameClient.player.id;
        
        memberElement.innerHTML = `
          <div class="party-member-info">
            <div class="party-member-name ${isOnline ? '' : 'offline'}">
              ${member.name} ${isLeader ? '<span class="leader-badge">Leader</span>' : ''}
              ${isPlayer ? '<span class="player-badge">You</span>' : ''}
            </div>
            <div class="party-member-details">
              <span class="party-member-class">${member.class || 'Unknown'}</span>
              <span class="party-member-level">Lvl ${member.level || 1}</span>
            </div>
          </div>
          ${isLeader && !isPlayer ? 
            '<button class="request-leader-btn">Request Leader</button>' : ''}
        `;
        
        // Add event listeners for buttons
        const requestLeaderBtn = memberElement.querySelector('.request-leader-btn');
        if (requestLeaderBtn) {
          requestLeaderBtn.addEventListener('click', () => {
            this.requestLeadership(member.id);
          });
        }
        
        memberContainer.appendChild(memberElement);
      });
      
      // Update party frame in HUD
      this.updatePartyFrame(party);
    }
  
    updatePartyFrame(party) {
      const memberContainer = this.partyFrame.querySelector('.party-frame-members');
      
      // Clear current members
      memberContainer.innerHTML = '';
      
      if (!party) {
        // Not in a party
        memberContainer.innerHTML = '<div class="party-frame-empty">No party</div>';
        return;
      }
      
      // Add each member
      party.members.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'party-frame-member';
        
        // Check if member is online
        const isOnline = member.isOnline !== false; // Default to true if not specified
        
        // Check if member is the leader
        const isLeader = member.id === party.leader;
        
        // Check if member is the player
        const isPlayer = member.id === this.gameClient.player.id;
        
        memberElement.innerHTML = `
          <div class="member-icon ${member.class ? member.class.toLowerCase() : 'unknown'}">
            ${isLeader ? '<div class="leader-icon">👑</div>' : ''}
          </div>
          <div class="member-info">
            <div class="member-name ${isOnline ? '' : 'offline'}">${member.name}</div>
            <div class="member-health-bar">
              <div class="member-health" style="width: ${member.healthPercent || 100}%"></div>
            </div>
          </div>
        `;
        
        memberContainer.appendChild(memberElement);
      });
    }
  
    filterParties() {
      const searchInput = this.container.querySelector('.party-search');
      const filterSelect = this.container.querySelector('.party-filter');
      const searchTerm = searchInput.value.toLowerCase();
      const filterValue = filterSelect.value;
      
      const partyItems = this.partyListContainer.querySelectorAll('.party-item');
      
      partyItems.forEach(party => {
        const leaderName = party.querySelector('.party-item-leader').textContent.toLowerCase();
        const partyStatus = party.dataset.partyStatus;
        
        // Check if party matches search and filter
        const matchesSearch = leaderName.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || partyStatus === filterValue;
        
        // Show or hide party
        party.style.display = matchesSearch && matchesFilter ? 'flex' : 'none';
      });
      
      // Show message if no parties match
      const visibleParties = Array.from(partyItems).filter(party => party.style.display !== 'none');
      
      if (visibleParties.length === 0) {
        let noPartiesMessage = this.partyListContainer.querySelector('.no-parties-message');
        
        if (!noPartiesMessage) {
          noPartiesMessage = document.createElement('div');
          noPartiesMessage.className = 'no-parties-message';
          this.partyListContainer.appendChild(noPartiesMessage);
        }
        
        noPartiesMessage.textContent = 'No parties match your search or filter.';
        noPartiesMessage.style.display = 'block';
      } else {
        const noPartiesMessage = this.partyListContainer.querySelector('.no-parties-message');
        if (noPartiesMessage) {
          noPartiesMessage.style.display = 'none';
        }
      }
    }
  
    requestLeadership(targetId) {
      if (!this.gameClient.network || !this.gameClient.network.socket) {
        this.gameUI.showNotification('Network connection not available', 'error');
        return;
      }
      
      // Send request leadership request to server
      this.gameClient.network.socket.emit('request_leadership', { targetId });
      
      // Show notification
      this.gameUI.showNotification('Leadership request sent', 'info');
    }
  
    handlePartyCreated(data) {
      // Reset loading state
      this.showCreatePartyLoading(false);
      
      // Update player's party ID
      if (this.gameClient.player) {
        this.gameClient.player.partyId = data.id;
      }
      
      // Update UI
      this.updateCurrentParty(data);
      
      // Show success message
      this.gameUI.showNotification('Party created successfully', 'success');
      
      // Switch to current party tab
      const currentPartyTab = this.container.querySelector('.party-tab[data-tab="current"]');
      currentPartyTab.click();
    }
  
    handlePartyJoined(data) {
      // Update player's party ID
      if (this.gameClient.player) {
        this.gameClient.player.partyId = data.id;
      }
      
      // Update UI
      this.updateCurrentParty(data);
      
      // Show success message
      this.gameUI.showNotification('Joined party successfully', 'success');
      
      // Switch to current party tab
      const currentPartyTab = this.container.querySelector('.party-tab[data-tab="current"]');
      currentPartyTab.click();
    }
  
    handlePartyUpdated(data) {
      // Update player's party ID
      if (this.gameClient.player && (!this.gameClient.player.partyId || this.gameClient.player.partyId === data.id)) {
        this.gameClient.player.partyId = data.id;
      }
      
      // Update UI
      this.updateCurrentParty(data);
    }
  
    handlePartyMemberJoined(data) {
      // Update currentParty if we have it
      if (this.gameClient.player && this.gameClient.player.partyId === data.partyId) {
        // Request updated party data
        if (this.gameClient.network && this.gameClient.network.socket) {
          this.gameClient.network.socket.emit('get_party', { partyId: data.partyId });
        }
      }
      
      // Show notification
      this.gameUI.showNotification(`${data.memberName} joined the party`, 'info');
    }
  
    handlePartyMemberLeft(data) {
      // Update currentParty if we have it
      if (this.gameClient.player && this.gameClient.player.partyId === data.partyId) {
        // Request updated party data
        if (this.gameClient.network && this.gameClient.network.socket) {
          this.gameClient.network.socket.emit('get_party', { partyId: data.partyId });
        }
      }
      
      // Show notification
      this.gameUI.showNotification(`${data.memberName} left the party`, 'info');
    }
  
    handlePartyDisbanded(data) {
      // Clear player's party ID
      if (this.gameClient.player && this.gameClient.player.partyId === data.id) {
        this.gameClient.player.partyId = null;
      }
      
      // Update UI
      this.updateCurrentParty(null);
      
      // Show notification
      this.gameUI.showNotification('Party has been disbanded', 'info');
    }
  
    handlePartiesUpdated(data) {
      // Update party list
      this.updatePartyList(data);
    }
  
    handleDungeonReady(data) {
      // Reset start dungeon button
      const startDungeonBtn = this.container.querySelector('.start-dungeon-btn');
      startDungeonBtn.disabled = false;
      startDungeonBtn.textContent = 'Start Dungeon';
      
      // Show notification
      this.gameUI.showNotification('Dungeon is ready!', 'success');
      
      // Connect to instance server
      this.connectToInstanceServer(data);
    }
  
    connectToInstanceServer(data) {
      // Create a loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <h2>Entering Dungeon</h2>
          <div class="loading-spinner"></div>
          <div class="loading-text">Connecting to dungeon server...</div>
        </div>
      `;
      
      document.body.appendChild(loadingOverlay);
      
      // Connect to instance server
      // In a real implementation, this would create a new connection
      // For the prototype, we'll simulate it
      
      setTimeout(() => {
        // Remove loading overlay
        document.body.removeChild(loadingOverlay);
        
        // Show success message
        this.gameUI.showNotification('Entered dungeon', 'success');
        
        // Close party UI
        this.toggle(false);
      }, 2000);
    }
  
    toggle(visible = null) {
      this.isVisible = visible !== null ? visible : !this.isVisible;
      this.container.style.display = this.isVisible ? 'flex' : 'none';
      
      if (this.isVisible) {
        // Request updated party list
        if (this.gameClient.network && this.gameClient.network.socket) {
          this.gameClient.network.socket.emit('get_parties');
        }
      }
    }
  
    update() {
      // Update party information if needed
      if (this.gameClient.player && this.gameClient.player.partyId) {
        // Request updated party data
        if (this.gameClient.network && this.gameClient.network.socket) {
          this.gameClient.network.socket.emit('get_party', { partyId: this.gameClient.player.partyId });
        }
      }
    }
  
    addStyles() {
      // Add CSS styles for the party UI
      const style = document.createElement('style');
      style.textContent = `
        .party-ui {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 500px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 10px;
          border: 1px solid #666;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          z-index: 1100;
        }
        
        .party-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          border-bottom: 1px solid #666;
        }
        
        .party-header h2 {
          margin: 0;
        }
        
        .party-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        
        .party-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .party-tabs {
          display: flex;
          margin: 10px 20px;
        }
        
        .party-tab {
          padding: 10px 20px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px 5px 0 0;
          cursor: pointer;
          margin-right: 5px;
        }
        
        .party-tab.active {
          background-color: rgba(80, 80, 150, 0.3);
          border-bottom-color: transparent;
        }
        
        .party-tab-content {
          display: none;
          flex: 1;
          padding: 0 20px 20px;
          overflow-y: auto;
        }
        
        .party-tab-content.active {
          display: flex;
          flex-direction: column;
        }
        
        .current-party {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .no-party-message {
          text-align: center;
          margin: 20px 0;
          color: #aaa;
        }
        
        .current-party-members {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .party-member {
          display: flex;
          justify-content: space-between;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 10px;
        }
        
        .party-member-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .party-member-name.offline {
          color: #aaa;
        }
        
        .party-member-details {
          display: flex;
          gap: 10px;
          color: #aaa;
          font-size: 12px;
        }
        
        .leader-badge {
          background-color: #ffaa00;
          color: black;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 10px;
          margin-left: 5px;
        }
        
        .player-badge {
          background-color: #00aaff;
          color: black;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 10px;
          margin-left: 5px;
        }
        
        .current-party-controls {
          display: flex;
          justify-content: center;
          gap: 10px;
        }
        
        .create-party-btn, .leave-party-btn, .start-dungeon-btn {
          background-color: #4a9eff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .create-party-btn:hover, .leave-party-btn:hover, .start-dungeon-btn:hover {
          background-color: #3a7edf;
        }
        
        .leave-party-btn {
          background-color: #ff5555;
        }
        
        .leave-party-btn:hover {
          background-color: #dd3333;
        }
        
        .start-dungeon-btn {
          background-color: #55aa55;
        }
        
        .start-dungeon-btn:hover {
          background-color: #448844;
        }
        
        .party-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .party-list-filter {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .party-search {
          flex: 1;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 8px;
          color: white;
        }
        
        .party-filter {
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 8px;
          color: white;
        }
        
        .party-list-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        
        .no-parties-message {
          text-align: center;
          margin: 20px 0;
          color: #aaa;
        }
        
        .party-item {
          display: flex;
          justify-content: space-between;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 10px;
        }
        
        .party-item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .party-item-leader {
          font-weight: bold;
        }
        
        .party-status {
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
        }
        
        .party-status.forming {
          background-color: #55aa55;
          color: white;
        }
        
        .party-status.ready {
          background-color: #ffaa00;
          color: black;
        }
        
        .party-status.in-dungeon {
          background-color: #aa55aa;
          color: white;
        }
        
        .party-item-members {
          color: #aaa;
          font-size: 12px;
        }
        
        .join-party-btn {
          background-color: #4a9eff;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
        }
        
        .join-party-btn:hover {
          background-color: #3a7edf;
        }
        
        .join-party-btn:disabled {
          background-color: #555;
          cursor: not-allowed;
        }
        
        .request-leader-btn {
          background-color: #ffaa00;
          color: black;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .request-leader-btn:hover {
          background-color: #dd9900;
        }
        
        /* Dungeon dialog */
        .dungeon-dialog {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          background-color: rgba(0, 0, 0, 0.9);
          color: white;
          border-radius: 10px;
          border: 1px solid #666;
          z-index: 1200;
          pointer-events: auto;
        }
        
        .dungeon-dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          border-bottom: 1px solid #666;
        }
        
        .dungeon-dialog-header h3 {
          margin: 0;
        }
        
        .dungeon-dialog-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        
        .dungeon-dialog-content {
          padding: 20px;
        }
        
        .dungeon-biome-selection {
          margin-bottom: 20px;
        }
        
        .dungeon-biome-selection h4, .dungeon-difficulty-selection h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        .dungeon-biomes {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .dungeon-biome {
          flex: 1;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid #666;
          border-radius: 5px;
          padding: 10px;
          cursor: pointer;
        }
        
        .dungeon-biome.selected {
          background-color: rgba(80, 80, 150, 0.3);
          border-color: #4a9eff;
        }
        
        .biome-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .biome-description {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 5px;
        }
        
        .biome-info {
          font-size: 12px;
          color: #ffaa00;
        }
        
        .dungeon-difficulty-slider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .difficulty-slider {
          flex: 1;
        }
        
        .difficulty-value {
          width: 100px;
        }
        
        .difficulty-description {
          font-size: 12px;
          color: #aaa;
        }
        
        .dungeon-dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 10px 20px;
          border-top: 1px solid #666;
        }
        
        .dungeon-dialog-cancel, .dungeon-dialog-start {
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .dungeon-dialog-cancel {
          background-color: #555;
          color: white;
          border: none;
        }
        
        .dungeon-dialog-start {
          background-color: #55aa55;
          color: white;
          border: none;
        }
        
        .dungeon-dialog-cancel:hover {
          background-color: #777;
        }
        
        .dungeon-dialog-start:hover {
          background-color: #448844;
        }
        
        /* Party frame in HUD */
        .party-frame {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 200px;
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 5px;
          border: 1px solid #666;
        }
        
        .party-frame-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 10px;
          border-bottom: 1px solid #666;
        }
        
        .party-frame-title {
          font-size: 14px;
          font-weight: bold;
        }
        
        .party-frame-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          line-height: 20px;
          text-align: center;
        }
        
        .party-frame-members {
          padding: 5px;
        }
        
        .party-frame-empty {
          text-align: center;
          padding: 10px;
          color: #aaa;
          font-size: 12px;
        }
        
        .party-frame-member {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          padding: 5px;
          border-radius: 3px;
          background-color: rgba(0, 0, 0, 0.3);
        }
        
        .member-icon {
          width: 20px;
          height: 20px;
          background-color: #555;
          border-radius: 50%;
          margin-right: 10px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 12px;
        }
        
        .member-icon.warrior {
          background-color: #ff5555;
        }
        
        .member-icon.mage {
          background-color: #5555ff;
        }
        
        .member-icon.archer {
          background-color: #55ff55;
        }
        
        .member-icon.cleric {
          background-color: #ffff55;
        }
        
        .leader-icon {
          position: absolute;
          top: -5px;
          right: -5px;
          font-size: 8px;
        }
        
        .member-info {
          flex: 1;
        }
        
        .member-name {
          font-size: 12px;
          margin-bottom: 2px;
        }
        
        .member-name.offline {
          color: #aaa;
        }
        
        .member-health-bar {
          width: 100%;
          height: 4px;
          background-color: #555;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .member-health {
          height: 100%;
          background-color: #ff3333;
          border-radius: 2px;
        }
        
        /* Loading overlay */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }
        
        .loading-content {
          text-align: center;
          color: white;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin: 20px auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      
      document.head.appendChild(style);
    }
  }