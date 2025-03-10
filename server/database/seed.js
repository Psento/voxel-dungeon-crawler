// server/database/seed.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

async function seed() {
  // Create database connection
  const pool = new Pool(config.database);
  
  try {
    // Add test account
    const accountId = uuidv4();
    const username = 'testuser';
    const email = 'test@example.com';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO accounts (account_id, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [accountId, username, email, passwordHash]
    );
    
    // Add test character
    const characterId = uuidv4();
    await pool.query(
      `INSERT INTO characters 
        (character_id, account_id, name, class, birthstone_one, birthstone_two, health, energy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (account_id, name) DO NOTHING`,
      [characterId, accountId, 'TestWarrior', 'Warrior', 'Ruby', 'Diamond', 150, 80]
    );
    
    console.log('=========================================');
    console.log('Seed data created successfully!');
    console.log('Test Account:');
    console.log('  Username: testuser');
    console.log('  Password: password123');
    console.log('  Character: TestWarrior (Warrior)');
    console.log('=========================================');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seed().catch(() => process.exit(1));
}

module.exports = { seed };