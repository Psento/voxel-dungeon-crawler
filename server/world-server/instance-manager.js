// server/world-server/instance-manager.js
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../../config');

class InstanceManager {
  constructor() {
    this.instances = new Map(); // instanceId -> instance data
    this.instanceCount = 0;
  }
  
  async createInstance(party, biomeId, difficulty) {
    try {
      // Generate instance ID
      const instanceId = uuidv4();
      
      // In a production environment, this would launch a new instance server
      // For development, we'll assume the instance server is running on a specific port
      const serverPort = 3002 + (this.instanceCount % 10);
      const serverUrl = `http://localhost:${serverPort}`;
      
      // Generate instance token for authentication
      const token = jwt.sign(
        {
          instanceId,
          partyId: party.id,
          members: party.members
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      
      // Create instance data
      const instance = {
        id: instanceId,
        serverUrl,
        token,
        partyId: party.id,
        biomeId,
        difficulty,
        status: 'creating',
        createdAt: new Date(),
        members: party.members
      };
      
      // Store instance
      this.instances.set(instanceId, instance);
      this.instanceCount++;
      
      // In a production environment, we would wait for instance server to be ready
      // For development, we'll assume it's already running
      
      // Try to contact the instance server
      try {
        const response = await axios.post(`${serverUrl}/initialize`, {
          instanceId,
          biomeId,
          difficulty,
          token,
          members: party.members
        });
        
        if (response.data.success) {
          instance.status = 'ready';
        } else {
          throw new Error(response.data.message || 'Failed to initialize instance');
        }
      } catch (error) {
        console.error(`Failed to contact instance server: ${error.message}`);
        throw new Error('Instance server unavailable');
      }
      
      return instance;
    } catch (error) {
      console.error(`Error creating instance: ${error.message}`);
      throw error;
    }
  }
  
  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }
  
  cleanupInstance(instanceId) {
    this.instances.delete(instanceId);
  }
  
  getActiveInstanceCount() {
    return this.instances.size;
  }
}

module.exports = { InstanceManager };