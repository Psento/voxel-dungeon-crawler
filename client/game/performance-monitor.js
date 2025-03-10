class PerformanceMonitor {
    constructor() {
      this.enabled = true;
      this.stats = {
        fps: 0,
        frameTime: 0,
        renderTime: 0,
        updateTime: 0,
        physicsTime: 0,
        networkTime: 0,
        activeEntities: 0,
        visibleChunks: 0,
        triangleCount: 0,
        drawCalls: 0,
        memoryUsage: 0
      };
      
      this.samples = {
        fps: [],
        frameTime: [],
        renderTime: [],
        updateTime: [],
        physicsTime: [],
        networkTime: []
      };
      
      this.sampleSize = 60; // One second at 60 FPS
      this.dynamicLOD = true;
      this.targetFPS = 60;
      this.autoAdjustViewDistance = true;
      
      // Create performance UI
      this.createUI();
      
      // Initialize frame timing
      this.lastFrameTime = performance.now();
      this.frameStartTime = 0;
    }
    
    startFrame() {
      if (!this.enabled) return;
      
      // Mark frame start time
      this.frameStartTime = performance.now();
      
      // Calculate FPS based on time since last frame
      const elapsed = this.frameStartTime - this.lastFrameTime;
      this.lastFrameTime = this.frameStartTime;
      
      if (elapsed > 0) {
        this.stats.fps = 1000 / elapsed;
        this.addSample('fps', this.stats.fps);
        this.addSample('frameTime', elapsed);
      }
    }
    
    endFrame() {
      if (!this.enabled || !this.frameStartTime) return;
      
      // Calculate total frame time
      const endTime = performance.now();
      const totalFrameTime = endTime - this.frameStartTime;
      
      // Update stats
      this.stats.frameTime = totalFrameTime;
      
      // Update UI
      this.updateUI();
      
      // Dynamic LOD adjustment based on performance
      if (this.dynamicLOD && this.autoAdjustViewDistance) {
        this.adjustViewDistance();
      }
    }
    
    startTimer(timerName) {
      if (!this.enabled) return;
      
      this[`${timerName}StartTime`] = performance.now();
    }
    
    endTimer(timerName) {
      if (!this.enabled || !this[`${timerName}StartTime`]) return;
      
      const elapsed = performance.now() - this[`${timerName}StartTime`];
      this.stats[`${timerName}Time`] = elapsed;
      this.addSample(`${timerName}Time`, elapsed);
      
      delete this[`${timerName}StartTime`];
    }
    
    addSample(metricName, value) {
      if (!this.samples[metricName]) return;
      
      this.samples[metricName].push(value);
      
      // Keep sample size constrained
      if (this.samples[metricName].length > this.sampleSize) {
        this.samples[metricName].shift();
      }
    }
    
    getAverageSample(metricName) {
      if (!this.samples[metricName] || this.samples[metricName].length === 0) {
        return 0;
      }
      
      const sum = this.samples[metricName].reduce((a, b) => a + b, 0);
      return sum / this.samples[metricName].length;
    }
    
    updateEntityCount(count) {
      this.stats.activeEntities = count;
    }
    
    updateChunkCount(count) {
      this.stats.visibleChunks = count;
    }
    
    updateTriangleCount(renderer) {
      if (!renderer || !renderer.info) return;
      
      this.stats.triangleCount = renderer.info.render.triangles;
      this.stats.drawCalls = renderer.info.render.calls;
    }
    
    updateMemoryUsage(renderer) {
      if (!renderer || !renderer.info) return;
      
      this.stats.memoryUsage = renderer.info.memory.geometries + 
                               renderer.info.memory.textures;
    }
    
    adjustViewDistance() {
      const avgFPS = this.getAverageSample('fps');
      
      // Adjust view distance based on performance
      if (avgFPS < this.targetFPS * 0.8) {
        // Performance is low, reduce view distance
        if (window.gameClient && window.gameClient.voxelRenderer) {
          const currentViewDistance = window.gameClient.voxelRenderer.viewDistance;
          if (currentViewDistance > 2) {
            window.gameClient.voxelRenderer.viewDistance = currentViewDistance - 1;
            console.log(`Reduced view distance to ${window.gameClient.voxelRenderer.viewDistance} due to low FPS (${avgFPS.toFixed(1)})`);
          }
        }
      } else if (avgFPS > this.targetFPS * 0.95) {
        // Performance is good, increase view distance if it's not already high
        if (window.gameClient && window.gameClient.voxelRenderer) {
          const currentViewDistance = window.gameClient.voxelRenderer.viewDistance;
          if (currentViewDistance < 8) {
            window.gameClient.voxelRenderer.viewDistance = currentViewDistance + 1;
            console.log(`Increased view distance to ${window.gameClient.voxelRenderer.viewDistance} due to good FPS (${avgFPS.toFixed(1)})`);
          }
        }
      }
    }
    
    createUI() {
      // Create performance monitor UI
      this.ui = document.createElement('div');
      this.ui.className = 'performance-monitor';
      this.ui.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        width: 200px;
        z-index: 9999;
        display: none;
      `;
      
      this.uiContent = document.createElement('div');
      this.ui.appendChild(this.uiContent);
      
      // Add toggle button
      this.toggleButton = document.createElement('button');
      this.toggleButton.textContent = 'Performance Monitor';
      this.toggleButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
        z-index: 9999;
      `;
      
      this.toggleButton.addEventListener('click', () => {
        this.ui.style.display = this.ui.style.display === 'none' ? 'block' : 'none';
      });
      
      document.body.appendChild(this.ui);
      document.body.appendChild(this.toggleButton);
      
      // Add keyboard shortcut (F3)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
          e.preventDefault();
          this.ui.style.display = this.ui.style.display === 'none' ? 'block' : 'none';
        }
      });
    }
    
    updateUI() {
      if (!this.ui || this.ui.style.display === 'none') return;
      
      // Format stats for display
      const formatStat = (value, decimals = 1) => {
        return typeof value === 'number' ? value.toFixed(decimals) : value;
      };
      
      // Update UI content
      this.uiContent.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">Performance Stats</div>
        <div>FPS: ${formatStat(this.stats.fps)} (Target: ${this.targetFPS})</div>
        <div>Frame Time: ${formatStat(this.stats.frameTime)} ms</div>
        <div>Render: ${formatStat(this.stats.renderTime)} ms</div>
        <div>Update: ${formatStat(this.stats.updateTime)} ms</div>
        <div>Physics: ${formatStat(this.stats.physicsTime)} ms</div>
        <div>Network: ${formatStat(this.stats.networkTime)} ms</div>
        <div style="margin-top: 5px; font-weight: bold;">Scene Stats</div>
        <div>Entities: ${this.stats.activeEntities}</div>
        <div>Chunks: ${this.stats.visibleChunks}</div>
        <div>Triangles: ${this.stats.triangleCount.toLocaleString()}</div>
        <div>Draw Calls: ${this.stats.drawCalls}</div>
        <div>Memory Objects: ${this.stats.memoryUsage}</div>
        <div style="margin-top: 5px; font-weight: bold;">Settings</div>
        <div>
          <label>
            <input type="checkbox" ${this.dynamicLOD ? 'checked' : ''} id="dynamic-lod-toggle">
            Dynamic LOD
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" ${this.autoAdjustViewDistance ? 'checked' : ''} id="auto-view-distance-toggle">
            Auto Adjust View Distance
          </label>
        </div>
      `;
      
      // Add event listeners to toggles
      const dynamicLODToggle = document.getElementById('dynamic-lod-toggle');
      if (dynamicLODToggle) {
        dynamicLODToggle.addEventListener('change', (e) => {
          this.dynamicLOD = e.target.checked;
        });
      }
      
      const autoViewDistanceToggle = document.getElementById('auto-view-distance-toggle');
      if (autoViewDistanceToggle) {
        autoViewDistanceToggle.addEventListener('change', (e) => {
          this.autoAdjustViewDistance = e.target.checked;
        });
      }
    }
  }