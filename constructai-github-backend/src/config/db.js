const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL environment variable is not defined in .env');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('render.com') || connectionString && connectionString.includes('supabase') || connectionString && connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL database connected successfully at', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
