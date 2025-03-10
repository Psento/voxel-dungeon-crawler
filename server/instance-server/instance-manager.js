// server/instance-server/instance-manager.js

// Add worker pool for instance servers
const { Worker } = require('worker_threads');
const os = require('os');

class InstanceWorkerPool {
  constructor(maxWorkers = Math.max(1, os.cpus().length - 1)) {
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.activeWorkers = 0;
    this.taskQueue = [];
  }
  
  async runTask(taskData) {
    return new Promise((resolve, reject) => {
      const task = {
        taskData,
        resolve,
        reject
      };
      
      if (this.activeWorkers < this.maxWorkers) {
        this.runTaskOnWorker(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }
  
  runTaskOnWorker(task) {
    this.activeWorkers++;
    
    const worker = new Worker('./server/instance-server/instance-worker.js');
    
    worker.on('message', (result) => {
      this.activeWorkers--;
      worker.terminate();
      
      task.resolve(result);
      
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.runTaskOnWorker(nextTask);
      }
    });
    
    worker.on('error', (err) => {
      this.activeWorkers--;
      worker.terminate();
      
      task.reject(err);
      
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.runTaskOnWorker(nextTask);
      }
    });
    
    worker.postMessage(task.taskData);
  }
}

// Use the worker pool in InstanceManager
class InstanceManager {
  constructor() {
    this.instances = new Map();
    this.instanceCount = 0;
    this.workerPool = new InstanceWorkerPool();
  }
  
  async createInstance(party, biomeId, difficulty) {
    try {
      // Generate instance ID
      const instanceId = uuidv4();
      
      // Create instance data
      const instance = {
        id: instanceId,
        serverUrl: null,
        token: null,
        partyId: party.id,
        biomeId,
        difficulty,
        status: 'creating',
        createdAt: new Date(),
        members: party.members
      };
      
      // Generate dungeon
      const dungeonResult = await this.workerPool.runTask({
        action: 'generateDungeon',
        biomeId,
        difficulty,
        layerCount: 3 + Math.floor(difficulty / 2)
      });
      
      instance.dungeon = dungeonResult.dungeon;
      
      // Generate instance token
      instance.token = jwt.sign(
        {
          instanceId,
          partyId: party.id,
          members: party.members,
          dungeonSeed: instance.dungeon.seed
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      
      // Start instance server (or find available one)
      const serverPort = 3002 + (this.instanceCount % 10);
      instance.serverUrl = `http://localhost:${serverPort}`;
      this.instanceCount++;
      
      // Store instance
      this.instances.set(instanceId, instance);
      
      return instance;
    } catch (error) {
      console.error(`Error creating instance: ${error.message}`);
      throw error;
    }
  }
}