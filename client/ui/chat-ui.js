// client/ui/chat-ui.js
export class ChatUI {
    constructor(chatSystem, gameUI) {
      this.chatSystem = chatSystem;
      this.gameUI = gameUI;
      this.isVisible = false;
      this.unreadMessages = new Map();
      this.initialize();
    }
  
    initialize() {
      // Create chat container
      this.container = document.createElement('div');
      this.container.className = 'game-chat';
      this.container.innerHTML = `
        <div class="chat-header">
          <div class="chat-tabs"></div>
          <button class="chat-close-btn">×</button>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" placeholder="Type a message...">
          <button class="chat-send-btn">Send</button>
        </div>
      `;
      
      // Hide by default
      this.container.style.display = 'none';
      
      // Add to game UI
      this.gameUI.container.appendChild(this.container);
      
      // Add event listeners
      this.setupEventListeners();
      
      // Initial update
      this.updateChannelTabs();
      this.renderMessages();
      
      // Check unread messages
      this.checkUnread();
    }
  
    setupEventListeners() {
      // Chat system events
      this.chatSystem.on('messageReceived', ({ message, channelKey }) => {
        if (this.chatSystem.activeChannel === channelKey) {
          this.renderMessages();
        } else {
          this.incrementUnread(channelKey);
        }
      });
      
      this.chatSystem.on('channelChanged', () => {
        this.updateChannelTabs();
        this.renderMessages();
        this.clearUnread(this.chatSystem.activeChannel);
      });
      
      this.chatSystem.on('historyReceived', () => {
        this.renderMessages();
      });
      
      this.chatSystem.on('messageNotification', ({ channelKey }) => {
        this.incrementUnread(channelKey);
      });
      
      // UI events
      const closeBtn = this.container.querySelector('.chat-close-btn');
      closeBtn.addEventListener('click', () => this.toggle(false));
      
      const input = this.container.querySelector('.chat-input');
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
      
      const sendBtn = this.container.querySelector('.chat-send-btn');
      sendBtn.addEventListener('click', () => this.sendMessage());
      
      // Key binding for chat toggle
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.isVisible) {
          e.preventDefault();
          this.toggle(true);
          setTimeout(() => {
            this.container.querySelector('.chat-input').focus();
          }, 10);
        } else if (e.key === 'Escape' && this.isVisible) {
          this.toggle(false);
        }
      });
    }
  
    updateChannelTabs() {
      const tabsContainer = this.container.querySelector('.chat-tabs');
      tabsContainer.innerHTML = '';
      
      const channels = this.chatSystem.getAllChannels();
      
      channels.forEach(channel => {
        const tab = document.createElement('div');
        tab.className = `chat-tab ${channel.key === this.chatSystem.activeChannel ? 'active' : ''}`;
        
        // Display name based on channel type
        let displayName = channel.name;
        if (channel.type === 'party') {
          displayName = 'Party';
        }
        
        tab.innerHTML = `
          <span class="tab-name">${displayName}</span>
          <span class="unread-counter" style="display:none">0</span>
          ${channel.key !== 'global' ? '<span class="close-tab">×</span>' : ''}
        `;
        
        // Tab click handler
        tab.addEventListener('click', (e) => {
          if (e.target.classList.contains('close-tab')) {
            // Close tab
            e.stopPropagation();
            this.chatSystem.leaveChannel(channel.key);
            this.updateChannelTabs();
          } else {
            // Switch to tab
            this.chatSystem.activeChannel = channel.key;
            this.updateChannelTabs();
            this.renderMessages();
            this.clearUnread(channel.key);
          }
        });
        
        // Show unread counter if needed
        if (this.unreadMessages.has(channel.key) && this.unreadMessages.get(channel.key) > 0) {
          const counter = tab.querySelector('.unread-counter');
          counter.textContent = this.unreadMessages.get(channel.key);
          counter.style.display = 'inline-block';
        }
        
        tabsContainer.appendChild(tab);
      });
      
      // Add "new message" button
      const newMsgBtn = document.createElement('div');
      newMsgBtn.className = 'chat-tab new-message';
      newMsgBtn.innerHTML = '<span>+</span>';
      newMsgBtn.addEventListener('click', () => this.showNewMessageDialog());
      tabsContainer.appendChild(newMsgBtn);
    }
  
    renderMessages() {
      const messagesContainer = this.container.querySelector('.chat-messages');
      messagesContainer.innerHTML = '';
      
      const messages = this.chatSystem.getChannelMessages();
      
      messages.forEach(message => {
        const msgElement = document.createElement('div');
        msgElement.className = 'chat-message';
        
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgElement.innerHTML = `
          <span class="message-time">[${time}]</span>
          <span class="message-sender">${message.sender.name}:</span>
          <span class="message-content">${this.formatMessage(message.content)}</span>
        `;
        
        messagesContainer.appendChild(msgElement);
      });
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  
    sendMessage() {
      const input = this.container.querySelector('.chat-input');
      const message = input.value.trim();
      
      if (message) {
        const success = this.chatSystem.sendMessage(message);
        if (success) {
          input.value = '';
        }
      }
    }
  
    toggle(visible = null) {
      this.isVisible = visible === null ? !this.isVisible : visible;
      this.container.style.display = this.isVisible ? 'flex' : 'none';
      
      // Focus input when showing
      if (this.isVisible) {
        this.container.querySelector('.chat-input').focus();
      }
    }
  
    incrementUnread(channelKey) {
      const count = this.unreadMessages.get(channelKey) || 0;
      this.unreadMessages.set(channelKey, count + 1);
      this.updateChannelTabs();
      this.checkUnread();
    }
  
    clearUnread(channelKey) {
      this.unreadMessages.delete(channelKey);
      this.updateChannelTabs();
      this.checkUnread();
    }
  
    checkUnread() {
      // Check if any channels have unread messages
      let totalUnread = 0;
      for (const count of this.unreadMessages.values()) {
        totalUnread += count;
      }
      
      // Show notification in game UI
      if (totalUnread > 0 && !this.isVisible) {
        this.gameUI.showChatNotification(totalUnread);
      } else {
        this.gameUI.hideChatNotification();
      }
    }
  
    showNewMessageDialog() {
      // Show dialog to create new private message or join channel
      const dialog = document.createElement('div');
      dialog.className = 'chat-dialog';
      dialog.innerHTML = `
        <div class="dialog-header">New Conversation</div>
        <div class="dialog-content">
          <div class="form-group">
            <label>Type:</label>
            <select class="channel-type">
              <option value="private">Private Message</option>
              <option value="party">Join Party Chat</option>
            </select>
          </div>
          <div class="form-group private-options">
            <label>Player Name:</label>
            <input type="text" class="recipient-name" placeholder="Enter player name">
          </div>
          <div class="form-group party-options" style="display:none">
            <label>Party ID:</label>
            <input type="text" class="party-id" placeholder="Enter party ID">
          </div>
        </div>
        <div class="dialog-footer">
          <button class="cancel-btn">Cancel</button>
          <button class="confirm-btn">Start Chat</button>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Setup event handlers
      const typeSelect = dialog.querySelector('.channel-type');
      const privateOptions = dialog.querySelector('.private-options');
      const partyOptions = dialog.querySelector('.party-options');
      
      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'private') {
          privateOptions.style.display = 'block';
          partyOptions.style.display = 'none';
        } else {
          privateOptions.style.display = 'none';
          partyOptions.style.display = 'block';
        }
      });
      
      dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        if (typeSelect.value === 'private') {
          const recipientName = dialog.querySelector('.recipient-name').value.trim();
          if (recipientName) {
            // This would need to be improved with an actual player lookup
            alert('Player lookup not implemented in prototype');
          }
        } else {
          const partyId = dialog.querySelector('.party-id').value.trim();
          if (partyId) {
            this.chatSystem.joinChannel({
              type: 'party',
              partyId
            });
          }
        }
        document.body.removeChild(dialog);
      });
    }
  
    formatMessage(content) {
      // Basic message formatting - escape HTML, convert URLs to links
      const escaped = this.escapeHtml(content);
      
      // Convert URLs to clickable links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    }
  
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }