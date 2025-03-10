const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getConnection } = require('../../database');
const config = require('../../../config');

const router = express.Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }
    
    const client = await getConnection();
    
    try {
      // Check if username or email already exists
      const { rows } = await client.query(
        'SELECT * FROM accounts WHERE username = $1 OR email = $2',
        [username, email]
      );
      
      if (rows.length > 0) {
        return res.status(400).json({
          error: 'Username or email already in use'
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create account
      const accountId = uuidv4();
      
      await client.query(
        `INSERT INTO accounts (account_id, username, email, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [accountId, username, email, passwordHash]
      );
      
      // Generate JWT
      const token = jwt.sign(
        { accountId, username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Return success
      res.status(201).json({
        accountId,
        username,
        token
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }
    
    const client = await getConnection();
    
    try {
      // Find account
      const { rows } = await client.query(
        'SELECT * FROM accounts WHERE username = $1',
        [username]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }
      
      const account = rows[0];
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, account.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }
      
      // Update last login
      await client.query(
        'UPDATE accounts SET last_login_date = CURRENT_TIMESTAMP WHERE account_id = $1',
        [account.account_id]
      );
      
      // Generate JWT
      const token = jwt.sign(
        { accountId: account.account_id, username: account.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Return success
      res.json({
        accountId: account.account_id,
        username: account.username,
        token
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;