/**
 * broadcast.js — shared SSE client registry
 * Import this in eventsRoutes.js AND any controller that needs to push live updates.
 */

const clients = new Map(); // clientId -> res

const broadcast = (event, data) => {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(msg); } catch (_) { /* disconnected */ }
  });
};

module.exports = { clients, broadcast };
