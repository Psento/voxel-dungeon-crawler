// client/app.js
import { ConnectionManager } from './auth/ConnectionManager';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize connection manager
  window.connectionManager = new ConnectionManager();
});