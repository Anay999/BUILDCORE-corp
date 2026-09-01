import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  try {
    ReactDOM.createRoot(rootEl).render(<App />);
  } catch (e) {
    console.error("ReactDOM render failed:", e);
    rootEl.innerHTML = `<div style="padding:20px;color:#f87171;background:#0f172a;font-family:sans-serif;"><h2>Render Error</h2><p>${e.message}</p></div>`;
  }
}
