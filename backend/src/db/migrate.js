const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const config = require('../config');

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('[Migration] Starting database migration...');
  console.log(`[Migration] Database: ${config.db.database} on ${config.db.host}:${config.db.port}`);
  console.log('----------------------------------------------------');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Execute schema SQL commands
    await client.query(schemaSql);

    await client.query('COMMIT');
    console.log('[Migration] Schema executed successfully within transaction.');

    // Verify created tables
    const tableCheckQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('staff_users', 'inquiries', 'session')
      ORDER BY table_name;
    `;
    const res = await client.query(tableCheckQuery);
    console.log('[Migration] Verified tables in database:');
    res.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('----------------------------------------------------');
    console.log('[Migration] Database migration completed successfully!');
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]: Migration failed, transaction rolled back.');
    console.error('[Migration Error]:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
