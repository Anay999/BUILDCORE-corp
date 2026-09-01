import React, { useState, useEffect, useCallback } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { api, getUser, saveToken, logout } from "./api.js";
import { AppCtx, useApp, Ic, Toast } from "./context.jsx";
export { AppCtx, useApp, Ic, Toast };

// Pages
import LoginPage from "./pages/Login.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import ProjectsPage from "./pages/Projects.jsx";
import ProjectDetailPage from "./pages/ProjectDetail.jsx";
import TasksPage from "./pages/Tasks.jsx";
import DSRPage from "./pages/DSR.jsx";
import IssuesPage from "./pages/Issues.jsx";
import AttendancePage from "./pages/Attendance.jsx";
import TimelogPage from "./pages/Timelog.jsx";
import MaterialsPage from "./pages/Materials.jsx";
import VendorsPage from "./pages/Vendors.jsx";
import POsPage from "./pages/POs.jsx";
import TendersPage from "./pages/Tenders.jsx";
import ContractsPage from "./pages/Contracts.jsx";
import EquipmentPage from "./pages/Equipment.jsx";
import PayrollPage from "./pages/Payroll.jsx";
import RequisitionsPage from "./pages/Requisitions.jsx";
import AlertsPage from "./pages/Alerts.jsx";
import InventoryPage from "./pages/Inventory.jsx";
import SettingsPage from "./pages/Settings.jsx";
import MorePage from "./pages/More.jsx";
import GpsTrackerPage from "./pages/GpsTracker.jsx";
import ChatPage from "./pages/Chat.jsx";
import TeamPage from "./pages/Team.jsx";
import AiAnalysisPage from "./pages/AiAnalysis.jsx";
import ReportsPage from "./pages/Reports.jsx";
import ActivityPage from "./pages/Activity.jsx";
import ClientRequestsPage from "./pages/ClientRequests.jsx";

// ─── Bottom Navigation ───────────────────────────────────────────────────────
function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const p = loc.pathname;

  const tabs = [
    { path: "/", icon: <Ic.Home s={22} />, label: "Home" },
    { path: "/projects", icon: <Ic.FolderOpen s={22} />, label: "Projects" },
    { path: "/chat", icon: <Ic.MessageSquare s={22} />, label: "Chat" },
    { path: "/dsr", icon: <Ic.ClipboardList s={22} />, label: "DSR" },
    { path: "/more", icon: <Ic.Grid s={22} />, label: "More" },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(t => {
        const active = t.path === "/" ? p === "/" : p.startsWith(t.path);
        return (
          <button key={t.path} className={`nav-tab ${active ? "active" : ""}`} onClick={() => nav(t.path)}>
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

// ─── Auth Guard ──────────────────────────────────────────────────────────────
function AuthGuard({ children }) {
  const { user } = useApp();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!user && loc.pathname !== "/login") nav("/login", { replace: true });
  }, [user, loc.pathname, nav]);

  if (!user && loc.pathname !== "/login") return <LoginPage />;
  return children;
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [toast, setToast] = useState({ msg: "", type: "" });

  const showToast = useCallback((msg, type = "", ms = 2500) => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), ms);
  }, []);

  const doLogin = useCallback((token, u) => {
    saveToken(token, u);
    setUser(u);
  }, []);

  const doLogout = useCallback(() => {
    logout();
    setUser(null);
  }, []);

  return (
    <AppCtx.Provider value={{ user, doLogin, doLogout, showToast }}>
      <HashRouter>
        <AuthGuard>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Shell><DashboardPage /></Shell>} />
            <Route path="/projects" element={<Shell><ProjectsPage /></Shell>} />
            <Route path="/projects/:id" element={<Shell><ProjectDetailPage /></Shell>} />
            <Route path="/chat" element={<Shell><ChatPage /></Shell>} />
            <Route path="/tasks" element={<Shell><TasksPage /></Shell>} />
            <Route path="/dsr" element={<Shell><DSRPage /></Shell>} />
            <Route path="/issues" element={<Shell><IssuesPage /></Shell>} />
            <Route path="/attendance" element={<Shell><AttendancePage /></Shell>} />
            <Route path="/timelog" element={<Shell><TimelogPage /></Shell>} />
            <Route path="/materials" element={<Shell><MaterialsPage /></Shell>} />
            <Route path="/inventory" element={<Shell><InventoryPage /></Shell>} />
            <Route path="/vendors" element={<Shell><VendorsPage /></Shell>} />
            <Route path="/pos" element={<Shell><POsPage /></Shell>} />
            <Route path="/tenders" element={<Shell><TendersPage /></Shell>} />
            <Route path="/contracts" element={<Shell><ContractsPage /></Shell>} />
            <Route path="/equipment" element={<Shell><EquipmentPage /></Shell>} />
            <Route path="/payroll" element={<Shell><PayrollPage /></Shell>} />
            <Route path="/requisitions" element={<Shell><RequisitionsPage /></Shell>} />
            <Route path="/alerts" element={<Shell><AlertsPage /></Shell>} />
            <Route path="/team" element={<Shell><TeamPage /></Shell>} />
            <Route path="/ai-analysis" element={<Shell><AiAnalysisPage /></Shell>} />
            <Route path="/reports" element={<Shell><ReportsPage /></Shell>} />
            <Route path="/activity" element={<Shell><ActivityPage /></Shell>} />
            <Route path="/client-requests" element={<Shell><ClientRequestsPage /></Shell>} />
            <Route path="/settings" element={<Shell><SettingsPage /></Shell>} />
            <Route path="/gps" element={<Shell><GpsTrackerPage /></Shell>} />
            <Route path="/more" element={<Shell><MorePage /></Shell>} />
          </Routes>
        </AuthGuard>
        <Toast {...toast} />
      </HashRouter>
    </AppCtx.Provider>
  );
}
