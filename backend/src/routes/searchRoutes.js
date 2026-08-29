const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const getUserId = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, "secretkey").id;
  } catch { return null; }
};

// GET /api/search?q=query
// Searches across projects, tasks, issues, documents, purchase orders, subcontractors, inventory
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ results: {} });

    const like = `%${q}%`;

    const [projects, tasks, issues, docs, pos, subs, inventory] = await Promise.all([
      // Projects
      pool.query(
        `SELECT id, title, location, status, client_name, budget FROM projects
         WHERE title ILIKE $1 OR location ILIKE $1 OR client_name ILIKE $1
         LIMIT 6`,
        [like]
      ),
      // Tasks
      pool.query(
        `SELECT pt.id, pt.title, pt.status, pt.priority, pt.project_id, p.title as project_title
         FROM project_tasks pt
         LEFT JOIN projects p ON p.id = pt.project_id
         WHERE pt.title ILIKE $1 OR pt.description ILIKE $1
         LIMIT 5`,
        [like]
      ),
      // Issues
      pool.query(
        `SELECT i.id, i.title, i.status, i.priority, i.project_id, p.title as project_title
         FROM issues i
         LEFT JOIN projects p ON p.id = i.project_id
         WHERE i.title ILIKE $1 OR i.description ILIKE $1
         LIMIT 5`,
        [like]
      ),
      // Documents
      pool.query(
        `SELECT d.id, d.original_name AS name, d.file_type AS category, d.project_id, p.title as project_title
         FROM project_documents d
         LEFT JOIN projects p ON p.id = d.project_id
         WHERE d.original_name ILIKE $1 OR d.file_type ILIKE $1
         LIMIT 5`,
        [like]
      ),
      // Purchase Orders
      pool.query(
        `SELECT po.id, po.vendor_name AS vendor, po.status, po.amount AS total_amount, po.project_id, p.title as project_title
         FROM purchase_orders po
         LEFT JOIN projects p ON p.id = po.project_id
         WHERE po.vendor_name ILIKE $1 OR CAST(po.po_number AS TEXT) ILIKE $1 OR CAST(po.id AS TEXT) ILIKE $1
         LIMIT 5`,
        [like]
      ),
      // Subcontractors
      pool.query(
        `SELECT id, company_name, contact_name, status, contract_value FROM subcontractors
         WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR trade ILIKE $1
         LIMIT 5`,
        [like]
      ),
      // Inventory
      pool.query(
        `SELECT id, name, category, qty_in_stock AS quantity, unit FROM inventory_items
         WHERE name ILIKE $1 OR category ILIKE $1 OR sku ILIKE $1
         LIMIT 5`,
        [like]
      ),
    ]);

    res.json({
      results: {
        projects: projects.rows,
        tasks: tasks.rows,
        issues: issues.rows,
        documents: docs.rows,
        purchaseOrders: pos.rows,
        subcontractors: subs.rows,
        inventory: inventory.rows,
      }
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

module.exports = router;
