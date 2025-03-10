const { v4: uuidv4 } = require('uuid');

class LootSystem {
  constructor(biome) {
    this.biome = biome;
  }

  generateLoot(enemy) {
    // Get enemy type
    const enemyType = enemy.type;
    
    // Determine number of items to drop
    let itemCount = 1;
    
    if (enemyType === 'elite') {
      itemCount = Math.floor(Math.random() * 2) + 1; // 1-2 items
    } else if (enemyType === 'boss') {
      itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
    } else {
      // Regular enemy - 50% chance to drop an item
      if (Math.random() < 0.5) {
        itemCount = 0;
      }
    }
    
    if (itemCount === 0) {
      return [];
    }
    
    // Generate items
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      const item = this.generateItem(enemy);
      items.push(item);
    }
    
    return items;
  }

  generateItem(enemy) {
    // Determine item rarity based on enemy type
    let rarityRoll = Math.random();
    let rarity;
    
    if (enemy.type === 'boss') {
      // Boss has higher chance for rare+ items
      if (rarityRoll < 0.1) {
        rarity = 'legendary';
      } else if (rarityRoll < 0.4) {
        rarity = 'epic';
      } else if (rarityRoll < 0.8) {
        rarity = 'rare';
      } else {
        rarity = 'uncommon';
      }
    } else if (enemy.type === 'elite') {
      // Elite has moderate chance for rare items
      if (rarityRoll < 0.05) {
        rarity = 'legendary';
      } else if (rarityRoll < 0.2) {
        rarity = 'epic';
      } else if (rarityRoll < 0.5) {
        rarity = 'rare';
      } else {
        rarity = 'uncommon';
      }
    } else {
      // Regular enemy has low chance for rare items
      if (rarityRoll < 0.01) {
        rarity = 'legendary';
      } else if (rarityRoll < 0.05) {
        rarity = 'epic';
      } else if (rarityRoll < 0.2) {
        rarity = 'rare';
      } else if (rarityRoll < 0.5) {
        rarity = 'uncommon';
      } else {
        rarity = 'common';
      }
    }
    
    // Determine item type
    const typeRoll = Math.random();
    let type;
    
    if (typeRoll < 0.4) {
      // Weapon
      type = this.getRandomWeaponType();
    } else if (typeRoll < 0.8) {
      // Armor
      type = this.getRandomArmorType();
    } else {
      // Consumable
      type = 'potion';
    }
    
    // Generate item based on type and rarity
    if (type === 'potion') {
      return this.generateConsumable(rarity);
    } else {
      return this.generateEquipment(type, rarity, enemy.difficulty || 1);
    }
  }

  generateEquipment(type, rarity, difficulty) {
    // Base item level based on difficulty
    const baseLevel = Math.max(1, Math.floor(difficulty / 2));
    
    // Adjust level based on rarity
    let levelBonus = 0;
    
    switch (rarity) {
      case 'uncommon': levelBonus = 1; break;
      case 'rare': levelBonus = 2; break;
      case 'epic': levelBonus = 4; break;
      case 'legendary': levelBonus = 6; break;
    }
    
    const level = baseLevel + levelBonus;
    
    // Generate name
    const name = this.generateItemName(type, rarity);
    
    // Generate stat modifiers
    const statModifiers = this.generateStatModifiers(type, rarity, level);
    
    // Determine equip slot
    let equipSlot;
    
    if (type === 'sword' || type === 'staff' || type === 'bow' || type === 'mace') {
      equipSlot = 'mainhand';
    } else if (type === 'shield') {
      equipSlot = 'offhand';
    } else if (type === 'helmet') {
      equipSlot = 'head';
    } else if (type === 'chestplate') {
      equipSlot = 'chest';
    } else if (type === 'gloves') {
      equipSlot = 'hands';
    } else if (type === 'boots') {
      equipSlot = 'feet';
    } else if (type === 'amulet') {
      equipSlot = 'neck';
    } else if (type === 'ring') {
      equipSlot = 'finger';
    }
    
    return {
      id: uuidv4(),
      name,
      type,
      rarity,
      level,
      statModifiers,
      equipSlot,
      isEquippable: true
    };
  }

  generateConsumable(rarity) {
    // Determine potion type
    const typeRoll = Math.random();
    let potionType;
    
    if (typeRoll < 0.5) {
      potionType = 'health';
    } else {
      potionType = 'energy';
    }
    
    // Determine potion tier based on rarity
    let tier = 1;
    
    switch (rarity) {
      case 'uncommon': tier = 1; break;
      case 'rare': tier = 2; break;
      case 'epic': tier = 3; break;
      case 'legendary': tier = 4; break;
      default: tier = 1;
    }
    
    // Generate name
    let name;
    
    if (potionType === 'health') {
      if (tier === 1) name = 'Minor Health Potion';
      else if (tier === 2) name = 'Health Potion';
      else if (tier === 3) name = 'Major Health Potion';
      else name = 'Supreme Health Potion';
    } else {
      if (tier === 1) name = 'Minor Energy Potion';
      else if (tier === 2) name = 'Energy Potion';
      else if (tier === 3) name = 'Major Energy Potion';
      else name = 'Supreme Energy Potion';
    }
    
    // Calculate potion strength
    const baseValue = potionType === 'health' ? 50 : 50;
    const multiplier = 1 + (tier - 1) * 0.5; // 50% more per tier
    const value = Math.floor(baseValue * multiplier);
    
    return {
      id: uuidv4(),
      name,
      type: 'potion',
      potionType,
      tier,
      rarity,
      value,
      isEquippable: false,
      stackable: true,
      stackCount: 1
    };
  }

  getRandomWeaponType() {
    const weaponTypes = ['sword', 'staff', 'bow', 'mace', 'shield'];
    return weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
  }

  getRandomArmorType() {
    const armorTypes = ['helmet', 'chestplate', 'gloves', 'boots', 'amulet', 'ring'];
    return armorTypes[Math.floor(Math.random() * armorTypes.length)];
  }

  generateItemName(type, rarity) {
    // Prefixes based on rarity
    const prefixes = {
      common: ['Basic', 'Simple', 'Plain', 'Sturdy'],
      uncommon: ['Fine', 'Craft', 'Quality', 'Sturdy'],
      rare: ['Superior', 'Exceptional', 'Refined', 'Mighty'],
      epic: ['Exquisite', 'Magnificent', 'Glorious', 'Arcane'],
      legendary: ['Ancient', 'Mythical', 'Legendary', 'Divine']
    };
    
    // Suffixes based on type
    const suffixes = {
      sword: ['Blade', 'Sword', 'Edge', 'Cleaver'],
      staff: ['Staff', 'Rod', 'Wand', 'Scepter'],
      bow: ['Bow', 'Longbow', 'Shortbow', 'Recurve'],
      mace: ['Mace', 'Hammer', 'Maul', 'Bludgeon'],
      shield: ['Shield', 'Bulwark', 'Aegis', 'Defender'],
      helmet: ['Helm', 'Casque', 'Crown', 'Headguard'],
      chestplate: ['Chestplate', 'Breastplate', 'Cuirass', 'Hauberk'],
      gloves: ['Gloves', 'Gauntlets', 'Grips', 'Handguards'],
      boots: ['Boots', 'Greaves', 'Sabatons', 'Treads'],
      amulet: ['Amulet', 'Necklace', 'Pendant', 'Talisman'],
      ring: ['Ring', 'Band', 'Signet', 'Loop']
    };
    
    // Special modifiers based on rarity
    const modifiers = {
      rare: ['of Power', 'of Might', 'of Agility', 'of Wisdom'],
      epic: ['of the Champion', 'of the Mage', 'of the Hunter', 'of the Cleric'],
      legendary: ['of the Ancients', 'of the Gods', 'of Eternity', 'of Destiny']
    };
    
    // Generate name
    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const suffix = suffixes[type][Math.floor(Math.random() * suffixes[type].length)];
    
    let name = `${prefix} ${suffix}`;
    
    // Add modifier for rare+ items
    if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
      const modifier = modifiers[rarity][Math.floor(Math.random() * modifiers[rarity].length)];
      name += ` ${modifier}`;
    }
    
    return name;
  }

  generateStatModifiers(type, rarity, level) {
    // Base stat value based on level
    const baseValue = level * 2;
    
    // Rarity multipliers
    const rarityMultipliers = {
      common: 1,
      uncommon: 1.25,
      rare: 1.5,
      epic: 2,
      legendary: 3
    };
    
    const multiplier = rarityMultipliers[rarity];
    
    // Determine primary stats based on item type
    const statModifiers = {};
    
    if (type === 'sword' || type === 'mace') {
      // Melee weapons
      statModifiers.damage = Math.floor(baseValue * multiplier);
      statModifiers.attackSpeed = 1 + (level * 0.01 * multiplier);
    } else if (type === 'staff') {
      // Magic weapons
      statModifiers.magicDamage = Math.floor(baseValue * multiplier);
      statModifiers.cooldownReduction = Math.floor(level * 0.2 * multiplier);
    } else if (type === 'bow') {
      // Ranged weapons
      statModifiers.rangedDamage = Math.floor(baseValue * multiplier);
      statModifiers.criticalChance = Math.floor(level * 0.2 * multiplier);
    } else if (type === 'shield') {
      // Shields
      statModifiers.armor = Math.floor(baseValue * 0.8 * multiplier);
      statModifiers.blockChance = Math.floor(level * 0.3 * multiplier);
    } else if (type === 'helmet' || type === 'chestplate' || type === 'gloves' || type === 'boots') {
      // Armor
      statModifiers.armor = Math.floor(baseValue * 0.5 * multiplier);
      statModifiers.health = Math.floor(level * 5 * multiplier);
    } else if (type === 'amulet') {
      // Amulet
      statModifiers.magicResist = Math.floor(baseValue * 0.3 * multiplier);
      statModifiers.health = Math.floor(level * 3 * multiplier);
    } else if (type === 'ring') {
      // Ring
      statModifiers.energy = Math.floor(level * 3 * multiplier);
      statModifiers.cooldownReduction = Math.floor(level * 0.1 * multiplier);
    }
    
    // Add random secondary stats based on rarity
    const secondaryStatCount = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4
    };
    
    const secondaryStats = [
      'strength', 'agility', 'intellect', 'stamina',
      'criticalDamage', 'haste', 'healthRegen', 'energyRegen',
      'fireResist', 'iceResist', 'lightningResist'
    ];
    
    for (let i = 0; i < secondaryStatCount[rarity]; i++) {
      // Select a random secondary stat that isn't already present
      let availableStats = secondaryStats.filter(stat => !statModifiers[stat]);
      
      if (availableStats.length === 0) break;
      
      const statName = availableStats[Math.floor(Math.random() * availableStats.length)];
      const statValue = Math.floor(baseValue * 0.3 * multiplier);
      
      statModifiers[statName] = statValue;
    }
    
    return statModifiers;
  }
}

module.exports = { LootSystem };