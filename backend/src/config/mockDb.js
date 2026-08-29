// Minimal in-memory mockDb for AI fallback when PostgreSQL is unavailable
const mockDb = {
  projects: [
    { id: 1, name: 'Tower A', location: 'Sector 5', blueprint: 'Residential Tower', completion_percentage: 62, start_date: null, end_date: null },
    { id: 2, name: 'Mall Site', location: 'Jubilee', blueprint: 'Commercial Mall', completion_percentage: 45, start_date: null, end_date: null },
  ],
  photos: [],
  aiAnalyses: [],
  progressUpdates: [],
  alerts: [],
  aiInsights: [],
  save() { /* no-op in memory */ }
};

module.exports = mockDb;
