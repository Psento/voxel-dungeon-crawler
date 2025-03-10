// server/database/models/friendship.js
const { pool, withTransaction } = require('../index');
const { v4: uuidv4 } = require('uuid');

class Friendship {
  static async getFriendships(accountId) {
    const { rows } = await pool().query(
      `SELECT f.*, 
        a1.username as requester_name, 
        a2.username as recipient_name,
        c1.name as requester_character_name,
        c2.name as recipient_character_name
      FROM friendships f
      JOIN accounts a1 ON f.requester_id = a1.account_id
      JOIN accounts a2 ON f.recipient_id = a2.account_id
      LEFT JOIN characters c1 ON c1.account_id = a1.account_id AND c1.last_played_date = (
        SELECT MAX(last_played_date) FROM characters WHERE account_id = a1.account_id
      )
      LEFT JOIN characters c2 ON c2.account_id = a2.account_id AND c2.last_played_date = (
        SELECT MAX(last_played_date) FROM characters WHERE account_id = a2.account_id
      )
      WHERE (f.requester_id = $1 OR f.recipient_id = $1) 
        AND f.status IN ('pending', 'accepted')`,
      [accountId]
    );
    
    return rows.map(row => {
      const isSender = row.requester_id === accountId;
      const friendId = isSender ? row.recipient_id : row.requester_id;
      const friendName = isSender ? row.recipient_name : row.requester_name;
      const friendCharacterName = isSender ? row.recipient_character_name : row.requester_character_name;
      
      return {
        id: row.friendship_id,
        friendId,
        friendName,
        friendCharacterName,
        status: row.status,
        isSender,
        createdAt: row.created_at
      };
    });
  }
  
  static async getFriendRequests(accountId) {
    const { rows } = await pool().query(
      `SELECT f.*, 
        a.username as requester_name,
        c.name as requester_character_name
      FROM friendships f
      JOIN accounts a ON f.requester_id = a.account_id
      LEFT JOIN characters c ON c.account_id = a.account_id AND c.last_played_date = (
        SELECT MAX(last_played_date) FROM characters WHERE account_id = a.account_id
      )
      WHERE f.recipient_id = $1 AND f.status = 'pending'`,
      [accountId]
    );
    
    return rows.map(row => ({
      id: row.friendship_id,
      requesterId: row.requester_id,
      requesterName: row.requester_name,
      requesterCharacterName: row.requester_character_name,
      createdAt: row.created_at
    }));
  }
  
  static async sendFriendRequest(requesterId, recipientUsername) {
    return withTransaction(async (client) => {
      // Find recipient by username
      const { rows: recipientRows } = await client.query(
        'SELECT account_id FROM accounts WHERE username = $1',
        [recipientUsername]
      );
      
      if (recipientRows.length === 0) {
        throw new Error('User not found');
      }
      
      const recipientId = recipientRows[0].account_id;
      
      // Check if they're already friends or have a pending request
      const { rows: existingRows } = await client.query(
        `SELECT * FROM friendships 
        WHERE (requester_id = $1 AND recipient_id = $2)
           OR (requester_id = $2 AND recipient_id = $1)`,
        [requesterId, recipientId]
      );
      
      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (existing.status === 'accepted') {
          throw new Error('Already friends');
        } else if (existing.status === 'pending') {
          throw new Error('Friend request already pending');
        } else if (existing.status === 'rejected') {
          // If previously rejected, update to pending again
          await client.query(
            `UPDATE friendships
            SET status = 'pending', updated_at = CURRENT_TIMESTAMP
            WHERE friendship_id = $1
            RETURNING *`,
            [existing.friendship_id]
          );
          
          return { id: existing.friendship_id, recipientId };
        }
      }
      
      // Create new friend request
      const { rows } = await client.query(
        `INSERT INTO friendships (friendship_id, requester_id, recipient_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *`,
        [uuidv4(), requesterId, recipientId]
      );
      
      return { id: rows[0].friendship_id, recipientId };
    });
  }
  
  static async acceptFriendRequest(friendshipId, accountId) {
    return withTransaction(async (client) => {
      // Verify this request is for this user
      const { rows } = await client.query(
        `SELECT * FROM friendships 
        WHERE friendship_id = $1 AND recipient_id = $2 AND status = 'pending'`,
        [friendshipId, accountId]
      );
      
      if (rows.length === 0) {
        throw new Error('Friend request not found');
      }
      
      // Accept the request
      const { rows: updated } = await client.query(
        `UPDATE friendships
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE friendship_id = $1
        RETURNING *`,
        [friendshipId]
      );
      
      return updated[0];
    });
  }
  
  static async rejectFriendRequest(friendshipId, accountId) {
    return withTransaction(async (client) => {
      // Verify this request is for this user
      const { rows } = await client.query(
        `SELECT * FROM friendships 
        WHERE friendship_id = $1 AND recipient_id = $2 AND status = 'pending'`,
        [friendshipId, accountId]
      );
      
      if (rows.length === 0) {
        throw new Error('Friend request not found');
      }
      
      // Reject the request
      const { rows: updated } = await client.query(
        `UPDATE friendships
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE friendship_id = $1
        RETURNING *`,
        [friendshipId]
      );
      
      return updated[0];
    });
  }
  
  static async removeFriend(friendshipId, accountId) {
    return withTransaction(async (client) => {
      // Verify this friendship involves this user
      const { rows } = await client.query(
        `SELECT * FROM friendships 
        WHERE friendship_id = $1 
          AND (requester_id = $2 OR recipient_id = $2)
          AND status = 'accepted'`,
        [friendshipId, accountId]
      );
      
      if (rows.length === 0) {
        throw new Error('Friendship not found');
      }
      
      // Remove friendship (soft delete by setting status to 'removed')
      const { rows: updated } = await client.query(
        `UPDATE friendships
        SET status = 'removed', updated_at = CURRENT_TIMESTAMP
        WHERE friendship_id = $1
        RETURNING *`,
        [friendshipId]
      );
      
      return updated[0];
    });
  }
  
  static async getOnlineFriends(accountId, onlineCharacterIds) {
    // Get all accepted friendships
    const { rows } = await pool().query(
      `SELECT f.*, 
        CASE 
          WHEN f.requester_id = $1 THEN f.recipient_id 
          ELSE f.requester_id 
        END as friend_id
      FROM friendships f
      WHERE (f.requester_id = $1 OR f.recipient_id = $1) 
        AND f.status = 'accepted'`,
      [accountId]
    );
    
    // Extract friend IDs
    const friendIds = rows.map(row => row.friend_id);
    
    // Query for online character data
    if (friendIds.length === 0 || onlineCharacterIds.length === 0) {
      return [];
    }
    
    const placeholders = friendIds.map((_, i) => `$${i + 2}`).join(',');
    
    const { rows: onlineFriends } = await pool().query(
      `SELECT c.character_id, c.name, c.class, c.level, a.username,
        a.account_id
      FROM characters c
      JOIN accounts a ON c.account_id = a.account_id
      WHERE c.character_id = ANY($1)
        AND a.account_id IN (${placeholders})`,
      [onlineCharacterIds, ...friendIds]
    );
    
    return onlineFriends;
  }
}

module.exports = Friendship;