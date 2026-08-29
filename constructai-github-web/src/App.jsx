import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  LayoutDashboard, Briefcase, CheckSquare, DollarSign, Camera, 
  Plus, ArrowLeft, Activity, Shield, MapPin, Calendar, LogOut, 
  AlertTriangle, CheckCircle2, Clock, Play, User, Users, RefreshCw,
  AlertOctagon, Eye, Filter, ArrowUpRight, TrendingUp, X, UploadCloud,
  Trash2
} from 'lucide-react';

const getBackendHost = () => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return hostname;
    }
  }
  return 'localhost';
};

const HOST = getBackendHost();
const API_BASE_URL = `http://${HOST}:5000/api`;
const SOCKET_URL = `http://${HOST}:5000`;

// Format Indian Rupees to Crores (Cr) and Lakhs (L) exactly matching mockup ₹2.4Cr
const formatRupees = (value) => {
  const num = Number(value);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)}Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  }
  return `₹${num.toLocaleString()}`;
};

// Prototype Mock Database exactly matching the uploaded mockup files
const MOCK_PROJECTS = [
  { id: 1, name: 'Tower A', location: 'Sector 5', manager_name: 'Arjun M.', budget: 40000000.00, start_date: '2026-03-01', end_date: '2027-12-31', total_cost: 24800000.00, completion_percentage: 62, risk_level: 'Low risk', status_color: '#10b981', blueprint: 'Residential Tower' },
  { id: 2, name: 'Mall Site', location: 'Jubilee', manager_name: 'Arjun M.', budget: 60000000.00, start_date: '2026-01-15', end_date: '2028-06-30', total_cost: 27000000.00, completion_percentage: 45, risk_level: 'Medium', status_color: '#f59e0b', blueprint: 'Commercial Mall' },
  { id: 3, name: 'Highway Overpass 7', location: 'Section 7', manager_name: 'Arjun M.', budget: 90000000.00, start_date: '2026-02-10', end_date: '2027-09-30', total_cost: 39500000.00, completion_percentage: 78, risk_level: 'Low risk', status_color: '#10b981', blueprint: 'Highway Overpass' },
  { id: 4, name: 'Residential Block C', location: 'Block C', manager_name: 'Arjun M.', budget: 20000000.00, start_date: '2026-05-10', end_date: '2027-04-28', total_cost: 16200000.00, completion_percentage: 31, risk_level: 'High risk', status_color: '#ef4444', blueprint: 'Residential Tower' },
  { id: 5, name: 'Warehouse — NH16', location: 'NH16', manager_name: 'Arjun M.', budget: 15000000.00, start_date: '2026-04-01', end_date: '2026-11-30', total_cost: 8500000.00, completion_percentage: 89, risk_level: 'On track', status_color: '#10b981', blueprint: 'Standard Warehouse' }
];

const MOCK_TASKS = [
  { id: 101, project_id: 1, title: 'Concrete inspection — Floor 4', assigned_to_name: 'Ravi', status: 'Pending', due_date: '2026-05-29' },
  { id: 102, project_id: 1, title: 'Upload site update', assigned_to_name: 'Ravi', status: 'In Progress', due_date: '2026-05-29' },
  { id: 103, project_id: 1, title: 'Material check', assigned_to_name: 'Ravi', status: 'Completed', due_date: '2026-05-28' },
  { id: 201, project_id: 2, title: 'Steel assembly frame inspection', assigned_to_name: 'Vikram', status: 'Pending', due_date: '2026-05-30' },
  { id: 202, project_id: 2, title: 'Shoring wall layout review', assigned_to_name: 'Vikram', status: 'Completed', due_date: '2026-05-27' },
  { id: 301, project_id: 3, title: 'Foundation pier excavation', assigned_to_name: 'Suresh', status: 'In Progress', due_date: '2026-05-31' },
  { id: 401, project_id: 4, title: 'Brickwork alignment inspection', assigned_to_name: 'Ramesh', status: 'Pending', due_date: '2026-06-02' }
];

const MOCK_PROGRESS = [
  { id: 501, project_id: 1, updated_by_name: 'Ravi', completion_percentage: 62, work_description: 'Pillar shuttering complete. Concrete poured and drying on Level 4 structural framing.', workers_count: 14, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 502, project_id: 2, updated_by_name: 'Vikram', completion_percentage: 45, work_description: 'Ground level steel frame columns mounted and bolted. Core concrete drying.', workers_count: 18, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 503, project_id: 3, updated_by_name: 'Suresh', completion_percentage: 78, work_description: 'Bridge deck pre-stressing cables tensioned. Approach slab concrete set.', workers_count: 22, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 504, project_id: 4, updated_by_name: 'Ramesh', completion_percentage: 31, work_description: 'Level 1 brick masonry work started. Electrical conduit piping laid.', workers_count: 12, created_at: new Date(Date.now() - 3600000 * 8).toISOString() }
];

const MOCK_COSTS = [
  { id: 601, project_id: 1, recorded_by_name: 'Arjun M.', labor_cost: 4000000.00, material_cost: 8000000.00, equipment_cost: 1000000.00, transport_cost: 500000.00, miscellaneous: 300000.00, created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: 602, project_id: 2, recorded_by_name: 'Arjun M.', labor_cost: 8000000.00, material_cost: 12000000.00, equipment_cost: 5000000.00, transport_cost: 1500000.00, miscellaneous: 500000.00, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 603, project_id: 3, recorded_by_name: 'Arjun M.', labor_cost: 12000000.00, material_cost: 18000000.00, equipment_cost: 6000000.00, transport_cost: 2500000.00, miscellaneous: 1000000.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 604, project_id: 4, recorded_by_name: 'Arjun M.', labor_cost: 4200000.00, material_cost: 8500000.00, equipment_cost: 2000000.00, transport_cost: 1000000.00, miscellaneous: 500000.00, created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
];

const MOCK_PHOTOS = [
  { id: 701, project_id: 1, uploaded_by_name: 'Ravi', photo_url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80', description: 'Tower A Level 4 structural pillar frameworks inspected.', uploaded_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 702, project_id: 2, uploaded_by_name: 'Vikram', photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', description: 'Steel assembly frame structures inspection checked by AI.', uploaded_at: new Date(Date.now() - 3600000 * 10).toISOString() },
  { id: 703, project_id: 3, uploaded_by_name: 'Suresh', photo_url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80', description: 'Highway overpass columns structural pier excavation.', uploaded_at: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: 704, project_id: 4, uploaded_by_name: 'Ramesh', photo_url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80', description: 'Brick wall alignment and plumbing layouts setup.', uploaded_at: new Date(Date.now() - 3600000 * 20).toISOString() }
];


const MOCK_ALERTS = [
  { id: 1, project_id: 1, project_name: 'Tower A', type: 'budget_spike', severity: 'high', message: 'Budget spike detected — Tower A: +18% over weekly average', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), dot_color: '#ef4444' },
  { id: 2, project_id: 4, project_name: 'Residential Block C', type: 'inactivity', severity: 'medium', message: 'Worker inactivity warning — Block C: No site upload since 08:00', timestamp: new Date().toISOString(), dot_color: '#f59e0b' },
  { id: 3, project_id: 1, project_name: 'Tower A', type: 'helmet_violation', severity: 'medium', message: 'Helmet violation detected: AI photo flag on Tower A upload', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), dot_color: '#f59e0b' },
  { id: 4, project_id: 2, project_name: 'Mall Site', type: 'missing_report', severity: 'info', message: 'Missing daily report — Mall Site: Worker report pending', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), dot_color: '#14b8a6' },
  { id: 5, project_id: 1, project_name: 'Tower A', type: 'site_hazard', severity: 'high', message: 'Reported issue by Ravi: Scaffolding on East side feels unstable during high winds.', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), dot_color: '#ef4444' },
  { id: 6, project_id: 2, project_name: 'Mall Site', type: 'site_hazard', severity: 'medium', message: 'Reported issue by Vikram: Delayed brick shipment starting to affect floor 1 framing schedule.', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), dot_color: '#f59e0b' },
  { id: 7, project_id: 1, project_name: 'Tower A', type: 'duplicate_photo', severity: 'high', message: 'AI Scan Warning: Worker Ravi is reportedly uploading the same or a fake photo. Stagnant site detected, delay risk is flagged High.', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), dot_color: '#ef4444' },
  { id: 8, project_id: 2, project_name: 'Mall Site', type: 'duplicate_photo', severity: 'high', message: 'AI Scan Warning: Worker Vikram is reportedly uploading the same or a fake photo. Suspicious static view flagged by AI.', timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), dot_color: '#ef4444' }
];

const MOCK_INSIGHTS = [
  { id: 1, type: 'delay_prediction', project_name: 'Mall Site', message: '5-day delay predicted — Mall Site: Based on current labor rate and weather forecast', color_theme: '#fef3c7', text_theme: '#b45309', border_theme: '#fde68a', bg_glow: 'rgba(245, 158, 11, 0.1)' },
  { id: 2, type: 'stage_detected', project_name: 'Tower A', message: 'Stage detected: Concrete framing — Tower A: 62% structural completion confirmed by AI', color_theme: '#d1fae5', text_theme: '#047857', border_theme: '#a7f3d0', bg_glow: 'rgba(16, 185, 129, 0.1)' },
  { id: 3, type: 'forecast', project_name: 'Tower A', message: 'Forecast: 68% by next week — Tower A: On track for 25 June handover', color_theme: '#e0f2fe', text_theme: '#0369a1', border_theme: '#bae6fd', bg_glow: 'rgba(59, 130, 246, 0.1)' }
];

const MOCK_ACTIVITIES = [
  { type: 'project', action: 'created', projectName: 'Tower A', user: 'Arjun M.', timestamp: new Date(Date.now() - 3600000 * 48) },
  { type: 'progress', action: 'logged', projectName: 'Tower A', completionPercentage: 62, workersCount: 14, user: 'Ravi', timestamp: new Date(Date.now() - 3600000 * 2) }
];

const getExpectedProgress = (proj) => {
  // Pre-calculated target blueprint expectation for standard mockups
  const mockExpectations = {
    1: 65, // Tower A actual 62%
    2: 48, // Mall Site actual 45%
    3: 75, // Highway Overpass 7 actual 78%
    4: 45, // Residential Block C actual 31%
    5: 85  // Warehouse actual 89%
  };
  if (mockExpectations[proj.id] !== undefined) {
    return mockExpectations[proj.id];
  }
  // Fallback to time elapsed calculation
  const start = new Date(proj.start_date || '2026-01-01');
  const end = new Date(proj.end_date || '2027-12-31');
  const today = new Date();
  if (today < start) return 0;
  if (today > end) return 100;
  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};

const getDaysBehind = (proj) => {
  const mockDays = {
    2: 6,   // Mall Site
    4: 14,  // Residential Block C
  };
  if (mockDays[proj.id] !== undefined) {
    return mockDays[proj.id];
  }
  const expected = getExpectedProgress(proj);
  const actual = proj.completion_percentage;
  const variance = expected - actual;
  return variance > 0 ? Math.round(variance * 1.2) : 0;
};

