// server/world-server/chat-system.js
class ChatSystem {
    constructor(io) {
      this.io = io;
      this.messageHistory = {
        global: [],
        party: {},
        private: {}
      };
      this.historyLimit = 50;
    }
  
    initialize() {
      this.io.on('connection', (socket) => {
        // Set up chat message handlers
        socket.on('chat_message', (data) => this.handleChatMessage(socket, data));
        socket.on('join_chat_channel', (data) => this.handleJoinChannel(socket, data));
        socket.on('leave_chat_channel', (data) => this.handleLeaveChannel(socket, data));
      });
    }
  
    handleChatMessage(socket, data) {
      // Validate message data
      if (!data.message || !data.channel) {
        socket.emit('error', { message: 'Invalid chat message data' });
        return;
      }
  
      // Sanitize message content
      const sanitizedMessage = this.sanitizeMessage(data.message);
      if (!sanitizedMessage) {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }
  
      // Create message object
      const messageObject = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        sender: {
          id: socket.characterId || socket.id,
          name: socket.character ? socket.character.name : 'Anonymous'
        },
        content: sanitizedMessage,
        timestamp: Date.now(),
        channel: data.channel
      };
  
      // Handle different channel types
      switch (data.channel.type) {
        case 'global':
          this.broadcastGlobalMessage(messageObject);
          break;
        case 'party':
          this.broadcastPartyMessage(socket, messageObject, data.channel.partyId);
          break;
        case 'private':
          this.sendPrivateMessage(socket, messageObject, data.channel.recipientId);
          break;
        default:
          socket.emit('error', { message: 'Unknown channel type' });
      }
    }
  
    broadcastGlobalMessage(message) {
      // Add to history
      this.addToHistory('global', message);
      
      // Broadcast to all connected clients
      this.io.emit('chat_message', message);
    }
  
    broadcastPartyMessage(socket, message, partyId) {
      if (!partyId) {
        socket.emit('error', { message: 'Party ID is required for party messages' });
        return;
      }
  
      // Add to party history
      this.addToHistory(`party:${partyId}`, message);
      
      // Broadcast to party members
      this.io.to(`party:${partyId}`).emit('chat_message', message);
    }
  
    sendPrivateMessage(socket, message, recipientId) {
      if (!recipientId) {
        socket.emit('error', { message: 'Recipient ID is required for private messages' });
        return;
      }
  
      // Add to private chat history for both sender and recipient
      const chatKey = [socket.characterId, recipientId].sort().join(':');
      this.addToHistory(`private:${chatKey}`, message);
      
      // Send to recipient
      this.io.to(recipientId).emit('chat_message', message);
      
      // Also send back to sender if not the same client
      if (socket.characterId !== recipientId) {
        socket.emit('chat_message', message);
      }
    }
  
    handleJoinChannel(socket, data) {
      if (!data.channel) {
        socket.emit('error', { message: 'Invalid channel data' });
        return;
      }
  
      // For party channels, join socket to the room
      if (data.channel.type === 'party' && data.channel.partyId) {
        socket.join(`party:${data.channel.partyId}`);
      }
  
      // Send message history
      this.sendChannelHistory(socket, data.channel);
    }
  
    handleLeaveChannel(socket, data) {
      if (!data.channel) {
        socket.emit('error', { message: 'Invalid channel data' });
        return;
      }
  
      // Leave party channel room
      if (data.channel.type === 'party' && data.channel.partyId) {
        socket.leave(`party:${data.channel.partyId}`);
      }
    }
  
    sendChannelHistory(socket, channel) {
      let history = [];
  
      switch (channel.type) {
        case 'global':
          history = this.messageHistory.global;
          break;
        case 'party':
          history = this.messageHistory.party[`party:${channel.partyId}`] || [];
          break;
        case 'private':
          const chatKey = [socket.characterId, channel.recipientId].sort().join(':');
          history = this.messageHistory.private[`private:${chatKey}`] || [];
          break;
      }
  
      socket.emit('chat_history', {
        channel: channel,
        messages: history
      });
    }
  
    addToHistory(historyKey, message) {
      // Determine which history collection to use
      let historyCollection;
      if (historyKey === 'global') {
        historyCollection = this.messageHistory.global;
      } else if (historyKey.startsWith('party:')) {
        if (!this.messageHistory.party[historyKey]) {
          this.messageHistory.party[historyKey] = [];
        }
        historyCollection = this.messageHistory.party[historyKey];
      } else if (historyKey.startsWith('private:')) {
        if (!this.messageHistory.private[historyKey]) {
          this.messageHistory.private[historyKey] = [];
        }
        historyCollection = this.messageHistory.private[historyKey];
      }
  
      // Add message to history
      if (historyCollection) {
        historyCollection.push(message);
        // Limit history size
        if (historyCollection.length > this.historyLimit) {
          historyCollection.shift();
        }
      }
    }
  
    sanitizeMessage(message) {
      // Basic sanitization - trim and limit length
      if (typeof message !== 'string') return '';
      
      return message.trim().substring(0, 500);
    }
  }
  
  module.exports = { ChatSystem };