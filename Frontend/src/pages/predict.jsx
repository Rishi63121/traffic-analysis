// frontend/src/pages/Predict.jsx
// ─────────────────────────────────────────────────────────────
// Prediction form — pick ANY road in Bangalore, set conditions,
// get the ML model's prediction for volume & congestion.
//
// FIXES:
//  - Dropdowns now populate from embedded fallback data,
//    so they always have real values even before Flask loads.
//  - Selecting a road auto-fills the Area field correctly.
//  - Predict button works whether Flask is up or down
//    (falls back to a plausible estimate using the dataset averages).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import axios from "axios";
import FALLBACK from "./fallback_data.json";

const DAY_NAMES   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Congestion label + color from a percentage
function congestionInfo(pct) {
  if (pct < 30) return { label:"low",      color:"var(--green)" };
  if (pct < 60) return { label:"moderate", color:"var(--amber)" };
  if (pct < 80) return { label:"high",     color:"var(--red)"   };
  return              { label:"critical",  color:"var(--red)"   };
}

export default function Predict() {
  // ── Dropdown options ───────────────────────────────────────
  // Start with fallback data immediately — no blank dropdowns.
  const [roads,      setRoads]      = useState(FALLBACK.roads);
  const [areas,      setAreas]      = useState(FALLBACK.areas);
  const [weathers,   setWeathers]   = useState(FALLBACK.weathers);
  const [roadToArea, setRoadToArea] = useState(FALLBACK.road_to_area);

  // ── Form state ─────────────────────────────────────────────
  const defaultRoad = "Silk Board Junction";
  const [form, setForm] = useState({
    road:        defaultRoad,
    area:        FALLBACK.road_to_area[defaultRoad] || "",
    weather:     "Clear",
    day_of_week: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
    month:       new Date().getMonth() + 1,
    roadwork:    false,
    incidents:   0,
  });

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Try to upgrade to live Flask data ─────────────────────
  // Fallback is already loaded above. This just overwrites with
  // live data if Flask IS running — otherwise stays on fallback.
  useEffect(() => {
    axios.get("/api/metadata")
      .then(res => {
        setRoads(res.data.roads);
        setAreas(res.data.areas);
        setWeathers(res.data.weathers);
        setRoadToArea(res.data.road_to_area);
      })
      .catch(() => {
        // Flask not running — fallback is already set, nothing to do
        setUsingFallback(true);
      });
  }, []);

  // ── When road changes, auto-set the area ──────────────────
  const handleRoadChange = (road) => {
    const area = roadToArea[road] || form.area;
    setForm(prev => ({ ...prev, road, area }));
    // Also reset result so old result doesn't confuse
    setResult(null);
  };

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Fallback prediction (when Flask is offline) ────────────
  // Uses the real dataset averages for the selected road +
  // applies simple adjustments for weather/incidents/roadwork.
  const fallbackPredict = (formData) => {
    const roadStat = FALLBACK.road_stats.find(r => r.road === formData.road);
    if (!roadStat) return null;

    let volume     = roadStat.avg_volume;
    let congestion = roadStat.avg_congestion;

    // Weekend reduction
    if (formData.day_of_week >= 5) { volume *= 0.8; congestion *= 0.85; }
    // Weather adjustments
    if (formData.weather === "Rain")       { volume *= 0.9;  congestion *= 1.1; }
    if (formData.weather === "Fog")        { volume *= 0.85; congestion *= 1.15; }
    if (formData.weather === "Overcast")   { volume *= 0.95; congestion *= 1.02; }
    // Incidents increase congestion
    congestion += formData.incidents * 5;
    // Roadwork adds congestion
    if (formData.roadwork) congestion += 10;

    congestion = Math.min(100, Math.max(0, Math.round(congestion * 10) / 10));
    volume     = Math.round(volume);
    const estSpeed = Math.round(55 - (congestion / 100) * 30);
    const { label } = congestionInfo(congestion);

    return {
      road:             formData.road,
      area:             formData.area,
      predicted_volume: volume,
      congestion_pct:   congestion,
      congestion_level: label,
      est_speed_kmh:    estSpeed,
      weather:          formData.weather,
      source:           "fallback",  // flag so we can show a note
    };
  };

  // ── Submit handler ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Try Flask first
      const res = await axios.post("/api/predict", form);
      setResult({ ...res.data, source: "model" });
    } catch {
      // Flask is down — use fallback estimate
      const est = fallbackPredict(form);
      if (est) {
        setResult(est);
      } else {
        setError("Could not generate a prediction. Make sure the dataset is loaded.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resInfo = result ? congestionInfo(result.congestion_pct) : null;

  return (
    <div>
      <h1 className="page-title">Predict Traffic</h1>
      <p className="page-subtitle">
        Pick any Bangalore road — the ML model predicts volume &amp; congestion
      </p>

      {/* Banner: show when using fallback data */}
      {usingFallback && (
        <div style={{ padding:"10px 16px", borderRadius:8, marginBottom:20,
                       background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.25)",
                       fontSize:13, color:"var(--amber)" }}>
          Flask server not detected — using dataset averages for predictions.
          Start Flask with <code style={{background:"rgba(255,255,255,.05)",padding:"1px 6px",borderRadius:4}}>
            python backend/app.py
          </code> for the full ML model.
        </div>
      )}

      <div className="grid-2">

        {/* ── Form card ─────────────────────────────────────── */}
        <div className="card">
          <form onSubmit={handleSubmit}>

            {/* Road selector */}
            <div className="form-group">
              <label>Road / intersection</label>
              <select
                value={form.road}
                onChange={e => handleRoadChange(e.target.value)}
              >
                {roads.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Area — auto-filled, user can override */}
            <div className="form-group">
              <label>Area (auto-filled from road)</label>
              <select value={form.area} onChange={e => setField("area", e.target.value)}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Day of week</label>
                <select value={form.day_of_week} onChange={e => setField("day_of_week", Number(e.target.value))}>
                  {DAY_NAMES.map((d,i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Month</label>
                <select value={form.month} onChange={e => setField("month", Number(e.target.value))}>
                  {MONTH_NAMES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Weather conditions</label>
              <select value={form.weather} onChange={e => setField("weather", e.target.value)}>
                {weathers.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Incident reports on this road (0–5)</label>
              <input
                type="number" min="0" max="5"
                value={form.incidents}
                onChange={e => setField("incidents", Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={form.roadwork}
                  onChange={e => setField("roadwork", e.target.checked)}
                  style={{ width:16, height:16, accentColor:"var(--cyan)" }}
                />
                Roadwork / construction currently active
              </label>
            </div>

            <button type="submit" className="btn full" disabled={loading}>
              {loading ? "Running model…" : "Predict Traffic"}
            </button>
          </form>
        </div>

        {/* ── Result card ───────────────────────────────────── */}
        <div className="card">
          <p className="card-title">Prediction result</p>

          {!result && !loading && !error && (
            <div style={{ marginTop:16 }}>
              <p className="muted">Select a road and click Predict.</p>
              <div style={{ marginTop:24, padding:16, background:"var(--bg)", borderRadius:8 }}>
                <p className="muted" style={{ fontSize:11, textTransform:"uppercase",
                                               letterSpacing:".06em", marginBottom:10 }}>
                  What the model predicts
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    ["Traffic Volume",   "vehicles per day on that road"],
                    ["Congestion Level", "0–100% from your dataset"],
                    ["Est. Speed",       "derived from congestion %"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ fontSize:13 }}>
                      <span style={{ color:"var(--cyan)", fontWeight:600 }}>{k}</span>
                      <span className="muted"> — {v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <p className="muted" style={{ marginTop:16 }}>Running prediction…</p>}
          {error   && <p style={{ color:"var(--red)", marginTop:16, fontSize:13 }}>{error}</p>}

          {result && resInfo && (
            <div className="result-box">

              {/* Road + area header */}
              <p style={{ fontSize:12, color:"var(--text-muted)", textTransform:"uppercase",
                           letterSpacing:".06em", marginBottom:4 }}>
                {result.road}
              </p>
              <p className="muted" style={{ fontSize:12, marginBottom:14 }}>{result.area}, Bangalore</p>

              {/* Big predicted volume */}
              <p className="result-volume">{result.predicted_volume.toLocaleString()}</p>
              <p className="muted" style={{ marginBottom:20 }}>vehicles / day (predicted)</p>

              <hr className="divider" />

              {/* Congestion bar */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span className="muted" style={{ fontSize:13 }}>Congestion</span>
                  <span style={{ fontWeight:700, color:resInfo.color }}>{result.congestion_pct}%</span>
                </div>
                <div style={{ height:10, background:"var(--border)", borderRadius:5, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:5,
                    width:`${result.congestion_pct}%`,
                    background: resInfo.color,
                    transition:"width .7s ease",
                  }}/>
                </div>
                <div style={{ marginTop:8 }}>
                  <span className={`badge ${resInfo.label}`}>{resInfo.label}</span>
                </div>
              </div>

              <hr className="divider" />

              {/* Speed + weather */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span className="muted" style={{ fontSize:13 }}>Est. avg speed</span>
                  <span style={{ fontWeight:600, color:"var(--purple)" }}>{result.est_speed_kmh} km/h</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span className="muted" style={{ fontSize:13 }}>Weather</span>
                  <span style={{ fontWeight:500 }}>{result.weather}</span>
                </div>
              </div>

              {/* Note if using fallback estimate */}
              {result.source === "fallback" && (
                <p style={{ marginTop:16, fontSize:11, color:"var(--text-muted)",
                             padding:"8px 10px", background:"rgba(255,255,255,.03)",
                             borderRadius:6, lineHeight:1.6 }}>
                  Estimated from dataset averages — start Flask for the full ML model prediction.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}