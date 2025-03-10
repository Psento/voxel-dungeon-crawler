// server/world-server/friends-tracker.js
const Friendship = require('../database/models/friendship');

class FriendsTracker {
  constructor(io) {
    this.io = io;
    this.onlineCharacters = new Map(); // characterId -> { accountId, socketId }
    this.accountCharacters = new Map(); // accountId -> Set of characterIds
  }
  
  trackCharacter(characterId, accountId, socketId) {
    // Store online character
    this.onlineCharacters.set(characterId, { accountId, socketId });
    
    // Track for this account
    if (!this.accountCharacters.has(accountId)) {
      this.accountCharacters.set(accountId, new Set());
    }
    this.accountCharacters.get(accountId).add(characterId);
    
    // Notify friends that player is online
    this.notifyFriendsStatusChange(accountId, characterId, true);
  }
  
  untrackCharacter(characterId) {
    // Check if character is tracked
    if (!this.onlineCharacters.has(characterId)) {
      return;
    }
    
    const { accountId } = this.onlineCharacters.get(characterId);
    
    // Remove from tracking
    this.onlineCharacters.delete(characterId);
    
    // Remove from account characters
    if (this.accountCharacters.has(accountId)) {
      this.accountCharacters.get(accountId).delete(characterId);
      
      // If this was the last character, clean up
      if (this.accountCharacters.get(accountId).size === 0) {
        this.accountCharacters.delete(accountId);
      }
    }
    
    // Notify friends that player is offline
    this.notifyFriendsStatusChange(accountId, characterId, false);
  }
  
  async getOnlineFriends(accountId) {
    // Get list of all online character IDs
    const onlineCharacterIds = Array.from(this.onlineCharacters.keys());
    
    // Query for online friends
    const onlineFriends = await Friendship.getOnlineFriends(accountId, onlineCharacterIds);
    
    return onlineFriends;
  }
  
  async notifyFriendsStatusChange(accountId, characterId, isOnline) {
    try {
      // Get all friends for this account
      const friendships = await Friendship.getFriendships(accountId);
      
      // Filter for accepted friendships
      const acceptedFriendships = friendships.filter(f => f.status === 'accepted');
      
      // Extract friend account IDs
      const friendAccountIds = acceptedFriendships.map(f => f.friendId);
      
      // Get character data
      // In a real implementation, we'd have this cached or in memory
      // For the prototype, we'll use what we have in memory
      const character = {
        id: characterId,
        // We'd need to fetch more data in a real implementation
      };
      
      // Notify each online friend
      for (const friendAccountId of friendAccountIds) {
        // Check if any characters for this friend are online
        if (this.accountCharacters.has(friendAccountId)) {
          for (const friendCharacterId of this.accountCharacters.get(friendAccountId)) {
            const friendData = this.onlineCharacters.get(friendCharacterId);
            if (friendData && friendData.socketId) {
              // Send friend status update
              this.io.to(friendData.socketId).emit('friend_status_update', {
                characterId,
                isOnline,
                character
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error notifying friends of status change:', error);
    }
  }
  
  async sendFriendsList(socket) {
    try {
      // Make sure we have account info
      if (!socket.accountId) return;
      
      // Get online friends
      const onlineFriends = await this.getOnlineFriends(socket.accountId);
      
      // Send to client
      socket.emit('friends_list', { friends: onlineFriends });
    } catch (error) {
      console.error('Error sending friends list:', error);
    }
  }
}

module.exports = { FriendsTracker };