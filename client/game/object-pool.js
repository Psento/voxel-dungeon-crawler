class ObjectPool {
    constructor() {
      this.pools = new Map();
    }
    
    createPool(objectType, creator, initialCapacity = 10) {
      // Create a new pool for the specified object type
      if (!this.pools.has(objectType)) {
        const pool = {
          active: new Set(),
          inactive: [],
          creator: creator
        };
        
        // Pre-populate pool with initial objects
        for (let i = 0; i < initialCapacity; i++) {
          const object = creator();
          pool.inactive.push(object);
        }
        
        this.pools.set(objectType, pool);
      }
    }
    
    get(objectType, ...args) {
      // Get an object from the pool or create a new one if none available
      const pool = this.pools.get(objectType);
      
      if (!pool) {
        throw new Error(`No pool exists for object type: ${objectType}`);
      }
      
      let object;
      
      if (pool.inactive.length > 0) {
        // Reuse an inactive object
        object = pool.inactive.pop();
      } else {
        // Create a new object
        object = pool.creator();
      }
      
      // Initialize the object with the provided arguments
      if (typeof object.initialize === 'function') {
        object.initialize(...args);
      }
      
      // Mark object as active
      pool.active.add(object);
      
      return object;
    }
    
    release(objectType, object) {
      // Return an object to the pool for reuse
      const pool = this.pools.get(objectType);
      
      if (!pool) {
        throw new Error(`No pool exists for object type: ${objectType}`);
      }
      
      // Reset the object if it has a reset method
      if (typeof object.reset === 'function') {
        object.reset();
      }
      
      // Move from active to inactive
      pool.active.delete(object);
      pool.inactive.push(object);
    }
    
    getActiveCount(objectType) {
      const pool = this.pools.get(objectType);
      return pool ? pool.active.size : 0;
    }
    
    getInactiveCount(objectType) {
      const pool = this.pools.get(objectType);
      return pool ? pool.inactive.length : 0;
    }
  }
  
  // Example usage for particles, projectiles, and enemies
