class PartySystem {
    constructor() {
      this.parties = new Map(); // partyId -> party data
      this.playerParties = new Map(); // playerId -> partyId
      this.pendingInvites = new Map(); // playerId -> [partyId, partyId, ...]
    }
  
    createParty(leaderId, maxSize = 4) {
      // Check if player is already in a party
      if (this.playerParties.has(leaderId)) {
        return { success: false, message: "You are already in a party." };
      }
      
      const partyId = generateId();
      
      this.parties.set(partyId, {
        id: partyId,
        leader: leaderId,
        members: [leaderId],
        maxSize: maxSize,
        status: 'forming', // forming, ready, in-dungeon
        instanceId: null,
        created: Date.now()
      });
      
      this.playerParties.set(leaderId, partyId);
      
      return { 
        success: true, 
        message: "Party created successfully.", 
        partyId: partyId 
      };
    }
  
    joinParty(playerId, partyId) {
      // Check if player is already in a party
      if (this.playerParties.has(playerId)) {
        return { success: false, message: "You are already in a party." };
      }
      
      // Check if party exists
      if (!this.parties.has(partyId)) {
        return { success: false, message: "Party not found." };
      }
      
      const party = this.parties.get(partyId);
      
      // Check if party is full
      if (party.members.length >= party.maxSize) {
        return { success: false, message: "Party is full." };
      }
      
      // Add player to party
      party.members.push(playerId);
      this.playerParties.set(playerId, partyId);
      
      return { success: true, message: "Successfully joined the party." };
    }
  
    leaveParty(playerId) {
      const partyId = this.playerParties.get(playerId);
      if (!partyId) {
        return { success: false, message: "You are not in a party." };
      }
      
      const party = this.parties.get(partyId);
      if (!party) {
        // Clean up orphaned player-party mapping
        this.playerParties.delete(playerId);
        return { success: false, message: "Party not found." };
      }
      
      // Remove player from members
      const index = party.members.indexOf(playerId);
      if (index !== -1) {
        party.members.splice(index, 1);
      }
      
      // Remove player-party mapping
      this.playerParties.delete(playerId);
      
      // If player was leader, assign new leader or disband
      if (party.leader === playerId) {
        if (party.members.length > 0) {
          party.leader = party.members[0];
        } else {
          this.parties.delete(partyId);
          return { 
            success: true, 
            message: "You left the party. Party was disbanded." 
          };
        }
      }
      
      return { success: true, message: "You left the party." };
    }
  
    getParty(partyId) {
      return this.parties.get(partyId);
    }
  
    getPlayerParty(playerId) {
      const partyId = this.playerParties.get(playerId);
      if (!partyId) return null;
      
      return this.parties.get(partyId);
    }
  
    setPartyStatus(playerId, status) {
      const partyId = this.playerParties.get(playerId);
      if (!partyId) {
        return { success: false, message: "You are not in a party." };
      }
      
      const party = this.parties.get(partyId);
      if (party.leader !== playerId) {
        return { success: false, message: "Only the party leader can change party status." };
      }
      
      const validStatuses = ['forming', 'ready', 'in-dungeon'];
      if (!validStatuses.includes(status)) {
        return { success: false, message: "Invalid status." };
      }
      
      party.status = status;
      
      return { success: true, message: `Party status changed to ${status}.` };
    }
  
    assignInstance(partyId, instanceId) {
      const party = this.parties.get(partyId);
      if (!party) {
        return { success: false, message: "Party not found." };
      }
      
      party.instanceId = instanceId;
      party.status = 'in-dungeon';
      
      return { success: true, message: "Party assigned to instance." };
    }
  
    getPublicParties() {
      // Return a list of parties for lobby display
      const publicParties = [];
      
      for (const [partyId, party] of this.parties) {
        publicParties.push({
          id: partyId,
          leader: party.leader,
          memberCount: party.members.length,
          maxSize: party.maxSize,
          status: party.status
        });
      }
      
      return publicParties;
    }
  }
  
  function generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  module.exports = { PartySystem };