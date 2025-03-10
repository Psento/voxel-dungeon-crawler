const webpack = require('webpack');
const webpackConfig = require('../webpack.config');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distPath = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Copy index.html to dist
const sourcePath = path.resolve(__dirname, '../client/index.html');
const destPath = path.resolve(distPath, 'index.html');
fs.copyFileSync(sourcePath, destPath);

// Run webpack
console.log('Building client bundle...');
webpack(webpackConfig, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.error('Build error:', err || stats.toString({
      chunks: false,
      colors: true
    }));
    process.exit(1);
  }
  
  console.log(stats.toString({
    chunks: false,
    colors: true
  }));
  
  console.log('Build completed successfully!');
});