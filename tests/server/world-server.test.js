// tests/server/world-server.test.js
const { createWorldServer } = require('../../server/world-server');
const { PartySystem } = require('../../server/world-server/party-manager');
const { InstanceManager } = require('../../server/world-server/instance-manager');

// Mock the party system and instance manager
jest.mock('../../server/world-server/party-manager');
jest.mock('../../server/world-server/instance-manager');

describe('World Server', () => {
  let worldServer;
  let mockHttpServer;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock HTTP server
    mockHttpServer = {
      on: jest.fn()
    };
    
    // Implement mock PartySystem and InstanceManager methods
    PartySystem.mockImplementation(() => ({
      createParty: jest.fn().mockReturnValue({
        success: true,
        partyId: 'test-party-id',
        message: 'Party created successfully'
      }),
      joinParty: jest.fn().mockReturnValue({
        success: true,
        message: 'Joined party successfully'
      }),
      leaveParty: jest.fn().mockReturnValue({
        success: true,
        message: 'Left party successfully'
      }),
      getParty: jest.fn().mockReturnValue({
        id: 'test-party-id',
        leader: 'test-character-id',
        members: ['test-character-id'],
        status: 'forming'
      }),
      getPlayerParty: jest.fn().mockReturnValue(null),
      getPublicParties: jest.fn().mockReturnValue([
        {
          id: 'test-party-id',
          leader: 'other-character-id',
          memberCount: 1,
          maxSize: 4,
          status: 'forming'
        }
      ]),
      setPartyStatus: jest.fn(),
      assignInstance: jest.fn()
    }));
    
    InstanceManager.mockImplementation(() => ({
      createInstance: jest.fn().mockResolvedValue({
        id: 'test-instance-id',
        serverUrl: 'http://localhost:3002',
        token: 'test-token'
      }),
      getInstance: jest.fn().mockReturnValue({
        id: 'test-instance-id',
        status: 'ready'
      }),
      cleanupInstance: jest.fn()
    }));
    
    // Create the world server
    worldServer = createWorldServer(mockHttpServer);
  });
  
  afterEach(() => {
    // Close the server
    worldServer.close();
  });
  
  test('should initialize socket.io connection', () => {
    expect(worldServer.io).toBeDefined();
  });
  
  test('should handle player joining the world', async () => {
    // Get the connection handler
    const connectionHandler = worldServer.io.on.mock.calls[0][1];
    expect(connectionHandler).toBeDefined();
    
    // Mock the socket
    const socket = {
      id: 'test-socket-id',
      accountId: 'test-account-id',
      username: 'test-user',
      characterId: 'test-character-id',
      character: {
        name: 'Test Character',
        class: 'Warrior',
        level: 1,
        health: 100,
        energy: 100,
        birthstone_one: 'Ruby',
        birthstone_two: 'Diamond',
        health_flask_tier: 1,
        energy_flask_tier: 1,
        health_flask_charges: 3,
        energy_flask_charges: 3
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
      disconnect: jest.fn()
    };
    
    // Register handlers
    connectionHandler(socket);
    
    // Find join_world handler
    const joinWorldHandler = socket.on.mock.calls.find(
      call => call[0] === 'join_world'
    )[1];
    expect(joinWorldHandler).toBeDefined();
    
    // Call join_world handler
    await joinWorldHandler({
      position: { x: 0, y: 0, z: 0 }
    });
    
    // Check socket was added to hub room
    expect(socket.join).toHaveBeenCalledWith('hub');
    
    // Check initial world state was sent
    expect(socket.emit).toHaveBeenCalledWith('world_state', expect.any(Object));
  });
  
  test('should handle player creating a party', async () => {
    // Get the connection handler
    const connectionHandler = worldServer.io.on.mock.calls[0][1];
    
    // Mock the socket with player data
    const socket = {
      id: 'test-socket-id',
      accountId: 'test-account-id',
      username: 'test-user',
      characterId: 'test-character-id',
      character: {
        name: 'Test Character',
        class: 'Warrior',
        level: 1
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
      disconnect: jest.fn()
    };
    
    // Mock players map
    const players = new Map();
    players.set('test-socket-id', {
      id: 'test-character-id',
      socketId: 'test-socket-id',
      name: 'Test Character',
      class: 'Warrior'
    });
    
    // Register handlers
    connectionHandler(socket);
    
    // Find create_party handler
    const createPartyHandler = socket.on.mock.calls.find(
      call => call[0] === 'create_party'
    )[1];
    expect(createPartyHandler).toBeDefined();
    
    // Call create_party handler
    createPartyHandler();
    
    // Check socket joined party room
    expect(socket.join).toHaveBeenCalledWith('party:test-party-id');
    
    // Check party creation result was sent
    expect(socket.emit).toHaveBeenCalledWith('party_created', expect.objectContaining({
      id: 'test-party-id'
    }));
  });
});