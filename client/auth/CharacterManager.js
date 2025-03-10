// client/auth/CharacterManager.js
export class CharacterManager {
    constructor(authManager) {
      this.authManager = authManager;
      this.characters = [];
      this.selectedCharacter = null;
      this.characterClasses = [];
      this.birthstones = [];
      this.onCharacterSelected = null;
    }
  
    /**
     * Fetch all characters for the current account
     */
    async fetchCharacters() {
      try {
        if (!this.authManager.isLoggedIn()) {
          throw new Error('Not authenticated');
        }
  
        const response = await fetch('/api/characters', {
          headers: {
            'Authorization': `Bearer ${this.authManager.getToken()}`
          }
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }
  
        const data = await response.json();
        this.characters = data.characters || [];
        
        // Check if we have a previously selected character
        const storedCharacterId = localStorage.getItem('characterId');
        if (storedCharacterId) {
          const storedCharacter = this.characters.find(char => char.character_id === storedCharacterId);
          if (storedCharacter) {
            this.selectedCharacter = storedCharacter;
          }
        }
  
        return this.characters;
      } catch (error) {
        console.error('Error fetching characters:', error);
        return [];
      }
    }
  
    /**
     * Fetch available character classes
     */
    async fetchClasses() {
      try {
        const response = await fetch('/api/characters/classes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch character classes');
        }
        
        const data = await response.json();
        this.characterClasses = data.classes || [];
        
        return this.characterClasses;
      } catch (error) {
        console.error('Error fetching character classes:', error);
        return [];
      }
    }
  
    /**
     * Fetch available birthstones
     */
    async fetchBirthstones() {
      try {
        const response = await fetch('/api/characters/birthstones');
        
        if (!response.ok) {
          throw new Error('Failed to fetch birthstones');
        }
        
        const data = await response.json();
        this.birthstones = data.birthstones || [];
        
        return this.birthstones;
      } catch (error) {
        console.error('Error fetching birthstones:', error);
        return [];
      }
    }
  
    /**
     * Create a new character
     * @param {Object} characterData - Character creation data
     */
    async createCharacter(characterData) {
      try {
        if (!this.authManager.isLoggedIn()) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch('/api/characters', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authManager.getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(characterData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create character');
        }
        
        const data = await response.json();
        
        // Update characters list
        await this.fetchCharacters();
        
        return { 
          success: true, 
          character: data.character 
        };
      } catch (error) {
        console.error('Error creating character:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    }
  
    /**
     * Select a character by ID
     * @param {string} characterId 
     */
    selectCharacter(characterId) {
      const character = this.characters.find(char => char.character_id === characterId);
      
      if (!character) {
        return { 
          success: false, 
          error: 'Character not found' 
        };
      }
      
      this.selectedCharacter = character;
      localStorage.setItem('characterId', characterId);
      
      if (this.onCharacterSelected) {
        this.onCharacterSelected(character);
      }
      
      return { 
        success: true, 
        character: character 
      };
    }
  
    /**
     * Get the currently selected character
     */
    getSelectedCharacter() {
      return this.selectedCharacter;
    }
  
    /**
     * Get the selected character ID
     */
    getSelectedCharacterId() {
      return this.selectedCharacter ? this.selectedCharacter.character_id : null;
    }
  
    /**
     * Set a callback function to be called when a character is selected
     * @param {Function} callback 
     */
    setCharacterSelectedCallback(callback) {
      this.onCharacterSelected = callback;
    }
  
    /**
     * Clear the selected character
     */
    clearSelectedCharacter() {
      this.selectedCharacter = null;
      localStorage.removeItem('characterId');
    }
  }