require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'voxel_dungeon',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_do_not_use_in_production',
    expiresIn: process.env.JWT_EXPIRATION || '24h'
  },
  
  game: {
    maxPlayersPerInstance: parseInt(process.env.MAX_PLAYERS_PER_INSTANCE || '16', 10),
    maxPlayersPerParty: parseInt(process.env.MAX_PLAYERS_PER_PARTY || '4', 10),
    maxPartiesPerHub: parseInt(process.env.MAX_PARTIES_PER_HUB || '64', 10)
  }
};