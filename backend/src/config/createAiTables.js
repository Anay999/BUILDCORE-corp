const pool = require("./db");

const createAiTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        uploaded_by INTEGER,
        photo_url TEXT,
        description TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        photo_url TEXT NOT NULL,
        stage_detected VARCHAR(100) NOT NULL,
        estimated_completion INTEGER NOT NULL DEFAULT 0,
        delay_risk VARCHAR(50) NOT NULL DEFAULT 'Low',
        structural_integrity VARCHAR(50) NOT NULL DEFAULT 'Normal',
        progress_change VARCHAR(255) NOT NULL DEFAULT '+0%',
        safety_findings TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        message VARCHAR(500) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        type VARCHAR(50) NOT NULL,
        message VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("AI tables ready ✅");
  } catch (e) {
    console.log("AI tables setup error:", e.message);
  }
};

module.exports = createAiTables;

// Add blueprint column to projects if it doesn't exist
const addBlueprintCol = async () => {
  try {
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS blueprint VARCHAR(100) DEFAULT 'Standard Warehouse'`);
    console.log("blueprint column ready ✅");
  } catch(e) { console.log("blueprint col:", e.message); }
};
addBlueprintCol();

// Add missing columns to progress_updates
pool.query(`
  ALTER TABLE progress_updates
    ADD COLUMN IF NOT EXISTS updated_by INTEGER,
    ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS work_description TEXT,
    ADD COLUMN IF NOT EXISTS workers_count INTEGER DEFAULT 0
`).catch(e => console.log("progress_updates migration:", e.message));
