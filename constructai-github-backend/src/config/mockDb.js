const fs = require('fs');
const path = require('path');
const dbFilePath = path.join(__dirname, 'mockDb_persistent.json');

const initialData = {
  projects: [
    { id: 1, name: 'Tower A', location: 'Sector 5', manager_name: 'Arjun M.', budget: 40000000.00, start_date: '2026-03-01', end_date: '2027-12-31', total_cost: 24800000.00, completion_percentage: 62, risk_level: 'Low risk', blueprint: 'Residential Tower' },
    { id: 2, name: 'Mall Site', location: 'Jubilee', manager_name: 'Arjun M.', budget: 60000000.00, start_date: '2026-01-15', end_date: '2028-06-30', total_cost: 27000000.00, completion_percentage: 45, risk_level: 'Medium', blueprint: 'Commercial Mall' },
    { id: 3, name: 'Highway Overpass 7', location: 'Section 7', manager_name: 'Arjun M.', budget: 90000000.00, start_date: '2026-02-10', end_date: '2027-09-30', total_cost: 39500000.00, completion_percentage: 78, risk_level: 'Low risk', blueprint: 'Highway Overpass' },
    { id: 4, name: 'Residential Block C', location: 'Block C', manager_name: 'Arjun M.', budget: 20000000.00, start_date: '2026-05-10', end_date: '2027-04-28', total_cost: 16200000.00, completion_percentage: 31, risk_level: 'High risk', blueprint: 'Residential Tower' },
    { id: 5, name: 'Warehouse — NH16', location: 'NH16', manager_name: 'Arjun M.', budget: 15000000.00, start_date: '2026-04-01', end_date: '2026-11-30', total_cost: 8500000.00, completion_percentage: 89, risk_level: 'On track', blueprint: 'Standard Warehouse' }
  ],
  tasks: [
    { id: 101, project_id: 1, title: 'Concrete inspection — Floor 4', assigned_to_name: 'Ravi', status: 'Pending', due_date: '2026-05-29' },
    { id: 102, project_id: 1, title: 'Upload site update', assigned_to_name: 'Ravi', status: 'In Progress', due_date: '2026-05-29' },
    { id: 103, project_id: 1, title: 'Material check', assigned_to_name: 'Ravi', status: 'Completed', due_date: '2026-05-28' },
    { id: 201, project_id: 2, title: 'Steel assembly frame inspection', assigned_to_name: 'Vikram', status: 'Pending', due_date: '2026-05-30' },
    { id: 202, project_id: 2, title: 'Shoring wall layout review', assigned_to_name: 'Vikram', status: 'Completed', due_date: '2026-05-27' },
    { id: 301, project_id: 3, title: 'Foundation pier excavation', assigned_to_name: 'Suresh', status: 'In Progress', due_date: '2026-05-31' },
    { id: 401, project_id: 4, title: 'Brickwork alignment inspection', assigned_to_name: 'Ramesh', status: 'Pending', due_date: '2026-06-02' }
  ],
  progressUpdates: [
    { id: 501, project_id: 1, updated_by_name: 'Ravi', completion_percentage: 62, work_description: 'Pillar shuttering complete. Concrete poured and drying on Level 4 structural framing.', workers_count: 14, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 502, project_id: 2, updated_by_name: 'Vikram', completion_percentage: 45, work_description: 'Ground level steel frame columns mounted and bolted. Core concrete drying.', workers_count: 18, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: 503, project_id: 3, updated_by_name: 'Suresh', completion_percentage: 78, work_description: 'Bridge deck pre-stressing cables tensioned. Approach slab concrete set.', workers_count: 22, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 504, project_id: 4, updated_by_name: 'Ramesh', completion_percentage: 31, work_description: 'Level 1 brick masonry work started. Electrical conduit piping laid.', workers_count: 12, created_at: new Date(Date.now() - 3600000 * 8).toISOString() }
  ],
  costs: [
    { id: 601, project_id: 1, recorded_by_name: 'Arjun M.', labor_cost: 4000000.00, material_cost: 8000000.00, equipment_cost: 1000000.00, transport_cost: 500000.00, miscellaneous: 300000.00, created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: 602, project_id: 2, recorded_by_name: 'Arjun M.', labor_cost: 8000000.00, material_cost: 12000000.00, equipment_cost: 5000000.00, transport_cost: 1500000.00, miscellaneous: 500000.00, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 603, project_id: 3, recorded_by_name: 'Arjun M.', labor_cost: 12000000.00, material_cost: 18000000.00, equipment_cost: 6000000.00, transport_cost: 2500000.00, miscellaneous: 1000000.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 604, project_id: 4, recorded_by_name: 'Arjun M.', labor_cost: 4200000.00, material_cost: 8500000.00, equipment_cost: 2000000.00, transport_cost: 1000000.00, miscellaneous: 500000.00, created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
  ],
  photos: [
    { id: 701, project_id: 1, uploaded_by_name: 'Ravi', photo_url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80', description: 'Tower A Level 4 structural pillar frameworks inspected.', uploaded_at: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 702, project_id: 2, uploaded_by_name: 'Vikram', photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', description: 'Steel assembly frame structures inspection checked by AI.', uploaded_at: new Date(Date.now() - 3600000 * 10).toISOString() },
    { id: 703, project_id: 3, uploaded_by_name: 'Suresh', photo_url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80', description: 'Highway overpass columns structural pier excavation.', uploaded_at: new Date(Date.now() - 3600000 * 14).toISOString() },
    { id: 704, project_id: 4, uploaded_by_name: 'Ramesh', photo_url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80', description: 'Brick wall alignment and plumbing layouts setup.', uploaded_at: new Date(Date.now() - 3600000 * 20).toISOString() }
  ],
  alerts: [
    { id: 1, project_id: 1, type: 'budget_spike', severity: 'high', message: 'Budget spike detected — Tower A: +18% over weekly average', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 2, project_id: 4, type: 'inactivity', severity: 'medium', message: 'Worker inactivity warning — Block C: No site upload since 08:00', timestamp: new Date().toISOString() },
    { id: 3, project_id: 1, type: 'helmet_violation', severity: 'medium', message: 'Helmet violation detected: AI photo flag on Tower A upload', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },
    { id: 4, project_id: 2, type: 'missing_report', severity: 'info', message: 'Missing daily report — Mall Site: Worker report pending', timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 5, project_id: 1, type: 'duplicate_photo', severity: 'high', message: 'AI Scan Warning: Worker Ravi is reportedly uploading the same or a fake photo. Stagnant site detected, delay risk is flagged High.', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 6, project_id: 2, type: 'duplicate_photo', severity: 'high', message: 'AI Scan Warning: Worker Vikram is reportedly uploading the same or a fake photo. Suspicious static view flagged by AI.', timestamp: new Date(Date.now() - 3600000 * 6).toISOString() }
  ],
  aiInsights: [
    { id: 1, project_id: 2, type: 'delay_prediction', message: '5-day delay predicted — Mall Site: Based on current labor rate and weather forecast', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 2, project_id: 1, type: 'stage_detected', message: 'Stage detected: Concrete framing — Tower A: 62% structural completion confirmed by AI', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 3, project_id: 1, type: 'forecast', message: 'Forecast: 68% by next week — Tower A: On track for 25 June handover', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
  ],
  aiAnalyses: [],
  projectMembers: [
    { project_id: 1, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' }
  ],
  users: [
    { id: 11, email: 'arjun@constructai.com', password: 'password123', fullName: 'Arjun M.', role: 'Manager' },
    { id: 12, email: 'ravi@constructai.com', password: 'password123', fullName: 'Ravi', role: 'Worker' }
  ]
};

let dbData;
try {
  if (fs.existsSync(dbFilePath)) {
    dbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    if (!dbData.users) {
      dbData.users = initialData.users;
      fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), 'utf8');
    }
  } else {
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf8');
    dbData = initialData;
  }
} catch (err) {
  console.error('⚠️ Failed to load persistent mock db file, using defaults:', err);
  dbData = initialData;
}

const save = () => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Failed to write mock db to disk:', err);
  }
};

module.exports = {
  get projects() { return dbData.projects; },
  set projects(val) { dbData.projects = val; save(); },
  
  get tasks() { return dbData.tasks; },
  set tasks(val) { dbData.tasks = val; save(); },
  
  get progressUpdates() { return dbData.progressUpdates; },
  set progressUpdates(val) { dbData.progressUpdates = val; save(); },
  
  get costs() { return dbData.costs; },
  set costs(val) { dbData.costs = val; save(); },
  
  get photos() { return dbData.photos; },
  set photos(val) { dbData.photos = val; save(); },
  
  get alerts() { return dbData.alerts; },
  set alerts(val) { dbData.alerts = val; save(); },
  
  get aiInsights() { return dbData.aiInsights; },
  set aiInsights(val) { dbData.aiInsights = val; save(); },
  
  get aiAnalyses() { return dbData.aiAnalyses; },
  set aiAnalyses(val) { dbData.aiAnalyses = val; save(); },

  get projectMembers() { return dbData.projectMembers; },
  set projectMembers(val) { dbData.projectMembers = val; save(); },

  get users() { return dbData.users; },
  set users(val) { dbData.users = val; save(); },
  
  save
};
