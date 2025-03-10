// server/database/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

async function migrate() {
  // Create database connection
  const pool = new Pool(config.database);
  
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    await pool.query(schema);
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate };