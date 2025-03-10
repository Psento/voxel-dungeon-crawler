const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('../../config');

function createWebServer() {
  // Create Express app
  const app = express();
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Apply middleware
  app.use(cors({
    origin: config.server.corsOrigin
  }));
  app.use(helmet());
  app.use(express.json());
  
  // API routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/characters', require('./routes/characters'));
  
  // Serve static files in production
  if (config.server.env === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
    
    // Serve index.html for all other routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../dist/index.html'));
    });
  }
  
  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    
    res.status(err.status || 500).json({
      error: config.server.env === 'production' ? 'Server error' : err.message
    });
  });
  
  return {
    app,
    server,
    listen: (port, callback) => {
      return server.listen(port, callback);
    },
    close: (callback) => {
      return server.close(callback);
    }
  };
}

module.exports = { createWebServer };