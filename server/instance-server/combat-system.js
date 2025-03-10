class CombatSystem {
    constructor(entityManager) {
      this.entityManager = entityManager;
    }
  
    processPlayerAttack(characterId, attackData) {
      // Get player data
      const player = this.entityManager.getPlayerData(characterId);
      if (!player) {
        return [];
      }
      
      // Calculate base damage based on player stats and equipment
      let baseDamage = 10; // Default base damage
      
      // Apply equipment modifiers (in a real implementation)
      /*
      for (const [slot, item] of Object.entries(player.equipment)) {
        if (item.statModifiers && item.statModifiers.damage) {
          baseDamage += item.statModifiers.damage;
        }
      }
      */
      
      // Apply class and level scaling
      baseDamage += player.level * 2;
      
      const results = [];
      
      if (attackData.type === 'melee') {
        // Process melee attack (close range)
        
        // Find enemies in range
        const meleeRange = 2.5;
        for (const [enemyId, enemy] of this.entityManager.enemies.entries()) {
          const dx = enemy.absolutePosition.x - player.position.x;
          const dy = enemy.absolutePosition.y - player.position.y;
          const dz = enemy.absolutePosition.z - player.position.z;
          
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance <= meleeRange) {
            // Apply damage
            const damageResult = this.entityManager.updateEnemyHealth(enemyId, -baseDamage);
            results.push(damageResult);
          }
        }
      } else if (attackData.type === 'ranged') {
        // Process ranged attack (projectile)
        
        // Create projectile
        const projectile = this.entityManager.addProjectile({
          ownerId: characterId,
          type: 'arrow',
          position: player.position,
          direction: attackData.direction,
          damage: baseDamage
        });
        
        // For simplicity in the prototype, we'll do instant hit detection
        // In a real implementation, projectiles would be updated in the game loop
        
        // Check if any target IDs were provided
        if (attackData.targetIds && attackData.targetIds.length > 0) {
          for (const targetId of attackData.targetIds) {
            const damageResult = this.entityManager.updateEnemyHealth(targetId, -baseDamage);
            if (damageResult) {
              results.push(damageResult);
            }
          }
        } else {
          // Perform a raycast to find targets
          // This is simplified for the prototype
          const maxRange = 20;
          const hitEnemy = this.findEnemyInDirection(
            player.position,
            attackData.direction,
            maxRange
          );
          
          if (hitEnemy) {
            const damageResult = this.entityManager.updateEnemyHealth(hitEnemy.id, -baseDamage);
            results.push(damageResult);
          }
        }
      }
      
      return results;
    }
  
    processAbilityUse(characterId, abilityData) {
      // Get player data
      const player = this.entityManager.getPlayerData(characterId);
      if (!player) {
        return [];
      }
      
      // Verify ability exists
      // In a real implementation, we would check the player's available abilities
      const ability = this.getMockAbility(abilityData.abilityId, player.class);
      if (!ability) {
        return [];
      }
      
      // Check energy cost
      if (player.energy < ability.energyCost) {
        return [{ error: 'Not enough energy' }];
      }
      
      // Deduct energy
      this.entityManager.updatePlayerEnergy(characterId, -ability.energyCost);
      
      const results = [];
      
      // Process ability effects based on type
      switch (ability.type) {
        case 'damage':
          results.push(...this.processAbilityDamage(player, ability, abilityData));
          break;
          
        case 'healing':
          results.push(...this.processAbilityHealing(player, ability, abilityData));
          break;
          
        case 'buff':
          results.push(...this.processAbilityBuff(player, ability, abilityData));
          break;
          
        case 'debuff':
          results.push(...this.processAbilityDebuff(player, ability, abilityData));
          break;
          
        default:
          results.push({ error: 'Unknown ability type' });
      }
      
      return results;
    }
  
    processAbilityDamage(player, ability, abilityData) {
      const results = [];
      
      // Calculate damage
      let damage = ability.baseDamage;
      
      // Apply player stats and level scaling
      damage += player.level * 2;
      
      // Determine targets
      let targets = [];
      
      if (ability.targetType === 'area') {
        // Find all enemies in radius
        const center = abilityData.targetPosition || player.position;
        const radius = ability.radius || 5;
        
        for (const [enemyId, enemy] of this.entityManager.enemies.entries()) {
          const dx = enemy.absolutePosition.x - center.x;
          const dy = enemy.absolutePosition.y - center.y;
          const dz = enemy.absolutePosition.z - center.z;
          
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance <= radius) {
            targets.push(enemy);
          }
        }
      } else if (ability.targetType === 'single') {
        // Target a single enemy
        if (abilityData.targetIds && abilityData.targetIds.length > 0) {
          const targetId = abilityData.targetIds[0];
          const enemy = this.entityManager.getEnemyData(targetId);
          
          if (enemy) {
            targets.push(enemy);
          }
        } else {
          // Find enemy in direction
          const maxRange = ability.range || 10;
          const hitEnemy = this.findEnemyInDirection(
            player.position,
            abilityData.direction,
            maxRange
          );
          
          if (hitEnemy) {
            targets.push(hitEnemy);
          }
        }
      }
      
      // Apply damage to targets
      for (const target of targets) {
        const damageResult = this.entityManager.updateEnemyHealth(target.id, -damage);
        results.push(damageResult);
      }
      
      return results;
    }
  
    processAbilityHealing(player, ability, abilityData) {
      const results = [];
      
      // Calculate healing amount
      let healing = ability.baseHealing;
      
      // Apply player stats and level scaling
      healing += player.level * 2;
      
      // Determine targets
      let targets = [];
      
      if (ability.targetSelf) {
        targets.push(player);
      }
      
      if (ability.targetAllies) {
        // Add all other players
        for (const [playerId, otherPlayer] of this.entityManager.players.entries()) {
          if (playerId !== player.id) {
            targets.push(otherPlayer);
          }
        }
      }
      
      // Apply healing to targets
      for (const target of targets) {
        let healResult;
        
        if (target === player) {
          healResult = this.entityManager.updatePlayerHealth(player.id, healing);
        } else {
          healResult = this.entityManager.updatePlayerHealth(target.id, healing);
        }
        
        if (healResult) {
          results.push({
            targetId: target.id,
            type: 'heal',
            amount: healing,
            currentHealth: healResult.currentHealth,
            maxHealth: healResult.maxHealth
          });
        }
      }
      
      return results;
    }
  
    processAbilityBuff(player, ability, abilityData) {
      // In a real implementation, this would apply buffs to players
      // For the prototype, we'll just return an acknowledgment
      
      const results = [];
      
      // Determine targets
      let targets = [];
      
      if (ability.targetSelf) {
        targets.push(player);
      }
      
      if (ability.targetAllies) {
        // Add all other players
        for (const [playerId, otherPlayer] of this.entityManager.players.entries()) {
          if (playerId !== player.id) {
            targets.push(otherPlayer);
          }
        }
      }
      
      // Create buff effect
      for (const target of targets) {
        results.push({
          targetId: target.id,
          type: 'buff',
          buffType: ability.buffType,
          amount: ability.amount,
          duration: ability.duration
        });
      }
      
      return results;
    }
  
    processAbilityDebuff(player, ability, abilityData) {
      // In a real implementation, this would apply debuffs to enemies
      // For the prototype, we'll just return an acknowledgment
      
      const results = [];
      
      // Determine targets (similar to damage ability)
      let targets = [];
      
      if (ability.targetType === 'area') {
        // Find all enemies in radius
        const center = abilityData.targetPosition || player.position;
        const radius = ability.radius || 5;
        
        for (const [enemyId, enemy] of this.entityManager.enemies.entries()) {
          const dx = enemy.absolutePosition.x - center.x;
          const dy = enemy.absolutePosition.y - center.y;
          const dz = enemy.absolutePosition.z - center.z;
          
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance <= radius) {
            targets.push(enemy);
          }
        }
      } else if (ability.targetType === 'single') {
        // Target a single enemy
        if (abilityData.targetIds && abilityData.targetIds.length > 0) {
          const targetId = abilityData.targetIds[0];
          const enemy = this.entityManager.getEnemyData(targetId);
          
          if (enemy) {
            targets.push(enemy);
          }
        }
      }
      
      // Create debuff effect
      for (const target of targets) {
        results.push({
          targetId: target.id,
          type: 'debuff',
          debuffType: ability.debuffType,
          amount: ability.amount,
          duration: ability.duration
        });
      }
      
      return results;
    }
  
    findEnemyInDirection(startPosition, direction, maxRange) {
      // Normalize direction
      const magnitude = Math.sqrt(
        direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z
      );
      
      const normalizedDir = {
        x: direction.x / magnitude,
        y: direction.y / magnitude,
        z: direction.z / magnitude
      };
      
      // Find closest enemy in direction
      let closestEnemy = null;
      let closestDistance = maxRange;
      
      for (const [enemyId, enemy] of this.entityManager.enemies.entries()) {
        // Vector from start to enemy
        const toEnemy = {
          x: enemy.absolutePosition.x - startPosition.x,
          y: enemy.absolutePosition.y - startPosition.y,
          z: enemy.absolutePosition.z - startPosition.z
        };
        
        // Distance to enemy
        const distance = Math.sqrt(
          toEnemy.x * toEnemy.x +
          toEnemy.y * toEnemy.y +
          toEnemy.z * toEnemy.z
        );
        
        // Skip if too far
        if (distance > maxRange) continue;
        
        // Dot product to check if enemy is in direction
        const dot = (
          toEnemy.x * normalizedDir.x +
          toEnemy.y * normalizedDir.y +
          toEnemy.z * normalizedDir.z
        );
        
        // Skip if behind or too far to the side
        if (dot <= 0) continue;
        
        // Projection of toEnemy onto direction
        const projLength = dot;
        
        // Distance from line
        const perpDist = Math.sqrt(distance * distance - projLength * projLength);
        
        // Skip if too far from line
        const maxPerpDist = enemy.radius || 1;
        if (perpDist > maxPerpDist) continue;
        
        // If this is the closest enemy so far, store it
        if (distance < closestDistance) {
          closestEnemy = enemy;
          closestDistance = distance;
        }
      }
      
      return closestEnemy;
    }
  
    getMockAbility(abilityId, playerClass) {
      // Mock abilities for the prototype
      // In a real implementation, these would be loaded from a database
      
      const abilities = {
        'warrior_whirlwind': {
          id: 'warrior_whirlwind',
          name: 'Whirlwind',
          type: 'damage',
          targetType: 'area',
          radius: 5,
          baseDamage: 40,
          energyCost: 25,
          cooldown: 8
        },
        'warrior_warcry': {
          id: 'warrior_warcry',
          name: 'War Cry',
          type: 'buff',
          buffType: 'damage',
          amount: 20,
          duration: 10,
          targetSelf: true,
          targetAllies: true,
          energyCost: 30,
          cooldown: 15
        },
        'mage_fireball': {
          id: 'mage_fireball',
          name: 'Fireball',
          type: 'damage',
          targetType: 'area',
          radius: 3,
          baseDamage: 50,
          energyCost: 30,
          cooldown: 5
        },
        'mage_frostnova': {
          id: 'mage_frostnova',
          name: 'Frost Nova',
          type: 'debuff',
          targetType: 'area',
          radius: 4,
          debuffType: 'slow',
          amount: 40,
          duration: 8,
          energyCost: 35,
          cooldown: 12
        },
        'cleric_heal': {
          id: 'cleric_heal',
          name: 'Heal',
          type: 'healing',
          targetSelf: true,
          targetAllies: true,
          baseHealing: 40,
          energyCost: 30,
          cooldown: 8
        },
        'cleric_smite': {
          id: 'cleric_smite',
          name: 'Smite',
          type: 'damage',
          targetType: 'single',
          baseDamage: 35,
          energyCost: 25,
          cooldown: 10
        }
      };
      
      return abilities[abilityId];
    }
  }
  
  module.exports = { CombatSystem };