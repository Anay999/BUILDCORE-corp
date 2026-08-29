const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach socket.io to express app context
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('join_project', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`👥 Client ${socket.id} joined room: project_${projectId}`);
  });

  socket.on('manager_contact_worker', (data) => {
    console.log(`✉️ Manager contacted worker for project_${data.projectId}:`, data.message);
    io.to(`project_${data.projectId}`).emit('manager_alert_received', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Test it: curl http://localhost:${PORT}/api/health`);
});


