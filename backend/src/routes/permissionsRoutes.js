const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const pool    = require("../config/db");
const eventsRoutes = require("./eventsRoutes");

// Ensure the table exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      perm_key VARCHAR(100) NOT NULL UNIQUE,
      roles TEXT[] NOT NULL DEFAULT '{}'
    );
  `);
};
ensureTable().catch(e => console.log("role_permissions table:", e.message));

const getRequesterId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// Default ROLE_PERMS fallback (mirrors frontend ROLE_PERMS exactly)
const DEFAULTS = {
  // Projects
  canCreateProject:        ["boss","manager"],
  canEditProject:          ["boss","manager"],
  canDeleteProject:        ["boss"],
  canAddMilestone:         ["boss","manager","engineer"],
  canAddProgress:          ["boss","manager","engineer","worker"],
  canExportData:           ["boss","manager"],
  // Finance
  canViewBudget:           ["boss","manager"],
  canEditBudget:           ["boss","manager"],
  canAddExpense:           ["boss","manager"],
  canDeleteExpense:        ["boss","manager"],
  canViewPnL:              ["boss","manager"],
  canEditPnL:              ["boss","manager"],
  canRequestPO:            ["boss","manager","engineer"],
  canApprovePurchaseOrder: ["boss","manager"],
  // Team
  canManageTeam:           ["boss"],
  canViewTeam:             ["boss","manager","engineer","worker"],
  canViewAttendance:       ["boss","manager","engineer"],
  canViewActivity:         ["boss","manager"],
  // Site Operations
  canAddTask:              ["boss","manager","engineer"],
  canDeleteTask:           ["boss","manager"],
  canWriteDailyLog:        ["boss","manager","engineer"],
  canRaiseChangeOrder:     ["boss","manager","engineer"],
  canApproveChangeOrder:   ["boss","manager"],
  canRunSafetyInspection:  ["boss","manager","engineer","worker"],
  canManagePunchList:      ["boss","manager","engineer"],
  canManageIssues:         ["boss","manager","engineer"],
  canViewIssues:           ["boss","manager","engineer","worker","client"],
  // Documents & Communication
  canUploadDoc:            ["boss","manager","engineer"],
  canChat:                 ["boss","manager","engineer","worker","client"],
  canViewReports:          ["boss","manager"],
  canManageSubcontractors: ["boss","manager"],
  // Resources
  canManageEquipment:      ["boss","manager","engineer"],
  canManageMaterials:      ["boss","manager","engineer"],
  // System
  canViewAlerts:           ["boss","manager","engineer"],
  canViewSettings:         ["boss","manager","engineer","worker","client"],
  canManagePermissions:    ["boss"],
  canManageIntegrations:   ["boss"],
  canViewClientRequests:   ["boss","manager"],
  // Calendar & Time
  canViewCalendar:         ["boss","manager","engineer","worker"],
  canViewTimeLog:          ["boss","manager","engineer","worker"],
  canClockInOut:           ["boss","manager","engineer","worker"],
  canDeleteTimeLog:        ["boss","manager"],
  // Progress Photos
  canViewPhotos:           ["boss","manager","engineer","worker"],
  canUploadPhoto:          ["boss","manager","engineer","worker"],
  canDeletePhoto:          ["boss","manager"],
  // Messaging extras
  canPinMessages:          ["boss","manager"],
  canSendVoice:            ["boss","manager","engineer","worker"],
  // Templates
  canManageTemplates:      ["boss","manager"],
};

// GET /api/permissions  — returns full permissions map
router.get("/", async (req, res) => {
  try {
    const rows = await pool.query(`SELECT perm_key, roles FROM role_permissions`);
    const result = { ...DEFAULTS };
    rows.rows.forEach(r => { result[r.perm_key] = r.roles; });
    res.json(result);
  } catch (e) {
    console.log(e.message);
    res.json(DEFAULTS); // safe fallback
  }
});

// PUT /api/permissions  — boss only, saves full overridden map
router.put("/", async (req, res) => {
  try {
    const requesterId = getRequesterId(req);
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });
    const requester = await pool.query(`SELECT role FROM users WHERE id=$1`, [requesterId]);
    if (requester.rows[0]?.role !== "boss") return res.status(403).json({ message: "Only the boss can change permissions" });

    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object") return res.status(400).json({ message: "Invalid payload" });

    for (const [key, roles] of Object.entries(permissions)) {
      if (!Array.isArray(roles)) continue;
      await pool.query(`
        INSERT INTO role_permissions (perm_key, roles)
        VALUES ($1, $2)
        ON CONFLICT (perm_key) DO UPDATE SET roles = $2
      `, [key, roles]);
    }

    // Push to ALL connected browsers instantly via SSE
    eventsRoutes.broadcast("permissions_update", { updatedBy: requesterId, ts: Date.now() });

    res.json({ success: true });
  } catch (e) {
    console.log(e.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
