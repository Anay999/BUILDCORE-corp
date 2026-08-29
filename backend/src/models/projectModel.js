const pool = require("../config/db");

const createProjectsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      status VARCHAR(100),
      budget NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await pool.query(query);
    console.log("Projects table created successfully ✅");
  } catch (error) {
    console.log("Error creating projects table ❌", error);
  }
};

module.exports = createProjectsTable;