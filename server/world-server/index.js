// server/world-server/index.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const { PartySystem } = require('./party-manager');
const { InstanceManager } = require('./instance-manager');
const Character = require('../database/models/character');

function createWorldServer(httpServer) {
  const io = socketIO(httpServer, {
    cors: {
      origin: config.server.corsOrigin,
      methods: ['GET', 'POST']
    }
  });
  
  // Initialize systems
  const partySystem = new PartySystem();
  const instanceManager = new InstanceManager();
  
  // State
  const players = new Map(); // socketId -> player data
  const characterSockets = new Map(); // characterId -> socketId
  
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const characterId = socket.handshake.auth.characterId;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Store account info in socket
      socket.accountId = decoded.accountId;
      socket.username = decoded.username;
      
      // Verify character belongs to account if provided
      if (characterId) {
        const character = await Character.getById(characterId);
        
        if (!character || character.account_id !== decoded.accountId) {
          return next(new Error('Invalid character'));
        }
        
        socket.characterId = characterId;
        socket.character = character;
      }
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (Account: ${socket.username})`);
    
    // Join world handler
    socket.on('join_world', async (data) => {
      try {
        // Ensure we have a character
        if (!socket.character) {
          const character = await Character.getById(data.characterId);
          
          if (!character || character.account_id !== socket.accountId) {
            socket.emit('error', { message: 'Invalid character' });
            return;
          }
          
          socket.characterId = data.characterId;
          socket.character = character;
        }
        
        console.log(`Player joined world: ${socket.character.name} (${socket.characterId})`);
        
        // Check if already connected with this character
        if (characterSockets.has(socket.characterId)) {
          const oldSocketId = characterSockets.get(socket.characterId);
          
          // Disconnect old socket if still connected
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit('error', { message: 'Connected from another location' });
            oldSocket.disconnect();
          }
          
          // Remove old player data
          players.delete(oldSocketId);
        }
        
        // Create player data
        const player = {
          id: socket.characterId,
          socketId: socket.id,
          name: socket.character.name,
          class: socket.character.class,
          level: socket.character.level,
          position: data.position || { x: 0, y: 2, z: 0 },
          rotation: data.rotation || { x: 0, y: 0, z: 0 },
          health: socket.character.health,
          maxHealth: socket.character.health,
          energy: socket.character.energy,
          maxEnergy: socket.character.energy,
          birthstones: [
            socket.character.birthstone_one,
            socket.character.birthstone_two
          ],
          flasks: {
            health: {
              tier: socket.character.health_flask_tier,
              charges: socket.character.health_flask_charges
            },
            energy: {
              tier: socket.character.energy_flask_tier,
              charges: socket.character.energy_flask_charges
            }
          }
        };
        
        // Add to players map
        players.set(socket.id, player);
        characterSockets.set(socket.characterId, socket.id);
        
        // Join hub room
        socket.join('hub');
        
        // Check if player is in a party
        const party = partySystem.getPlayerParty(socket.characterId);
        if (party) {
          socket.join(`party:${party.id}`);
        }
        
        // Send initial world state
        sendHubStateToPlayer(socket);
        
        // Broadcast new player to others in hub
        socket.to('hub').emit('player_joined', {
          id: player.id,
          name: player.name,
          class: player.class,
          level: player.level,
          position: player.position,
          rotation: player.rotation
        });
      } catch (error) {
        console.error('Error joining world:', error);
        socket.emit('error', { message: 'Failed to join world' });
      }
    });
    
    // Player movement handler
    socket.on('player_move', (data) => {
      const player = players.get(socket.id);
      if (!player) return;
      
      // Update player position
      player.position = data.position;
      if (data.rotation) {
        player.rotation = data.rotation;
      }
      
      // Broadcast movement to others in hub
      socket.to('hub').emit('player_moved', {
        id: player.id,
        position: player.position,
        rotation: player.rotation
      });
      
      // Also broadcast to party members if in a party
      const party = partySystem.getPlayerParty(player.id);
      if (party) {
        socket.to(`party:${party.id}`).emit('player_moved', {
          id: player.id,
          position: player.position,
          rotation: player.rotation
        });
      }
    });
    
    // Party handlers
    socket.on('create_party', () => {
      const player = players.get(socket.id);
      if (!player) return;
      
      const result = partySystem.createParty(player.id);
      
      if (result.success) {
        // Join party room
        socket.join(`party:${result.partyId}`);
        
        // Notify player
        socket.emit('party_created', {
          id: result.partyId,
          members: partySystem.getParty(result.partyId).members.map(memberId => {
            const memberSocket = characterSockets.get(memberId);
            const member = memberSocket ? players.get(memberSocket) : null;
            
            return {
              id: memberId,
              name: member ? member.name : 'Unknown',
              class: member ? member.class : 'Unknown',
              level: member ? member.level : 1,
              isLeader: memberId === player.id
            };
          })
        });
        
        // Broadcast updated party list to hub
        io.to('hub').emit('parties_updated', partySystem.getPublicParties());
      } else {
        socket.emit('error', { message: result.message });
      }
    });
    
    socket.on('join_party', (data) => {
      const player = players.get(socket.id);
      if (!player) return;
      
      const result = partySystem.joinParty(player.id, data.partyId);
      
      if (result.success) {
        // Join party room
        socket.join(`party:${data.partyId}`);
        
        // Notify all party members
        io.to(`party:${data.partyId}`).emit('party_updated', {
          id: data.partyId,
          members: partySystem.getParty(data.partyId).members.map(memberId => {
            const memberSocket = characterSockets.get(memberId);
            const member = memberSocket ? players.get(memberSocket) : null;
            
            return {
              id: memberId,
              name: member ? member.name : 'Unknown',
              class: member ? member.class : 'Unknown',
              level: member ? member.level : 1,
              isLeader: memberId === partySystem.getParty(data.partyId).leader
            };
          })
        });
        
        // Broadcast updated party list to hub
        io.to('hub').emit('parties_updated', partySystem.getPublicParties());
      } else {
        socket.emit('error', { message: result.message });
      }
    });
    
    socket.on('leave_party', () => {
      const player = players.get(socket.id);
      if (!player) return;
      
      const party = partySystem.getPlayerParty(player.id);
      if (!party) {
        socket.emit('error', { message: 'Not in a party' });
        return;
      }
      
      const partyId = party.id;
      const result = partySystem.leaveParty(player.id);
      
      if (result.success) {
        // Leave party room
        socket.leave(`party:${partyId}`);
        
        // Notify player
        socket.emit('left_party');
        
        // Notify remaining party members if party still exists
        const updatedParty = partySystem.getParty(partyId);
        if (updatedParty) {
          io.to(`party:${partyId}`).emit('party_updated', {
            id: partyId,
            members: updatedParty.members.map(memberId => {
              const memberSocket = characterSockets.get(memberId);
              const member = memberSocket ? players.get(memberSocket) : null;
              
              return {
                id: memberId,
                name: member ? member.name : 'Unknown',
                class: member ? member.class : 'Unknown',
                level: member ? member.level : 1,
                isLeader: memberId === updatedParty.leader
              };
            })
          });
        }
        
        // Broadcast updated party list to hub
        io.to('hub').emit('parties_updated', partySystem.getPublicParties());
      } else {
        socket.emit('error', { message: result.message });
      }
    });
    
    socket.on('start_dungeon', async (data) => {
      const player = players.get(socket.id);
      if (!player) return;
      
      const party = partySystem.getPlayerParty(player.id);
      if (!party) {
        socket.emit('error', { message: 'Not in a party' });
        return;
      }
      
      if (party.leader !== player.id) {
        socket.emit('error', { message: 'Only the party leader can start a dungeon' });
        return;
      }
      
      try {
        // Create instance
        const instance = await instanceManager.createInstance(
          party, data.biomeId, data.difficulty || 1
        );
        
        // Update party status
        partySystem.setPartyStatus(player.id, 'in-dungeon');
        partySystem.assignInstance(party.id, instance.id);
        
        // Notify all party members
        const partyMembers = party.members.filter(id => characterSockets.has(id));
        
        io.to(`party:${party.id}`).emit('dungeon_ready', {
          instanceId: instance.id,
          serverUrl: instance.serverUrl,
          token: instance.token
        });
        
        // Broadcast updated party list to hub
        io.to('hub').emit('parties_updated', partySystem.getPublicParties());
      } catch (error) {
        console.error('Error creating dungeon instance:', error);
        socket.emit('error', { message: 'Failed to create dungeon instance' });
      }
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
      const player = players.get(socket.id);
      if (!player) return;
      
      console.log(`Client disconnected: ${socket.id} (${player.name})`);
      
      // Remove from character sockets map
      characterSockets.delete(player.id);
      
      // Remove from players map
      players.delete(socket.id);
      
      // Handle party membership
      handlePartyOnDisconnect(player.id);
      
      // Broadcast player left to hub
      socket.to('hub').emit('player_left', {
        id: player.id
      });
    });
    
    // Helper function
    function handlePartyOnDisconnect(characterId) {
      const party = partySystem.getPlayerParty(characterId);
      if (!party) return;
      
      // Don't immediately remove from party
      // This allows reconnecting with the same character
      
      // Just notify other party members
      io.to(`party:${party.id}`).emit('party_member_offline', {
        id: characterId
      });
    }
  });
  
  // Helper function to send full hub state to a player
  function sendHubStateToPlayer(socket) {
    // Get all players in hub
    const hubPlayers = Array.from(players.values())
      .filter(player => player.id !== socket.characterId)
      .map(player => ({
        id: player.id,
        name: player.name,
        class: player.class,
        level: player.level,
        position: player.position,
        rotation: player.rotation
      }));
    
    // Get player's own data
    const player = players.get(socket.id);
    
    // Get available parties
    const availableParties = partySystem.getPublicParties();
    
    // Get player's party if any
    const party = partySystem.getPlayerParty(socket.characterId);
    
    // Send world state
    socket.emit('world_state', {
      player,
      players: hubPlayers,
      parties: availableParties,
      playerParty: party ? {
        id: party.id,
        leader: party.leader,
        members: party.members.map(memberId => {
          const memberSocket = characterSockets.get(memberId);
          const member = memberSocket ? players.get(memberSocket) : null;
          
          return {
            id: memberId,
            name: member ? member.name : 'Unknown',
            class: member ? member.class : 'Unknown',
            level: member ? member.level : 1,
            isLeader: memberId === party.leader,
            isOnline: !!memberSocket
          };
        }),
        status: party.status,
        instanceId: party.instanceId
      } : null
    });
  }
  
  // Return server object with additional methods
  return {
    io,
    close: () => {
      return new Promise((resolve) => {
        io.close(() => {
          resolve();
        });
      });
    }
  };
}

module.exports = { createWorldServer };