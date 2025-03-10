// server/web-server/routes/characters.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const Character = require('../../database/models/character');

const router = express.Router();

// Get all characters for the authenticated account
router.get('/', authenticate, async (req, res, next) => {
  try {
    const characters = await Character.getByAccountId(req.accountId);
    
    res.json({ characters });
  } catch (error) {
    next(error);
  }
});

// Get available character classes
router.get('/classes', async (req, res) => {
  try {
    const classes = Character.getClasses();
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

// Get available birthstones
router.get('/birthstones', async (req, res) => {
  try {
    const birthstones = Character.getBirthstones();
    res.json({ birthstones });
  } catch (error) {
    next(error);
  }
});

// Get specific character
router.get('/:characterId', authenticate, async (req, res, next) => {
  try {
    const character = await Character.getById(req.params.characterId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Verify character belongs to account
    if (character.account_id !== req.accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get additional character data (inventory, equipment, etc.)
    // This would be implemented in a real system
    
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

// Create a new character
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, class: className, birthstoneOne, birthstoneTwo } = req.body;
    
    // Validate input
    if (!name || !className || !birthstoneOne || !birthstoneTwo) {
      return res.status(400).json({
        error: 'Name, class, and birthstones are required'
      });
    }
    
    // Validate class
    const validClasses = Character.getClasses().map(c => c.name);
    if (!validClasses.includes(className)) {
      return res.status(400).json({
        error: 'Invalid class'
      });
    }
    
    // Validate birthstones
    const validBirthstones = Character.getBirthstones().map(b => b.name);
    if (!validBirthstones.includes(birthstoneOne) || !validBirthstones.includes(birthstoneTwo)) {
      return res.status(400).json({
        error: 'Invalid birthstone'
      });
    }
    
    // Create character
    const character = await Character.create({
      accountId: req.accountId,
      name,
      class: className,
      birthstoneOne,
      birthstoneTwo
    });
    
    res.status(201).json({ character });
  } catch (error) {
    // Check for duplicate name
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({
        error: 'Character name already exists'
      });
    }
    
    next(error);
  }
});

// Update character
router.patch('/:characterId', authenticate, async (req, res, next) => {
  try {
    const characterId = req.params.characterId;
    
    // Get character
    const character = await Character.getById(characterId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Verify character belongs to account
    if (character.account_id !== req.accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update character
    const updatedCharacter = await Character.update(characterId, req.body);
    
    res.json({ character: updatedCharacter });
  } catch (error) {
    next(error);
  }
});

// Delete character
router.delete('/:characterId', authenticate, async (req, res, next) => {
  try {
    const characterId = req.params.characterId;
    
    // Get character
    const character = await Character.getById(characterId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Verify character belongs to account
    if (character.account_id !== req.accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete character
    // This would need proper implementation with transaction
    // to delete related data (inventory, etc.)
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;