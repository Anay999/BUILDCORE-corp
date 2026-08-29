CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  manager_id INTEGER REFERENCES users(id),
  budget DECIMAL(15, 2),
  start_date DATE,
  end_date DATE,
  blueprint VARCHAR(255) DEFAULT 'Standard Warehouse',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  title VARCHAR(255),
  assigned_to INTEGER REFERENCES users(id),
  status VARCHAR(50),
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  uploaded_by INTEGER REFERENCES users(id),
  photo_url TEXT,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE progress_updates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  updated_by INTEGER REFERENCES users(id),
  completion_percentage DECIMAL(5, 2),
  work_description TEXT,
  workers_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE costs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  recorded_by INTEGER REFERENCES users(id),
  labor_cost DECIMAL(12, 2),
  material_cost DECIMAL(12, 2),
  equipment_cost DECIMAL(12, 2),
  transport_cost DECIMAL(12, 2),
  miscellaneous DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'budget_spike', 'inactivity', 'helmet_violation', 'missing_report'
  severity VARCHAR(20) NOT NULL, -- 'high', 'medium', 'info'
  message VARCHAR(500) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'delay_prediction', 'stage_detected', 'forecast'
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  stage_detected VARCHAR(100) NOT NULL,
  estimated_completion INTEGER NOT NULL,
  delay_risk VARCHAR(50) NOT NULL,
  structural_integrity VARCHAR(50) NOT NULL,
  progress_change VARCHAR(255) NOT NULL,
  safety_findings TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full structured AI analysis result (stores complete JSON output)
CREATE TABLE IF NOT EXISTS photo_analysis (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  ai_analysis_id INTEGER REFERENCES ai_analyses(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  previous_photo_url TEXT,
  change_detected BOOLEAN NOT NULL DEFAULT TRUE,
  blueprint VARCHAR(255),
  stage_detected VARCHAR(255),
  estimated_completion INTEGER,
  previous_completion INTEGER,
  progress_change_pct INTEGER DEFAULT 0,
  schedule_status VARCHAR(100),      -- 'ON TRACK', 'SLIGHTLY BEHIND', 'BEHIND SCHEDULE', etc.
  expected_progress_pct INTEGER,
  days_behind_schedule INTEGER DEFAULT 0,
  days_ahead_schedule INTEGER DEFAULT 0,
  projected_completion_date DATE,
  delay_detected BOOLEAN DEFAULT FALSE,
  delay_severity VARCHAR(20),        -- 'HIGH', 'MEDIUM', 'LOW', 'NONE'
  worker_count_before INTEGER,
  worker_count_now INTEGER,
  safety_compliance VARCHAR(50),     -- 'PASS', 'VIOLATION DETECTED'
  safety_findings TEXT,
  work_quality VARCHAR(50),          -- 'GOOD', 'REVIEW NEEDED', 'N/A'
  forecasting_confidence VARCHAR(10),
  full_analysis_json JSONB,          -- Complete analysis object
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase-level milestone tracking per project
CREATE TABLE IF NOT EXISTS milestone_tracking (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  phase_name VARCHAR(100) NOT NULL,  -- 'Excavation', 'Foundation', 'Framing', etc.
  expected_start_date DATE,
  expected_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  expected_completion_pct INTEGER,
  actual_completion_pct INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Delayed'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Structured delay alerts (separate from general alerts)
CREATE TABLE IF NOT EXISTS delay_alerts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  photo_analysis_id INTEGER REFERENCES photo_analysis(id) ON DELETE SET NULL,
  alert_type VARCHAR(100) NOT NULL,  -- 'DELAY_WARNING', 'SCHEDULE_WARNING', 'STAGNANT_SITE'
  severity VARCHAR(20) NOT NULL,     -- 'HIGH', 'MEDIUM', 'LOW'
  days_behind INTEGER DEFAULT 0,
  expected_pct INTEGER,
  actual_pct INTEGER,
  progress_gap INTEGER,
  projected_completion_date DATE,
  original_completion_date DATE,
  root_causes JSONB,                 -- Array of root cause strings
  recommendations JSONB,             -- Array of recommendation strings
  action_required TEXT,
  budget_impact TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);