function App() {
  // Navigation & Mockup Sidebar Tabs
  // Sidebar tabs: Dashboard, Projects, AI Analysis, Costs, Delays, Alerts, Reports, Users, Settings
  const [activeSidebarTab, setActiveSidebarTab] = useState('Dashboard'); 
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectSubTab, setProjectSubTab] = useState('overview'); // overview, tasks, photos

  // Simulation Bypasses / Database States
  const [token, setToken] = useState(localStorage.getItem('constructai_token') || 'mock_token');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('constructai_user') || '{"fullName":"Arjun M.","role":"Manager","id":11}'));
  
  // Real database states fallback
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [projectDetails, setProjectDetails] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState(MOCK_ALERTS);
  const [aiInsights, setAiInsights] = useState(MOCK_INSIGHTS);
  const [globalActivities, setGlobalActivities] = useState(MOCK_ACTIVITIES);
  const [notificationToasts, setNotificationToasts] = useState([]);

  // Database Connection Diagnostics
  const [usingMockData, setUsingMockData] = useState(true);
  const [checkingBackend, setCheckingBackend] = useState(false);

  // Forms
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLoc, setNewProjectLoc] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');
  const [newProjectBlueprint, setNewProjectBlueprint] = useState('Standard Warehouse');

  // New Project Form Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [allocatedWorkers, setAllocatedWorkers] = useState([{ name: '', email: '' }]);
  const [projectWorkersInput, setProjectWorkersInput] = useState([{ name: '', email: '' }]);
  const [blueprintFile, setBlueprintFile] = useState(null);
  const [blueprintFileName, setBlueprintFileName] = useState('');
  const [blueprintPreview, setBlueprintPreview] = useState(null);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [logProgressPct, setLogProgressPct] = useState(62);
  const [logProgressWorkers, setLogProgressWorkers] = useState(14);
  const [logProgressDesc, setLogProgressDesc] = useState('');

  const [logCostLabor, setLogCostLabor] = useState('');
  const [logCostMaterial, setLogCostMaterial] = useState('');
  const [logCostEquip, setLogCostEquip] = useState('');
  const [logCostTransport, setLogCostTransport] = useState('');

  const [logPhotoUrl, setLogPhotoUrl] = useState('');
  const [logPhotoDesc, setLogPhotoDesc] = useState('');
  const [workCategory, setWorkCategory] = useState('Concrete Work');
  const [siteSection, setSiteSection] = useState('Floor 4 — East Wing');
  
  // Snapshot file upload states
  const [snapshotFile, setSnapshotFile] = useState(null);
  const [snapshotFileName, setSnapshotFileName] = useState('');
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  
  // Worker search state (moved to follow hook rules)
  const [workerSearch, setWorkerSearch] = useState('');

  // Pending AI analyses for managers to review & approve
  const [pendingAnalyses, setPendingAnalyses] = useState([]);

  // Stateful Mock Database for full real-time dashboard reactivity
  const [mockTasks, setMockTasks] = useState(MOCK_TASKS);
  const [mockProgress, setMockProgress] = useState(MOCK_PROGRESS);
  const [mockCosts, setMockCosts] = useState(MOCK_COSTS);
  const [mockPhotos, setMockPhotos] = useState(MOCK_PHOTOS);
  const [mockMembers, setMockMembers] = useState([
    { id: 1001, project_id: 1, full_name: 'Ravi', email: 'ravi@constructai.com', role: 'Worker' },
    { id: 1002, project_id: 2, full_name: 'Vikram', email: 'vikram@constructai.com', role: 'Worker' },
    { id: 1003, project_id: 3, full_name: 'Suresh', email: 'suresh@constructai.com', role: 'Worker' },
    { id: 1004, project_id: 4, full_name: 'Ramesh', email: 'ramesh@constructai.com', role: 'Worker' }
  ]);


  const socketRef = useRef(null);

  // Auto-clear notification toasts
  useEffect(() => {
    if (notificationToasts.length > 0) {
      const timer = setTimeout(() => {
        setNotificationToasts(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notificationToasts]);

  // Initial Boot & Server Health check
  useEffect(() => {
    checkBackendHealth();
  }, [token]);

  const decodeToken = (t) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const checkBackendHealth = async () => {
    setCheckingBackend(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/health`);
      if (res.data) {
        let activeToken = token;
        
        // 1. Decode token and verify role is Manager or Admin (if using a real JWT token)
        if (activeToken && activeToken !== 'mock_token') {
          const decoded = decodeToken(activeToken);
          if (!decoded || (decoded.role !== 'Manager' && decoded.role !== 'Admin')) {
            console.warn("⚠️ Mismatched or non-manager role token found. Resetting to mock_token.");
            activeToken = 'mock_token';
            setToken('mock_token');
            localStorage.setItem('constructai_token', 'mock_token');
            const defaultUser = { fullName: 'Arjun M.', role: 'Manager', id: 11 };
            setUser(defaultUser);
            localStorage.setItem('constructai_user', JSON.stringify(defaultUser));
          }
        }

        // 2. Validate token viability by calling /auth/profile
        try {
          await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${activeToken}` }
          });
        } catch (authErr) {
          console.warn("⚠️ Token is invalid or expired. Falling back to mock_token.", authErr.message);
          activeToken = 'mock_token';
          setToken('mock_token');
          localStorage.setItem('constructai_token', 'mock_token');
          const defaultUser = { fullName: 'Arjun M.', role: 'Manager', id: 11 };
          setUser(defaultUser);
          localStorage.setItem('constructai_user', JSON.stringify(defaultUser));
        }

        setUsingMockData(false);
        fetchProjects(activeToken, true);
        fetchAlertsAndInsights(activeToken, true);
      }
    } catch (err) {
      console.warn("⚠️ Database Server Offline. Activating high-fidelity mockup simulator.");
      setUsingMockData(true);
      setProjects(MOCK_PROJECTS);
      setLiveAlerts(MOCK_ALERTS);
      setAiInsights(MOCK_INSIGHTS);
    } finally {
      setCheckingBackend(false);
    }
  };

  // Setup Live WebSocket listeners
  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Web Dashboard Socket Connected:', socketRef.current.id);
    });

    socketRef.current.on('alert_raised', (data) => {
      const newAlert = {
        id: Date.now(),
        project_id: data.alert.project_id,
        project_name: data.projectName,
        type: data.alert.type,
        severity: data.alert.severity,
        message: data.alert.message,
        timestamp: new Date().toISOString(),
        dot_color: data.alert.type === 'budget_spike' ? '#ef4444' : '#f59e0b'
      };
      setLiveAlerts(prev => [newAlert, ...prev]);
      addToast(`🚨 Live Alert: ${data.alert.message}`, 'cost');
    });

    // Real-time photo stream trigger AI analysis pending
    socketRef.current.on('ai_analysis_ready', (data) => {
      setPendingAnalyses(prev => [data.analysis, ...prev]);
      addToast(`🧠 AI completed photo analysis: Stage detected: ${data.analysis.stage_detected}`, 'progress');
    });

    socketRef.current.on('global_activity', (act) => {
      setGlobalActivities(prev => [act, ...prev].slice(0, 20));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  // Join room for selected project details
  useEffect(() => {
    if (!socketRef.current || !selectedProjectId) return;

    socketRef.current.emit('join_project', selectedProjectId);

    const handleTaskUpdated = (task) => {
      setMockTasks(prev => prev.map(t => t.id === task.id ? task : t));
      setProjectDetails(prev => {
        if (!prev || Number(prev.project.id) !== Number(task.project_id)) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? task : t)
        };
      });
      addToast(`Task "${task.title}" updated`, 'task');
    };

    const handleProgressUpdated = (prog) => {
      setMockProgress(prev => [prog, ...prev]);
      setProjectDetails(prev => {
        if (!prev || Number(prev.project.id) !== Number(prog.project_id)) return prev;
        return {
          ...prev,
          project: {
            ...prev.project,
            completion_percentage: Number(prog.completion_percentage)
          },
          progressUpdates: [prog, ...prev.progressUpdates]
        };
      });
      // Sync main list
      setProjects(prev => prev.map(p => p.id === prog.project_id ? { ...p, completion_percentage: Number(prog.completion_percentage) } : p));
    };

    const handlePhotoAdded = (photo) => {
      setMockPhotos(prev => {
        if (prev.find(p => p.id === photo.id)) return prev;
        return [photo, ...prev];
      });
      setProjectDetails(prev => {
        if (!prev || Number(prev.project.id) !== Number(photo.project_id)) return prev;
        // Avoid duplicate additions
        if (prev.photos.find(p => p.id === photo.id)) return prev;
        return {
          ...prev,
          photos: [photo, ...prev.photos]
        };
      });
      addToast(`New site snapshot uploaded for project`, 'progress');
    };

    const handleCostAdded = (cost) => {
      setMockCosts(prev => {
        if (prev.find(c => c.id === cost.id)) return prev;
        return [cost, ...prev];
      });
      setProjectDetails(prev => {
        if (!prev || Number(prev.project.id) !== Number(cost.project_id)) return prev;
        // Avoid duplicate additions
        if (prev.costs.find(c => c.id === cost.id)) return prev;
        const newCosts = [cost, ...prev.costs];
        const newTotal = newCosts.reduce((sum, item) => sum + Number(item.labor_cost) + Number(item.material_cost) + Number(item.equipment_cost) + Number(item.transport_cost) + Number(item.miscellaneous), 0);
        return {
          ...prev,
          project: {
            ...prev.project,
            total_cost: newTotal
          },
          costs: newCosts
        };
      });
      setProjects(prev => prev.map(p => {
        if (p.id !== cost.project_id) return p;
        const entryTotal = Number(cost.labor_cost) + Number(cost.material_cost) + Number(cost.equipment_cost) + Number(cost.transport_cost) + Number(cost.miscellaneous);
        return {
          ...p,
          total_cost: Number(p.total_cost) + entryTotal
        };
      }));
      addToast(`New expenditure logged for project`, 'cost');
    };
    const handleProjectDeleted = (deletedId) => {
      const targetId = Number(deletedId);
      if (selectedProjectId === targetId) {
        setSelectedProjectId(null);
        addToast('This project has been deleted.', 'cost');
      }
      setProjects(prev => prev.filter(p => p.id !== targetId));
    };

    socketRef.current.on('task_updated', handleTaskUpdated);
    socketRef.current.on('progress_updated', handleProgressUpdated);
    socketRef.current.on('photo_added', handlePhotoAdded);
    socketRef.current.on('cost_added', handleCostAdded);
    socketRef.current.on('project_deleted', handleProjectDeleted);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('task_updated', handleTaskUpdated);
        socketRef.current.off('progress_updated', handleProgressUpdated);
        socketRef.current.off('photo_added', handlePhotoAdded);
        socketRef.current.off('cost_added', handleCostAdded);
        socketRef.current.off('project_deleted', handleProjectDeleted);
      }
    };
  }, [selectedProjectId]);

  const addToast = (message, type) => {
    setNotificationToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  const fetchProjects = async (activeToken = token, bypassMockCheck = false) => {
    if (usingMockData && !bypassMockCheck) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setProjects(res.data.projects);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlertsAndInsights = async (activeToken = token, bypassMockCheck = false) => {
    if (usingMockData && !bypassMockCheck) return;
    try {
      const alertsRes = await axios.get(`${API_BASE_URL}/alerts`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const insightsRes = await axios.get(`${API_BASE_URL}/insights`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setLiveAlerts(alertsRes.data.alerts.map(a => ({
        ...a,
        project_name: a.project_name || (a.project_id === 1 ? 'Tower A' : a.project_id === 2 ? 'Mall Site' : `Project #${a.project_id}`),
        dot_color: a.type === 'budget_spike' || a.type === 'duplicate_photo' || a.type === 'site_hazard' ? '#ef4444' : a.type === 'inactivity' || a.type === 'helmet_violation' ? '#f59e0b' : '#14b8a6'
      })));
      setAiInsights(insightsRes.data.insights.map(i => ({
        ...i,
        color_theme: i.type === 'delay_prediction' ? '#fef3c7' : i.type === 'stage_detected' ? '#d1fae5' : '#e0f2fe',
        text_theme: i.type === 'delay_prediction' ? '#b45309' : i.type === 'stage_detected' ? '#047857' : '#0369a1',
        border_theme: i.type === 'delay_prediction' ? '#fde68a' : i.type === 'stage_detected' ? '#a7f3d0' : '#bae6fd',
        bg_glow: i.type === 'delay_prediction' ? 'rgba(245, 158, 11, 0.1)' : i.type === 'stage_detected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectDetails = async (id) => {
    setSelectedProjectId(id);
    setProjectDetails(null);
    if (usingMockData) {
      const proj = projects.find(p => p.id === id);
      const tasks = mockTasks.filter(t => t.project_id === id);
      const updates = mockProgress.filter(p => p.project_id === id);
      const costs = mockCosts.filter(c => c.project_id === id);
      const photos = mockPhotos.filter(ph => ph.project_id === id);
      const members = mockMembers.filter(m => m.project_id === id);
      
      setProjectDetails({
        project: proj,
        tasks,
        progressUpdates: updates,
        costs,
        photos,
        members
      });
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectDetails(res.data);
    } catch (err) {
      console.error('Failed to load live project details, falling back to mock details:', err);
      const proj = projects.find(p => p.id === id);
      const tasks = mockTasks.filter(t => t.project_id === id);
      const updates = mockProgress.filter(p => p.project_id === id);
      const costs = mockCosts.filter(c => c.project_id === id);
      const photos = mockPhotos.filter(ph => ph.project_id === id);
      const members = mockMembers.filter(m => m.project_id === id);
      
      setProjectDetails({
        project: proj,
        tasks,
        progressUpdates: updates,
        costs,
        photos,
        members
      });
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    const validWorkers = projectWorkersInput.filter(w => w.name && w.email);
    if (validWorkers.length === 0) {
      addToast('Please enter at least one worker name and Gmail ID.', 'error');
      return;
    }

    if (usingMockData) {
      const addedMembers = [];
      for (let i = 0; i < validWorkers.length; i++) {
        const w = validWorkers[i];
        const plainPassword = 'pass_' + Math.floor(1000 + Math.random() * 9000);
        const newMember = {
          id: Date.now() + i,
          project_id: selectedProjectId,
          full_name: w.name,
          email: w.email,
          role: 'Worker',
          password: plainPassword
        };
        addedMembers.push(newMember);

        const newAlert = {
          id: Date.now() + i + 100,
          message: `👷 ${w.name} added to project team.`,
          dot_color: '#10b981',
          timestamp: 'Just now'
        };
        setLiveAlerts(prev => [newAlert, ...prev]);
      }

      setMockMembers(prev => [...prev, ...addedMembers]);
      setProjectDetails(prev => ({
        ...prev,
        members: [...(prev.members || []), ...addedMembers]
      }));

      setProjectWorkersInput([{ name: '', email: '' }]);
      addToast(`✅ Successfully added ${validWorkers.length} worker(s) to the team!`, 'success');
      return;
    }

    let successCount = 0;
    const addedAPIWorkers = [];
    for (const w of validWorkers) {
      try {
        const res = await axios.post(`${API_BASE_URL}/projects/${selectedProjectId}/workers`, {
          email: w.email,
          fullName: w.name
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addedAPIWorkers.push(res.data.worker);
        successCount++;
      } catch (err) {
        console.error('Failed to add worker:', err);
        addToast(`Failed to add ${w.name}: ` + (err.response?.data?.error || 'Server error'), 'error');
      }
    }

    if (successCount > 0) {
      setProjectDetails(prev => ({
        ...prev,
        members: [...(prev.members || []), ...addedAPIWorkers]
      }));
      setProjectWorkersInput([{ name: '', email: '' }]);
      addToast(`✅ Successfully added ${successCount} worker(s) to the project!`, 'success');
    }
  };

  const handleWorkerPhotoUpload = async (file, workerName) => {
    let activePhotoUrl = '';
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      
      if (!usingMockData) {
        try {
          const formData = new FormData();
          formData.append('photo', file);
          const uploadRes = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          activePhotoUrl = uploadRes.data.url;
        } catch (err) {
          console.error(err);
          addToast('File uploader failed. Using preview.', 'error');
          activePhotoUrl = dataUrl;
        }
      } else {
        activePhotoUrl = dataUrl;
      }

      const newPhoto = {
        id: Date.now(),
        project_id: selectedProjectId,
        photo_url: activePhotoUrl,
        description: `Site photo uploaded on behalf of ${workerName}`,
        uploaded_by_name: workerName,
        uploaded_at: new Date().toISOString()
      };

      if (usingMockData) {
        setMockPhotos(prev => [newPhoto, ...prev]);
        setProjectDetails(prev => ({
          ...prev,
          photos: [newPhoto, ...prev.photos]
        }));
        
        const newAnalysis = {
          id: Date.now(),
          project_id: selectedProjectId,
          photo_url: activePhotoUrl,
          stage_detected: 'Masonry Wall Stage',
          estimated_completion: 45,
          delay_risk: 'Low',
          structural_integrity: 'Normal',
          progress_change: '+2% progress',
          safety_findings: null,
          status: 'Approved',
          created_at: new Date().toISOString()
        };
        setPendingAnalyses(prev => [newAnalysis, ...prev]);
        addToast(`✅ Photo uploaded successfully for ${workerName}!`, 'success');
      } else {
        try {
          await axios.post(`${API_BASE_URL}/ai-analysis`, {
            projectId: selectedProjectId,
            photoUrl: activePhotoUrl,
            workCategory: 'Brickwork',
            siteSection: 'Framework',
            notes: `Uploaded on behalf of ${workerName}`
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setProjectDetails(prev => ({
            ...prev,
            photos: [newPhoto, ...prev.photos]
          }));
          addToast(`✅ Photo uploaded successfully for ${workerName}!`, 'success');
        } catch (err) {
          console.error(err);
          addToast('AI analysis submission failed.', 'error');
        }
      }
    };
  };

  const handleRemoveWorker = (memberId) => {
    setMockMembers(prev => prev.filter(m => m.id !== memberId));
    setProjectDetails(prev => ({
      ...prev,
      members: (prev.members || []).filter(m => m.id !== memberId)
    }));
    addToast('Worker removed from project.', 'info');
  };

  // Manager Approve AI Analysis update
  const handleApproveAIAnalysis = async (analysisId) => {
    if (usingMockData) {
      // Simulate approval
      const analysis = pendingAnalyses.find(a => a.id === analysisId) || { estimated_completion: 62, project_id: 1, stage_detected: 'Concrete Framing Stage' };
      setPendingAnalyses(prev => prev.filter(a => a.id !== analysisId));

      setProjects(prev => prev.map(p => p.id === analysis.project_id ? { ...p, completion_percentage: analysis.estimated_completion } : p));
      
      const newProgress = {
        id: Date.now(),
        project_id: analysis.project_id,
        updated_by_name: 'AI Approved',
        completion_percentage: analysis.estimated_completion,
        work_description: `Approved AI detection for ${analysis.stage_detected}`,
        workers_count: 14,
        created_at: new Date().toISOString()
      };
      setMockProgress(prev => [newProgress, ...prev]);

      if (selectedProjectId === analysis.project_id) {
        setProjectDetails(prev => ({
          ...prev,
          project: { ...prev.project, completion_percentage: analysis.estimated_completion },
          progressUpdates: [newProgress, ...prev.progressUpdates]
        }));
      }

      addToast('AI Analysis approved! Project structural progress updated successfully.', 'progress');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/ai-analysis/${analysisId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAnalyses(prev => prev.filter(a => a.id !== analysisId));
      addToast('AI Analysis approved! Progress sync completed.', 'progress');
    } catch (err) {
      console.error(err);
    }
  };

  // Upload photo simulating AI Category checks
  const handlePhotoUploadSimulateAI = async (e) => {
    e.preventDefault();
    
    let activePhotoUrl = logPhotoUrl;

    if (snapshotFile) {
      if (!usingMockData) {
        try {
          const formData = new FormData();
          formData.append('photo', snapshotFile);
          const uploadRes = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          activePhotoUrl = uploadRes.data.url;
        } catch (err) {
          console.error('⚠️ Photo file upload failed:', err.message);
          addToast('File upload failed. Trying to submit metadata only.', 'cost');
        }
      } else {
        activePhotoUrl = snapshotPreview || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5';
      }
    }

    if (!activePhotoUrl) {
      addToast('Please select a photo file or enter an image URL.', 'error');
      return;
    }

    if (usingMockData) {
      const newAnalysis = {
        id: Date.now(),
        project_id: selectedProjectId,
        photo_url: activePhotoUrl,
        stage_detected: workCategory === 'Concrete Work' ? 'Concrete Framing Stage' : 'Masonry Wall Stage',
        estimated_completion: workCategory === 'Concrete Work' ? 62 : 45,
        delay_risk: 'Low',
        structural_integrity: 'Normal',
        progress_change: workCategory === 'Concrete Work' ? '+4% progress' : '+3% progress',
        safety_findings: workCategory === 'Concrete Work' ? 'Safety: Helmet missing on 1 worker detected in photo' : null,
        status: 'Pending',
        created_at: new Date().toISOString()
      };

      setPendingAnalyses(prev => [newAnalysis, ...prev]);

      const newPhoto = {
        id: Date.now(),
        project_id: selectedProjectId,
        photo_url: activePhotoUrl,
        description: logPhotoDesc || `${workCategory} - ${siteSection}`,
        uploaded_by_name: 'Ravi',
        uploaded_at: new Date().toISOString()
      };
      setMockPhotos(prev => [newPhoto, ...prev]);

      // Add to photo gallery
      setProjectDetails(prev => ({
        ...prev,
        photos: [newPhoto, ...prev.photos]
      }));

      // Add helmet violation alert if concrete work
      if (workCategory === 'Concrete Work') {
        const newAlert = {
          id: Date.now(),
          project_id: selectedProjectId,
          project_name: projectDetails.project.name,
          type: 'helmet_violation',
          severity: 'medium',
          message: 'Helmet violation detected: AI photo flag on Tower A upload',
          timestamp: new Date().toISOString(),
          dot_color: '#f59e0b'
        };
        setLiveAlerts(prev => [newAlert, ...prev]);
        addToast('Alert Raised: Helmet violation detected by AI!', 'cost');
      }

      addToast(`Photo uploaded. AI processed: ${newAnalysis.stage_detected}`, 'progress');
      setLogPhotoUrl('');
      setLogPhotoDesc('');
      setSnapshotFile(null);
      setSnapshotFileName('');
      setSnapshotPreview(null);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/ai-analysis`, {
        projectId: selectedProjectId,
        photoUrl: activePhotoUrl,
        workCategory: workCategory,
        siteSection: siteSection,
        notes: logPhotoDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogPhotoUrl('');
      setLogPhotoDesc('');
      setSnapshotFile(null);
      setSnapshotFileName('');
      setSnapshotPreview(null);
    } catch (err) {
      console.error(err);
      addToast('AI analysis submission failed.', 'cost');
    }
  };

  const resetNewProjectForm = () => {
    setNewProjectName('');
    setNewProjectLoc('');
    setNewProjectBudget('');
    setNewProjectBlueprint('Standard Warehouse');
    setAllocatedWorkers([{ name: '', email: '' }]);
    setBlueprintFile(null);
    setBlueprintFileName('');
    setBlueprintPreview(null);
  };

  const handleCreateProjectModal = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;

    let blueprintFileUrl = null;

    // Upload blueprint file if it exists and database mode is active
    if (!usingMockData && blueprintFile) {
      try {
        const formData = new FormData();
        formData.append('photo', blueprintFile); // The backend /api/upload endpoint expects the field name 'photo'
        const uploadRes = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        blueprintFileUrl = uploadRes.data.url;
      } catch (err) {
        console.error('⚠️ Blueprint file upload failed:', err.message);
        addToast('File upload failed. Saving details only.', 'cost');
      }
    } else if (usingMockData && blueprintFile) {
      // Mock File URL fallback to base64 preview or a default mockup URL
      blueprintFileUrl = blueprintPreview || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5';
    }

    const requestPayload = {
      name: newProjectName,
      location: newProjectLoc,
      budget: Number(newProjectBudget) || 30000000,
      blueprint: newProjectBlueprint,
      blueprintFileUrl,
      workers: allocatedWorkers.filter(w => w.name && w.email)
    };

    if (usingMockData) {
      const newProjId = projects.length + 1;
      const newProj = {
        id: newProjId,
        name: newProjectName,
        location: newProjectLoc || 'Sector 5',
        manager_name: 'Arjun M.',
        budget: Number(newProjectBudget) || 30000000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 3600000 * 24 * 365).toISOString().split('T')[0],
        total_cost: 0,
        completion_percentage: 0,
        risk_level: 'On track',
        status_color: '#10b981',
        blueprint: newProjectBlueprint,
        blueprint_file_url: blueprintFileUrl
      };
      setProjects(prev => [newProj, ...prev]);

      // Allocate mock project members
      const validWorkers = allocatedWorkers.filter(w => w.name && w.email);
      if (validWorkers.length > 0) {
        const mappedMembers = validWorkers.map((w, idx) => ({
          id: Date.now() + idx,
          project_id: newProjId,
          full_name: w.name,
          email: w.email,
          role: 'Worker'
        }));
        setMockMembers(prev => [...prev, ...mappedMembers]);
      }

      resetNewProjectForm();
      setShowNewProjectModal(false);
      addToast('Site successfully added!', 'project');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/projects`, requestPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      resetNewProjectForm();
      setShowNewProjectModal(false);
      fetchProjects();
      addToast('Site successfully added!', 'project');
    } catch (err) {
      console.error('⚠️ Create project failed:', err);
      addToast('Failed to create project.', 'cost');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to permanently delete this project site and all associated logs?")) {
      return;
    }

    if (usingMockData) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setSelectedProjectId(null);
      addToast('Project successfully deleted (Offline Simulator)', 'project');
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedProjectId(null);
      fetchProjects();
      // Reload alerts/insights too, as cascading deletion updates them
      fetchAlertsAndInsights();
      addToast('Project successfully deleted', 'project');
    } catch (err) {
      console.error('⚠️ Delete project failed:', err);
      addToast(err.response?.data?.error || 'Failed to delete project.', 'cost');
    }
  };

  // Resolve / Acknowledge alert locally
  const handleResolveAlert = async (alertId, projectName) => {
    setLiveAlerts(prev => prev.filter(a => a.id !== alertId));
    addToast(`Acknowledged worker report for ${projectName}`, 'progress');
  };

  // Dispatch manager contact request to worker via socket
  const handleContactWorker = (projectId, projectName, workerName) => {
    addToast(`Site check alert dispatched to ${workerName}`, 'progress');
    if (socketRef.current) {
      socketRef.current.emit('manager_contact_worker', {
        projectId,
        workerName,
        message: `🚨 Manager Alert: Unresolved delays on ${projectName}. Please verify and contact supervisor.`,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Toggle tasks status
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const nextMap = { 'Pending': 'In Progress', 'In Progress': 'Completed', 'Completed': 'Pending' };
    const nextStatus = nextMap[currentStatus] || 'Pending';

    if (usingMockData) {
      setMockTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
      setProjectDetails(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t)
      }));
      addToast(`Task status set to ${nextStatus}`, 'task');
      return;
    }

    try {
      await axios.patch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        status: nextStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Log progress updates
  const handleLogProgress = async (e) => {
    e.preventDefault();
    if (usingMockData) {
      const newProgress = {
        id: Date.now(),
        project_id: selectedProjectId,
        updated_by_name: 'Arjun M.',
        completion_percentage: Number(logProgressPct),
        work_description: logProgressDesc || 'Manual override update.',
        workers_count: Number(logProgressWorkers),
        created_at: new Date().toISOString()
      };
      setMockProgress(prev => [newProgress, ...prev]);

      setProjectDetails(prev => ({
        ...prev,
        project: { ...prev.project, completion_percentage: Number(logProgressPct) },
        progressUpdates: [newProgress, ...prev.progressUpdates]
      }));

      setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, completion_percentage: Number(logProgressPct) } : p));
      addToast(`Completion updated to ${logProgressPct}%`, 'progress');
      setLogProgressDesc('');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/progress`, {
        projectId: selectedProjectId,
        completionPercentage: logProgressPct,
        workDescription: logProgressDesc,
        workersCount: logProgressWorkers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogProgressDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  // Log expenditure
  const handleLogCost = async (e) => {
    e.preventDefault();
    const labor = Number(logCostLabor) || 0;
    const material = Number(logCostMaterial) || 0;
    const equip = Number(logCostEquip) || 0;
    const transport = Number(logCostTransport) || 0;
    const total = labor + material + equip + transport;

    if (total <= 0) return;

    if (usingMockData) {
      const newCost = {
        id: Date.now(),
        project_id: selectedProjectId,
        recorded_by_name: 'Arjun M.',
        labor_cost: labor,
        material_cost: material,
        equipment_cost: equip,
        transport_cost: transport,
        miscellaneous: 0,
        created_at: new Date().toISOString()
      };
      setMockCosts(prev => [newCost, ...prev]);

      setProjectDetails(prev => ({
        ...prev,
        project: { ...prev.project, total_cost: Number(prev.project.total_cost) + total },
        costs: [newCost, ...prev.costs]
      }));

      setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, total_cost: Number(p.total_cost) + total } : p));
      addToast(`Recorded expense: ${formatRupees(total)}`, 'cost');
      setLogCostLabor('');
      setLogCostMaterial('');
      setLogCostEquip('');
      setLogCostTransport('');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/costs`, {
        projectId: selectedProjectId,
        laborCost: labor,
        materialCost: material,
        equipmentCost: equip,
        transportCost: transport
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogCostLabor('');
      setLogCostMaterial('');
      setLogCostEquip('');
      setLogCostTransport('');
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic dashboard KPI computations
  const totalBudgetSpent = projects.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
  const totalBudgetLimit = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const spentPercentage = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;
  const delayedProjectsCount = projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').length;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', position: 'relative' }}>
      
      {/* Live notification alerts banner */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notificationToasts.map(toast => (
          <div key={toast.id} className="glass-card animate-fade-in" style={{
            padding: '16px 20px',
            borderLeft: `4px solid ${toast.type === 'cost' ? 'var(--danger)' : toast.type === 'progress' ? 'var(--success)' : '#3b82f6'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: toast.type === 'cost' ? 'var(--danger)' : toast.type === 'progress' ? 'var(--success)' : '#3b82f6',
              boxShadow: `0 0 10px ${toast.type === 'cost' ? 'var(--danger)' : toast.type === 'progress' ? 'var(--success)' : '#3b82f6'}`
            }} />
            <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar navigation exact match to mockup (12, 3, 5 badges) */}
      <div className="glass-panel" style={{ width: '260px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '8px', borderRadius: '10px' }}>
            <Shield size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', margin: 0, fontWeight: 800, color: 'white' }}>ConstructAI</h1>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Management Suite</span>
          </div>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
          {[
            { name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { name: 'Projects', icon: <Briefcase size={18} />, badge: projects.length },
            { name: 'AI Analysis', icon: <Eye size={18} />, badge: pendingAnalyses.length || null },
            { name: 'Costs', icon: <DollarSign size={18} /> },
            { name: 'Delays', icon: <AlertOctagon size={18} />, badge: 3 },
            { name: 'Alerts', icon: <AlertTriangle size={18} />, badge: liveAlerts.length },
            { name: 'Reports', icon: <Activity size={18} />, badge: liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).length || null },
            { name: 'Users', icon: <User size={18} /> },
            { name: 'Settings', icon: <Clock size={18} /> }
          ].map(tab => (
            <button 
              key={tab.name}
              className={`btn-secondary ${activeSidebarTab === tab.name && !selectedProjectId ? 'active' : ''}`}
              onClick={() => { setActiveSidebarTab(tab.name); setSelectedProjectId(null); }}
              style={{
                justifyContent: 'space-between',
                background: (activeSidebarTab === tab.name && !selectedProjectId) ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                padding: '10px 14px',
                fontSize: '13px',
                color: (activeSidebarTab === tab.name && !selectedProjectId) ? 'white' : 'var(--text-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {tab.icon}
                <span>{tab.name}</span>
              </div>
              {tab.badge && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: tab.name === 'Delays' ? 'rgba(239, 68, 68, 0.2)' : tab.name === 'Alerts' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.08)',
                  color: tab.name === 'Delays' ? 'var(--danger)' : tab.name === 'Alerts' ? 'var(--warning)' : 'white'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Database Toggle Diagnostics */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={11} className={checkingBackend ? 'animate-spin' : ''} style={{ color: usingMockData ? 'var(--warning)' : 'var(--success)' }} onClick={checkBackendHealth} />
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{usingMockData ? 'Mock Simulator' : 'Postgres Connected'}</span>
            </div>
            <button onClick={() => setUsingMockData(!usingMockData)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', color: 'white', cursor: 'pointer' }}>Toggle</button>
          </div>
        </div>

        {/* Arjun M. Profile Card */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: 'white'
          }}>
            AM
          </div>
          <div style={{ overflow: 'hidden', flexGrow: 1 }}>
            <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 700, color: 'white' }}>Arjun M.</h4>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Site Manager</span>
          </div>
          <button onClick={() => addToast('Simulating secure logoff...', 'task')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div style={{ flexGrow: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* Mockup Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
                {selectedProjectId ? projectDetails?.project.name : 'Dashboard Overview'}
              </h2>
              {selectedProjectId && projectDetails?.project.blueprint && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  📐 Blueprint: {projectDetails.project.blueprint}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
              {selectedProjectId ? `${projectDetails?.project.location || 'Sector 5'}` : 'Tuesday, 16 May 2026 — Live'}
            </p>
          </div>

          {!selectedProjectId && (
            <button 
              onClick={() => setShowNewProjectModal(true)} 
              className="btn-primary" 
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-gradient)' }}
            >
              <Plus size={14} /> New Project
            </button>
          )}

          {selectedProjectId && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {(user?.role === 'Manager' || user?.role === 'Admin') && (
                <button 
                  onClick={() => handleDeleteProject(selectedProjectId)}
                  style={{ 
                    fontSize: '12px', 
                    padding: '8px 14px', 
                    background: 'rgba(239, 68, 68, 0.12)', 
                    color: '#ef4444', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Trash2 size={14} /> Delete Project
                </button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedProjectId(null)} style={{ fontSize: '12px', padding: '8px 14px' }}>
                <ArrowLeft size={14} /> Back to Command
              </button>
            </div>
          )}
        </div>

        {/* Dashboard Grid layout */}
        {!selectedProjectId ? (
          activeSidebarTab === 'AI Analysis' ? (
            /* AI Analysis Panel */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header */}
              <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Eye size={22} color="#6366f1" />
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'white', fontWeight: 800, margin: 0 }}>AI Photo Analysis Center</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Visual comparison • Blueprint tracking • Delay detection</p>
                  </div>
                </div>
                {pendingAnalyses.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.18)', color: '#ef4444' }}>
                    {pendingAnalyses.length} PENDING APPROVAL{pendingAnalyses.length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>

              {pendingAnalyses.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                  <CheckCircle2 size={40} style={{ color: 'var(--success)', margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>All site uploads fully reviewed!</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>AI findings will appear here when a worker uploads a progress photo from the mobile app.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {pendingAnalyses.map(analysis => {
                    const bpComp = analysis.blueprint_comparison || {};
                    const schedStatus = bpComp.schedule_status || {};
                    const delayInfo = analysis.delay_risk_analysis || {};
                    const forecast = analysis.forecasting || {};
                    const quality = analysis.quality_assurance || {};
                    const metrics = analysis.progress_metrics || {};
                    const visualComp = analysis.visual_comparison || {};
                    const phaseInfo = analysis.phase_analysis || {};
                    const progAnalysis = analysis.progress_analysis || {};

                    const status = schedStatus.status || (analysis.delay_risk === 'High' ? 'BEHIND SCHEDULE' : 'ON TRACK');
                    const statusColor = status === 'ON TRACK' || status === 'AHEAD OF SCHEDULE' ? '#10b981'
                      : status === 'SLIGHTLY BEHIND' ? '#f59e0b' : '#ef4444';

                    const changeDetected = analysis.change_detected !== false;
                    const delaySeverity = delayInfo.severity || 'NONE';

                    return (
                      <div key={analysis.id} className="glass-card animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
                        
                        {/* Card Header */}
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '10px', height: '10px', borderRadius: '50%',
                              background: changeDetected ? '#10b981' : '#ef4444',
                              boxShadow: `0 0 8px ${changeDetected ? '#10b981' : '#ef4444'}`
                            }} />
                            <div>
                              <h3 style={{ fontSize: '15px', color: 'white', fontWeight: 700, margin: 0 }}>
                                Project #{analysis.project_id} — Site Upload Analysis
                              </h3>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                {new Date(analysis.created_at || Date.now()).toLocaleString()} • Blueprint: {analysis.blueprint || 'Standard Warehouse'}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}33` }}>
                              {status}
                            </span>
                            <button className="btn-primary" onClick={() => handleApproveAIAnalysis(analysis.id)} style={{ fontSize: '12px', padding: '8px 18px', gap: '6px' }}>
                              <CheckCircle2 size={13} /> Approve Update
                            </button>
                          </div>
                        </div>

                        <div style={{ padding: '24px 28px' }}>
                          
                          {/* Row 1: Photo + Change Detection + Stage */}
                          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                              <img src={analysis.photo_url} alt="Site capture" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} onError={e => { e.target.style.display = 'none'; }} />
                              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                                  {analysis.stage_detected}
                                </span>
                              </div>
                            </div>
                            <div>
                              {/* Change Detection Banner */}
                              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '14px', background: changeDetected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${changeDetected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '20px' }}>{changeDetected ? '✅' : '⚠️'}</span>
                                <div>
                                  <p style={{ fontSize: '13px', fontWeight: 700, color: changeDetected ? '#10b981' : '#ef4444', margin: 0 }}>
                                    {changeDetected ? 'SIGNIFICANT CHANGES DETECTED' : 'NO SIGNIFICANT CHANGES — DELAY RISK'}
                                  </p>
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                    {changeDetected ? `Stage: ${analysis.stage_detected}` : 'Photo matches previous upload. Site may be stagnant.'}
                                  </p>
                                </div>
                              </div>

                              {/* Quick Stats Row */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                {[
                                  { label: 'Completion Est.', value: `${analysis.estimated_completion}%`, color: '#6366f1' },
                                  { label: 'Expected Today', value: `${bpComp.expected_progress?.percentage ?? '--'}%`, color: '#94a3b8' },
                                  { label: 'Variance', value: schedStatus.percentage_variance !== undefined ? `${schedStatus.percentage_variance >= 0 ? '+' : ''}${schedStatus.percentage_variance}%` : '--', color: (schedStatus.percentage_variance ?? 0) >= 0 ? '#10b981' : '#ef4444' },
                                  { label: 'Delay Risk', value: analysis.delay_risk || 'Low', color: analysis.delay_risk === 'High' ? '#ef4444' : '#10b981' },
                                ].map(stat => (
                                  <div key={stat.label} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600 }}>{stat.label}</p>
                                    <p style={{ fontSize: '15px', fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Progress Bar */}
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTUAL PROGRESS</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>EXPECTED PROGRESS</span>
                            </div>
                            <div style={{ position: 'relative', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${analysis.estimated_completion}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
                            </div>
                            <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginTop: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${bpComp.expected_progress?.percentage || 0}%`, height: '100%', background: 'rgba(148,163,184,0.4)', borderRadius: '10px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 700 }}>{analysis.estimated_completion}%</span>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{bpComp.expected_progress?.percentage ?? '--'}%</span>
                            </div>
                          </div>

                          {/* Row 3: Detail Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            
                            {/* Blueprint Comparison */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: `3px solid ${statusColor}` }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 10px', letterSpacing: '0.5px' }}>SCHEDULE STATUS</p>
                              <p style={{ fontSize: '13px', color: statusColor, fontWeight: 700, margin: '0 0 6px' }}>{status}</p>
                              {schedStatus.days_behind > 0 && <p style={{ fontSize: '11px', color: '#ef4444', margin: '0 0 4px' }}>⚠ {schedStatus.days_behind} days behind</p>}
                              {schedStatus.days_ahead > 0 && <p style={{ fontSize: '11px', color: '#10b981', margin: '0 0 4px' }}>↑ {schedStatus.days_ahead} days ahead</p>}
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Phase: {phaseInfo.current_phase || analysis.stage_detected?.split(' ')[0]}</p>
                            </div>

                            {/* Worker Productivity */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 10px', letterSpacing: '0.5px' }}>WORKER PRODUCTIVITY</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Before</span>
                                <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>{visualComp.worker_count_before ?? '--'} workers</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Now</span>
                                <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>{visualComp.worker_count_now ?? '--'} workers</span>
                              </div>
                              <p style={{ fontSize: '11px', color: '#10b981', margin: '4px 0 0' }}>{visualComp.worker_change || '--'}</p>
                            </div>

                            {/* Forecasting */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #f59e0b' }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 10px', letterSpacing: '0.5px' }}>FORECASTING</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Blueprint End</span>
                                <span style={{ fontSize: '11px', color: 'white', fontWeight: 600 }}>{forecast.blueprint_completion_date || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Projected</span>
                                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>{forecast.current_completion_estimate || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence</span>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>{forecast.confidence || '--'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Row 4: Delay Alert (only if delay detected) */}
                          {delayInfo.delay_detected && (
                            <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '16px' }}>
                              <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, margin: '0 0 8px' }}>🚨 DELAY ALERT — {delaySeverity} SEVERITY</p>
                              <p style={{ fontSize: '12px', color: '#fca5a5', margin: '0 0 8px' }}>{delayInfo.manager_alert?.message}</p>
                              <p style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, margin: '0 0 4px' }}>Action: {delayInfo.manager_alert?.action_required}</p>
                              {delayInfo.delay_analysis?.root_causes?.length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {delayInfo.delay_analysis.root_causes.map((cause, i) => (
                                    <span key={i} style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '4px' }}>{cause}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 5: Quality + Safety + Recommendations */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 10px' }}>QUALITY & SAFETY</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Work Quality</span>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>{quality.work_quality || 'GOOD'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Safety</span>
                                <span style={{ fontSize: '11px', color: quality.safety_compliance === 'VIOLATION DETECTED' ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                                  {quality.safety_compliance || (analysis.safety_findings ? 'VIOLATION DETECTED' : 'PASS')}
                                </span>
                              </div>
                              {analysis.safety_findings && (
                                <p style={{ fontSize: '10px', color: '#fbbf24', margin: '6px 0 0' }}>⚠ {analysis.safety_findings}</p>
                              )}
                            </div>
                            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 10px' }}>RECOMMENDATIONS</p>
                              {(forecast.recommendations || delayInfo.recommendations || []).slice(0, 3).map((rec, i) => (
                                <p key={i} style={{ fontSize: '11px', color: '#a5b4fc', margin: '0 0 4px' }}>✦ {rec}</p>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          ) : activeSidebarTab === 'Reports' ? (
            /* Reports & Alerts Panel */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header */}
              <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Activity size={22} color="#10b981" />
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'white', fontWeight: 800, margin: 0 }}>Site Operations & Incident Reports</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Mobile worker submissions • Hazard tracking</p>
                  </div>
                </div>
                {liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
                    {liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).length} PENDING REPORT{liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>

              {/* Worker Incident Reports (Full Width) */}
              <div className="glass-card" style={{ padding: '28px 30px' }}>
                <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color="#f59e0b" /> Mobile Incident Logs
                </h3>
                
                {liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>No active incident reports</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Worker submissions from the mobile client will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {liveAlerts.filter(a => a.type === 'site_hazard' || (a.message && a.message.includes('Reported issue by'))).map(alert => {
                      const severityColor = alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6';
                      
                      // Try parsing worker name e.g. "Reported issue by Ravi: ..."
                      let workerName = 'Field Worker';
                      let issueText = alert.message;
                      const match = alert.message.match(/Reported issue by ([^:]+): (.*)/);
                      if (match) {
                        workerName = match[1];
                        issueText = match[2];
                      }
                      
                      return (
                        <div key={alert.id} style={{ padding: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: `4px solid ${severityColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: `${severityColor}1a`, color: severityColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {alert.severity || 'info'} Severity
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                              Project: <strong style={{ color: 'white' }}>{alert.project_name || `Project #${alert.project_id}`}</strong>
                            </p>
                            
                            <p style={{ fontSize: '13.5px', color: '#f1f5f9', lineHeight: '150%', margin: '0 0 16px', fontStyle: 'italic' }}>
                              "{issueText}"
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', marginTop: 'auto' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Reporter: <strong style={{ color: 'white' }}>{workerName}</strong>
                            </span>
                            <button 
                              className="btn-secondary" 
                              onClick={() => handleResolveAlert(alert.id, alert.project_name || `Project #${alert.project_id}`)}
                              style={{ padding: '5px 12px', fontSize: '11px', height: '28px' }}
                            >
                              Acknowledge
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          ) : activeSidebarTab === 'Delays' ? (
            /* Delays Panel */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header */}
              <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertOctagon size={22} color="#ef4444" />
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'white', fontWeight: 800, margin: 0 }}>Project Delay Control Center</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Real-time schedule monitoring • AI delay estimates • Mitigation logs</p>
                  </div>
                </div>
                {projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.18)', color: '#ef4444' }}>
                    {projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').length} PROJECT{projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').length > 1 ? 'S' : ''} DELAYED
                  </span>
                )}
              </div>

              {projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').length === 0 ? (
                <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                  <CheckCircle2 size={40} style={{ color: 'var(--success)', margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>All projects on track!</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No active project delays or schedule risks detected.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {projects.filter(p => p.risk_level === 'High risk' || p.risk_level === 'Medium').map(proj => {
                    const daysBehind = getDaysBehind(proj);
                    const expected = getExpectedProgress(proj);
                    const actual = proj.completion_percentage;
                    const variance = expected - actual;
                    
                    // Retrieve last progress log
                    const lastProgress = mockProgress
                      .filter(up => up.project_id === proj.id)
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                    const isHighRisk = proj.risk_level === 'High risk';
                    const badgeColor = isHighRisk ? '#ef4444' : '#f59e0b';
                    
                    return (
                      <div key={proj.id} className="glass-card animate-fade-in" style={{ padding: '0', overflow: 'hidden' }}>
                        
                        {/* Panel Header */}
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, margin: 0 }}>
                              {proj.name} — {proj.location}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              Blueprint: {proj.blueprint || 'Standard Warehouse'} • Budget: ₹{(proj.budget / 10000000).toFixed(1)}Cr
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: `${badgeColor}1a`, color: badgeColor, border: `1px solid ${badgeColor}33` }}>
                              ⚠️ {daysBehind} Days Behind
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                              Risk: {proj.risk_level}
                            </span>
                          </div>
                        </div>

                        {/* Panel Body */}
                        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                          
                          {/* Left Column: Progress Variance */}
                          <div>
                            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 16px', letterSpacing: '0.5px' }}>
                              SCHEDULE SLIPPAGE DETAILED VIEW
                            </h4>
                            
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Actual Progress: <strong style={{ color: 'white' }}>{actual}%</strong></span>
                                <span style={{ color: 'var(--text-secondary)' }}>Expected Baseline: <strong style={{ color: 'white' }}>{expected}%</strong></span>
                              </div>
                              <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${actual}%`, height: '100%', background: `linear-gradient(90deg, ${badgeColor}, #3b82f6)`, borderRadius: '4px' }} />
                              </div>
                              <div style={{ position: 'relative', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${expected}%`, height: '100%', background: 'rgba(148,163,184,0.3)', borderRadius: '2px' }} />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Progress Variance</span>
                                <p style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444', margin: '2px 0 0' }}>-{variance}%</p>
                              </div>
                              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Milestone Handover</span>
                                <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'white', margin: '4px 0 0' }}>{proj.end_date}</p>
                              </div>
                            </div>

                            <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                              <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0, fontWeight: 600 }}>
                                💡 AI Recommended Action: Reallocate {isHighRisk ? '15%' : '8%'} unused material budget to add additional manpower on site to recover schedule delays.
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Last Progress Update */}
                          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '30px' }}>
                            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, margin: '0 0 16px', letterSpacing: '0.5px' }}>
                              LAST PROGRESS UPDATE RECEIVED
                            </h4>
                            
                            {lastProgress ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: 'white', fontWeight: 700 }}>
                                    Logged by: {lastProgress.updated_by_name}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {new Date(lastProgress.created_at).toLocaleDateString()} at {new Date(lastProgress.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '60px' }}>
                                  <p style={{ fontSize: '12.5px', color: '#e2e8f0', margin: 0, fontStyle: 'italic', lineHeight: '145%' }}>
                                    "{lastProgress.work_description}"
                                  </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  <span>Site Worker Count: <strong style={{ color: 'white' }}>{lastProgress.workers_count || '--'} workers</strong></span>
                                  <span>Recorded Completion: <strong style={{ color: 'white' }}>{lastProgress.completion_percentage}%</strong></span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ flex: 1, fontSize: '11px', padding: '6px' }} 
                                    onClick={() => handleContactWorker(proj.id, proj.name, lastProgress.updated_by_name)}
                                  >
                                    💬 Contact Worker
                                  </button>
                                  <button className="btn-primary" style={{ flex: 1, fontSize: '11px', padding: '6px', backgroundColor: '#6366f1' }} onClick={() => addToast('Labor reallocation initiated.', 'project')}>
                                    ⚡ Reallocate Labor
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '30px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                  No progress updates have been recorded yet for this project.
                                </p>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          ) : activeSidebarTab === 'Alerts' ? (
            /* Alerts Panel */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header */}
              <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={22} color="#f59e0b" />
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'white', fontWeight: 800, margin: 0 }}>Active Site Alerts & AI Scans</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Security violations • Photo stagnancy checks • Live operations feed</p>
                  </div>
                </div>
                {liveAlerts.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
                    {liveAlerts.length} ACTIVE ALERT{liveAlerts.length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                
                {/* Column 1: AI Scanned Alerts (duplicate/same photo) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-card" style={{ padding: '24px 28px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Eye size={16} color="#ef4444" /> AI Photographic Integrity Scans
                    </h3>
                    
                    {liveAlerts.filter(a => a.type === 'duplicate_photo' || a.message.toLowerCase().includes('duplicate') || a.message.toLowerCase().includes('same photo') || a.message.toLowerCase().includes('identical progress')).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>No photo integrity alerts</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>AI auto-verification will flag duplicate or fake photos here.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {liveAlerts.filter(a => a.type === 'duplicate_photo' || a.message.toLowerCase().includes('duplicate') || a.message.toLowerCase().includes('same photo') || a.message.toLowerCase().includes('identical progress')).map(alert => {
                          // Try parsing worker name e.g. "AI Scan Warning: Worker Ravi uploaded..."
                          let workerName = 'Field Worker';
                          const workerMatch = alert.message.match(/Worker\s+([a-zA-Z0-9\s\.\-_]+?)\s+(?:uploaded|is reportedly|is\b)/i) || alert.message.match(/Worker ([a-zA-Z]+)/);
                          if (workerMatch) {
                            workerName = workerMatch[1].trim();
                          }

                          return (
                            <div key={alert.id} style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.15)', borderLeft: '4px solid #ef4444' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', textTransform: 'uppercase' }}>
                                    Tampering Warning
                                  </span>
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Project: <strong>{alert.project_name || `Project #${alert.project_id}`}</strong>
                                  </p>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <p style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '145%', margin: '10px 0 14px' }}>
                                ⚠️ <strong>{workerName}</strong> is reportedly uploading the same or a fake photo. AI scan detected static image hashes without visual updates.
                              </p>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Logged by: <strong>Computer Vision AI</strong>
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn-secondary" 
                                    onClick={() => handleResolveAlert(alert.id, alert.project_name || `Project #${alert.project_id}`)}
                                    style={{ padding: '4px 10px', fontSize: '10px', height: '24px' }}
                                  >
                                    Dismiss
                                  </button>
                                  <button 
                                    className="btn-primary" 
                                    onClick={() => {
                                      handleContactWorker(alert.project_id, alert.project_name || `Project #${alert.project_id}`, workerName);
                                      addToast(`Requesting retake from ${workerName}`, 'progress');
                                    }}
                                    style={{ padding: '4px 10px', fontSize: '10px', height: '24px', backgroundColor: '#ef4444' }}
                                  >
                                    🔄 Request Retake
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: All Live Operations Alerts Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-card" style={{ padding: '24px 28px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} color="#f59e0b" /> Operations Live Alerts Feed
                    </h3>
                    
                    {liveAlerts.filter(a => a.type !== 'duplicate_photo' && !a.message.toLowerCase().includes('duplicate') && !a.message.toLowerCase().includes('same photo') && !a.message.toLowerCase().includes('identical progress')).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', margin: 0 }}>Operations feed clean</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {liveAlerts.filter(a => a.type !== 'duplicate_photo' && !a.message.toLowerCase().includes('duplicate') && !a.message.toLowerCase().includes('same photo') && !a.message.toLowerCase().includes('identical progress')).map(alert => (
                          <div 
                            key={alert.id} 
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'start',
                              paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: alert.dot_color || '#14b8a6', marginTop: '5px', flexShrink: 0 }} />
                              <div>
                                <span style={{ fontSize: '12.5px', color: 'white', fontWeight: 600, lineHeight: '140%' }}>{alert.message}</span>
                                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                  Project: {alert.project_name || `Project #${alert.project_id}`}
                                </p>
                              </div>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '10px' }}>
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          ) : activeSidebarTab === 'Projects' ? (
            /* Projects Panel */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Header */}
              <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Briefcase size={22} color="#6366f1" />
                  <div>
                    <h2 style={{ fontSize: '20px', color: 'white', fontWeight: 800, margin: 0 }}>All Active Project Sites</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Real-time construction tracking • Blueprints • Resource allocations</p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.18)', color: '#818cf8' }}>
                  {projects.length} Total Projects
                </span>
              </div>

              {/* Projects Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {projects.map((proj, idx) => {
                  const bulletColors = { 'Low risk': '#10b981', 'Medium': '#f59e0b', 'High risk': '#ef4444', 'On track': '#10b981' };
                  const bgColors = { 'Low risk': 'rgba(16,185,129,0.15)', 'Medium': 'rgba(245,158,11,0.15)', 'High risk': 'rgba(239,68,68,0.15)', 'On track': 'rgba(16,185,129,0.15)' };
                  const textColors = { 'Low risk': 'var(--success)', 'Medium': 'var(--warning)', 'High risk': 'var(--danger)', 'On track': 'var(--success)' };
                  const statusColor = bulletColors[proj.risk_level] || '#10b981';

                  return (
                    <div 
                      key={proj.id} 
                      className="glass-card" 
                      onClick={() => fetchProjectDetails(proj.id)}
                      style={{ 
                        padding: '24px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px',
                        position: 'relative',
                        borderLeft: `4px solid ${statusColor}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, margin: 0 }}>{proj.name}</h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>📍 {proj.location}</span>
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                          background: bgColors[proj.risk_level] || 'rgba(255,255,255,0.08)',
                          color: textColors[proj.risk_level] || 'white',
                          textTransform: 'uppercase'
                        }}>
                          {proj.risk_level}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>AI Progress Verification</span>
                          <span style={{ color: 'white', fontWeight: 700 }}>{proj.completion_percentage}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${proj.completion_percentage}%`, backgroundColor: statusColor, borderRadius: '3px' }} />
                        </div>
                      </div>

                      {/* Budget and blueprint */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', fontSize: '11.5px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>SPENT vs BUDGET</span>
                          <span style={{ color: 'white', fontWeight: 600 }}>{formatRupees(proj.total_cost || 0)} / {formatRupees(proj.budget)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>BLUEPRINT MODEL</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{proj.blueprint.split('/').pop()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            /* General mockup overview panels */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
              
              {/* Row 1: Mockup standard KPIs (Active, Delayed, Budget Used, AI Risk Score) */}
              <div className="dashboard-grid">
                <div className="glass-card" style={{ padding: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Projects</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px' }}>
                    <h3 style={{ fontSize: '32px', color: 'white', fontWeight: 800 }}>{projects.length}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 700 }}>+2 this month</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderLeft: '3px solid var(--danger)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Delayed Projects</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px' }}>
                    <h3 style={{ fontSize: '32px', color: 'var(--danger)', fontWeight: 800 }}>{delayedProjectsCount}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Needs attention</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Budget Used ({spentPercentage}%)</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px' }}>
                    <h3 style={{ fontSize: '32px', color: 'white', fontWeight: 800 }}>{formatRupees(totalBudgetSpent)}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Within estimate</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderLeft: '3px solid var(--warning)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>AI Risk Score /10</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px' }}>
                    <h3 style={{ fontSize: '32px', color: 'var(--warning)', fontWeight: 800 }}>6.2</h3>
                    <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 700 }}>Medium risk zone</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Middle Columns (Project Progress vs Project Status) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                
                {/* Project Progress list */}
                <div className="glass-card" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700 }}>Project Progress</h3>
                    <span style={{ fontSize: '12px', color: 'var(--accent-light)', cursor: 'pointer' }}>View all &rarr;</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {projects.slice(0, 5).map((proj, index) => {
                      const fillColors = ['#10b981', '#3b82f6', '#10b981', '#b45309', '#10b981'];
                      const barColor = fillColors[index % fillColors.length];
                      return (
                        <div key={proj.id} onClick={() => fetchProjectDetails(proj.id)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: 'white', fontWeight: 600 }}>{proj.name} — {proj.location}</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{proj.completion_percentage}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${proj.completion_percentage}%`, backgroundColor: barColor, borderRadius: '3px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Project Status table */}
                <div className="glass-card" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700 }}>Project Status</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Filter size={12} /> Filter
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {projects.slice(0, 5).map(proj => {
                      const bulletColors = { 'Low risk': '#10b981', 'Medium': '#f59e0b', 'High risk': '#ef4444', 'On track': '#10b981' };
                      const bgColors = { 'Low risk': 'rgba(16,185,129,0.15)', 'Medium': 'rgba(245,158,11,0.15)', 'High risk': 'rgba(239,68,68,0.15)', 'On track': 'rgba(16,185,129,0.15)' };
                      const textColors = { 'Low risk': 'var(--success)', 'Medium': 'var(--warning)', 'High risk': 'var(--danger)', 'On track': 'var(--success)' };
                      const bullet = bulletColors[proj.risk_level] || '#10b981';
                      
                      return (
                        <div 
                          key={proj.id}
                          onClick={() => fetchProjectDetails(proj.id)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '40%', backgroundColor: bullet, boxShadow: `0 0 8px ${bullet}` }} />
                            <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>{proj.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{proj.completion_percentage}%</span>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                              background: bgColors[proj.risk_level] || 'rgba(255,255,255,0.08)',
                              color: textColors[proj.risk_level] || 'white'
                            }}>
                              {proj.risk_level}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 3: Bottom Columns (AI Insights vs Live Alerts) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                
                {/* AI Insights column */}
                <div className="glass-card" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700 }}>AI Insights</h3>
                    <span style={{ fontSize: '12px', color: 'var(--accent-light)', cursor: 'pointer' }}>Full analysis &rarr;</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {aiInsights.map(insight => (
                      <div 
                        key={insight.id} 
                        style={{
                          padding: '16px 20px', borderRadius: '12px',
                          background: insight.color_theme,
                          border: `1px solid ${insight.border_theme}`,
                          boxShadow: `0 8px 24px ${insight.bg_glow}`,
                          display: 'flex', gap: '15px', alignItems: 'start'
                        }}
                      >
                        <div style={{ marginTop: '2px', color: insight.text_theme }}>
                          {insight.type === 'delay_prediction' ? <AlertTriangle size={18} /> : insight.type === 'stage_detected' ? <Shield size={18} /> : <TrendingUp size={18} />}
                        </div>
                        <p style={{ fontSize: '12px', color: insight.text_theme, fontWeight: 600, lineHeight: '140%', margin: 0 }}>
                          {insight.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Alerts Column */}
                <div className="glass-card" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700 }}>Live Alerts</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Manage all</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '280px', overflowY: 'auto' }}>
                    {liveAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'start',
                          paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: alert.dot_color, marginTop: '5px', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: 'white', fontWeight: 600, lineHeight: '140%' }}>{alert.message}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '10px' }}>
                          {alert.timestamp.includes('T') ? 'Today' : '2 hrs ago'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )
        ) : (
          !projectDetails || !projectDetails.project ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'white' }} className="animate-fade-in">
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>Gathering real-time project telemetry...</p>
            </div>
          ) : (
            /* Single Project Detail Pane */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <button className={`btn-secondary ${projectSubTab === 'overview' ? 'active' : ''}`} onClick={() => setProjectSubTab('overview')} style={{ background: projectSubTab === 'overview' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', fontSize: '12px' }}>
                <DollarSign size={14} /> Analytics & Costs
              </button>

              <button className={`btn-secondary ${projectSubTab === 'tasks' ? 'active' : ''}`} onClick={() => setProjectSubTab('tasks')} style={{ background: projectSubTab === 'tasks' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', fontSize: '12px' }}>
                <CheckSquare size={14} /> Tasks Matrix
              </button>

              <button className={`btn-secondary ${projectSubTab === 'photos' ? 'active' : ''}`} onClick={() => setProjectSubTab('photos')} style={{ background: projectSubTab === 'photos' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', fontSize: '12px' }}>
                <Camera size={14} /> Site Snapshots
              </button>

              <button className={`btn-secondary ${projectSubTab === 'workers' ? 'active' : ''}`} onClick={() => setProjectSubTab('workers')} style={{ background: projectSubTab === 'workers' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', fontSize: '12px' }}>
                <Users size={14} /> Project Workers
              </button>
            </div>

            {/* Overview & Cost Tab */}
            {projectSubTab === 'overview' && (() => {
              const totalCost = Number(projectDetails.project.total_cost) || 0;
              const budget = Number(projectDetails.project.budget) || 1;
              const spentPct = Math.min(100, Math.round((totalCost / budget) * 100));
              const remainingAmount = Math.max(0, budget - totalCost);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
                  
                  {/* Row 1: Project Timeline & Progress + Cost Distribution Balance */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: '24px' }}>
                    
                    {/* Project Timeline & Progress */}
                    <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TrendingUp size={16} color="#10b981" /> Overall Project Progress
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '28px', color: 'white', fontWeight: 800 }}>
                            {projectDetails.project.completion_percentage}%
                          </span>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px',
                            background: projectDetails.project.risk_level === 'High risk' ? 'rgba(239, 68, 68, 0.15)' : projectDetails.project.risk_level === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: projectDetails.project.risk_level === 'High risk' ? '#ef4444' : projectDetails.project.risk_level === 'Medium' ? '#f59e0b' : '#10b981'
                          }}>
                            {projectDetails.project.risk_level || 'On Track'}
                          </span>
                        </div>
                        
                        {/* Linear Progress Bar */}
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden', marginBottom: '20px' }}>
                          <div style={{
                            height: '100%',
                            width: `${projectDetails.project.completion_percentage}%`,
                            backgroundColor: projectDetails.project.risk_level === 'High risk' ? '#ef4444' : projectDetails.project.risk_level === 'Medium' ? '#f59e0b' : '#10b981',
                            borderRadius: '5px',
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Tasks Matrix Status</span>
                            <p style={{ fontSize: '14px', color: 'white', fontWeight: 700, marginTop: '2px' }}>
                              {projectDetails.tasks.filter(t => t.status === 'Completed').length} / {projectDetails.tasks.length} Done
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Timeline baseline</span>
                            <p style={{ fontSize: '14px', color: 'white', fontWeight: 700, marginTop: '2px' }}>
                              Handover: Dec 2026
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress log manual override */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: 'white', fontWeight: 700, marginBottom: '12px' }}>Submit Live Status Log</h4>
                        <form onSubmit={handleLogProgress} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Completion: {logProgressPct}%</label>
                              <span style={{ fontSize: '10px', color: 'var(--accent-light)', cursor: 'pointer' }} onClick={() => addToast('AI Scanner checking safety...', 'progress')}>Trigger AI scan</span>
                            </div>
                            <input type="range" min="0" max="100" value={logProgressPct} onChange={(e) => setLogProgressPct(e.target.value)} style={{ accentColor: 'var(--accent)' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <input type="number" className="glass-input" placeholder="Engineers" value={logProgressWorkers} onChange={(e) => setLogProgressWorkers(e.target.value)} style={{ padding: '6px', fontSize: '12px' }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <input type="text" className="glass-input" placeholder="Achievements..." value={logProgressDesc} onChange={(e) => setLogProgressDesc(e.target.value)} style={{ padding: '6px', fontSize: '12px' }} required />
                            </div>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
                              Log
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Cost Distribution Balance */}
                    <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Cost Distribution Balance</h3>
                        
                        {/* Donut Chart */}
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                          <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: `conic-gradient(#14b8a6 0% ${spentPct}%, rgba(255,255,255,0.06) ${spentPct}% 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(20, 184, 166, 0.1)'
                          }}>
                            <div style={{
                              width: '76px',
                              height: '76px',
                              borderRadius: '50%',
                              background: 'rgba(17, 22, 39, 0.95)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: '18px', color: 'white', fontWeight: 800 }}>{spentPct}%</span>
                              <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Spent</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#14b8a6' }} />
                              <div>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>Spent Budget</span>
                                <span style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>{formatRupees(totalCost)}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                              <div>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>Remaining Balance</span>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>{formatRupees(remainingAmount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span>Project Budget limit:</span>
                            <span style={{ color: 'white', fontWeight: 700 }}>{formatRupees(budget)}</span>
                          </div>
                          {totalCost > budget && (
                            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 700 }}>
                                ⚠️ OVER BUDGET CAP WARNING
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: AI Delay & Risk Analysis + Real-time Site Snapshots */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: '24px' }}>
                    
                    {/* AI Delay & Risk Analysis */}
                    <div className="glass-card" style={{ padding: '30px', borderLeft: `4px solid ${projectDetails.project.risk_level === 'High risk' ? '#ef4444' : projectDetails.project.risk_level === 'Medium' ? '#f59e0b' : '#10b981'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={16} color="#14b8a6" /> AI Health & Delay Risk
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Risk Profile</span>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                              background: projectDetails.project.risk_level === 'High risk' ? 'rgba(239, 68, 68, 0.15)' : projectDetails.project.risk_level === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: projectDetails.project.risk_level === 'High risk' ? '#ef4444' : projectDetails.project.risk_level === 'Medium' ? '#f59e0b' : '#10b981'
                            }}>{projectDetails.project.risk_level || 'On track'}</span>
                          </div>

                          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>AI Prediction Alert</span>
                            <p style={{ fontSize: '12px', color: 'white', marginTop: '4px', lineHeight: 1.4 }}>
                              {projectDetails.project.id === 2 
                                ? '5-day delay predicted based on material bottlenecks and weather changes.'
                                : projectDetails.project.id === 1
                                ? 'Tower A is on track for June 25 handover. No weather bottlenecks flagged.'
                                : 'Progress matches baseline timeline. Low risk of delay.'}
                            </p>
                          </div>

                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>AI Recommendations:</span>
                            <ul style={{ paddingLeft: '14px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <li>Optimize labor distribution on Level 4 frameworks.</li>
                              <li>Verify safety gear (helmet warning active on last upload).</li>
                              <li>Ensure material supply line matches concrete pouring tasks.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Site Snapshots */}
                    <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Camera size={16} color="#3b82f6" /> Recent Site Snapshots
                          </h3>
                          <span onClick={() => setProjectSubTab('photos')} style={{ fontSize: '11px', color: 'var(--accent-light)', cursor: 'pointer', fontWeight: 600 }}>
                            View All ({projectDetails.photos.length}) &rarr;
                          </span>
                        </div>

                        {projectDetails.photos.length === 0 ? (
                          <div style={{ height: '120px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No photos uploaded yet.</span>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {projectDetails.photos.slice(0, 3).map((ph) => (
                              <div key={ph.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '120px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <img src={ph.photo_url} alt="Site progress" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px',
                                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                                  display: 'flex', flexDirection: 'column'
                                }}>
                                  <span style={{ fontSize: '9px', color: 'white', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ph.description || 'Site Snapshot'}
                                  </span>
                                  <span style={{ fontSize: '7px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {new Date(ph.uploaded_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Last upload: {projectDetails.photos.length > 0 ? new Date(projectDetails.photos[0].uploaded_at).toLocaleDateString() : 'N/A'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                          ● Live Feed Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Tabular Logs + Expense Logger */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: '24px' }}>
                    
                    {/* Activity logs & expense entries */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="glass-card" style={{ padding: '30px' }}>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Expense Ledger Entries</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                          {projectDetails.costs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No expenses logged.</p>
                          ) : (
                            projectDetails.costs.map((cost) => {
                              const total = Number(cost.labor_cost) + Number(cost.material_cost) + Number(cost.equipment_cost) + Number(cost.transport_cost) + Number(cost.miscellaneous);
                              return (
                                <div key={cost.id} style={{
                                  padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                  <div>
                                    <h5 style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>Logged by {cost.recorded_by_name}</h5>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                      L: {formatRupees(cost.labor_cost)} | M: {formatRupees(cost.material_cost)}
                                    </p>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--warning)', fontWeight: 800 }}>{formatRupees(total)}</span>
                                    <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(cost.created_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '30px' }}>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Daily Field Log History</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                          {projectDetails.progressUpdates.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No logs recorded yet.</p>
                          ) : (
                            projectDetails.progressUpdates.map((update) => (
                              <div key={update.id} style={{
                                padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'start'
                              }}>
                                <div style={{ flex: 1, paddingRight: '10px' }}>
                                  <h5 style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>{update.updated_by_name}</h5>
                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>"{update.work_description}"</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 800 }}>{update.completion_percentage}%</span>
                                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(update.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expense Logger */}
                    <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Log Site Expenditure</h3>
                        <form onSubmit={handleLogCost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Labor Cost (₹)</label>
                            <input type="number" className="glass-input" placeholder="e.g. 500000" value={logCostLabor} onChange={(e) => setLogCostLabor(e.target.value)} style={{ padding: '8px' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Material Cost (₹)</label>
                            <input type="number" className="glass-input" placeholder="e.g. 1500000" value={logCostMaterial} onChange={(e) => setLogCostMaterial(e.target.value)} style={{ padding: '8px' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Equipment (₹)</label>
                              <input type="number" className="glass-input" placeholder="e.g. 200000" value={logCostEquip} onChange={(e) => setLogCostEquip(e.target.value)} style={{ padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Transport (₹)</label>
                              <input type="number" className="glass-input" placeholder="e.g. 50000" value={logCostTransport} onChange={(e) => setLogCostTransport(e.target.value)} style={{ padding: '8px' }} />
                            </div>
                          </div>
                          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '10px' }}>
                            Record Expense
                          </button>
                        </form>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })()}


            {/* Task Matrix Subtab */}
            {projectSubTab === 'tasks' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }} className="animate-fade-in">
                <div className="glass-card" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Tasks Checklist</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {projectDetails.tasks.map(task => (
                      <div 
                        key={task.id} 
                        className="glass-card" 
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        style={{
                          padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderLeft: `4px solid ${task.status === 'Completed' ? 'var(--success)' : task.status === 'In Progress' ? '#3b82f6' : 'rgba(255,255,255,0.06)'}`
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '14px', color: task.status === 'Completed' ? 'var(--text-secondary)' : 'white', fontWeight: 600 }}>{task.title}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'inline-block' }}>Assignee: {task.assigned_to_name}</span>
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                          background: task.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                          color: task.status === 'Completed' ? 'var(--success)' : 'white'
                        }}>{task.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 700, marginBottom: '20px' }}>Assign New Task</h3>
                  <form onSubmit={(e) => { e.preventDefault(); addToast('Simulating task assignment...', 'task'); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Task Title</label>
                      <input type="text" className="glass-input" placeholder="Brickwork Floor 2..." required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Assign Task</button>
                  </form>
                </div>
              </div>
            )}

            {/* Site Snapshots Gallery */}
            {projectSubTab === 'photos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
                {/* Simulated AI Photo Log form */}
                <div className="glass-card" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, marginBottom: '16px' }}>Submit Camera Roll Upload (AI Scan)</h3>
                  <form onSubmit={handlePhotoUploadSimulateAI} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px', alignItems: 'end' }}>
                      
                      {/* File Upload zone */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SITE PHOTO FILE (CLICK TO SELECT)</label>
                        <div 
                          onClick={() => document.getElementById('snapshot-upload-input').click()}
                          style={{ 
                            border: '1.5px dashed rgba(255, 255, 255, 0.12)', 
                            borderRadius: '10px', 
                            padding: '10px 14px', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.02)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                        >
                          <span style={{ fontSize: '12px', color: snapshotFileName ? 'var(--accent-light)' : 'white', fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📁 {snapshotFileName ? snapshotFileName : 'Choose site photo file...'}
                          </span>
                          <input 
                            id="snapshot-upload-input"
                            type="file" 
                            accept="image/*,.pdf"
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setSnapshotFile(file);
                                setSnapshotFileName(file.name);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSnapshotPreview(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Paste URL */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>OR PASTE IMAGE URL</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="Paste image link..." 
                          value={logPhotoUrl} 
                          onChange={(e) => {
                            setLogPhotoUrl(e.target.value);
                            if (e.target.value) {
                              setSnapshotFile(null);
                              setSnapshotFileName('');
                              setSnapshotPreview(null);
                            }
                          }} 
                          style={{ padding: '12px 14px', fontSize: '13px' }}
                        />
                      </div>

                      {/* Work Category */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>WORK CATEGORY</label>
                        <select 
                          className="glass-input" 
                          value={workCategory} 
                          onChange={(e) => setWorkCategory(e.target.value)} 
                          style={{ appearance: 'none', background: 'rgba(16,20,35,0.8)', padding: '12px 14px', fontSize: '13px' }}
                        >
                          <option value="Concrete Work">Concrete Work</option>
                          <option value="Brickwork">Brickwork</option>
                        </select>
                      </div>

                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>NOTES / DESCRIPTION</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="e.g., Pouring concrete slab for level 4 columns..." 
                          value={logPhotoDesc} 
                          onChange={(e) => setLogPhotoDesc(e.target.value)} 
                          style={{ padding: '12px 14px', fontSize: '13px' }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          onClick={() => {
                            setLogPhotoUrl('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80');
                            setSnapshotFile(null);
                            setSnapshotFileName('');
                            setSnapshotPreview(null);
                            addToast('Preset frame loaded.', 'progress');
                          }} 
                          style={{ fontSize: '12px', padding: '12px 16px' }}
                        >
                          Select Frame
                        </button>
                        <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '12px' }}>
                          Upload & Analyse
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {projectDetails.photos.map(ph => (
                    <div key={ph.id} className="glass-card" style={{ padding: '12px' }}>
                      <img src={ph.photo_url} alt="Site progress" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }} />
                      <div style={{ marginTop: '12px', padding: '4px' }}>
                        <p style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>"{ph.description}"</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px' }}>
                          <span>By {ph.uploaded_by_name}</span>
                          <span>{new Date(ph.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Workers/Members Management Subtab */}
            {projectSubTab === 'workers' && (() => {
              const filteredMembers = (projectDetails?.members || []).filter(m =>
                (m.full_name || m.fullName || '').toLowerCase().includes(workerSearch.toLowerCase()) ||
                (m.email || '').toLowerCase().includes(workerSearch.toLowerCase())
              );
              const getInitials = (name) => (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
              const avatarColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '30px' }} className="animate-fade-in">

                  {/* Active Workers List */}
                  <div className="glass-card" style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Users size={18} color="#10b981" /> Project Team
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                          background: 'rgba(16,185,129,0.18)', color: '#10b981', marginLeft: '4px'
                        }}>{(projectDetails?.members || []).length} members</span>
                      </h3>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', marginBottom: '18px' }}>
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="🔍 Search by name or email…"
                        value={workerSearch}
                        onChange={e => setWorkerSearch(e.target.value)}
                        style={{ paddingLeft: '14px', fontSize: '13px' }}
                      />
                    </div>

                    {filteredMembers.length === 0 ? (
                      <div style={{ padding: '50px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                        <Users size={36} color="rgba(255,255,255,0.12)" style={{ marginBottom: '12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                          {workerSearch ? 'No workers match your search.' : 'No workers assigned yet. Use the form to invite your team.'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredMembers.map((member, idx) => {
                          const name = member.full_name || member.fullName || 'Unknown';
                          const color = avatarColors[idx % avatarColors.length];
                          const workerPhotos = (projectDetails?.photos || []).filter(p =>
                            p.uploaded_by_name?.toLowerCase() === name.toLowerCase()
                          );

                          return (
                            <div
                              key={member.id}
                              style={{
                                display: 'flex', flexDirection: 'column', gap: '10px',
                                padding: '14px 18px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderLeft: `4px solid ${color}`,
                                borderRadius: '12px',
                                transition: 'background 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                {/* Avatar */}
                                <div style={{
                                  width: '40px', height: '40px', borderRadius: '50%',
                                  background: `${color}22`, border: `2px solid ${color}55`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, fontSize: '13px', fontWeight: 700, color
                                }}>
                                  {getInitials(name)}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h4 style={{ fontSize: '14px', color: 'white', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</h4>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>📧 {member.email}</span>
                                  <span style={{ fontSize: '11px', color: '#a5b4fc', display: 'block', marginTop: '2px' }}>🔑 Password: <code>{member.password || 'password123'}</code></span>
                                </div>

                                {/* Role Badge */}
                                <span style={{
                                  fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                                  background: `${color}20`, color, flexShrink: 0
                                }}>
                                  {member.role || 'Worker'}
                                </span>

                                {/* Remove Button */}
                                <button
                                  onClick={() => handleRemoveWorker(member.id)}
                                  title="Remove from project"
                                  style={{
                                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                                    color: '#ef4444', fontSize: '11px', fontWeight: 600,
                                    flexShrink: 0, transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                                >
                                  ✕ Remove
                                </button>
                              </div>

                              {/* Photo Gallery or Mini Uploader */}
                              {workerPhotos.length > 0 ? (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>📸 Uploaded Snapshots ({workerPhotos.length})</span>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {workerPhotos.map(ph => (
                                      <div 
                                        key={ph.id} 
                                        title={ph.description}
                                        style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                                        onClick={() => window.open(ph.photo_url, '_blank')}
                                      >
                                        <img src={ph.photo_url} alt="Site snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px',
                                  display: 'flex', flexDirection: 'column', gap: '8px'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10.5px', color: 'var(--warning)', fontWeight: 600 }}>⚠️ No snaps uploaded by this worker</span>
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`worker-upload-file-${member.id}`).click()}
                                      style={{
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#a5b4fc',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      📷 Upload Snap
                                    </button>
                                  </div>
                                  <input
                                    id={`worker-upload-file-${member.id}`}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        await handleWorkerPhotoUpload(file, name);
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Worker Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-card" style={{ padding: '28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '17px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <Users size={16} color="#6366f1" /> Invite Workers
                        </h3>
                        <button 
                          type="button" 
                          onClick={() => setProjectWorkersInput(prev => [...prev, { name: '', email: '' }])}
                          style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'}
                        >
                          + Add Worker
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Enter the workers' names and Gmail IDs to add them to this project.</p>

                      <form onSubmit={handleAddWorker} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {projectWorkersInput.map((w, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="Name (e.g. Ravi)" 
                                value={w.name} 
                                onChange={(e) => {
                                  const updated = [...projectWorkersInput];
                                  updated[idx].name = e.target.value;
                                  setProjectWorkersInput(updated);
                                }}
                                style={{ flex: 1, padding: '10px 12px', fontSize: '12.5px' }}
                                required
                              />
                              <input 
                                type="email" 
                                className="glass-input" 
                                placeholder="Gmail (e.g. ravi@gmail.com)" 
                                value={w.email} 
                                onChange={(e) => {
                                  const updated = [...projectWorkersInput];
                                  updated[idx].email = e.target.value;
                                  setProjectWorkersInput(updated);
                                }}
                                style={{ flex: 1.3, padding: '10px 12px', fontSize: '12.5px' }}
                                required
                              />
                              {projectWorkersInput.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => setProjectWorkersInput(prev => prev.filter((_, i) => i !== idx))}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#f87171',
                                    borderRadius: '6px',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ justifyContent: 'center', marginTop: '6px', gap: '8px' }}
                        >
                          <Users size={14} /> Add to Project
                        </button>
                      </form>
                    </div>

                    {/* Info Card */}
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
                      <h4 style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700, marginBottom: '10px' }}>ℹ️ How it works</h4>
                      <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Workers are registered with their Gmail IDs</li>
                        <li style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Passcodes are system-generated and emailed</li>
                        <li style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>They can log in via the mobile app</li>
                        <li style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assigned only to this specific project</li>
                      </ul>
                    </div>
                  </div>

                  {/* Row 4: Project Blueprint File Display */}
                  <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Briefcase size={16} color="var(--accent-light)" /> Project Blueprint & Design Plan
                        </h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Active blueprint details for AI visual comparison verification and structural tracking.
                        </p>
                      </div>
                      
                      {projectDetails.project.blueprint_file_url && (
                        <a 
                          href={projectDetails.project.blueprint_file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Eye size={12} /> Open in New Tab
                        </a>
                      )}
                    </div>

                    {/* Content display area */}
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {(() => {
                        const fileUrl = projectDetails.project.blueprint_file_url;
                        const blueprintClass = projectDetails.project.blueprint || 'Standard Warehouse';
                        
                        if (!fileUrl) {
                          // No uploaded blueprint file: show default blueprint schematic
                          return (
                            <div 
                              onClick={() => addToast('Standard blueprint template active. Upload a custom PDF/CAD drawing during project creation to view interactive designs!', 'task')}
                              title="Click to view instructions"
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 10px', maxWidth: '500px', cursor: 'pointer' }}
                            >
                              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <Briefcase size={28} color="#a5b4fc" />
                              </div>
                              <h4 style={{ fontSize: '15px', color: 'white', fontWeight: 700 }}>No Custom Design File Uploaded</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                                This project is currently using the standard **{blueprintClass}** blueprint class template. Custom drawings (PDF/CAD/Images) can be uploaded during site creation.
                              </p>
                              
                              {/* Display a simulated high-fidelity schematic layout */}
                              <div style={{
                                width: '100%', marginTop: '24px', padding: '16px 20px', background: 'rgba(30, 41, 59, 0.5)', 
                                border: '1.5px dashed rgba(99, 102, 241, 0.25)', borderRadius: '10px', textAlign: 'left',
                                fontFamily: 'monospace', fontSize: '11px', color: '#a5b4fc', position: 'relative', overflow: 'hidden'
                              }}>
                                <div style={{ position: 'absolute', top: '10px', right: '15px', color: 'rgba(165, 180, 252, 0.15)', fontWeight: 800, fontSize: '14px' }}>SCHEMATIC v1.0</div>
                                <span style={{ color: 'white', fontWeight: 700, display: 'block', marginBottom: '6px' }}>📐 STANDARD CAD DRAWING REFERENCE:</span>
                                <div>• Target: {blueprintClass}</div>
                                <div>• Dimensions: 120m x 80m standard span</div>
                                <div>• Framework: Reinforced structural columns</div>
                                <div>• Comparison Node: active [visual_integrity_model_v4]</div>
                                
                                <div style={{ borderTop: '1px solid rgba(165, 180, 252, 0.15)', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>STAGE: CONCRETE_FRAMING</span>
                                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>INTEGRITY: 100% OK</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Check file type
                        const isImage = fileUrl.startsWith('data:image/') || 
                                        fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) ||
                                        fileUrl.includes('images.unsplash.com');
                        
                        const isPdf = fileUrl.match(/\.pdf/i);
                        
                        if (isImage) {
                          return (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <div 
                                onClick={() => window.open(fileUrl, '_blank')}
                                title="Click to view full blueprint in new tab"
                                style={{ position: 'relative', maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0e1117', cursor: 'pointer' }}
                              >
                                <img 
                                  src={fileUrl} 
                                  alt="Project Blueprint Drawing" 
                                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} 
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Pre-loaded image blueprint (Click image to open). Detected class: **{blueprintClass}**
                              </span>
                            </div>
                          );
                        } else if (isPdf) {
                          return (
                            <div style={{ width: '100%', height: '450px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <iframe 
                                src={`${fileUrl}#toolbar=0`} 
                                title="Project Blueprint PDF" 
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white' }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span 
                                  onClick={() => window.open(fileUrl, '_blank')}
                                  title="Open PDF in new tab"
                                  style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                  Embedded blueprint document. Identified class: **{blueprintClass}** (Click to open)
                                </span>
                                <a href={fileUrl} download style={{ fontSize: '12px', color: 'var(--accent-light)', fontWeight: 600, textDecoration: 'underline' }}>
                                  Download PDF File
                                </a>
                              </div>
                            </div>
                          );
                        } else {
                          // General document fallback card
                          return (
                            <div 
                              onClick={() => window.open(fileUrl, '_blank')}
                              title="Click to open design document in new tab"
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 10px', maxWidth: '500px', cursor: 'pointer' }}
                            >
                              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <Briefcase size={28} color="#60a5fa" />
                              </div>
                              <h4 style={{ fontSize: '15px', color: 'white', fontWeight: 700 }}>Custom CAD / Blueprint File Attached</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                                A design document is uploaded for this project site. Click this card or click the button below to view the drawing directly.
                              </p>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}
                              >
                                <Eye size={14} /> Open & View Design Drawing
                              </a>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                </div>
              );
            })()}


            </div>
          )
        )}

      {/* Floating Island New Project Modal */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(4, 6, 15, 0.82)',
          backdropFilter: 'blur(20px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} className="animate-fade-in">
          <div style={{
            width: '100%',
            maxWidth: '580px',
            background: 'rgba(17, 20, 38, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.12)',
            position: 'relative',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }} className="animate-scale-in">
            
            {/* Close button */}
            <button 
              onClick={() => {
                setShowNewProjectModal(false);
                resetNewProjectForm();
              }}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={20} color="#818cf8" /> Create New Site Project
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>Configure blueprint templates, assign budgets, and allocate site workers.</p>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateProjectModal} style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '6px', flex: 1 }}>
              
              {/* Project Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Project Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Tower B - Extension" 
                  value={newProjectName} 
                  onChange={(e) => setNewProjectName(e.target.value)} 
                  required 
                  style={{ padding: '12px 14px', fontSize: '13px' }}
                />
              </div>

              {/* Location & Budget Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                
                {/* Location / Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Site Address</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. Sector 5, Jubilee Hills" 
                    value={newProjectLoc} 
                    onChange={(e) => setNewProjectLoc(e.target.value)} 
                    required 
                    style={{ padding: '12px 14px', fontSize: '13px' }}
                  />
                </div>

                {/* Budget */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Budget (INR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>₹</span>
                    <input 
                      type="number" 
                      className="glass-input" 
                      placeholder="e.g. 40000000" 
                      value={newProjectBudget} 
                      onChange={(e) => setNewProjectBudget(e.target.value)} 
                      required 
                      style={{ padding: '12px 12px 12px 24px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

              </div>

              {/* Blueprint AI Model Class Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>AI Analysis Blueprint Class</label>
                <input 
                  type="text"
                  className="glass-input" 
                  placeholder="e.g. Standard Warehouse, Residential Tower" 
                  value={newProjectBlueprint} 
                  onChange={(e) => setNewProjectBlueprint(e.target.value)} 
                  required
                  style={{ padding: '12px 14px', fontSize: '13px' }}
                />
              </div>

              {/* Workers Allocation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workers Allocation</label>
                  <button 
                    type="button" 
                    onClick={() => setAllocatedWorkers(prev => [...prev, { name: '', email: '' }])}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#a5b4fc',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'}
                  >
                    + Add Worker
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allocatedWorkers.map((w, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Name (e.g. Ravi)" 
                        value={w.name} 
                        onChange={(e) => {
                          const updated = [...allocatedWorkers];
                          updated[idx].name = e.target.value;
                          setAllocatedWorkers(updated);
                        }}
                        style={{ flex: 1, padding: '10px 12px', fontSize: '12.5px' }}
                        required
                      />
                      <input 
                        type="email" 
                        className="glass-input" 
                        placeholder="Gmail (e.g. ravi@gmail.com)" 
                        value={w.email} 
                        onChange={(e) => {
                          const updated = [...allocatedWorkers];
                          updated[idx].email = e.target.value;
                          setAllocatedWorkers(updated);
                        }}
                        style={{ flex: 1.3, padding: '10px 12px', fontSize: '12.5px' }}
                        required
                      />
                      {allocatedWorkers.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setAllocatedWorkers(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            borderRadius: '6px',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Blueprint Drawing File Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Blueprint Drawing / 3D CAD Plan</label>
                <div 
                  style={{
                    border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                  onClick={() => document.getElementById('blueprint-file-picker').click()}
                >
                  <input 
                    type="file" 
                    id="blueprint-file-picker" 
                    style={{ display: 'none' }} 
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setBlueprintFile(file);
                        setBlueprintFileName(file.name);
                        setNewProjectBlueprint(file.name); // Auto-fill with the uploaded file name
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (event) => setBlueprintPreview(event.target.result);
                          reader.readAsDataURL(file);
                        } else {
                          setBlueprintPreview(null);
                        }
                      }
                    }}
                  />
                  <UploadCloud size={28} color="#a5b4fc" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: 600, display: 'block' }}>
                    {blueprintFileName ? blueprintFileName : 'Upload Design Document'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Supports PDF, CAD blueprint files, or JPG/PNG plans
                  </span>
                  
                  {blueprintPreview && (
                    <img 
                      src={blueprintPreview} 
                      alt="Blueprint Preview" 
                      style={{
                        marginTop: '16px',
                        maxWidth: '100%',
                        maxHeight: '120px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} 
                    />
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowNewProjectModal(false);
                    resetNewProjectForm();
                  }}
                  style={{ flex: 1, padding: '12px', fontSize: '13px', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5, padding: '12px', fontSize: '13px', justifyContent: 'center', background: 'var(--accent-gradient)' }}
                >
                  Create Project Site
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default App;