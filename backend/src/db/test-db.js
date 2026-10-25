const { pool, testConnection } = require('../config/db');
const config = require('../config');

async function verifyDatabase() {
  console.log('----------------------------------------------------');
  console.log('[DB Test] Verifying PostgreSQL connection...');
  console.log(`[DB Test] Target: ${config.db.database} at ${config.db.host}:${config.db.port}`);
  console.log('----------------------------------------------------');

  try {
    const info = await testConnection();
    console.log('[DB Test] Connection successful!');
    console.log(`[DB Test] Connected Database: ${info.db_name}`);
    console.log(`[DB Test] Server Time: ${info.current_time}`);

    // Check tables
    const tableRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('staff_users', 'inquiries', 'session')
      ORDER BY table_name;
    `);

    console.log('[DB Test] Existing Tables:');
    if (tableRes.rows.length === 0) {
      console.log('  (No tables found yet. Run "npm run db:migrate" to create schema)');
    } else {
      tableRes.rows.forEach((row) => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }

    // Check status check constraint on inquiries if table exists
    const constraintRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'inquiries' AND c.contype = 'c';
    `);

    if (constraintRes.rows.length > 0) {
      console.log('[DB Test] Inquiries Constraints:');
      constraintRes.rows.forEach((row) => {
        console.log(`  ✓ ${row.conname}: ${row.definition}`);
      });
    }

    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('[DB Test Error]: Unable to connect to PostgreSQL database.');
    console.error('[DB Test Error]:', err.message);
    console.error('Please verify that PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD in backend/.env are correct.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

verifyDatabase();
