const express = require("express");
const router = express.Router();
const { clients, broadcast } = require("../utils/broadcast");

// Expose broadcast so other routes can use it (backwards compat)
router.broadcast = broadcast;

// SSE endpoint — clients connect here to receive live events
router.get("/", (req, res) => {
  const userId = req.query.userId || "anon";
  const clientId = `${userId}_${Date.now()}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: "Connected to BuildCore live updates" })}\n\n`);

  // Keep alive ping every 25s
  const ping = setInterval(() => {
    try { res.write(": ping\n\n"); } catch (e) { clearInterval(ping); }
  }, 25000);

  // Store client
  clients.set(clientId, res);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(clientId);
  });
});

// POST endpoint — other routes call this to broadcast events
router.post("/broadcast", (req, res) => {
  const { event, data } = req.body;
  if (!event) return res.status(400).json({ message: "event required" });
  broadcast(event, data || {});
  res.json({ sent: clients.size, event });
});

module.exports = router;
