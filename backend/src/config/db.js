const { Pool } = require('pg');
const config = require('./index');

// Configure PostgreSQL connection pool
// Prefers DATABASE_URL if provided, otherwise uses discrete parameters
const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    };

const pool = new Pool(poolConfig);

// Log unexpected errors on idle clients without exposing credentials
pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Execute parameterized SQL queries safely.
 * Always use parameters ($1, $2, etc.) to prevent SQL injection.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Test connectivity to the database.
 * @returns {Promise<{ db_name: string, current_time: string, version: string }>}
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT current_database() AS db_name, NOW() AS current_time, version() AS pg_version'
    );
    return res.rows[0];
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};
