const db = require('./db');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  console.log('🌱 Starting database seeding based on mockup data...');

  try {
    // 1. Clear existing data in correct dependency order
    await db.query('TRUNCATE TABLE alerts, ai_insights, ai_analyses, progress_updates, costs, tasks, photos, projects, users CASCADE');
    console.log('🧹 Existing data truncated successfully.');

    // 2. Create Users
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('password123', salt);

    // Site Manager (Arjun M.)
    const managerRes = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, role
    `, ['arjun@constructai.com', passHash, 'Arjun M.', 'Manager']);
    const arjun = managerRes.rows[0];

    // Field Worker (Ravi)
    const workerRes = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, role
    `, ['ravi@constructai.com', passHash, 'Ravi', 'Worker']);
    const ravi = workerRes.rows[0];

    console.log(`👤 Users seeded: Manager (${arjun.full_name}), Worker (${ravi.full_name})`);

    // 3. Create Projects
    // Budgets are entered in standard Indian Rupee amounts matching the ₹2.4Cr scale
    // Tower A: 4 Crores, Mall Site: 6 Crores, etc.
    const projectData = [
      { name: 'Tower A', location: 'Sector 5', budget: 40000000.00 },
      { name: 'Mall Site', location: 'Jubilee', budget: 60000000.00 },
      { name: 'Highway Overpass 7', location: 'Section 7', budget: 90000000.00 },
      { name: 'Residential Block C', location: 'Block C', budget: 20000000.00 },
      { name: 'Warehouse — NH16', location: 'NH16', budget: 15000000.00 }
    ];

    const seededProjects = [];
    for (const proj of projectData) {
      const res = await db.query(`
        INSERT INTO projects (name, location, manager_id, budget, start_date, end_date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '180 days')
        RETURNING *
      `, [proj.name, proj.location, arjun.id, proj.budget]);
      seededProjects.push(res.rows[0]);
    }
    console.log(`🏢 Seeded ${seededProjects.length} projects.`);

    const pTowerA = seededProjects[0];
    const pMall = seededProjects[1];
    const pOverpass = seededProjects[2];
    const pBlockC = seededProjects[3];
    const pWarehouse = seededProjects[4];

    // 4. Create Initial Progress Updates to match mockup percentages
    // Tower A: 62%, Mall: 45%, Overpass: 78%, Block C: 31%, Warehouse: 89%
    const progressData = [
      { project_id: pTowerA.id, pct: 62.0, desc: 'Concrete framing stage and pillar reinforcement.' },
      { project_id: pMall.id, pct: 45.0, desc: 'Bricklaying and utility integration in main mall atrium.' },
      { project_id: pOverpass.id, pct: 78.0, desc: 'Precast girder installation and road base consolidation.' },
      { project_id: pBlockC.id, pct: 31.0, desc: 'Excavation and subfloor levels concrete drying.' },
      { project_id: pWarehouse.id, pct: 89.0, desc: 'Corrugated roof sheet cladding and shutter installation.' }
    ];

    for (const prog of progressData) {
      await db.query(`
        INSERT INTO progress_updates (project_id, updated_by, completion_percentage, work_description, workers_count)
        VALUES ($1, $2, $3, $4, $5)
      `, [prog.project_id, ravi.id, prog.pct, prog.desc, 18]);
    }

    // 5. Seed costs to match ₹2.4Cr (24,000,000 INR) Cumulative Budget Used
    // Seed some cost entries across projects
    await db.query(`
      INSERT INTO costs (project_id, recorded_by, labor_cost, material_cost, equipment_cost, transport_cost, miscellaneous)
      VALUES ($1, $2, 4000000.00, 8000000.00, 1000000.00, 500000.00, 300000.00)
    `, [pTowerA.id, arjun.id]); // 1.38 Crore

    await db.query(`
      INSERT INTO costs (project_id, recorded_by, labor_cost, material_cost, equipment_cost, transport_cost, miscellaneous)
      VALUES ($1, $2, 2000000.00, 5000000.00, 2000000.00, 500000.00, 700000.00)
    `, [pMall.id, arjun.id]); // 1.02 Crore

    console.log('💰 Costs ledger seeded (Total budget used matches ₹2.4Cr).');

    // 6. Seed Tasks exactly matching the mockup list
    // "Concrete inspection — Floor 4" (New), "Upload site update" (Pending), "Material check" (Completed)
    await db.query(`
      INSERT INTO tasks (project_id, title, assigned_to, status, due_date)
      VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '2 days')
    `, [pTowerA.id, 'Concrete inspection — Floor 4', ravi.id, 'Pending']); // Will display as "New" on mobile

    await db.query(`
      INSERT INTO tasks (project_id, title, assigned_to, status, due_date)
      VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '1 days')
    `, [pTowerA.id, 'Upload site update', ravi.id, 'In Progress']);

    await db.query(`
      INSERT INTO tasks (project_id, title, assigned_to, status, due_date)
      VALUES ($1, $2, $3, $4, CURRENT_DATE)
    `, [pTowerA.id, 'Material check', ravi.id, 'Completed']);

    console.log('📋 Tasks checklists seeded.');

    // 7. Seed Live Alerts matching the mockup
    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'budget_spike', 'high', 'Budget spike detected — Tower A: +18% over weekly average', CURRENT_TIMESTAMP - INTERVAL '2 hours')
    `, [pTowerA.id]);

    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'inactivity', 'medium', 'Worker inactivity warning — Block C: No site upload since 08:00', CURRENT_TIMESTAMP)
    `, [pBlockC.id]);

    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'helmet_violation', 'medium', 'Helmet violation detected: AI photo flag on Tower A upload', CURRENT_TIMESTAMP - INTERVAL '1 hours')
    `, [pTowerA.id]);

    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'missing_report', 'info', 'Missing daily report — Mall Site: Worker report pending', CURRENT_TIMESTAMP - INTERVAL '24 hours')
    `, [pMall.id]);

    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'duplicate_photo', 'high', 'AI Scan Warning: Worker Ravi is reportedly uploading the same or a fake photo. Stagnant site detected, delay risk is flagged High.', CURRENT_TIMESTAMP - INTERVAL '4 hours')
    `, [pTowerA.id]);

    await db.query(`
      INSERT INTO alerts (project_id, type, severity, message, timestamp)
      VALUES ($1, 'duplicate_photo', 'high', 'AI Scan Warning: Worker Vikram is reportedly uploading the same or a fake photo. Suspicious static view flagged by AI.', CURRENT_TIMESTAMP - INTERVAL '6 hours')
    `, [pMall.id]);

    console.log('🚨 Live alerts seeded.');

    // 8. Seed AI Insights matching the mockup
    await db.query(`
      INSERT INTO ai_insights (project_id, type, message)
      VALUES ($1, 'delay_prediction', '5-day delay predicted — Mall Site: Based on current labor rate and weather forecast')
    `, [pMall.id]);

    await db.query(`
      INSERT INTO ai_insights (project_id, type, message)
      VALUES ($1, 'stage_detected', 'Stage detected: Concrete framing — Tower A: 62% structural completion confirmed by AI')
    `, [pTowerA.id]);

    await db.query(`
      INSERT INTO ai_insights (project_id, type, message)
      VALUES ($1, 'forecast', 'Forecast: 68% by next week — Tower A: On track for 25 June handover')
    `, [pTowerA.id]);

    console.log('🧠 AI Predictive insights seeded.');
    console.log('🎉 Database successfully seeded with mockup parameters!');

  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
};

// If run directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
