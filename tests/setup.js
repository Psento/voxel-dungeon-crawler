// tests/setup.js
// Mock database connection for tests
jest.mock('../server/database', () => {
    const mockPool = {
      query: jest.fn().mockImplementation((query, params) => {
        // Add mock implementation for database queries
        return { rows: [] };
      }),
      connect: jest.fn().mockImplementation(() => {
        return {
          query: jest.fn().mockImplementation((query, params) => {
            return { rows: [] };
          }),
          release: jest.fn()
        };
      })
    };
    
    return {
      pool: () => mockPool,
      getConnection: jest.fn().mockImplementation(() => mockPool.connect()),
      initializeDatabase: jest.fn().mockResolvedValue(mockPool)
    };
  });
  
  // Mock socket.io for tests
// tests/setup.js (continued)
jest.mock('socket.io', () => {
    const mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
      disconnect: jest.fn()
    };
    
    const mockIo = {
      use: jest.fn((middleware) => middleware(mockSocket, jest.fn())),
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          callback(mockSocket);
        }
      }),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      sockets: {
        sockets: new Map([['test-socket-id', mockSocket]])
      },
      close: jest.fn(callback => callback())
    };
    
    return jest.fn().mockReturnValue(mockIo);
  });
  
  // Mock JWT token generation
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'test-token'),
    verify: jest.fn(() => ({ accountId: 'test-account-id', username: 'test-user' }))
  }));