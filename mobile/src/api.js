// BuildCore Ultra-Fast High-Reliability API Client
const PRIMARY_LAN = "http://192.168.1.71:5000/api";
const TUNNEL_URL = "https://buildcore-anay-live.loca.lt/api";

export function normalizeApiUrl(url) {
  if (!url) return TUNNEL_URL;
  let clean = url.trim().replace(/\/+$/, "");
  if (clean.includes("loca.lt") && clean.startsWith("http://")) {
    clean = clean.replace("http://", "https://");
  }
  if (!clean.endsWith("/api")) {
    clean += "/api";
  }
  return clean;
}

const CANDIDATE_URLS = [
  TUNNEL_URL,
  PRIMARY_LAN,
  "http://192.168.137.73:5000/api",
  "http://10.0.2.2:5000/api",
];

// In-Memory Fast Cache for 0ms Screen Renders
const MEM_CACHE = new Map();

let cachedActiveUrl = null;

export function getApiBaseUrl() {
  if (cachedActiveUrl) return cachedActiveUrl;
  const custom = localStorage.getItem("bc_api_url");
  if (custom) {
    cachedActiveUrl = normalizeApiUrl(custom);
    return cachedActiveUrl;
  }
  return TUNNEL_URL;
}

export function setApiBaseUrl(url) {
  if (url) {
    const clean = normalizeApiUrl(url);
    cachedActiveUrl = clean;
    localStorage.setItem("bc_api_url", clean);
  } else {
    cachedActiveUrl = null;
    localStorage.removeItem("bc_api_url");
  }
}

function getToken() {
  return localStorage.getItem("bc_token") || "";
}

function getHeaders(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
    "bypass-tunnel-reminder": "true",
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ─── Fast Parallel Probe: Detects the fastest route in < 200ms ────────────────
export async function raceFastestRoute() {
  const probePath = "/stats/alerts";
  const promises = CANDIDATE_URLS.map(async (baseUrl) => {
    const cleanBase = normalizeApiUrl(baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch(`${cleanBase}${probePath}`, {
        method: "GET",
        headers: getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 401 || res.status === 200) {
        return cleanBase;
      }
      throw new Error("HTTP error");
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  });

  try {
    const winner = await Promise.any(promises);
    if (winner) {
      setApiBaseUrl(winner);
      return winner;
    }
  } catch {}
  return getApiBaseUrl();
}

// Auto-race on app boot in background
setTimeout(() => {
  raceFastestRoute().catch(() => {});
}, 100);

async function doFetch(baseUrl, path, options = {}, timeoutMs = 1500) {
  const cleanBase = normalizeApiUrl(baseUrl);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${cleanBase}${cleanPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers: getHeaders(options.headers || {}),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504)) {
      throw new Error(`Server temporarily unavailable (${res.status})`);
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function request(method, path, body) {
  const options = { method };
  if (body !== undefined) options.body = JSON.stringify(body);

  const activeUrl = getApiBaseUrl();
  let res;

  try {
    res = await doFetch(activeUrl, path, options, 1500);
  } catch {
    // Fast parallel failover across remaining candidate routes
    const candidates = CANDIDATE_URLS.filter((u) => u !== activeUrl);
    try {
      res = await Promise.any(
        candidates.map(async (altUrl) => {
          const r = await doFetch(altUrl, path, options, 2000);
          setApiBaseUrl(altUrl);
          return r;
        })
      );
    } catch {
      throw new Error("Unable to reach backend. Check server connection.");
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`);
    if (method === "GET") {
      MEM_CACHE.set(path, data);
    }
    return data;
  }

  const text = await res.text();
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    throw new Error("Server returned HTML page. Reconnecting...");
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return text;
}

export const api = {
  get: (path) => request("GET", path),
  getCached: (path) => {
    return MEM_CACHE.get(path) || null;
  },
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
  upload: async (path, formData) => {
    const token = getToken();
    const options = {
      method: "POST",
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        "bypass-tunnel-reminder": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    };
    const activeUrl = getApiBaseUrl();
    let res;
    try {
      res = await doFetch(activeUrl, path, options, 8000);
    } catch {
      for (const altUrl of CANDIDATE_URLS) {
        if (altUrl === activeUrl) continue;
        try {
          res = await doFetch(altUrl, path, options, 6000);
          setApiBaseUrl(altUrl);
          break;
        } catch {}
      }
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`);
      return data;
    }
    return res.text();
  },
};

export function fmt(n) {
  const num = Number(n || 0);
  if (num >= 1_00_00_000) return "₹" + (num / 1_00_00_000).toFixed(1) + "Cr";
  if (num >= 1_00_000) return "₹" + (num / 1_00_00_000).toFixed(1) + "L";
  if (num >= 1_000) return "₹" + (num / 1_000).toFixed(1) + "K";
  return "₹" + num.toLocaleString("en-IN");
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ago(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function initials(name = "") {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

export function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function prioColor(p = "") {
  const map = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#10b981",
  };
  return map[p.toLowerCase()] || "#94a3b8";
}

export function statusBadge(s = "") {
  const map = {
    active: { bg: "#064e3b", text: "#34d399", label: "Active" },
    ongoing: { bg: "#1e3a8a", text: "#60a5fa", label: "Ongoing" },
    completed: { bg: "#064e3b", text: "#34d399", label: "Completed" },
    delayed: { bg: "#7f1d1d", text: "#f87171", label: "Delayed" },
    "on hold": { bg: "#78350f", text: "#fbbf24", label: "On Hold" },
    planned: { bg: "#3b0764", text: "#c084fc", label: "Planned" },
    pending: { bg: "#374151", text: "#9ca3af", label: "Pending" },
    approved: { bg: "#064e3b", text: "#34d399", label: "Approved" },
    rejected: { bg: "#7f1d1d", text: "#f87171", label: "Rejected" },
    open: { bg: "#1e3a8a", text: "#60a5fa", label: "Open" },
    resolved: { bg: "#064e3b", text: "#34d399", label: "Resolved" },
    closed: { bg: "#374151", text: "#9ca3af", label: "Closed" },
  };
  return map[s.toLowerCase()] || { bg: "#1f2937", text: "#e5e7eb", label: s || "Unknown" };
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("bc_user") || "null");
  } catch {
    return null;
  }
}

export function saveToken(token, user) {
  if (token) localStorage.setItem("bc_token", token);
  if (user) localStorage.setItem("bc_user", JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem("bc_token");
  localStorage.removeItem("bc_user");
}
