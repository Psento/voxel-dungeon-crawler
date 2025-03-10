// config/index.js
require('dotenv').config();

const environment = process.env.NODE_ENV || 'development';

// Base configuration
const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: environment,
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'voxeldungeon',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    ssl: process.env.DB_SSL === 'true'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_do_not_use_in_production',
    expiresIn: process.env.JWT_EXPIRATION || '24h'
  },
  
  game: {
    maxPlayersPerInstance: parseInt(process.env.MAX_PLAYERS_PER_INSTANCE || '16', 10),
    maxPlayersPerParty: parseInt(process.env.MAX_PLAYERS_PER_PARTY || '4', 10),
    maxPartiesPerHub: parseInt(process.env.MAX_PARTIES_PER_HUB || '64', 10),
    dungeonSeedSalt: process.env.DUNGEON_SEED_SALT || 'dungeon_seed_salt'
  },
  
  instance: {
    minWorkers: parseInt(process.env.MIN_INSTANCE_WORKERS || '1', 10),
    maxWorkers: parseInt(process.env.MAX_INSTANCE_WORKERS || '4', 10),
    basePort: parseInt(process.env.INSTANCE_BASE_PORT || '3002', 10)
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    prefix: process.env.REDIS_PREFIX || 'voxel:'
  }
};

// Environment-specific overrides
const environmentConfig = {
  development: {
    // Development-specific settings
    server: {
      corsOrigin: '*'
    }
  },
  
  test: {
    // Test-specific settings
    database: {
      database: 'voxeldungeon_test'
    },
    jwt: {
      secret: 'test_secret_key'
    }
  },
  
  production: {
    // Production-specific settings
    server: {
      corsOrigin: process.env.CORS_ORIGIN // Stricter CORS in production
    }
  }
};

// Merge base config with environment-specific config
const mergedConfig = {
  ...config,
  ...environmentConfig[environment] || {},
  // Deep merge server config
  server: {
    ...config.server,
    ...(environmentConfig[environment]?.server || {})
  },
  // Deep merge database config
  database: {
    ...config.database,
    ...(environmentConfig[environment]?.database || {})
  },
  // Deep merge jwt config
  jwt: {
    ...config.jwt,
    ...(environmentConfig[environment]?.jwt || {})
  }
};

module.exports = mergedConfig;