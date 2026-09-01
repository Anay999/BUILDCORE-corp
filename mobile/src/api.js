// API helper — points to backend with smart auto-detection (Same WiFi + Hotspot + Cloud 5G)
const CANDIDATE_URLS = [
  "http://192.168.1.71:5000/api",   // Wi-Fi LAN IP
  "http://192.168.137.73:5000/api", // Mobile Hotspot IP
  "https://buildcore-anay-live.loca.lt/api", // Cloud Tunnel
  "http://10.0.2.2:5000/api",       // Android Emulator Loopback
  "http://localhost:5000/api",      // Local Web Loopback
];

const DEFAULT_LOCAL_URL = "http://192.168.1.71:5000/api";
const DEFAULT_TUNNEL_URL = "https://buildcore-anay-live.loca.lt/api";

export function getApiBaseUrl() {
  const custom = localStorage.getItem("bc_api_url");
  if (custom) return custom.replace(/\/+$/, "");
  return DEFAULT_LOCAL_URL;
}

export function setApiBaseUrl(url) {
  if (url) localStorage.setItem("bc_api_url", url.trim().replace(/\/+$/, ""));
  else localStorage.removeItem("bc_api_url");
}

function getToken() {
  return localStorage.getItem("bc_token") || "";
}

function headers(extra = {}) {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
    "bypass-tunnel-reminder": "true",
    "ngrok-skip-browser-warning": "true",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

async function tryFetch(base, path, opts = {}, timeoutMs = 3000) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${base}${cleanPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const mergedHeaders = {
    "Bypass-Tunnel-Reminder": "true",
    "bypass-tunnel-reminder": "true",
    "ngrok-skip-browser-warning": "true",
    ...(opts.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...opts,
      headers: mergedHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function req(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const primaryBase = getApiBaseUrl();

  let res;
  try {
    res = await tryFetch(primaryBase, path, opts, 3500);
  } catch {
    // Fast parallel probe across all candidates
    let found = false;
    const candidates = CANDIDATE_URLS.filter((u) => u !== primaryBase);

    for (const altUrl of candidates) {
      try {
        res = await tryFetch(altUrl, path, opts, 2500);
        setApiBaseUrl(altUrl);
        found = true;
        break;
      } catch {}
    }

    if (!found) {
      throw new Error("Unable to reach backend. Tap '📶 Wi-Fi (1.71)' or check laptop server.");
    }
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    return data;
  }

  const text = await res.text();
  if (text.includes("localtunnel") || text.includes("Tunnel Reminder")) {
    throw new Error("Tunnel reminder page intercepted — reconnecting...");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
  return text;
}

export const api = {
  get: (path) => req("GET", path),
  post: (path, body) => req("POST", path, body),
  put: (path, body) => req("PUT", path, body),
  patch: (path, body) => req("PATCH", path, body),
  delete: (path) => req("DELETE", path),
  upload: async (path, formData) => {
    const t = getToken();
    const opts = {
      method: "POST",
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        "bypass-tunnel-reminder": "true",
        "ngrok-skip-browser-warning": "true",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: formData,
    };
    const primaryBase = getApiBaseUrl();
    let res;
    try {
      res = await tryFetch(primaryBase, path, opts, 6000);
    } catch {
      for (const altUrl of CANDIDATE_URLS) {
        if (altUrl === primaryBase) continue;
        try {
          res = await tryFetch(altUrl, path, opts, 4000);
          setApiBaseUrl(altUrl);
          break;
        } catch {}
      }
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      return data;
    }
    return res.text();
  },
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
    completed: { bg: "#1e3a8a", text: "#60a5fa", label: "Completed" },
    delayed: { bg: "#7f1d1d", text: "#f87171", label: "Delayed" },
    "on hold": { bg: "#78350f", text: "#fbbf24", label: "On Hold" },
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
