const config = require('../config');
const { createWorldServer } = require('./world-server');
const { createWebServer } = require('./web-server');
const { initializeDatabase } = require('./database');

async function startServer() {
  try {
    // Initialize database connection
    console.log('Initializing database connection...');
    await initializeDatabase();
    console.log('Database connection established.');
    
    // Start web server
    console.log('Starting web server...');
    const webServer = createWebServer();
    webServer.listen(config.server.port, () => {
      console.log(`Web server listening on port ${config.server.port}`);
    });
    
    // Start world server (using same HTTP server for socket.io)
    console.log('Starting world server...');
    const worldServer = createWorldServer(webServer.server);
    console.log('World server started.');
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      
      setTimeout(() => {
        console.log('Graceful shutdown timed out, forcing exit...');
        process.exit(1);
      }, 10000); // 10 seconds grace period
      
      webServer.close(() => {
        console.log('Web server closed.');
        worldServer.close(() => {
          console.log('World server closed.');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };