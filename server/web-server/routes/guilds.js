const express = require('express');
const { authenticate } = require('../middleware/auth');
const Guild = require('../../database/models/guild');

const router = express.Router();

// Get all guilds (paginated)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    
    // This is a simplified version - in a real implementation,
    // we would have a method to get all guilds with pagination
    const { rows } = await pool().query(
      `SELECT g.*, a.username as leader_name,
        (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.guild_id) as member_count
      FROM guilds g
      JOIN accounts a ON g.leader_id = a.account_id
      ORDER BY g.name
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({ guilds: rows });
  } catch (error) {
    next(error);
  }
});

// Get guild by ID
router.get('/:guildId', async (req, res, next) => {
  try {
    const guild = await Guild.getById(req.params.guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    res.json({ guild });
  } catch (error) {
    next(error);
  }
});

// Get guild members
router.get('/:guildId/members', async (req, res, next) => {
  try {
    const guild = await Guild.getById(req.params.guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const members = await Guild.getMembers(req.params.guildId);
    
    res.json({ members });
  } catch (error) {
    next(error);
  }
});

// Create a new guild
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Guild name is required' });
    }
    
    // Check if already in a guild
    const existingGuild = await Guild.getByAccountId(req.accountId);
    
    if (existingGuild) {
      return res.status(400).json({ error: 'You are already in a guild' });
    }
    
    // Create guild
    const guild = await Guild.create({
      name,
      description: description || '',
      leaderId: req.accountId
    });
    
    res.status(201).json({ guild });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Guild name already exists' });
    }
    
    next(error);
  }
});

// Update a guild
router.put('/:guildId', authenticate, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    // Update guild
    const guild = await Guild.updateGuild(req.params.guildId, req.accountId, {
      name,
      description
    });
    
    res.json({ guild });
  } catch (error) {
    if (error.message === 'Not authorized to update guild') {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(400).json({ error: 'Guild name already exists' });
    }
    
    next(error);
  }
});

// Invite a member
router.post('/:guildId/invite', authenticate, async (req, res, next) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await Guild.inviteMember(req.params.guildId, req.accountId, username);
    
    res.status(201).json({
      message: 'Invitation sent',
      invite: result.invite
    });
  } catch (error) {
    if (error.message === 'Not authorized to invite members' ||
        error.message === 'User not found' ||
        error.message === 'User is already a guild member' ||
        error.message === 'User has already been invited') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

// Accept an invite
router.post('/invites/:inviteId/accept', authenticate, async (req, res, next) => {
  try {
    const guildId = await Guild.acceptInvite(req.params.inviteId, req.accountId);
    
    res.json({
      message: 'Invite accepted',
      guildId
    });
  } catch (error) {
    if (error.message === 'Invite not found' ||
        error.message === 'Already a member of a guild') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

// Decline an invite
router.post('/invites/:inviteId/decline', authenticate, async (req, res, next) => {
  try {
    await Guild.declineInvite(req.params.inviteId, req.accountId);
    
    res.json({
      message: 'Invite declined'
    });
  } catch (error) {
    if (error.message === 'Invite not found') {
      return res.status(404).json({ error: error.message });
    }
    
    next(error);
  }
});

// Get invites for current user
router.get('/invites', authenticate, async (req, res, next) => {
  try {
    const invites = await Guild.getInvites(req.accountId);
    
    res.json({ invites });
  } catch (error) {
    next(error);
  }
});

// Leave a guild
router.post('/:guildId/leave', authenticate, async (req, res, next) => {
  try {
    await Guild.leaveGuild(req.params.guildId, req.accountId);
    
    res.json({
      message: 'Left guild successfully'
    });
  } catch (error) {
    if (error.message === 'Guild not found' ||
        error.message === 'Not a member of this guild' ||
        error.message === 'Guild leader cannot leave. Transfer leadership first.') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

// Transfer leadership
router.post('/:guildId/transfer-leadership', authenticate, async (req, res, next) => {
  try {
    const { newLeaderId } = req.body;
    
    if (!newLeaderId) {
      return res.status(400).json({ error: 'New leader ID is required' });
    }
    
    await Guild.transferLeadership(req.params.guildId, req.accountId, newLeaderId);
    
    res.json({
      message: 'Leadership transferred successfully'
    });
  } catch (error) {
    if (error.message === 'Not authorized to transfer leadership' ||
        error.message === 'New leader is not a guild member') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

// Update member role
router.put('/:guildId/members/:memberId/role', authenticate, async (req, res, next) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    
    const result = await Guild.updateMemberRole(
      req.params.guildId,
      req.accountId,
      req.params.memberId,
      role
    );
    
    res.json({
      message: 'Member role updated',
      member: result
    });
  } catch (error) {
    if (error.message === 'Invalid role' ||
        error.message === 'Not authorized to update member roles' ||
        error.message === 'Target is not a guild member') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

// Remove a member
router.delete('/:guildId/members/:memberId', authenticate, async (req, res, next) => {
  try {
    await Guild.removeMember(
      req.params.guildId,
      req.accountId,
      req.params.memberId
    );
    
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Not authorized to remove members' ||
        error.message === 'Guild not found' ||
        error.message === 'Cannot remove guild leader' ||
        error.message === 'Officers cannot remove other officers' ||
        error.message === 'Member not found') {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
});

module.exports = router;