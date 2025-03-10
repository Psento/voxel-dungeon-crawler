const path = require('path');
const { spawn } = require('child_process');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('../webpack.config');

// Start server process
const serverProcess = spawn('node', ['--inspect', 'server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: 3001 } // Run server on different port
});

// Start webpack dev server
const compiler = webpack(webpackConfig);
const devServerOptions = {
  static: {
    directory: path.join(__dirname, '../client')
  },
  port: 3000,
  proxy: {
    '/api': 'http://localhost:3001',
    '/socket.io': {
      target: 'http://localhost:3001',
      ws: true
    }
  },
  historyApiFallback: true,
  hot: true
};

const devServer = new WebpackDevServer(devServerOptions, compiler);

async function startDevServer() {
  console.log('Starting dev server...');
  await devServer.start();
  console.log('Dev server is running at http://localhost:3000');
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