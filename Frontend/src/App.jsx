// frontend/src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root component. Manages which page is visible using a simple
// useState — no router library needed for a project this size.
// Think of `page` as a variable that controls what's on screen.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Predict   from "./pages/Predict";

// Icon components — small inline SVGs, no library needed
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  predict: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
};

export default function App() {
  // `page` controls which component renders in the main area.
  // "dashboard" or "predict" — that's it, super simple.
  const [page, setPage] = useState("dashboard");

  return (
    <div className="app">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="sidebar">

        {/* Brand name */}
        <div className="brand">TrafficPulse</div>

        {/* Nav buttons — clicking one updates `page` state */}
        {[
          { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
          { id: "predict",   label: "Predict",   icon: Icons.predict   },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => setPage(id)}   // switching pages = just changing this variable
          >
            {icon}
            {label}
          </button>
        ))}

        {/* Status indicator at the bottom */}
        <div style={{ marginTop: "auto", padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }}/>
            Flask API running
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }}/>
            ML model loaded
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      {/* Conditionally render the right page based on `page` state */}
      <main className="main">
        {page === "dashboard" && <Dashboard />}
        {page === "predict"   && <Predict />}
      </main>

    </div>
  );
}