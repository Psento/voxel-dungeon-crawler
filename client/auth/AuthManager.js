// client/auth/AuthManager.js
export class AuthManager {
    constructor() {
      this.token = null;
      this.accountId = null;
      this.username = null;
      this.isAuthenticated = false;
      this.onAuthStateChanged = null;
      
      // Initialize from localStorage if available
      this.loadFromStorage();
    }
  
    /**
     * Load authentication data from localStorage
     */
    loadFromStorage() {
      const token = localStorage.getItem('token');
      const accountId = localStorage.getItem('accountId');
      const username = localStorage.getItem('username');
      
      if (token && accountId) {
        this.token = token;
        this.accountId = accountId;
        this.username = username || '';
        this.isAuthenticated = true;
      }
    }
  
    /**
     * Save authentication data to localStorage
     */
    saveToStorage() {
      if (this.token && this.accountId) {
        localStorage.setItem('token', this.token);
        localStorage.setItem('accountId', this.accountId);
        if (this.username) {
          localStorage.setItem('username', this.username);
        }
      }
    }
  
    /**
     * Clear authentication data
     */
    clearAuth() {
      this.token = null;
      this.accountId = null;
      this.username = null;
      this.isAuthenticated = false;
      
      localStorage.removeItem('token');
      localStorage.removeItem('accountId');
      localStorage.removeItem('username');
      localStorage.removeItem('characterId');
      
      if (this.onAuthStateChanged) {
        this.onAuthStateChanged(false);
      }
    }
  
    /**
     * Authenticate user with username and password
     * @param {string} username 
     * @param {string} password 
     */
    async login(username, password) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Login failed');
        }
        
        const data = await response.json();
        
        this.token = data.token;
        this.accountId = data.accountId;
        this.username = data.username;
        this.isAuthenticated = true;
        
        this.saveToStorage();
        
        if (this.onAuthStateChanged) {
          this.onAuthStateChanged(true);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Authentication error:', error);
        return { 
          success: false, 
          error: error.message || 'Authentication failed'
        };
      }
    }
  
    /**
     * Register a new user
     * @param {string} username 
     * @param {string} email 
     * @param {string} password 
     */
    async register(username, email, password) {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Registration failed');
        }
        
        const data = await response.json();
        
        this.token = data.token;
        this.accountId = data.accountId;
        this.username = data.username;
        this.isAuthenticated = true;
        
        this.saveToStorage();
        
        if (this.onAuthStateChanged) {
          this.onAuthStateChanged(true);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Registration error:', error);
        return { 
          success: false, 
          error: error.message || 'Registration failed'
        };
      }
    }
  
    /**
     * Logout the current user
     */
    logout() {
      this.clearAuth();
      return { success: true };
    }
  
    /**
     * Check if the user is authenticated
     */
    isLoggedIn() {
      return this.isAuthenticated;
    }
  
    /**
     * Get the auth token
     */
    getToken() {
      return this.token;
    }
  
    /**
     * Get the account ID
     */
    getAccountId() {
      return this.accountId;
    }
  
    /**
     * Set a callback function to be called when auth state changes
     * @param {Function} callback 
     */
    setAuthStateChangedCallback(callback) {
      this.onAuthStateChanged = callback;
    }
  }