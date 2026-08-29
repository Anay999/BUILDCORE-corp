const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const pool = require("./config/db");
const createAiTables = require("./config/createAiTables");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const progressRoutes = require("./routes/progressRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends",  require("./routes/friendRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/project-chat", require("./routes/projectChatRoutes"));
app.use("/api/comments",     require("./routes/commentRoutes"));
app.use("/api/documents",   require("./routes/documentRoutes"));
app.use("/api/attendance",  require("./routes/attendanceRoutes"));
app.use("/api/safety",      require("./routes/safetyRoutes"));
app.use("/api/milestones",  require("./routes/milestoneRoutes"));
app.use("/api/expenses",    require("./routes/expenseRoutes"));
app.use("/api/activity",    require("./routes/activityRoutes"));
app.use("/api/events",      require("./routes/eventsRoutes"));
app.use("/api/email",       require("./routes/emailRoutes"));
app.use("/api/materials",   require("./routes/materialRoutes"));
app.use("/api/pl",             require("./routes/plRoutes"));
app.use("/api/daily-logs",    require("./routes/dailyLogRoutes"));
app.use("/api/change-orders", require("./routes/changeOrderRoutes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api", require("./routes/aiRoutes"));
app.use("/api/subcontractors", require("./routes/subcontractorRoutes"));
app.use("/api/punch-list",    require("./routes/punchListRoutes"));
app.use("/api/issues",        require("./routes/issueRoutes"));
app.use("/api/equipment",      require("./routes/equipmentRoutes"));
app.use("/api/integrations",  require("./routes/integrationRoutes"));
app.use("/api/permissions",   require("./routes/permissionsRoutes"));
app.use("/api/stats",        require("./routes/statsRoutes"));
app.use("/api/project-requests", require("./routes/projectRequestRoutes"));
app.use("/api/time-tracking",   require("./routes/timeTrackingRoutes"));
app.use("/api/project-photos",  require("./routes/projectPhotoRoutes"));
app.use("/api/project-templates", require("./routes/projectTemplateRoutes"));
app.use("/api/rfi",               require("./routes/rfiRoutes"));
app.use("/api/invoices",          require("./routes/invoiceRoutes"));
app.use("/api/payroll",           require("./routes/payrollRoutes"));
app.use("/api/vendors",           require("./routes/vendorRoutes"));
app.use("/api/tenders",           require("./routes/tenderRoutes"));
app.use("/api/contracts",         require("./routes/contractRoutes"));
app.use("/api/inventory",         require("./routes/inventoryRoutes"));
app.use("/api/sync",              require("./routes/syncRoutes"));
app.use("/api/notifications",     require("./routes/notificationRoutes"));
app.use("/api/search",            require("./routes/searchRoutes"));
app.use("/api/reports",           require("./routes/reportRoutes"));
app.use("/api/requisitions",      require("./routes/requisitionRoutes"));
app.use("/api/contract-payments", require("./routes/contractPaymentRoutes"));
app.use("/api/dsr",               require("./routes/dsrRoutes"));
app.use("/api/vendor-payments",   require("./routes/vendorPaymentRoutes"));

app.get("/", (req, res) => {
  res.send("Construction AI Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await pool.query("SELECT 1");
    console.log("Database connected successfully ✅");
  } catch (error) {
    console.log("DB warning:", error.message);
  }
  try {
    await createAiTables();
  } catch (error) {
    console.log("AI tables warning:", error.message);
  }
});
