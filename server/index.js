const config = require('../config');
const { createWorldServer } = require('./world-server');
const { createWebServer } = require('./web-server');
const { initializeDatabase } = require('./database');

async function startServer() {
  try {
    // Use environment port or default to 3000
    const PORT = process.env.PORT || 3000;
    
    // Initialize database connection
    console.log('Initializing database connection...');
    await initializeDatabase();
    console.log('Database connection established.');
    
    // Start web server
    console.log(`Starting web server on port ${PORT}...`);
    const webServer = createWebServer();
    const server = webServer.listen(PORT, () => {
      console.log(`Web server listening on port ${PORT}`);
    });
    
    // Start world server (using same HTTP server for socket.io)
    console.log('Starting world server...');
    const worldServer = createWorldServer(server);
    console.log('World server started.');
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      
      setTimeout(() => {
        console.log('Graceful shutdown timed out, forcing exit...');
        process.exit(1);
      }, 10000); // 10 seconds grace period
      
      server.close(() => {
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