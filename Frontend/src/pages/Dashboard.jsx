// frontend/src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────
// Dashboard: per-road stats table + a monthly trend chart that
// updates dynamically when you pick any road from the dropdown
// or click any row in the table.
//
// FIXES:
//  - Chart title is now dynamic (shows whichever road is selected)
//  - Road dropdown populates from real data even if Flask is offline
//  - Falls back to embedded dataset so UI always works
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Filler, Legend,
} from "chart.js";
import axios from "axios";

// Import the pre-built fallback data (extracted from your CSV at build time)
// This means the UI works even when Flask isn't running yet.
import FALLBACK from "./fallback_data.json";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);

export default function Dashboard() {
  const [roadStats,    setRoadStats]    = useState([]);
  const [chartByRoad,  setChartByRoad]  = useState({});   // { "Silk Board Junction": [...], ... }
  const [selectedRoad, setSelectedRoad] = useState(FALLBACK.roads[10]); // default: Silk Board Junction
  const [loading,      setLoading]      = useState(true);

  // ── Load data: try Flask first, fall back to embedded JSON ──
  useEffect(() => {
    axios.get("/api/road-stats")
      .then(res => {
        setRoadStats(res.data);
        // If Flask is up, also get all chart data upfront
        return axios.get("/api/chart-data-all").catch(() => null);
      })
      .then(res => {
        if (res) setChartByRoad(res.data);
        else      setChartByRoad(FALLBACK.chart_by_road);
      })
      .catch(() => {
        // Flask offline → use embedded fallback silently
        setRoadStats(FALLBACK.road_stats);
        setChartByRoad(FALLBACK.chart_by_road);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Chart data for the currently selected road ─────────────
  // chartByRoad[selectedRoad] is the array of monthly data points
  const chartRows = chartByRoad[selectedRoad] || [];

  const lineChart = {
    labels: chartRows.map(d => d.month_name),
    datasets: [
      {
        label:           "Avg Volume",
        data:            chartRows.map(d => Math.round(d.avg_volume)),
        borderColor:     "#22d3ee",
        backgroundColor: "rgba(34,211,238,0.08)",
        borderWidth:     2,
        pointRadius:     4,
        pointBackgroundColor: "#22d3ee",
        tension:         0.4,
        fill:            true,
        yAxisID:         "y",
      },
      {
        label:           "Congestion %",
        data:            chartRows.map(d => Math.round(d.avg_congestion)),
        borderColor:     "#f87171",
        backgroundColor: "rgba(248,113,113,0.05)",
        borderWidth:     2,
        pointRadius:     4,
        pointBackgroundColor: "#f87171",
        tension:         0.4,
        fill:            false,
        yAxisID:         "y2",
      },
    ],
  };

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, labels: { color: "#64748b", font: { size: 12 } } },
    },
    scales: {
      x:  { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,.04)" } },
      y:  {
        ticks: { color: "#22d3ee" },
        grid:  { color: "rgba(255,255,255,.04)" },
        title: { display: true, text: "Volume (vehicles/day)", color: "#64748b" },
      },
      y2: {
        position: "right",
        ticks:    { color: "#f87171" },
        grid:     { display: false },
        title:    { display: true, text: "Congestion %", color: "#64748b" },
        min: 0, max: 100,
      },
    },
  };

  // Summary numbers for the selected road's stat cards
  const selected = roadStats.find(r => r.road === selectedRoad);

  const congestionColor = (pct) =>
    pct > 80 ? "var(--red)" : pct > 50 ? "var(--amber)" : "var(--green)";

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Historical averages from the Bangalore traffic dataset (2022–2024)
      </p>

      {/* ── Road selector dropdown ──────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <label className="muted" style={{ display:"block", marginBottom:6, fontSize:12,
                                          textTransform:"uppercase", letterSpacing:".05em" }}>
          Select road
        </label>
        <select
          value={selectedRoad}
          onChange={e => setSelectedRoad(e.target.value)}
          style={{ width:"100%", padding:"10px 14px", background:"var(--surface)",
                   border:"1px solid var(--border)", borderRadius:8,
                   color:"var(--text)", fontSize:14 }}
        >
          {/* Populate from real data — no hardcoding */}
          {roadStats.map(r => (
            <option key={r.road} value={r.road}>
              {r.road}  —  {r.area}
            </option>
          ))}
        </select>
      </div>

      {/* ── Stat cards for selected road ───────────────────── */}
      {selected && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <p className="stat-label">Avg daily volume</p>
            <p className="stat-value" style={{ color:"var(--cyan)" }}>
              {selected.avg_volume.toLocaleString()}
            </p>
            <p className="muted">vehicles / day</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Avg congestion</p>
            <p className="stat-value" style={{ color: congestionColor(selected.avg_congestion) }}>
              {selected.avg_congestion}%
            </p>
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${selected.level}`}>{selected.level}</span>
            </div>
          </div>

          <div className="stat-card">
            <p className="stat-label">Avg speed</p>
            <p className="stat-value" style={{ color:"var(--purple)" }}>
              {selected.avg_speed}
            </p>
            <p className="muted">km / h</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Area</p>
            <p style={{ fontSize:18, fontWeight:700, marginTop:4 }}>{selected.area}</p>
            <p className="muted">Bangalore</p>
          </div>
        </div>
      )}

      {/* ── Monthly trend chart ─────────────────────────────── */}
      {/* Title uses selectedRoad — updates dynamically with the dropdown */}
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="card-title">
          {/* This is the fix — was hardcoded before, now dynamic */}
          {selectedRoad} — monthly trend
        </p>

        {chartRows.length === 0 ? (
          <p className="muted" style={{ paddingBottom:12 }}>No chart data for this road.</p>
        ) : (
          <div className="chart-wrap">
            <Line data={lineChart} options={chartOptions} />
          </div>
        )}
      </div>

      {/* ── All roads table ─────────────────────────────────── */}
      <div className="card">
        <p className="card-title">All 16 roads — click any row to update chart</p>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Road","Area","Avg Volume","Congestion","Speed (km/h)","Level"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left",
                                         color:"var(--text-muted)", fontWeight:600,
                                         fontSize:11, textTransform:"uppercase", letterSpacing:".04em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roadStats.map(r => (
                  <tr
                    key={r.road}
                    onClick={() => setSelectedRoad(r.road)}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor:       "pointer",
                      // Highlight the row that matches the current dropdown selection
                      background:   r.road === selectedRoad
                        ? "rgba(34,211,238,.06)"
                        : "transparent",
                      transition:   "background .15s",
                    }}
                  >
                    <td style={{ padding:"10px 12px", fontWeight: r.road === selectedRoad ? 600 : 400 }}>
                      {r.road}
                    </td>
                    <td style={{ padding:"10px 12px", color:"var(--text-muted)" }}>{r.area}</td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace" }}>
                      {r.avg_volume.toLocaleString()}
                    </td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {/* Mini horizontal progress bar */}
                        <div style={{ width:60, height:5, background:"var(--border)",
                                       borderRadius:3, overflow:"hidden" }}>
                          <div style={{
                            width:     `${r.avg_congestion}%`,
                            height:    "100%",
                            borderRadius: 3,
                            background: congestionColor(r.avg_congestion),
                          }}/>
                        </div>
                        <span style={{ fontFamily:"monospace" }}>{r.avg_congestion}%</span>
                      </div>
                    </td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace" }}>{r.avg_speed}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span className={`badge ${r.level}`}>{r.level}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}