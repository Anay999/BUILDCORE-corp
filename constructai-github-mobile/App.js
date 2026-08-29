import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Image, Dimensions, NativeModules
} from 'react-native';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

// Dynamically resolve developer's host machine IP address
const getBackendHost = () => {
  let host = '192.168.31.203'; // Fallback to detected IPv4
  try {
    if (NativeModules.SourceCode && NativeModules.SourceCode.scriptURL) {
      const scriptURL = NativeModules.SourceCode.scriptURL;
      const address = scriptURL.split('://')[1];
      if (address) {
        const ip = address.split(':')[0];
        if (ip && ip !== 'localhost') {
          host = ip;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to resolve scriptURL host:', e);
  }
  return host;
};

const HOST_IP = getBackendHost();
const API_BASE_URL = `http://${HOST_IP}:5000/api`;
const SOCKET_URL = `http://${HOST_IP}:5000`;


const SCREEN_WIDTH = Dimensions.get('window').width;

// Mock database to populate mockup-perfect tasks
const INITIAL_TASKS = [
  { id: 1, title: 'Concrete inspection — Floor 4', status: 'New', time_due: 'Today' },
  { id: 2, title: 'Upload site update', status: '12:00', time_due: 'Pending' },
  { id: 3, title: 'Material check', status: 'Done', time_due: 'Completed' }
];

const MOCK_PROJECTS_DEFAULT = [
  { id: 1, name: 'Tower A', location: 'Sector 5', blueprint: 'Residential Tower' },
  { id: 2, name: 'Mall Site', location: 'Jubilee', blueprint: 'Commercial Mall' },
  { id: 3, name: 'Highway Overpass 7', location: 'Section 7', blueprint: 'Highway Overpass' },
  { id: 4, name: 'Residential Block C', location: 'Block C', blueprint: 'Residential Tower' },
  { id: 5, name: 'Warehouse — NH16', location: 'NH16', blueprint: 'Standard Warehouse' }
];

export default function App() {
  // Navigation Screens: 'home' | 'upload' | 'ai_result' | 'report' | 'add_cost' | 'profile'
  const [activeScreen, setActiveScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('Home'); // Home, Upload, Tasks, Alerts, Profile

  // Auth State
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Operational states
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [workCategory, setWorkCategory] = useState('Concrete Work');
  const [siteSection, setSiteSection] = useState('Floor 4 — East Wing');
  const [notes, setNotes] = useState('Pillar shuttering complete...');

  // Project selector state
  const [projectsList, setProjectsList] = useState(MOCK_PROJECTS_DEFAULT);
  const [selectedProjectIdMobile, setSelectedProjectIdMobile] = useState(1);

  const selectedProject = projectsList.find(p => p.id === selectedProjectIdMobile) || projectsList[0] || { name: 'Tower A', location: 'Sector 5', blueprint: 'Residential Tower' };

  // AI Mockup Results state
  const [aiResult, setAiResult] = useState({
    stage: 'Concrete Framing Stage',
    completion: 62,
    delayRisk: 'Low',
    integrity: 'Normal',
    progressChange: '+4% progress',
    safetyWarning: 'Safety: Helmet missing on 1 worker detected in photo'
  });

  const [snapDesc, setSnapDesc] = useState('');
  // snapUrl: the public URL returned by backend after upload (not base64)
  const [snapUrl, setSnapUrl] = useState(null);
  // Local image URI for preview only (not sent to backend)
  const [localImageUri, setLocalImageUri] = useState(null);
  // Multi-step upload pipeline status
  // 'idle' | 'selecting' | 'uploading' | 'analysing' | 'done' | 'error'
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadError, setUploadError] = useState(null);     // { step, message }
  const [uploadProgress, setUploadProgress] = useState(0);  // 0–100
  const [lastPickedAsset, setLastPickedAsset] = useState(null); // For retry
  const [activeManagerAlert, setActiveManagerAlert] = useState(null);
  
  // Issue reporting states
  const [issueText, setIssueText] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('medium');

  // Cost logging states
  const [spentOn, setSpentOn] = useState('Material purchase');
  const [costAmount, setCostAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendActive, setBackendActive] = useState(false);

  const socketRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  // STEP A: Upload file to backend and get public URL
  // ─────────────────────────────────────────────────────────
  const uploadFileToServer = async (asset) => {
    setUploadStatus('uploading');
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('photo', {
      uri: asset.uri,
      name: asset.fileName || `site_photo_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg'
    });

    setUploadProgress(30);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // DO NOT set Content-Type manually — let fetch set multipart boundary automatically
      },
      body: formData
    });

    setUploadProgress(70);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.url) throw new Error('Server returned no URL after upload.');

    setUploadProgress(100);
    return data.url;
  };

  // ─────────────────────────────────────────────────────────
  // STEP B: Run AI analysis with the uploaded photo URL
  // ─────────────────────────────────────────────────────────
  const runAIAnalysis = async (photoUrl) => {
    setUploadStatus('analysing');
    setUploadProgress(0);

    const payload = {
      projectId: selectedProjectIdMobile,
      photoUrl,
      workCategory,
      siteSection,
      notes
    };

    const res = await fetch(`${API_BASE_URL}/ai-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-platform': 'mobile'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `AI analysis failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.analysis) throw new Error('AI analysis returned no result.');
    return data.analysis;
  };

  // ─────────────────────────────────────────────────────────
  // PIPELINE: Select → Upload → Analyse (auto-triggered)
  // ─────────────────────────────────────────────────────────
  const runFullPipeline = async (asset) => {
    setUploadError(null);
    setLastPickedAsset(asset);
    setLocalImageUri(asset.uri);
    setSnapUrl(null);

    try {
      // ── Step 1: Upload file ──────────────────────────
      let photoUrl;

      if (!backendActive) {
        // Offline simulator — skip upload, use Unsplash placeholder
        setUploadStatus('uploading');
        await new Promise(r => setTimeout(r, 800));
        setUploadProgress(100);
        photoUrl = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80';
      } else {
        photoUrl = await uploadFileToServer(asset);
      }

      setSnapUrl(photoUrl);

      // ── Step 2: Run AI Analysis ──────────────────────
      if (!backendActive) {
        // Offline simulator — run local analysis
        setUploadStatus('analysing');
        await new Promise(r => setTimeout(r, 1200));
        runOfflineAnalysis(photoUrl);
        setUploadStatus('done');
        setActiveScreen('ai_result');
        return;
      }

      const analysis = await runAIAnalysis(photoUrl);

      // ── Map response to aiResult state ───────────────
      const a = analysis;
      const bpComp = a.blueprint_comparison || {};
      const schedStatus = bpComp.schedule_status || {};
      const delayInfo = a.delay_risk_analysis || {};
      const forecast = a.forecasting || {};
      const quality = a.quality_assurance || {};
      const metrics = a.progress_metrics || {};

      setAiResult({
        id: a.id,
        stage: a.stage_detected,
        completion: a.estimated_completion,
        previousCompletion: a.progress_analysis?.previous_progress ?? null,
        delayRisk: a.delay_risk,
        integrity: a.structural_integrity,
        progressChange: a.progress_change,
        safetyWarning: a.safety_findings,
        changeDetected: a.change_detected,
        scheduleStatus: schedStatus.status || 'ON TRACK',
        expectedProgress: bpComp.expected_progress?.percentage ?? null,
        percentageVariance: schedStatus.percentage_variance ?? 0,
        currentPhase: a.phase_analysis?.current_phase ?? null,
        delayDetected: delayInfo.delay_detected,
        delaySeverity: delayInfo.severity,
        daysBehind: delayInfo.delay_analysis?.days_behind_schedule ?? 0,
        projectedCompletion: forecast.current_completion_estimate ?? null,
        originalEndDate: forecast.blueprint_completion_date ?? null,
        rootCauses: delayInfo.delay_analysis?.root_causes ?? [],
        managerAlertMessage: delayInfo.manager_alert?.message ?? null,
        workersBefore: a.visual_comparison?.worker_count_before ?? null,
        workersNow: a.visual_comparison?.worker_count_now ?? null,
        workerChange: a.visual_comparison?.worker_change ?? null,
        productivityAssessment: metrics.productivity_rate?.assessment ?? 'On expected pace',
        riskToDeadline: forecast.risk_to_deadline ?? 'LOW',
        confidence: forecast.confidence ?? '80%',
        workQuality: quality.work_quality ?? 'GOOD',
        safetyCompliance: quality.safety_compliance ?? 'PASS',
        reworkNeeded: quality.rework_needed ?? 'None',
        recommendations: forecast.recommendations ?? [],
      });

      setUploadStatus('done');

      if (socketRef.current) {
        socketRef.current.emit('global_activity', {
          type: 'photo', action: 'uploaded',
          projectName: selectedProject?.name,
          user: user?.fullName || 'Ravi',
          timestamp: new Date()
        });
      }

      setActiveScreen('ai_result');

    } catch (err) {
      console.warn('❌ Upload pipeline error:', err.message);
      setUploadStatus('error');
      const step = uploadStatus === 'uploading' ? 'upload' : 'analysis';
      setUploadError({ step, message: err.message });
    }
  };

  // ─────────────────────────────────────────────────────────
  // Offline simulator analysis (no backend)
  // ─────────────────────────────────────────────────────────
  const runOfflineAnalysis = (photoUrl) => {
    const blueprint = selectedProject?.blueprint || 'Standard Warehouse';
    let stageDetected = 'Excavation & Base Setup';
    let progressIncrement = 4;
    let safetyWarning = null;
    let delayRisk = 'Low';
    const notesLower = (notes || '').toLowerCase();
    const catLower = (workCategory || '').toLowerCase();

    if (blueprint === 'Residential Tower') {
      if (catLower.includes('concrete') || notesLower.includes('pillar') || notesLower.includes('slab')) {
        stageDetected = 'Tower Level Shuttering & Pour'; progressIncrement = 7;
        safetyWarning = 'Safety: Helmet missing on 1 worker detected in photo';
      } else { stageDetected = 'Residential Interior Fit-outs'; progressIncrement = 3; }
    } else if (blueprint === 'Commercial Mall') {
      if (catLower.includes('steel') || notesLower.includes('frame') || notesLower.includes('column')) {
        stageDetected = 'Commercial Core Column Setup'; progressIncrement = 8;
        safetyWarning = 'Safety: Harness missing on structural frame welder';
      } else { stageDetected = 'Mall Interior Framing'; progressIncrement = 4; }
    } else if (blueprint === 'Highway Overpass') {
      if (notesLower.includes('pier') || notesLower.includes('excavation')) {
        stageDetected = 'Overpass Pier Excavation & Foundation'; progressIncrement = 7;
      } else { stageDetected = 'Approach Slab Paving'; progressIncrement = 3; }
    } else {
      if (notesLower.includes('foundation') || notesLower.includes('floor')) {
        stageDetected = 'Warehouse Slab Poured'; progressIncrement = 5;
      } else { stageDetected = 'Warehouse Walling Stage'; progressIncrement = 3; }
    }

    const prevCompletion = selectedProject?.completion_percentage || 0;
    const estimatedCompletion = Math.min(100, prevCompletion + progressIncrement);
    const expectedProgress = Math.min(100, prevCompletion + 5);
    const variance = estimatedCompletion - expectedProgress;
    const scheduleStatus = variance >= 0 ? 'ON TRACK' : variance >= -5 ? 'SLIGHTLY BEHIND' : 'BEHIND SCHEDULE';

    setAiResult({
      stage: stageDetected, completion: estimatedCompletion, previousCompletion: prevCompletion,
      delayRisk, integrity: 'Normal',
      progressChange: `+${progressIncrement}% (analysed against ${blueprint})`,
      safetyWarning,
      changeDetected: true, scheduleStatus, expectedProgress,
      percentageVariance: variance, currentPhase: stageDetected.split(' ')[0],
      delayDetected: delayRisk === 'High', delaySeverity: delayRisk === 'High' ? 'HIGH' : 'LOW',
      daysBehind: variance < 0 ? Math.abs(variance) : 0, projectedCompletion: null,
      originalEndDate: selectedProject?.end_date || null,
      rootCauses: delayRisk === 'High' ? ['Work stopped or stalled'] : [],
      managerAlertMessage: null,
      workersBefore: Math.floor(Math.random() * 6) + 4,
      workersNow: Math.floor(Math.random() * 8) + 5,
      workerChange: '+2 workers',
      productivityAssessment: scheduleStatus === 'ON TRACK' ? 'On expected pace' : 'Below pace',
      riskToDeadline: delayRisk === 'High' ? 'HIGH' : 'LOW', confidence: '82%',
      workQuality: safetyWarning ? 'REVIEW NEEDED' : 'GOOD',
      safetyCompliance: safetyWarning ? 'VIOLATION DETECTED' : 'PASS',
      reworkNeeded: 'None',
      recommendations: scheduleStatus === 'ON TRACK'
        ? ['Maintain current pace', 'Monitor quality standards']
        : ['Review resource allocation', 'Add workers if budget permits'],
    });
  };

  // ─────────────────────────────────────────────────────────
  // Pick from gallery — triggers full pipeline
  // ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    setUploadStatus('selecting');
    const { status } = await ImagePicker.requestImageLibraryPermissionsAsync();
    if (status !== 'granted') {
      setUploadStatus('idle');
      Alert.alert('Permission Denied', 'ConstructAI needs photo library access to upload site photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      setUploadStatus('idle');
      return;
    }

    await runFullPipeline(result.assets[0]);
  };

  // ─────────────────────────────────────────────────────────
  // Take photo with camera — triggers full pipeline
  // ─────────────────────────────────────────────────────────
  const takePhoto = async () => {
    setUploadStatus('selecting');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setUploadStatus('idle');
      Alert.alert('Permission Denied', 'ConstructAI needs camera access to capture site photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      setUploadStatus('idle');
      return;
    }

    await runFullPipeline(result.assets[0]);
  };

  // ─────────────────────────────────────────────────────────
  // Camera press — show action sheet: Camera or Gallery
  // ─────────────────────────────────────────────────────────
  const handleCameraPress = () => {
    if (uploadStatus === 'uploading' || uploadStatus === 'analysing') return;
    Alert.alert(
      'Add Site Photo',
      'Choose how to add a photo for AI analysis',
      [
        { text: '📷 Take Photo', onPress: takePhoto },
        { text: '🖼️ Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel', onPress: () => {} }
      ]
    );
  };

  // Authenticate user against backend
  const handleLogin = async (presetEmail, presetPassword) => {
    const targetEmail = presetEmail || email;
    const targetPassword = presetPassword || password;

    if (!targetEmail || !targetPassword) {
      setLoginError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: targetEmail, password: targetPassword })
      });
      
      setIsSubmitting(false);
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        setEmail('');
        setPassword('');
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setIsSubmitting(false);
      console.warn('⚠️ Login network error, checking simulator fallbacks:', err.message);
      
      // Offline / Simulator login bypass
      if (targetPassword === 'password123') {
        if (targetEmail === 'ravi@constructai.com') {
          setToken('mock_worker_token');
          setUser({ id: 22, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' });
          setEmail('');
          setPassword('');
          return;
        } else if (targetEmail === 'arjun@constructai.com') {
          setToken('mock_manager_token');
          setUser({ id: 11, email: 'arjun@constructai.com', fullName: 'Arjun M.', role: 'Manager' });
          setEmail('');
          setPassword('');
          return;
        }
      }
      setLoginError('Connection failed. Presets work with password123.');
    }
  };

  // Submit site issue to database alerts
  const handleSubmitIssue = async () => {
    if (!issueText) {
      Alert.alert('Empty Description', 'Please describe the issue before submitting.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      projectId: selectedProjectIdMobile,
      type: 'site_hazard',
      severity: issueSeverity,
      message: `Reported issue by ${user ? user.fullName : 'Ravi'}: ${issueText}`
    };

    if (!backendActive) {
      // Mock Sync
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert('Report Submitted', 'Simulated report submitted. Management has been notified.', [
          { text: 'OK', onPress: () => {
            setIssueText('');
            setActiveScreen('home');
            setActiveTab('Home');
          }}
        ]);
        // Simulate WS alert trigger
        if (socketRef.current) {
          socketRef.current.emit('global_activity', {
            type: 'alert',
            action: 'raised',
            projectName: selectedProject.name,
            user: user ? user.fullName : 'Ravi',
            timestamp: new Date()
          });
        }
      }, 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-platform': 'mobile'
        },
        body: JSON.stringify(payload)
      });
      setIsSubmitting(false);
      if (res.ok) {
        Alert.alert('Report Submitted', 'Issue successfully submitted to active logs.', [
          { text: 'OK', onPress: () => {
            setIssueText('');
            setActiveScreen('home');
            setActiveTab('Home');
          }}
        ]);
      } else {
        Alert.alert('Submission Failed', 'Server rejected report.');
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Network Error', 'Failed to synchronize report.');
    }
  };

  // Submit emergency costs to dashboard cost ledger
  const handleLogCost = async () => {
    if (!spentOn) {
      Alert.alert('Empty Field', 'Please enter what the cost was spent on.');
      return;
    }
    if (!costAmount || isNaN(Number(costAmount)) || Number(costAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);

    const amountVal = Number(costAmount);
    const spentLower = spentOn.toLowerCase();
    
    let laborCost = 0;
    let materialCost = 0;
    let equipmentCost = 0;
    let transportCost = 0;
    let miscellaneous = 0;

    if (spentLower.includes('labor') || spentLower.includes('worker') || spentLower.includes('salary') || spentLower.includes('wage')) {
      laborCost = amountVal;
    } else if (spentLower.includes('material') || spentLower.includes('cement') || spentLower.includes('brick') || spentLower.includes('steel') || spentLower.includes('concrete') || spentLower.includes('sand') || spentLower.includes('wood') || spentLower.includes('pipe')) {
      materialCost = amountVal;
    } else if (spentLower.includes('equipment') || spentLower.includes('machine') || spentLower.includes('tool') || spentLower.includes('crane') || spentLower.includes('rent') || spentLower.includes('generator')) {
      equipmentCost = amountVal;
    } else if (spentLower.includes('transport') || spentLower.includes('fuel') || spentLower.includes('delivery') || spentLower.includes('truck') || spentLower.includes('shipping') || spentLower.includes('freight')) {
      transportCost = amountVal;
    } else {
      miscellaneous = amountVal;
    }

    const payload = {
      projectId: selectedProjectIdMobile,
      laborCost,
      materialCost,
      equipmentCost,
      transportCost,
      miscellaneous
    };

    if (!backendActive) {
      // Mock Sync
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert(
          'Cost Logged (Offline/Simulator)',
          `Simulated cost of ₹${amountVal.toLocaleString()} logged for: ${spentOn} on ${selectedProject.name}.`,
          [
            { text: 'OK', onPress: () => {
              setSpentOn('Material purchase');
              setCostAmount('');
              setActiveScreen('home');
              setActiveTab('Home');
            }}
          ]
        );
        // Trigger simulated WS event
        if (socketRef.current) {
          socketRef.current.emit('global_activity', {
            type: 'cost',
            action: 'logged',
            projectName: selectedProject.name,
            amount: amountVal,
            user: user ? user.fullName : 'Ravi',
            timestamp: new Date()
          });
        }
      }, 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-platform': 'mobile'
        },
        body: JSON.stringify(payload)
      });
      setIsSubmitting(false);
      if (res.ok) {
        Alert.alert(
          'Cost Logged',
          `Cost of ₹${amountVal.toLocaleString()} logged successfully.`,
          [
            { text: 'OK', onPress: () => {
              setSpentOn('Material purchase');
              setCostAmount('');
              setActiveScreen('home');
              setActiveTab('Home');
            }}
          ]
        );
      } else {
        Alert.alert('Submission Failed', 'Server rejected cost entry.');
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert(
        'Upload Synchronized (Offline/Simulator)',
        'Server sync was skipped or offline. Showing simulated cost results locally.',
        [
          { text: 'OK', onPress: () => {
            setSpentOn('Material purchase');
            setCostAmount('');
            setActiveScreen('home');
            setActiveTab('Home');
          }}
        ]
      );
    }
  };

  // Assert backend health
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(() => setBackendActive(true))
      .catch(() => setBackendActive(false));
  }, []);

  // Fetch active projects from backend on mount or health activation
  useEffect(() => {
    if (!token) return;
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/projects`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setProjectsList(data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch projects, using mock defaults:', err);
      }
    };
    if (backendActive) {
      fetchProjects();
    }
  }, [backendActive, token]);

  // WebSockets Setup
  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Mobile WebSocket Connected!');
      socketRef.current.emit('join_project', selectedProjectIdMobile);
    });

    socketRef.current.on('manager_alert_received', (data) => {
      console.log('🚨 Received manager contact alert:', data);
      setActiveManagerAlert(data);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  // Clear manager alert automatically after 12 hours
  useEffect(() => {
    if (!activeManagerAlert) return;
    const receivedTime = new Date(activeManagerAlert.timestamp).getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const timeRemaining = (receivedTime + twelveHoursMs) - Date.now();
    
    if (timeRemaining <= 0) {
      setActiveManagerAlert(null);
      return;
    }
    
    const timer = setTimeout(() => {
      setActiveManagerAlert(null);
    }, timeRemaining);
    
    return () => clearTimeout(timer);
  }, [activeManagerAlert]);

  // Dynamically join room matching selected project
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`🔌 Joining project room: project_${selectedProjectIdMobile}`);
      socketRef.current.emit('join_project', selectedProjectIdMobile);
    }
  }, [selectedProjectIdMobile]);

  // Reset upload states when entering the upload screen if previously done
  useEffect(() => {
    if (activeScreen === 'upload') {
      if (uploadStatus === 'done') {
        setUploadStatus('idle');
        setLocalImageUri(null);
        setSnapUrl(null);
        setUploadProgress(0);
        setUploadError(null);
        setLastPickedAsset(null);
      }
    }
  }, [activeScreen]);

  // handleUploadAndAnalyse — legacy manual trigger (now only used if user taps
  // the button WITHOUT having auto-uploaded. Mostly unused in the new flow.
  const handleUploadAndAnalyse = async () => {
    if (!localImageUri && !snapUrl) {
      Alert.alert('No Photo', 'Please tap the camera box to select or take a photo first.');
      return;
    }
    if (snapUrl) {
      // Already uploaded — just re-run analysis
      try {
        setUploadStatus('analysing');
        if (!backendActive) {
          runOfflineAnalysis(snapUrl);
          setUploadStatus('done');
          setActiveScreen('ai_result');
          return;
        }
        const analysis = await runAIAnalysis(snapUrl);
        const a = analysis;
        const bpComp = a.blueprint_comparison || {};
        const schedStatus = bpComp.schedule_status || {};
        const delayInfo = a.delay_risk_analysis || {};
        const forecast = a.forecasting || {};
        const quality = a.quality_assurance || {};
        const metrics = a.progress_metrics || {};
        setAiResult({
          id: a.id, stage: a.stage_detected, completion: a.estimated_completion,
          previousCompletion: a.progress_analysis?.previous_progress ?? null,
          delayRisk: a.delay_risk, integrity: a.structural_integrity,
          progressChange: a.progress_change, safetyWarning: a.safety_findings,
          changeDetected: a.change_detected, scheduleStatus: schedStatus.status || 'ON TRACK',
          expectedProgress: bpComp.expected_progress?.percentage ?? null,
          percentageVariance: schedStatus.percentage_variance ?? 0,
          currentPhase: a.phase_analysis?.current_phase ?? null,
          delayDetected: delayInfo.delay_detected, delaySeverity: delayInfo.severity,
          daysBehind: delayInfo.delay_analysis?.days_behind_schedule ?? 0,
          projectedCompletion: forecast.current_completion_estimate ?? null,
          originalEndDate: forecast.blueprint_completion_date ?? null,
          rootCauses: delayInfo.delay_analysis?.root_causes ?? [],
          managerAlertMessage: delayInfo.manager_alert?.message ?? null,
          workersBefore: a.visual_comparison?.worker_count_before ?? null,
          workersNow: a.visual_comparison?.worker_count_now ?? null,
          workerChange: a.visual_comparison?.worker_change ?? null,
          productivityAssessment: metrics.productivity_rate?.assessment ?? 'On expected pace',
          riskToDeadline: forecast.risk_to_deadline ?? 'LOW', confidence: forecast.confidence ?? '80%',
          workQuality: quality.work_quality ?? 'GOOD', safetyCompliance: quality.safety_compliance ?? 'PASS',
          reworkNeeded: quality.rework_needed ?? 'None', recommendations: forecast.recommendations ?? [],
        });
        setUploadStatus('done');
        setActiveScreen('ai_result');
      } catch (err) {
        setUploadStatus('error');
        setUploadError({ step: 'analysis', message: err.message });
      }
      return;
    }
    // If no snapUrl yet, run full pipeline from asset
    if (lastPickedAsset) await runFullPipeline(lastPickedAsset);

    const payload = {
      projectId: selectedProjectIdMobile,
      photoUrl: snapUrl,
      workCategory: workCategory,
      siteSection: siteSection,
      notes: notes
    };

    if (!backendActive) {
      // Simulator Bypass — produce same rich fields as backend
      setTimeout(() => {
        setIsSubmitting(false);
        
        const blueprint = selectedProject.blueprint || 'Standard Warehouse';
        let stageDetected = 'Excavation & Base Setup';
        let progressIncrement = 4;
        let safetyWarning = null;
        let delayRisk = 'Low';
        let integrity = 'Normal';

        const notesLower = (notes || '').toLowerCase();
        const catLower = (workCategory || '').toLowerCase();

        if (blueprint === 'Residential Tower') {
          if (catLower.includes('concrete') || notesLower.includes('pillar') || notesLower.includes('slab')) {
            stageDetected = 'Tower Level Shuttering & Pour';
            progressIncrement = 7;
            safetyWarning = 'Safety: Helmet missing on 1 worker detected in photo';
          } else {
            stageDetected = 'Residential Interior Fit-outs';
            progressIncrement = 3;
          }
        } else if (blueprint === 'Commercial Mall') {
          if (catLower.includes('concrete') || notesLower.includes('steel') || notesLower.includes('frame') || notesLower.includes('column')) {
            stageDetected = 'Commercial Core Column Setup';
            progressIncrement = 8;
            safetyWarning = 'Safety: Harness missing on structural frame welder';
          } else {
            stageDetected = 'Mall Interior Framing';
            progressIncrement = 4;
          }
        } else if (blueprint === 'Highway Overpass') {
          if (catLower.includes('concrete') || notesLower.includes('pier') || notesLower.includes('piles') || notesLower.includes('excavation')) {
            stageDetected = 'Overpass Pier Excavation & Foundation';
            progressIncrement = 7;
          } else {
            stageDetected = 'Approach Slab Paving';
            progressIncrement = 3;
          }
        } else {
          if (catLower.includes('concrete') || notesLower.includes('foundation') || notesLower.includes('floor')) {
            stageDetected = 'Warehouse Slab Poured';
            progressIncrement = 5;
          } else {
            stageDetected = 'Warehouse Walling Stage';
            progressIncrement = 3;
          }
        }

        const prevCompletion = selectedProject.completion_percentage || 0;
        const estimatedCompletion = Math.min(100, prevCompletion + progressIncrement);
        const expectedProgress = Math.min(100, prevCompletion + 5); // Simulate expected
        const variance = estimatedCompletion - expectedProgress;
        const scheduleStatus = variance >= 0 ? 'ON TRACK' : variance >= -5 ? 'SLIGHTLY BEHIND' : 'BEHIND SCHEDULE';

        setAiResult({
          stage: stageDetected,
          completion: estimatedCompletion,
          previousCompletion: prevCompletion,
          delayRisk,
          integrity,
          progressChange: `+${progressIncrement}% (analyzed against ${blueprint})`,
          safetyWarning,
          // New rich fields
          changeDetected: true,
          scheduleStatus,
          expectedProgress,
          percentageVariance: variance,
          currentPhase: stageDetected.split(' ')[0],
          delayDetected: delayRisk === 'High',
          delaySeverity: delayRisk === 'High' ? 'HIGH' : 'LOW',
          daysBehind: variance < 0 ? Math.abs(variance) : 0,
          projectedCompletion: null,
          originalEndDate: selectedProject.end_date || null,
          rootCauses: delayRisk === 'High' ? ['Work stopped or stalled', 'No visible progress detected'] : [],
          managerAlertMessage: delayRisk === 'High' ? 'No visible progress. Investigate immediately.' : null,
          workersBefore: Math.floor(Math.random() * 6) + 4,
          workersNow: Math.floor(Math.random() * 8) + 5,
          workerChange: '+2 workers',
          productivityAssessment: scheduleStatus === 'ON TRACK' ? 'On expected pace' : 'Slightly below expected pace',
          riskToDeadline: delayRisk === 'High' ? 'HIGH' : 'LOW',
          confidence: `${75 + Math.floor(Math.random() * 15)}%`,
          workQuality: safetyWarning ? 'REVIEW NEEDED' : 'GOOD',
          safetyCompliance: safetyWarning ? 'VIOLATION DETECTED' : 'PASS',
          reworkNeeded: 'None',
          recommendations: scheduleStatus === 'ON TRACK'
            ? ['Maintain current pace', 'Monitor quality standards', 'Prepare next phase materials']
            : ['Review resource allocation', 'Add workers if budget permits', 'Expedite material delivery'],
        });

        setActiveScreen('ai_result');

        if (socketRef.current) {
          socketRef.current.emit('global_activity', {
            type: 'photo', action: 'uploaded',
            projectName: selectedProject.name,
            user: user ? user.fullName : 'Ravi',
            timestamp: new Date()
          });
        }
      }, 1500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-platform': 'mobile'
        },
        body: JSON.stringify(payload)
      });
      setIsSubmitting(false);
      if (res.ok) {
        const data = await res.json();
        if (data && data.analysis) {
          const a = data.analysis;
          const bpComp = a.blueprint_comparison || {};
          const schedStatus = bpComp.schedule_status || {};
          const delayInfo = a.delay_risk_analysis || {};
          const forecast = a.forecasting || {};
          const quality = a.quality_assurance || {};
          const metrics = a.progress_metrics || {};

          setAiResult({
            id: a.id,
            stage: a.stage_detected,
            completion: a.estimated_completion,
            previousCompletion: a.progress_analysis?.previous_progress ?? null,
            delayRisk: a.delay_risk,
            integrity: a.structural_integrity,
            progressChange: a.progress_change,
            safetyWarning: a.safety_findings,
            // Rich fields from full analysis
            changeDetected: a.change_detected,
            scheduleStatus: schedStatus.status || 'ON TRACK',
            expectedProgress: bpComp.expected_progress?.percentage ?? null,
            percentageVariance: schedStatus.percentage_variance ?? 0,
            currentPhase: a.phase_analysis?.current_phase ?? null,
            delayDetected: delayInfo.delay_detected,
            delaySeverity: delayInfo.severity,
            daysBehind: delayInfo.delay_analysis?.days_behind_schedule ?? 0,
            projectedCompletion: forecast.current_completion_estimate ?? null,
            originalEndDate: forecast.blueprint_completion_date ?? null,
            rootCauses: delayInfo.delay_analysis?.root_causes ?? [],
            managerAlertMessage: delayInfo.manager_alert?.message ?? null,
            workersBefore: a.visual_comparison?.worker_count_before ?? null,
            workersNow: a.visual_comparison?.worker_count_now ?? null,
            workerChange: a.visual_comparison?.worker_change ?? null,
            productivityAssessment: metrics.productivity_rate?.assessment ?? 'On expected pace',
            riskToDeadline: forecast.risk_to_deadline ?? 'LOW',
            confidence: forecast.confidence ?? '80%',
            workQuality: quality.work_quality ?? 'GOOD',
            safetyCompliance: quality.safety_compliance ?? 'PASS',
            reworkNeeded: quality.rework_needed ?? 'None',
            recommendations: forecast.recommendations ?? [],
          });
        }
        setActiveScreen('ai_result');
      } else {
        Alert.alert('Analysis Failed', 'Could not run AI diagnostics.');
      }
    } catch (err) {
      setIsSubmitting(false);
      console.warn('⚠️ Network or server error on upload:', err);
      Alert.alert(
        'Upload Synchronized (Offline/Simulator)',
        'Server sync was skipped or offline. Showing simulated AI analysis results locally.',
        [{ text: 'OK', onPress: () => setActiveScreen('ai_result') }]
      );
    }

  };

  // Worker approves AI suggested updates
  const handleApproveUpdate = async () => {
    setIsSubmitting(true);

    if (!backendActive) {
      setTimeout(() => {
        setIsSubmitting(false);
        
        // Update local state completion percentage for selected project
        setProjectsList(prev => prev.map(p => p.id === selectedProjectIdMobile ? { ...p, completion_percentage: aiResult.completion } : p));
        
        Alert.alert('Appreciation', `Thank you! ${selectedProject.name} completion successfully updated to ${aiResult.completion}% on live dashboard.`, [
          { text: 'OK', onPress: () => {
            setActiveScreen('home');
            setActiveTab('Home');
          }}
        ]);
      }, 1000);
      return;
    }

    try {
      const analysisId = aiResult.id || Date.now();
      const res = await fetch(`${API_BASE_URL}/ai-analysis/${analysisId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-platform': 'mobile'
        }
      });
      setIsSubmitting(false);
      if (res.ok) {
        // Re-fetch project list to update local state
        const projectsRes = await fetch(`${API_BASE_URL}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          if (Array.isArray(data)) {
            setProjectsList(data);
          }
        }

        Alert.alert('Approved', `Progress successfully updated to ${aiResult.completion}% on the live dashboard.`, [
          { text: 'OK', onPress: () => {
            setActiveScreen('home');
            setActiveTab('Home');
          }}
        ]);
      } else {
        Alert.alert('Approval Failed', 'Server rejected progress approval.');
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Sync Offline', 'Simulated approval complete locally.');
      setActiveScreen('home');
      setActiveTab('Home');
    }
  };

  const renderProjectSelector = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>SELECT ACTIVE PROJECT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {projectsList.map(proj => {
          const isSelected = proj.id === selectedProjectIdMobile;
          return (
            <TouchableOpacity
              key={proj.id}
              style={[
                styles.btnPreset,
                isSelected && { backgroundColor: '#e2f9f0', borderColor: '#047857' }
              ]}
              onPress={() => setSelectedProjectIdMobile(proj.id)}
            >
              <Text style={[
                styles.btnPresetText,
                isSelected && { color: '#047857' }
              ]}>
                🏢 {proj.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {!token ? (
        <ScrollView style={styles.mainScroll} contentContainerStyle={{ justifyContent: 'center', paddingBottom: 40, paddingTop: 40 }}>
          <View style={styles.loginHeader}>
            <Text style={styles.loginLogo}>📐 ConstructAI</Text>
            <Text style={styles.loginSubtitle}>Empowering site engineering with Computer Vision & AI diagnostics</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Sign In</Text>

            {loginError ? (
              <View style={styles.loginErrorCard}>
                <Text style={styles.loginErrorText}>⚠️ {loginError}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput 
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. ravi@constructai.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput 
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleLogin()} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Login to Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Preset Badges */}
          <View style={styles.presetContainer}>
            <Text style={[styles.label, { textAlign: 'center', marginBottom: 12 }]}>QUICK DEMO PRESETS</Text>
            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.btnSecondary, { backgroundColor: '#e2f9f0', borderColor: '#a7f3d0', borderWidth: 1 }]}
                onPress={() => handleLogin('ravi@constructai.com', 'password123')}
              >
                <Text style={[styles.btnSecondaryText, { color: '#047857' }]}>👷 Worker Preset (Ravi)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnSecondary, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', borderWidth: 1 }]}
                onPress={() => handleLogin('arjun@constructai.com', 'password123')}
              >
                <Text style={[styles.btnSecondaryText, { color: '#0369a1' }]}>🏢 Manager Preset (Arjun M.)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          {activeManagerAlert && (
            <View style={{
              backgroundColor: '#fee2e2',
              borderColor: '#ef4444',
              borderWidth: 1,
              padding: 12,
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13 }}>🚨 MANAGER URGENT ALERT</Text>
                <Text style={{ color: '#7f1d1d', fontSize: 12, marginTop: 2 }}>{activeManagerAlert.message}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveManagerAlert(null)}
                style={{
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>OK</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* 1. Worker Home Screen Frame */}
          {activeScreen === 'home' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Greeting block */}
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>Hello, {user ? user.fullName : 'Ravi'} 👋</Text>
                <Text style={styles.subtext}>{user?.role || 'Worker'} — {selectedProject.name}</Text>
              </View>

              {renderProjectSelector()}

              {/* Action button colored grids matching mockup */}
              <View style={styles.gridAction}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e2f9f0' }]} onPress={() => { setActiveScreen('upload'); setActiveTab('Upload'); }}>
                  <Text style={[styles.actionBtnText, { color: '#047857' }]}>📸 Upload Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e0f2fe' }]} onPress={() => Alert.alert('Status Logger', `Slide overall structural updates in snapshot reviews for ${selectedProject.name}.`)}>
                  <Text style={[styles.actionBtnText, { color: '#0369a1' }]}>🔄 Update Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]} onPress={() => { setActiveScreen('add_cost'); setActiveTab('Home'); }}>
                  <Text style={[styles.actionBtnText, { color: '#b45309' }]}>💰 Add Cost</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => { setActiveScreen('report'); setActiveTab('Alerts'); }}>
                  <Text style={[styles.actionBtnText, { color: '#b91c1c' }]}>⚠️ Report Issue</Text>
                </TouchableOpacity>
              </View>

              {/* Today's Tasks board */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>TODAY'S TASKS</Text>
                
                {/* Task 1 */}
                <View style={styles.taskCard}>
                  <Text style={styles.taskTitle}>Concrete inspection — Floor 4</Text>
                  <Text style={[styles.taskPill, { backgroundColor: '#e0f2fe', color: '#0369a1' }]}>New</Text>
                </View>

                {/* Task 2 */}
                <View style={styles.taskCard}>
                  <Text style={styles.taskTitle}>Upload site update</Text>
                  <Text style={[styles.taskPillText, { color: '#64748b' }]}>12:00</Text>
                </View>

                {/* Task 3 */}
                <View style={[styles.taskCard, { opacity: 0.6 }]}>
                  <Text style={[styles.taskTitle, { textDecorationLine: 'line-through' }]}>Material check</Text>
                  <Text style={[styles.taskPill, { backgroundColor: '#d1fae5', color: '#047857' }]}>Done</Text>
                </View>
              </View>

              {/* Delay warning card at bottom exactly matching mockup */}
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>⚠️ Delay warning on your site</Text>
              </View>
            </ScrollView>
          )}

          {/* 2. Upload Photo Screen Frame */}
          {activeScreen === 'upload' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 50 }}>
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>Upload Site Photo</Text>
                <Text style={styles.subtext}>Tap to capture or choose — AI analyses automatically</Text>
              </View>

              {renderProjectSelector()}

              {/* ── CAMERA BOX ────────────────────────────── */}
              <TouchableOpacity
                style={[
                  styles.cameraBox,
                  (uploadStatus === 'uploading' || uploadStatus === 'analysing') && { opacity: 0.7 }
                ]}
                onPress={handleCameraPress}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'analysing'}
              >
                {localImageUri ? (
                  <Image source={{ uri: localImageUri }} style={{ width: '100%', height: '100%', borderRadius: 13 }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                    <Text style={styles.cameraBoxText}>Tap to capture or choose from gallery</Text>
                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>AI scan starts automatically</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── PIPELINE STATUS INDICATOR ─────────────── */}
              {uploadStatus !== 'idle' && uploadStatus !== 'error' && (
                <View style={{ marginVertical: 14, paddingHorizontal: 4 }}>
                  {/* Step row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    {[
                      { key: 'selecting',  label: '1. Select',  icon: '📷' },
                      { key: 'uploading',  label: '2. Upload',  icon: '☁️' },
                      { key: 'analysing',  label: '3. Analyse', icon: '🤖' },
                      { key: 'done',       label: '4. Done',    icon: '✅' },
                    ].map((step, i) => {
                      const steps = ['selecting', 'uploading', 'analysing', 'done'];
                      const currentIdx = steps.indexOf(uploadStatus);
                      const stepIdx = steps.indexOf(step.key);
                      const isDone = stepIdx < currentIdx;
                      const isActive = stepIdx === currentIdx;
                      return (
                        <View key={step.key} style={{ alignItems: 'center', flex: 1 }}>
                          <View style={[
                            { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
                            isDone ? { backgroundColor: '#10b981' } :
                            isActive ? { backgroundColor: '#6366f1' } :
                            { backgroundColor: 'rgba(255,255,255,0.07)' }
                          ]}>
                            <Text style={{ fontSize: 16 }}>{isDone ? '✓' : step.icon}</Text>
                          </View>
                          <Text style={{ fontSize: 9, color: isActive ? '#a5b4fc' : isDone ? '#10b981' : '#475569', fontWeight: isActive ? '700' : '400' }}>
                            {step.label}
                          </Text>
                          {i < 3 && (
                            <View style={[
                              { position: 'absolute', right: '-50%', top: 17, height: 2, width: '80%' },
                              stepIdx < currentIdx ? { backgroundColor: '#10b981' } : { backgroundColor: 'rgba(255,255,255,0.07)' }
                            ]} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Status message */}
                  <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                    <Text style={{ color: '#a5b4fc', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                      {uploadStatus === 'selecting'  && '📷 Opening camera...'}
                      {uploadStatus === 'uploading'  && `☁️ Uploading photo to server...`}
                      {uploadStatus === 'analysing'  && '🤖 AI is analysing — comparing with blueprint...'}
                      {uploadStatus === 'done'       && '✅ Analysis complete!'}
                    </Text>
                    {uploadStatus === 'uploading' && uploadProgress > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                          <View style={{ height: 4, width: `${uploadProgress}%`, backgroundColor: '#6366f1', borderRadius: 4 }} />
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4, textAlign: 'center' }}>{uploadProgress}%</Text>
                      </View>
                    )}
                    {uploadStatus === 'analysing' && (
                      <View style={{ marginTop: 10, alignItems: 'center' }}>
                        <ActivityIndicator color="#6366f1" size="small" />
                      </View>
                    )}
                    {uploadStatus === 'done' && (
                      <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={[styles.btnPrimary, { flex: 1, backgroundColor: '#6366f1', marginTop: 0 }]}
                          onPress={() => {
                            setActiveScreen('ai_result');
                          }}
                        >
                          <Text style={styles.btnPrimaryText}>➡️ View Result</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnPrimary, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 0 }]}
                          onPress={() => {
                            setUploadStatus('idle');
                            setLocalImageUri(null);
                            setSnapUrl(null);
                            setLastPickedAsset(null);
                            setUploadProgress(0);
                            setUploadError(null);
                          }}
                        >
                          <Text style={[styles.btnPrimaryText, { color: '#94a3b8' }]}>🔄 Retake</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ── ERROR CARD WITH RETRY ─────────────────── */}
              {uploadStatus === 'error' && uploadError && (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  borderRadius: 12, padding: 16, marginVertical: 14,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)'
                }}>
                  <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>
                    ⚠️ {uploadError.step === 'upload' ? 'Upload Failed' : 'AI Analysis Failed'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#fca5a5', marginBottom: 14, lineHeight: 18 }}>
                    {uploadError.message}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                    {uploadError.step === 'upload'
                      ? 'The photo could not be uploaded to the server. Check your network connection.'
                      : 'The AI engine could not process this photo. Try with better lighting or a clearer angle.'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { flex: 1, backgroundColor: '#ef4444' }]}
                      onPress={() => {
                        if (lastPickedAsset) runFullPipeline(lastPickedAsset);
                        else handleCameraPress();
                      }}
                    >
                      <Text style={styles.btnPrimaryText}>🔄 Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                      onPress={() => {
                        setUploadStatus('idle');
                        setUploadError(null);
                        setLocalImageUri(null);
                        setSnapUrl(null);
                        setLastPickedAsset(null);
                      }}
                    >
                      <Text style={[styles.btnPrimaryText, { color: '#94a3b8' }]}>✕ Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── FORM FIELDS (hidden during pipeline) ──── */}
              {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Work Category</Text>
                    <TextInput
                      style={styles.input} value={workCategory} onChangeText={setWorkCategory}
                      placeholder="e.g. Concrete Work, Brickwork" placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Site Section</Text>
                    <TextInput
                      style={styles.input} value={siteSection} onChangeText={setSiteSection}
                      placeholder="e.g. Floor 4 — East Wing" placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                      style={styles.input} value={notes} onChangeText={setNotes}
                      placeholder="Pillar shuttering complete..." placeholderTextColor="#64748b"
                    />
                  </View>
                </>
              )}

              {/* ── FILL IN NOTES DURING UPLOAD ───────────── */}
              {(uploadStatus === 'uploading' || uploadStatus === 'analysing') && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: '#6366f1' }]}>📝 Add notes while AI analyses (optional)</Text>
                  <TextInput
                    style={styles.input} value={notes} onChangeText={setNotes}
                    placeholder="Pillar shuttering complete..." placeholderTextColor="#64748b"
                  />
                </View>
              )}

            </ScrollView>
          )}

          {/* 3. AI Analysis Result Screen Frame */}
          {activeScreen === 'ai_result' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 60 }}>
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>AI Analysis Result</Text>
                <Text style={styles.subtext}>Analysed against {selectedProject?.blueprint || 'Blueprint'}</Text>
              </View>

              {/* ── CHANGE DETECTION BANNER ───────────────────── */}
              <View style={[styles.detailsCard, {
                borderLeftWidth: 4,
                borderLeftColor: aiResult.changeDetected === false ? '#ef4444' : '#10b981',
                marginBottom: 14
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>{aiResult.changeDetected === false ? '⚠️' : '✅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: aiResult.changeDetected === false ? '#ef4444' : '#10b981' }}>
                      {aiResult.changeDetected === false ? 'NO SIGNIFICANT CHANGES DETECTED' : 'CHANGES DETECTED'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {aiResult.changeDetected === false
                        ? 'Photo matches previous upload — Delay risk flagged'
                        : `Stage advanced: ${aiResult.stage}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── STAGE BADGE ──────────────────────────────── */}
              <View style={styles.stageContainer}>
                <Text style={styles.stageBadge}>{aiResult.stage}</Text>
              </View>

              {/* ── PROGRESS & COMPLETION ───────────────────── */}
              <View style={styles.detailsCard}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 8 }}>PROGRESS OVERVIEW</Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Estimated Completion</Text>
                  <Text style={[styles.metricValue, { fontSize: 20, color: '#6366f1' }]}>{aiResult.completion}%</Text>
                </View>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: `${aiResult.completion}%`, backgroundColor: '#6366f1' }]} />
                </View>

                <View style={[styles.row, { marginTop: 14 }]}>
                  <Text style={styles.metricLabel}>Previous Progress</Text>
                  <Text style={styles.metricValue}>{aiResult.previousCompletion ?? aiResult.completion - 5}%</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Progress Change</Text>
                  <Text style={[styles.metricValue, { color: '#10b981' }]}>{aiResult.progressChange}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Structural Integrity</Text>
                  <Text style={[styles.metricValue, { color: '#f8fafc' }]}>{aiResult.integrity}</Text>
                </View>
              </View>

              {/* ── BLUEPRINT COMPARISON ─────────────────────── */}
              <View style={styles.detailsCard}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 12 }}>BLUEPRINT vs. ACTUAL</Text>
                
                {/* Schedule Status Badge */}
                {(() => {
                  const status = aiResult.scheduleStatus || 'ON TRACK';
                  const badgeColor = status === 'ON TRACK' || status === 'AHEAD OF SCHEDULE' ? '#10b981'
                    : status === 'SLIGHTLY BEHIND' ? '#f59e0b'
                    : '#ef4444';
                  return (
                    <View style={{ backgroundColor: badgeColor + '22', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: badgeColor + '44' }}>
                      <Text style={{ color: badgeColor, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                        📊 {status}
                      </Text>
                    </View>
                  );
                })()}

                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Expected Progress Today</Text>
                  <Text style={styles.metricValue}>{aiResult.expectedProgress ?? '--'}%</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Actual Progress</Text>
                  <Text style={[styles.metricValue, { color: '#6366f1' }]}>{aiResult.completion}%</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Variance</Text>
                  <Text style={[styles.metricValue, {
                    color: (aiResult.percentageVariance ?? 0) >= 0 ? '#10b981' : '#ef4444'
                  }]}>
                    {(aiResult.percentageVariance ?? 0) >= 0 ? '+' : ''}{aiResult.percentageVariance ?? 0}%
                  </Text>
                </View>
                {aiResult.currentPhase && (
                  <View style={styles.row}>
                    <Text style={styles.metricLabel}>Current Phase</Text>
                    <Text style={styles.metricValue}>{aiResult.currentPhase}</Text>
                  </View>
                )}
              </View>

              {/* ── DELAY RISK ANALYSIS ──────────────────────── */}
              {(aiResult.delayDetected || aiResult.delayRisk === 'High') && (
                <View style={[styles.detailsCard, { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700', marginBottom: 10 }}>🚨 DELAY RISK ANALYSIS</Text>
                  
                  <View style={styles.row}>
                    <Text style={styles.metricLabel}>Delay Severity</Text>
                    <Text style={[styles.metricValue, { color: '#ef4444' }]}>{aiResult.delaySeverity || 'HIGH'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.metricLabel}>Days Behind Schedule</Text>
                    <Text style={[styles.metricValue, { color: '#ef4444' }]}>{aiResult.daysBehind ?? 0} days</Text>
                  </View>
                  {aiResult.projectedCompletion && (
                    <View style={styles.row}>
                      <Text style={styles.metricLabel}>Projected Completion</Text>
                      <Text style={styles.metricValue}>{aiResult.projectedCompletion}</Text>
                    </View>
                  )}

                  {aiResult.rootCauses && aiResult.rootCauses.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 6 }}>ROOT CAUSES:</Text>
                      {aiResult.rootCauses.map((cause, i) => (
                        <Text key={i} style={{ fontSize: 12, color: '#f1f5f9', marginBottom: 3 }}>• {cause}</Text>
                      ))}
                    </View>
                  )}

                  {aiResult.managerAlertMessage && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 10, marginTop: 10 }}>
                      <Text style={{ fontSize: 12, color: '#fca5a5' }}>{aiResult.managerAlertMessage}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── WORKER PRODUCTIVITY ──────────────────────── */}
              <View style={styles.detailsCard}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 12 }}>PRODUCTIVITY METRICS</Text>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Workers (Previous)</Text>
                  <Text style={styles.metricValue}>{aiResult.workersBefore ?? '--'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Workers (Current)</Text>
                  <Text style={styles.metricValue}>{aiResult.workersNow ?? '--'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Workforce Change</Text>
                  <Text style={[styles.metricValue, { color: '#10b981' }]}>{aiResult.workerChange ?? '--'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Productivity Assessment</Text>
                  <Text style={[styles.metricValue, { color: '#a5b4fc', fontSize: 11 }]}>{aiResult.productivityAssessment ?? 'On expected pace'}</Text>
                </View>
              </View>

              {/* ── FORECASTING ──────────────────────────────── */}
              <View style={styles.detailsCard}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 12 }}>📅 FORECASTING</Text>
                {aiResult.projectedCompletion && (
                  <View style={styles.row}>
                    <Text style={styles.metricLabel}>Projected Completion</Text>
                    <Text style={[styles.metricValue, { color: '#6366f1' }]}>{aiResult.projectedCompletion}</Text>
                  </View>
                )}
                {aiResult.originalEndDate && (
                  <View style={styles.row}>
                    <Text style={styles.metricLabel}>Blueprint End Date</Text>
                    <Text style={styles.metricValue}>{aiResult.originalEndDate}</Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Risk to Deadline</Text>
                  <Text style={[styles.metricValue, {
                    color: aiResult.riskToDeadline === 'HIGH' ? '#ef4444' : aiResult.riskToDeadline === 'MEDIUM' ? '#f59e0b' : '#10b981'
                  }]}>{aiResult.riskToDeadline ?? 'LOW'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Confidence</Text>
                  <Text style={[styles.metricValue, { color: '#10b981' }]}>{aiResult.confidence ?? '80%'}</Text>
                </View>
                
                {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 6 }}>RECOMMENDATIONS:</Text>
                    {aiResult.recommendations.map((rec, i) => (
                      <Text key={i} style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 4 }}>✦ {rec}</Text>
                    ))}
                  </View>
                )}
              </View>

              {/* ── QUALITY & SAFETY ────────────────────────── */}
              <View style={styles.detailsCard}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 12 }}>QUALITY & SAFETY</Text>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Work Quality</Text>
                  <Text style={[styles.metricValue, { color: '#10b981' }]}>{aiResult.workQuality ?? 'GOOD'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Safety Compliance</Text>
                  <Text style={[styles.metricValue, {
                    color: aiResult.safetyCompliance === 'VIOLATION DETECTED' ? '#ef4444' : '#10b981'
                  }]}>{aiResult.safetyCompliance ?? 'PASS'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Rework Needed</Text>
                  <Text style={styles.metricValue}>{aiResult.reworkNeeded ?? 'None'}</Text>
                </View>
              </View>

              {/* ── SAFETY WARNING CARD ──────────────────────── */}
              {aiResult.safetyWarning && (
                <View style={styles.safetyCard}>
                  <Text style={styles.safetyText}>⚠️ {aiResult.safetyWarning}</Text>
                </View>
              )}

              {/* ── ACTION BUTTONS ───────────────────────────── */}
              <TouchableOpacity style={styles.btnPrimary} onPress={handleApproveUpdate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>✅ Approve & Sync to Dashboard</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 10 }]}
                onPress={() => { setActiveScreen('upload'); }}
              >
                <Text style={[styles.btnPrimaryText, { color: '#94a3b8' }]}>↩ Upload Another Photo</Text>
              </TouchableOpacity>

            </ScrollView>
          )}


          {/* 4. Report Issue Screen Frame */}
          {activeScreen === 'report' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>Report Site Issue</Text>
                <Text style={styles.subtext}>Reporting for: {selectedProject.name} ({selectedProject.blueprint})</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Issue Description</Text>
                <TextInput 
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                  placeholder="Describe the safety hazard, structural concern, or material shortage..." 
                  placeholderTextColor="#64748b"
                  multiline
                  value={issueText}
                  onChangeText={setIssueText}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Severity Level</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {['info', 'medium', 'high'].map(sev => (
                    <TouchableOpacity 
                      key={sev}
                      style={[
                        styles.btnPreset, 
                        { flex: 1, padding: 10 },
                        issueSeverity === sev && { backgroundColor: sev === 'high' ? '#fee2e2' : sev === 'medium' ? '#fef3c7' : '#e0f2fe' }
                      ]}
                      onPress={() => setIssueSeverity(sev)}
                    >
                      <Text style={[
                        styles.btnPresetText,
                        issueSeverity === sev && { color: sev === 'high' ? '#b91c1c' : sev === 'medium' ? '#b45309' : '#0369a1' }
                      ]}>
                        {sev.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: '#b91c1c' }]} 
                onPress={handleSubmitIssue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Submit Urgent Report</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btnSecondary, { marginTop: 12 }]} 
                onPress={() => { setActiveScreen('home'); setActiveTab('Home'); }}
              >
                <Text style={[styles.btnSecondaryText, { color: '#64748b' }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* 5. Add Cost Screen Frame */}
          {activeScreen === 'add_cost' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>Log Site Expenditure</Text>
                <Text style={styles.subtext}>Logging for: {selectedProject.name} ({selectedProject.blueprint})</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Spent On</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Cement bags, Worker wages, Crane lease" 
                  placeholderTextColor="#64748b"
                  value={spentOn}
                  onChangeText={setSpentOn}
                />
              </View>

              {/* Quick presets selection tags */}
              <View style={[styles.formGroup, { marginBottom: 12 }]}>
                <Text style={styles.label}>Quick Presets</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { text: '🧱 Cement Bags', search: 'Cement purchase' },
                    { text: '👷 Labor Salaries', search: 'Worker labor' },
                    { text: '🚚 Truck Fuel', search: 'Transport fuel' },
                    { text: '🔧 Equipment Rental', search: 'Tools rental' }
                  ].map((item, idx) => (
                    <TouchableOpacity 
                      key={idx}
                      style={styles.btnPreset}
                      onPress={() => setSpentOn(item.search)}
                    >
                      <Text style={styles.btnPresetText}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 5000" 
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={costAmount}
                  onChangeText={setCostAmount}
                />
              </View>

              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: '#b45309' }]} 
                onPress={handleLogCost}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Log Expenditure</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btnSecondary, { marginTop: 12 }]} 
                onPress={() => { setActiveScreen('home'); setActiveTab('Home'); }}
              >
                <Text style={[styles.btnSecondaryText, { color: '#64748b' }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* 6. Profile & Logout Screen Frame */}
          {activeScreen === 'profile' && (
            <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.greetBlock}>
                <Text style={styles.greetText}>User Profile</Text>
                <Text style={styles.subtext}>Manage your active session</Text>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Full Name</Text>
                  <Text style={styles.metricValue}>{user?.fullName || 'Ravi'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Email</Text>
                  <Text style={styles.metricValue}>{user?.email || 'ravi@constructai.com'}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Role</Text>
                  <Text style={[styles.metricValue, { color: user?.role === 'Manager' ? '#0369a1' : '#047857', fontWeight: '700' }]}>
                    {user?.role || 'Worker'}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.metricLabel}>Sync Status</Text>
                  <Text style={[styles.metricValue, { color: backendActive ? '#047857' : '#b91c1c' }]}>
                    {backendActive ? 'Online ✅' : 'Offline / Simulator ⚠️'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: '#b91c1c', marginTop: 32 }]} 
                onPress={() => {
                  setToken(null);
                  setUser(null);
                  setActiveScreen('home');
                  setActiveTab('Home');
                }}
              >
                <Text style={styles.btnPrimaryText}>Sign Out / Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          <View style={styles.tabbar}>
            {[
              { label: 'Home', screen: 'home' },
              { label: 'Upload', screen: 'upload' },
              { label: 'Tasks', screen: 'home' },
              { label: 'Alerts', screen: 'home' },
              { label: 'Profile', screen: 'profile' }
            ].map(tab => (
              <TouchableOpacity 
                key={tab.label}
                style={styles.tab} 
                onPress={() => {
                  setActiveTab(tab.label);
                  setActiveScreen(tab.screen);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab.label && styles.tabTextActive]}>
                  {tab.label === 'Home' ? '🏠 ' : tab.label === 'Upload' ? '📸 ' : tab.label === 'Tasks' ? '📋 ' : tab.label === 'Alerts' ? '🚨 ' : '👤 '}
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 24
  },
  greetBlock: {
    marginVertical: 24
  },
  greetText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5
  },
  subtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500'
  },
  gridAction: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32
  },
  actionBtn: {
    width: '47%',
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    paddingLeft: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  section: {
    marginBottom: 30
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 16
  },
  taskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b'
  },
  taskPill: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden'
  },
  taskPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  warningCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginVertical: 10
  },
  warningText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700'
  },
  cameraBox: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  cameraBoxText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600'
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8
  },
  spinnerSelect: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center'
  },
  spinnerSelectText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600'
  },
  btnPrimary: {
    backgroundColor: '#047857',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 20
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  stageContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  stageBadge: {
    backgroundColor: '#e2f9f0',
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden'
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  metricValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700'
  },
  barContainer: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  safetyCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20
  },
  safetyText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16
  },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    paddingBottom: 24,
    paddingTop: 10
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b'
  },
  tabTextActive: {
    color: '#047857'
  },
  tipText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  btnSecondaryText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13
  },
  btnPreset: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPresetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  loginHeader: {
    alignItems: 'center',
    marginVertical: 36,
    paddingHorizontal: 16
  },
  loginLogo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -1,
    marginBottom: 8
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18
  },
  loginCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 32
  },
  loginCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20
  },
  loginErrorCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  loginErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700'
  },
  presetContainer: {
    paddingHorizontal: 8,
    marginBottom: 24
  }
});
