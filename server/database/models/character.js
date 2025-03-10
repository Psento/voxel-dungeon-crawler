// server/database/models/character.js
const { pool } = require('../index');
const { v4: uuidv4 } = require('uuid');

class Character {
  static async getByAccountId(accountId) {
    const { rows } = await pool().query(
      'SELECT * FROM characters WHERE account_id = $1',
      [accountId]
    );
    
    return rows;
  }
  
  static async getById(characterId) {
    const { rows } = await pool().query(
      'SELECT * FROM characters WHERE character_id = $1',
      [characterId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }
  
  static async create(data) {
    const characterId = uuidv4();
    
    // Get base stats for class
    const baseStats = Character.getClassBaseStats(data.class);
    
    // Apply birthstone effects to base stats
    const stats = Character.applyBirthstoneEffects(
      baseStats,
      data.birthstoneOne,
      data.birthstoneTwo
    );
    
    const { rows } = await pool().query(
      `INSERT INTO characters (
        character_id, account_id, name, class, 
        birthstone_one, birthstone_two, health, energy,
        health_flask_tier, energy_flask_tier,
        health_flask_charges, energy_flask_charges
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        characterId,
        data.accountId,
        data.name,
        data.class,
        data.birthstoneOne,
        data.birthstoneTwo,
        stats.health,
        stats.energy,
        1, // Initial flask tier
        1, // Initial flask tier
        3, // Initial flask charges
        3  // Initial flask charges
      ]
    );
    
    return rows[0];
  }
  
  static async update(characterId, data) {
    const updateFields = [];
    const values = [characterId];
    let paramIndex = 2;
    
    // Build dynamic update query
    for (const [key, value] of Object.entries(data)) {
      // Skip character_id
      if (key === 'character_id') continue;
      
      // Convert camelCase to snake_case
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      updateFields.push(`${dbField} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return null;
    }
    
    const query = `
      UPDATE characters 
      SET ${updateFields.join(', ')}, last_played_date = CURRENT_TIMESTAMP
      WHERE character_id = $1
      RETURNING *
    `;
    
    const { rows } = await pool().query(query, values);
    
    return rows.length > 0 ? rows[0] : null;
  }
  
  static async addExperience(characterId, amount) {
    // Get current character data
    const character = await Character.getById(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Calculate new experience and check for level up
    const newExperience = character.experience + amount;
    const newLevel = Character.calculateLevel(newExperience);
    const leveledUp = newLevel > character.level;
    
    // Update character
    const { rows } = await pool().query(
      `UPDATE characters 
       SET experience = $1, level = $2, last_played_date = CURRENT_TIMESTAMP
       WHERE character_id = $3
       RETURNING *`,
      [newExperience, newLevel, characterId]
    );
    
    // If leveled up, update stats
    if (leveledUp) {
      await Character.updateStatsForLevel(characterId, newLevel);
    }
    
    return {
      character: rows[0],
      leveledUp,
      experienceGained: amount
    };
  }
  
  static async updateStatsForLevel(characterId, level) {
    const character = await Character.getById(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Get base stats for class
    const baseStats = Character.getClassBaseStats(character.class);
    
    // Apply level scaling (10% per level)
    const levelMultiplier = 1 + ((level - 1) * 0.1);
    
    const healthBase = Math.floor(baseStats.health * levelMultiplier);
    const energyBase = Math.floor(baseStats.energy * levelMultiplier);
    
    // Apply birthstone effects
    const stats = Character.applyBirthstoneEffects(
      { health: healthBase, energy: energyBase },
      character.birthstone_one,
      character.birthstone_two
    );
    
    // Update character stats
    const { rows } = await pool().query(
      `UPDATE characters 
       SET health = $1, energy = $2
       WHERE character_id = $3
       RETURNING *`,
      [stats.health, stats.energy, characterId]
    );
    
    return rows[0];
  }
  
  static calculateLevel(experience) {
    // Simple level formula: Each level requires 1000 * level experience
    let level = 1;
    let expRequired = 1000;
    let remainingExp = experience;
    
    while (remainingExp >= expRequired) {
      remainingExp -= expRequired;
      level++;
      expRequired = 1000 * level;
    }
    
    return level;
  }
  
  static getClassBaseStats(className) {
    // Base stats for each class
    const classStats = {
      'Warrior': { health: 150, energy: 80 },
      'Mage': { health: 80, energy: 150 },
      'Archer': { health: 100, energy: 120 },
      'Cleric': { health: 120, energy: 130 }
    };
    
    return classStats[className] || { health: 100, energy: 100 };
  }
  
  static applyBirthstoneEffects(stats, birthstoneOne, birthstoneTwo) {
    const birthstones = [birthstoneOne, birthstoneTwo];
    let health = stats.health;
    let energy = stats.energy;
    
    birthstones.forEach(stone => {
      switch(stone) {
        case 'Ruby':
          // Ruby doesn't affect health/energy directly
          break;
        case 'Sapphire':
          energy = Math.floor(energy * 1.15); // +15% energy
          break;
        case 'Diamond':
          health = Math.floor(health * 1.12); // +12% health
          break;
        case 'Amethyst':
          energy = Math.floor(energy * 1.08); // +8% energy
          break;
        case 'Aquamarine':
          health = Math.floor(health * 1.08); // +8% health
          break;
        case 'Peridot':
          health = Math.floor(health * 1.05); // +5% health
          break;
        // Add other birthstones as needed
      }
    });
    
    return { health, energy };
  }
  
  static getBirthstones() {
    // Available birthstones and their effects
    return [
      { name: 'Ruby', effect: 'Increases damage dealt by 10%' },
      { name: 'Sapphire', effect: 'Increases maximum energy by 15%' },
      { name: 'Emerald', effect: 'Reduces cooldown of abilities by 8%' },
      { name: 'Diamond', effect: 'Increases maximum health by 12%' },
      { name: 'Amethyst', effect: 'Increases energy regeneration by 20%' },
      { name: 'Topaz', effect: 'Increases gold found by 25%' },
      { name: 'Opal', effect: 'Increases experience gained by 10%' },
      { name: 'Garnet', effect: 'Increases critical hit chance by 5%' },
      { name: 'Aquamarine', effect: 'Reduces damage taken by 8%' },
      { name: 'Peridot', effect: 'Increases healing received by 12%' }
    ];
  }
  
  static getClasses() {
    // Available classes and their descriptions
    return [
      {
        name: 'Warrior',
        description: 'A stalwart defender with high health and melee damage.',
        armorType: 'Heavy',
        weaponType: 'Melee',
        abilities: [
          { name: 'Whirlwind', description: 'Spin in a circle, damaging all nearby enemies.' },
          { name: 'War Cry', description: 'Increase damage for you and nearby allies.' },
          { name: 'Berserk', description: 'Enter a rage, increasing attack speed and damage.' }
        ]
      },
      {
        name: 'Mage',
        description: 'A powerful spellcaster with high energy and ranged magical attacks.',
        armorType: 'Light',
        weaponType: 'Staff',
        abilities: [
          { name: 'Fireball', description: 'Launch a ball of fire that explodes on impact.' },
          { name: 'Frost Nova', description: 'Release a burst of cold that slows all nearby enemies.' },
          { name: 'Arcane Barrage', description: 'Channel arcane energy to bombard an area.' }
        ]
      },
      {
        name: 'Archer',
        description: 'A nimble fighter with high accuracy and ranged physical attacks.',
        armorType: 'Medium',
        weaponType: 'Bow',
        abilities: [
          { name: 'Multishot', description: 'Fire multiple arrows in a cone.' },
          { name: 'Trap', description: 'Place a trap that snares enemies.' },
          { name: 'Rain of Arrows', description: 'Call down a hail of arrows on an area.' }
        ]
      },
      {
        name: 'Cleric',
        description: 'A devoted healer with supportive abilities and decent defense.',
        armorType: 'Medium',
        weaponType: 'Mace',
        abilities: [
          { name: 'Heal', description: 'Restore health to yourself and nearby allies.' },
          { name: 'Smite', description: 'Call down holy light to damage and weaken an enemy.' },
          { name: 'Divine Shield', description: 'Create a protective barrier around party members.' }
        ]
      }
    ];
  }
}

module.exports = Character;