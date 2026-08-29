// API helper — all calls go to the same backend (port 5000 via Vite proxy)
const BASE = "/api";

function getToken() {
  return localStorage.getItem("bc_token") || "";
}

function headers(extra = {}) {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

async function req(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path) => req("GET", path),
  post: (path, body) => req("POST", path, body),
  put: (path, body) => req("PUT", path, body),
  patch: (path, body) => req("PATCH", path, body),
  delete: (path) => req("DELETE", path),
};

export function fmt(n) {
  const num = Number(n || 0);
  if (num >= 1_00_00_000) return "₹" + (num / 1_00_00_000).toFixed(1) + "Cr";
  if (num >= 1_00_000) return "₹" + (num / 1_00_000).toFixed(1) + "L";
  if (num >= 1_000) return "₹" + (num / 1_000).toFixed(1) + "K";
  return "₹" + num.toLocaleString("en-IN");
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function ago(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const days = Math.floor(h / 24);
  if (days < 30) return days + "d ago";
  return fmtDate(d);
}

export function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

export function statusBadge(status) {
  const map = {
    "In Progress": "badge-blue",
    "Completed": "badge-green",
    "Planned": "badge-purple",
    "Delayed": "badge-red",
    "On Hold": "badge-yellow",
    open: "badge-red", resolved: "badge-green", closed: "badge-gray",
    in_progress: "badge-blue", pending: "badge-yellow",
    approved: "badge-green", rejected: "badge-red",
    active: "badge-blue", inactive: "badge-gray",
    paid: "badge-green", unpaid: "badge-red", partial: "badge-yellow",
    low: "badge-green", medium: "badge-yellow", high: "badge-red", critical: "badge-red",
  };
  return map[status] || "badge-gray";
}

export function prioColor(p) {
  return { high: "#ef4444", medium: "#f59e0b", low: "#10b981", critical: "#ef4444" }[p] || "#94a3b8";
}

export function saveToken(t, u) {
  localStorage.setItem("bc_token", t);
  localStorage.setItem("bc_user", JSON.stringify(u));
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem("bc_user") || "null"); } catch { return null; }
}

export function logout() {
  localStorage.removeItem("bc_token");
  localStorage.removeItem("bc_user");
}
