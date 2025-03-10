// server/database/models/guild.js
const { pool, withTransaction } = require('../index');
const { v4: uuidv4 } = require('uuid');

class Guild {
  static async create(data) {
    return withTransaction(async (client) => {
      const guildId = uuidv4();
      
      // Create guild
      const { rows } = await client.query(
        `INSERT INTO guilds (guild_id, name, description, leader_id, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *`,
        [guildId, data.name, data.description, data.leaderId]
      );
      
      // Add leader as first member
      await client.query(
        `INSERT INTO guild_members (guild_id, account_id, role, joined_at)
        VALUES ($1, $2, 'leader', CURRENT_TIMESTAMP)`,
        [guildId, data.leaderId]
      );
      
      return rows[0];
    });
  }
  
  static async getById(guildId) {
    const { rows } = await pool().query(
      `SELECT g.*, a.username as leader_name,
        (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.guild_id) as member_count
      FROM guilds g
      JOIN accounts a ON g.leader_id = a.account_id
      WHERE g.guild_id = $1`,
      [guildId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }
  
  static async getByAccountId(accountId) {
    const { rows } = await pool().query(
      `SELECT g.*, gm.role, gm.joined_at
      FROM guilds g
      JOIN guild_members gm ON g.guild_id = gm.guild_id
      WHERE gm.account_id = $1`,
      [accountId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }
  
  static async getMembers(guildId) {
    const { rows } = await pool().query(
      `SELECT gm.*, a.username, 
        (SELECT c.name FROM characters c 
         WHERE c.account_id = a.account_id 
         ORDER BY c.last_played_date DESC LIMIT 1) as character_name
      FROM guild_members gm
      JOIN accounts a ON gm.account_id = a.account_id
      WHERE gm.guild_id = $1
      ORDER BY 
        CASE 
          WHEN gm.role = 'leader' THEN 1
          WHEN gm.role = 'officer' THEN 2
          ELSE 3
        END,
        gm.joined_at ASC`,
      [guildId]
    );
    
    return rows;
  }
  
  static async inviteMember(guildId, inviterId, targetUsername) {
    return withTransaction(async (client) => {
      // Check if inviter is an officer or leader
      const { rows: inviterRows } = await client.query(
        `SELECT role FROM guild_members
        WHERE guild_id = $1 AND account_id = $2
        AND role IN ('leader', 'officer')`,
        [guildId, inviterId]
      );
      
      if (inviterRows.length === 0) {
        throw new Error('Not authorized to invite members');
      }
      
      // Get target account
      const { rows: targetRows } = await client.query(
        'SELECT account_id FROM accounts WHERE username = $1',
        [targetUsername]
      );
      
      if (targetRows.length === 0) {
        throw new Error('User not found');
      }
      
      const targetId = targetRows[0].account_id;
      
      // Check if already a member
      const { rows: memberRows } = await client.query(
        'SELECT * FROM guild_members WHERE guild_id = $1 AND account_id = $2',
        [guildId, targetId]
      );
      
      if (memberRows.length > 0) {
        throw new Error('User is already a guild member');
      }
      
      // Check if already invited
      const { rows: inviteRows } = await client.query(
        'SELECT * FROM guild_invites WHERE guild_id = $1 AND account_id = $2',
        [guildId, targetId]
      );
      
      if (inviteRows.length > 0) {
        throw new Error('User has already been invited');
      }
      
      // Create invite
      const inviteId = uuidv4();
      
      const { rows } = await client.query(
        `INSERT INTO guild_invites 
          (invite_id, guild_id, account_id, inviter_id, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *`,
        [inviteId, guildId, targetId, inviterId]
      );
      
      return {
        invite: rows[0],
        targetId
      };
    });
  }
  
  static async acceptInvite(inviteId, accountId) {
    return withTransaction(async (client) => {
      // Verify invite
      const { rows: inviteRows } = await client.query(
        `SELECT * FROM guild_invites 
        WHERE invite_id = $1 AND account_id = $2`,
        [inviteId, accountId]
      );
      
      if (inviteRows.length === 0) {
        throw new Error('Invite not found');
      }
      
      const invite = inviteRows[0];
      
      // Check if already a member of another guild
      const { rows: existingGuildRows } = await client.query(
        'SELECT * FROM guild_members WHERE account_id = $1',
        [accountId]
      );
      
      if (existingGuildRows.length > 0) {
        throw new Error('Already a member of a guild');
      }
      
      // Add as member
      await client.query(
        `INSERT INTO guild_members (guild_id, account_id, role, joined_at)
        VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
        [invite.guild_id, accountId]
      );
      
      // Delete invite
      await client.query(
        'DELETE FROM guild_invites WHERE invite_id = $1',
        [inviteId]
      );
      
      return invite.guild_id;
    });
  }
  
  static async declineInvite(inviteId, accountId) {
    const { rows } = await pool().query(
      `DELETE FROM guild_invites 
      WHERE invite_id = $1 AND account_id = $2
      RETURNING *`,
      [inviteId, accountId]
    );
    
    if (rows.length === 0) {
      throw new Error('Invite not found');
    }
    
    return rows[0];
  }
  
  static async leaveGuild(guildId, accountId) {
    return withTransaction(async (client) => {
      // Check if user is the guild leader
      const { rows: guildRows } = await client.query(
        'SELECT * FROM guilds WHERE guild_id = $1',
        [guildId]
      );
      
      if (guildRows.length === 0) {
        throw new Error('Guild not found');
      }
      
      if (guildRows[0].leader_id === accountId) {
        throw new Error('Guild leader cannot leave. Transfer leadership first.');
      }
      
      // Remove member
      const { rows } = await client.query(
        `DELETE FROM guild_members 
        WHERE guild_id = $1 AND account_id = $2
        RETURNING *`,
        [guildId, accountId]
      );
      
      if (rows.length === 0) {
        throw new Error('Not a member of this guild');
      }
      
      return rows[0];
    });
  }
  
  static async transferLeadership(guildId, leaderId, newLeaderId) {
    return withTransaction(async (client) => {
      // Verify current leader
      const { rows: guildRows } = await client.query(
        'SELECT * FROM guilds WHERE guild_id = $1 AND leader_id = $2',
        [guildId, leaderId]
      );
      
      if (guildRows.length === 0) {
        throw new Error('Not authorized to transfer leadership');
      }
      
      // Verify new leader is a member
      const { rows: memberRows } = await client.query(
        'SELECT * FROM guild_members WHERE guild_id = $1 AND account_id = $2',
        [guildId, newLeaderId]
      );
      
      if (memberRows.length === 0) {
        throw new Error('New leader is not a guild member');
      }
      
      // Update guild leader
      await client.query(
        'UPDATE guilds SET leader_id = $1 WHERE guild_id = $2',
        [newLeaderId, guildId]
      );
      
      // Update member roles
      await client.query(
        'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND account_id = $3',
        ['member', guildId, leaderId]
      );
      
      await client.query(
        'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND account_id = $3',
        ['leader', guildId, newLeaderId]
      );
      
      return guildId;
    });
  }
  
  static async updateGuild(guildId, leaderId, data) {
    // Verify leadership
    const { rows: guildRows } = await pool().query(
      'SELECT * FROM guilds WHERE guild_id = $1 AND leader_id = $2',
      [guildId, leaderId]
    );
    
    if (guildRows.length === 0) {
      throw new Error('Not authorized to update guild');
    }
    
    // Update fields
    const validFields = ['name', 'description'];
    const setClause = [];
    const values = [guildId];
    
    let paramIndex = 2;
    for (const [key, value] of Object.entries(data)) {
      if (validFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const { rows } = await pool().query(
      `UPDATE guilds SET ${setClause.join(', ')} WHERE guild_id = $1 RETURNING *`,
      values
    );
    
    return rows[0];
  }
  
  static async updateMemberRole(guildId, leaderId, memberId, newRole) {
    return withTransaction(async (client) => {
      // Validate role
      const validRoles = ['member', 'officer'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid role');
      }
      
      // Verify leadership
      const { rows: guildRows } = await client.query(
        'SELECT * FROM guilds WHERE guild_id = $1 AND leader_id = $2',
        [guildId, leaderId]
      );
      
      if (guildRows.length === 0) {
        throw new Error('Not authorized to update member roles');
      }
      
      // Check if target is a member
      const { rows: memberRows } = await client.query(
        'SELECT * FROM guild_members WHERE guild_id = $1 AND account_id = $2',
        [guildId, memberId]
      );
      
      if (memberRows.length === 0) {
        throw new Error('Target is not a guild member');
      }
      
      // Update role
      const { rows } = await client.query(
        'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND account_id = $3 RETURNING *',
        [newRole, guildId, memberId]
      );
      
      return rows[0];
    });
  }
  
  static async removeMember(guildId, leaderId, memberId) {
    return withTransaction(async (client) => {
      // Verify leadership or officer status
      const { rows: leaderRows } = await client.query(
        `SELECT role FROM guild_members 
        WHERE guild_id = $1 AND account_id = $2 
        AND role IN ('leader', 'officer')`,
        [guildId, leaderId]
      );
      
      if (leaderRows.length === 0) {
        throw new Error('Not authorized to remove members');
      }
      
      // Can't remove leader
      const { rows: guildRows } = await client.query(
        'SELECT leader_id FROM guilds WHERE guild_id = $1',
        [guildId]
      );
      
      if (guildRows.length === 0) {
        throw new Error('Guild not found');
      }
      
      if (guildRows[0].leader_id === memberId) {
        throw new Error('Cannot remove guild leader');
      }
      
      // Officers can only remove regular members
      if (leaderRows[0].role === 'officer') {
        const { rows: targetRows } = await client.query(
          'SELECT role FROM guild_members WHERE guild_id = $1 AND account_id = $2',
          [guildId, memberId]
        );
        
        if (targetRows.length === 0) {
          throw new Error('Member not found');
        }
        
        if (targetRows[0].role === 'officer') {
          throw new Error('Officers cannot remove other officers');
        }
      }
      
      // Remove member
      const { rows } = await client.query(
        'DELETE FROM guild_members WHERE guild_id = $1 AND account_id = $2 RETURNING *',
        [guildId, memberId]
      );
      
      if (rows.length === 0) {
        throw new Error('Member not found');
      }
      
      return rows[0];
    });
  }
  
  static async getInvites(accountId) {
    const { rows } = await pool().query(
      `SELECT gi.*, g.name as guild_name, a.username as inviter_name
      FROM guild_invites gi
      JOIN guilds g ON gi.guild_id = g.guild_id
      JOIN accounts a ON gi.inviter_id = a.account_id
      WHERE gi.account_id = $1`,
      [accountId]
    );
    
    return rows;
  }
}

module.exports = Guild;