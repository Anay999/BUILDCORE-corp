const pool = require("../config/db");

const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_email VARCHAR(255)`);
    console.log("Users table created successfully ✅");
  } catch (error) {
    console.log("Error creating users table ❌", error);
  }
};

module.exports = createUsersTable;