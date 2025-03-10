// server/database/index.js
const { Pool } = require('pg');
const config = require('../../config');

// Create connection pool
let pool;

// Connection pool configuration
const poolConfig = {
  ...config.database,
  min: 2, // Minimum number of connections
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
  
  // Add connection event handlers
  async afterCreate(connection, callback) {
    // Set session parameters if needed
    try {
      await connection.query('SET statement_timeout = 10000'); // 10s query timeout
      callback(null, connection);
    } catch (err) {
      callback(err, connection);
    }
  }
};

async function initializeDatabase() {
  if (pool) return pool;
  
  // Create pool
  pool = new Pool(poolConfig);
  
  // Add error handler to prevent app crashes on connection issues
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
  });
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('Connected to database successfully');
    client.release();
    
    // Check if tables exist, create them if not
    await createTablesIfNotExist();
    
    return pool;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Monitor pool statistics (for debugging and performance monitoring)
function getPoolStats() {
  if (!pool) return null;
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

// Transaction helper function
async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase,
  pool: () => pool,
  getConnection: async () => pool.connect(),
  getPoolStats,
  withTransaction
};