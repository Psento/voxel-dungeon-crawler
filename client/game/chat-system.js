// client/game/chat-system.js
import { EventEmitter } from 'events';

export class ChatSystem extends EventEmitter {
  constructor(gameNetwork) {
    super();
    this.network = gameNetwork;
    this.channels = {
      global: {
        type: 'global',
        name: 'Global',
        messages: []
      }
    };
    this.activeChannel = 'global';
    this.initialize();
  }

  initialize() {
    if (!this.network || !this.network.socket) {
      console.error('Chat system requires a connected game network');
      return;
    }

    // Set up socket event handlers
    this.network.socket.on('chat_message', (message) => {
      this.receiveMessage(message);
    });

    this.network.socket.on('chat_history', (data) => {
      this.receiveHistory(data);
    });

    // Join global channel by default
    this.joinChannel({ type: 'global' });
  }

  joinChannel(channel) {
    // Create a unique key for the channel
    const channelKey = this.getChannelKey(channel);
    
    // Add channel if it doesn't exist
    if (!this.channels[channelKey]) {
      this.channels[channelKey] = {
        ...channel,
        messages: []
      };
    }

    // Set as active channel
    this.activeChannel = channelKey;

    // Notify server
    this.network.socket.emit('join_chat_channel', { channel });

    // Trigger event
    this.emit('channelChanged', this.activeChannel);
    
    return channelKey;
  }

  leaveChannel(channelKey) {
    if (!this.channels[channelKey]) return;

    // If it's the active channel, switch to global
    if (this.activeChannel === channelKey) {
      this.activeChannel = 'global';
      this.emit('channelChanged', this.activeChannel);
    }

    // Notify server for party channels
    if (this.channels[channelKey].type === 'party') {
      this.network.socket.emit('leave_chat_channel', { 
        channel: this.channels[channelKey] 
      });
    }

    // For private channels, keep the history but mark as inactive
    if (this.channels[channelKey].type !== 'private') {
      delete this.channels[channelKey];
    }
  }

  sendMessage(content, channelKey = null) {
    const targetChannel = channelKey || this.activeChannel;
    if (!this.channels[targetChannel]) {
      console.error(`Channel ${targetChannel} does not exist`);
      return false;
    }

    // Send message to server
    this.network.socket.emit('chat_message', {
      message: content,
      channel: this.channels[targetChannel]
    });

    return true;
  }

  receiveMessage(message) {
    // Determine which channel this belongs to
    const channelKey = this.getChannelKeyFromMessage(message);
    
    // Create channel if it doesn't exist (e.g., for new private messages)
    if (!this.channels[channelKey]) {
      const channelType = message.channel.type;
      if (channelType === 'private') {
        // Create a new private channel
        this.channels[channelKey] = {
          type: 'private',
          name: message.sender.name,
          recipientId: message.sender.id,
          messages: []
        };
      } else if (channelType === 'party' && message.channel.partyId) {
        // Create a new party channel
        this.channels[channelKey] = {
          type: 'party',
          name: 'Party',
          partyId: message.channel.partyId,
          messages: []
        };
      }
    }

    // Add message to channel
    if (this.channels[channelKey]) {
      this.channels[channelKey].messages.push(message);
      
      // Emit events
      this.emit('messageReceived', {
        message,
        channelKey
      });

      // If this channel isn't active, emit notification
      if (channelKey !== this.activeChannel) {
        this.emit('messageNotification', {
          message,
          channelKey
        });
      }
    }
  }

  receiveHistory(data) {
    const channelKey = this.getChannelKey(data.channel);
    
    if (this.channels[channelKey]) {
      this.channels[channelKey].messages = data.messages;
      this.emit('historyReceived', {
        channelKey,
        messages: data.messages
      });
    }
  }

  getChannelKey(channel) {
    switch (channel.type) {
      case 'global':
        return 'global';
      case 'party':
        return `party:${channel.partyId}`;
      case 'private':
        // Sort IDs to ensure same key regardless of sender/recipient
        const ids = [this.network.characterId, channel.recipientId].sort();
        return `private:${ids.join(':')}`;
      default:
        return 'unknown';
    }
  }

  getChannelKeyFromMessage(message) {
    if (!message.channel) return 'global';

    switch (message.channel.type) {
      case 'global':
        return 'global';
      case 'party':
        return `party:${message.channel.partyId}`;
      case 'private':
        // For private messages, we need to determine if we're the sender or recipient
        const otherPersonId = message.sender.id === this.network.characterId 
          ? message.channel.recipientId 
          : message.sender.id;
        const ids = [this.network.characterId, otherPersonId].sort();
        return `private:${ids.join(':')}`;
      default:
        return 'unknown';
    }
  }

  getActiveChannel() {
    return this.channels[this.activeChannel];
  }

  getChannelMessages(channelKey = null) {
    const targetChannel = channelKey || this.activeChannel;
    return this.channels[targetChannel]?.messages || [];
  }

  getAllChannels() {
    return Object.keys(this.channels).map(key => ({
      key,
      ...this.channels[key]
    }));
  }
}