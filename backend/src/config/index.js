const path = require('path');
const dotenv = require('dotenv');

// Explicitly load backend/.env relative to __dirname to support running from any directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Centralized configuration object
const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: process.env.PGPORT
      ? parseInt(process.env.PGPORT, 10)
      : process.env.DB_PORT
        ? parseInt(process.env.DB_PORT, 10)
        : 5432,
    database: process.env.PGDATABASE || process.env.DB_NAME || 'customer_inquiry_db',
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  },
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_key_change_in_production',
  seed: {
    email: process.env.SEED_STAFF_EMAIL || 'admin@coffeeninja.com',
    password: process.env.SEED_STAFF_PASSWORD || 'CoffeeNinja2026!',
  },
};

module.exports = config;
