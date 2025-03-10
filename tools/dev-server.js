const path = require('path');
const { spawn } = require('child_process');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('../webpack.config');

// Centralized port configuration
const SERVER_PORT = 3000;
const CLIENT_PORT = 3001;

// Start server process
const serverProcess = spawn('node', ['--inspect', 'server/index.js'], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    PORT: SERVER_PORT,  // Ensure server uses the same port
    NODE_ENV: 'development'
  }
});

// Start webpack dev server
const compiler = webpack(webpackConfig);
const devServerOptions = {
  static: {
    directory: path.join(__dirname, '../client')
  },
  port: CLIENT_PORT,
  proxy: {
    '/api': `http://localhost:${SERVER_PORT}`,
    '/socket.io': {
      target: `http://localhost:${SERVER_PORT}`,
      ws: true  // Enable WebSocket proxying
    }
  },
  historyApiFallback: true,
  hot: true
};

const devServer = new WebpackDevServer(devServerOptions, compiler);

async function startDevServer() {
  console.log(`Starting dev server on port ${CLIENT_PORT}...`);
  console.log(`Server backend running on port ${SERVER_PORT}`);
  
  await devServer.start();
  console.log(`Dev server is running at http://localhost:${CLIENT_PORT}`);
}

startDevServer();

// Handle process termination
process.on('SIGINT', () => {
  console.log('Dev server shutting down...');
  
  serverProcess.kill('SIGTERM');
  devServer.stop(() => {
    process.exit(0);
  });
});