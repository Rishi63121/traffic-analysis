# backend/app.py
# ─────────────────────────────────────────────────────────────
# Flask REST API — serves predictions and data to the React frontend.
#
# Endpoints:
#   GET  /health           → check server + model status
#   GET  /metadata         → all areas, roads, weathers (for dropdowns)
#   POST /predict          → run ML model, return predictions
#   GET  /road-stats       → per-road averages for dashboard table
#   GET  /chart-data?road= → volume trend for a specific road
# ─────────────────────────────────────────────────────────────

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, json, os, pandas as pd, numpy as np

app = Flask(__name__)
CORS(app)   # allow React (port 5173) to call this server (port 5000)

# ── Load everything once at startup ───────────────────────────
# Loading inside a route would reload on every request — wasteful.
ML_DIR = os.path.join(os.path.dirname(__file__), "../ml")

try:
    volume_model     = joblib.load(os.path.join(ML_DIR, "volume_model.pkl"))
    congestion_model = joblib.load(os.path.join(ML_DIR, "congestion_model.pkl"))
    encoders         = joblib.load(os.path.join(ML_DIR, "encoders.pkl"))
    with open(os.path.join(ML_DIR, "metadata.json")) as f:
        metadata = json.load(f)
    df = pd.read_csv(os.path.join(ML_DIR, "processed_data.csv"), parse_dates=["Date"])
    print("All models and data loaded successfully.")
except FileNotFoundError as e:
    print(f"ERROR: {e}")
    print("Run  python ml/train.py  first!")
    volume_model = congestion_model = encoders = metadata = df = None


# ── Helper: encode a single input value ───────────────────────
# The LabelEncoder was fit on training data. We use .transform()
# here (not fit_transform) so we get the same mapping.
def encode(col, value):
    le = encoders[col]
    # If an unknown value is passed, default to the first class
    if value not in le.classes_:
        value = le.classes_[0]
    return int(le.transform([value])[0])


# ── Helper: congestion label from number ───────────────────────
def congestion_label(level):
    if level < 30:   return "low"
    if level < 60:   return "moderate"
    if level < 80:   return "high"
    return "critical"


# ── GET /health ───────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({
        "status":       "ok",
        "model_loaded": volume_model is not None,
        "rows_loaded":  len(df) if df is not None else 0,
    })


# ── GET /metadata ─────────────────────────────────────────────
# React calls this once on startup to populate the dropdowns.
@app.route("/metadata")
def get_metadata():
    if metadata is None:
        return jsonify({"error": "Models not loaded"}), 500
    return jsonify({
        "areas":        metadata["areas"],
        "roads":        metadata["roads"],
        "weathers":     metadata["weathers"],
        "road_to_area": metadata["road_to_area"],
    })


# ── POST /predict ─────────────────────────────────────────────
# Body: { road, area, weather, day_of_week, month, roadwork, incidents }
# Returns: { predicted_volume, congestion_level, congestion_pct, avg_speed_est }
@app.route("/predict", methods=["POST"])
def predict():
    if volume_model is None:
        return jsonify({"error": "Run ml/train.py first"}), 500

    data = request.get_json()

    # Pull values from the JSON body sent by React
    road        = data.get("road",        "Silk Board Junction")
    area        = data.get("area",        "Koramangala")
    weather     = data.get("weather",     "Clear")
    day_of_week = int(data.get("day_of_week", 0))   # 0=Monday
    month       = int(data.get("month",   6))
    roadwork    = 1 if data.get("roadwork", False) else 0
    incidents   = int(data.get("incidents", 0))

    # Build the feature row — same order as FEATURE_COLS in train.py
    features = pd.DataFrame([{
        "Area Name_enc":                encode("Area Name", area),
        "Road/Intersection Name_enc":   encode("Road/Intersection Name", road),
        "Weather Conditions_enc":       encode("Weather Conditions", weather),
        "roadwork_enc":                 roadwork,
        "day_of_week":                  day_of_week,
        "month":                        month,
        "Incident Reports":             incidents,
    }])

    # Run both models
    pred_volume     = int(volume_model.predict(features)[0])
    pred_congestion = float(congestion_model.predict(features)[0])
    pred_congestion = round(min(100, max(0, pred_congestion)), 1)  # clamp to 0–100

    # Estimate speed from congestion (inverse relationship)
    # Higher congestion → lower speed. Range: ~25–55 km/h in Bangalore
    est_speed = round(55 - (pred_congestion / 100) * 30, 1)

    return jsonify({
        "road":             road,
        "area":             area,
        "predicted_volume": pred_volume,
        "congestion_pct":   pred_congestion,
        "congestion_level": congestion_label(pred_congestion),
        "est_speed_kmh":    est_speed,
        "weather":          weather,
    })


# ── GET /road-stats ───────────────────────────────────────────
# Returns per-road historical averages for the dashboard table.
@app.route("/road-stats")
def road_stats():
    if metadata is None:
        return jsonify([])
    rows = []
    for road, stats in metadata["road_stats"].items():
        area = metadata["road_to_area"].get(road, "")
        rows.append({
            "road":            road,
            "area":            area,
            "avg_volume":      round(stats["avg_volume"]),
            "avg_congestion":  round(stats["avg_congestion"], 1),
            "avg_speed":       round(stats["avg_speed"], 1),
            "level":           congestion_label(stats["avg_congestion"]),
        })
    # Sort by congestion descending — worst first
    rows.sort(key=lambda r: r["avg_congestion"], reverse=True)
    return jsonify(rows)


# ── GET /chart-data?road=Silk Board Junction ──────────────────
# Returns monthly average volume for one road → used by the chart.
@app.route("/chart-data")
def chart_data():
    if df is None:
        return jsonify([])

    road = request.args.get("road", "Silk Board Junction")

    # Filter to just the rows for this road
    road_df = df[df["Road/Intersection Name"] == road].copy()

    if road_df.empty:
        return jsonify([])

    # Group by month → average volume per month
    monthly = (
        road_df.groupby("month")
               .agg(avg_volume=("Traffic Volume", "mean"),
                    avg_congestion=("Congestion Level", "mean"),
                    avg_speed=("Average Speed", "mean"))
               .round(1)
               .reset_index()
    )
    month_names = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly["month_name"] = monthly["month"].apply(lambda m: month_names[m])

    return jsonify(monthly.to_dict(orient="records"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)


# ── GET /chart-data-all ───────────────────────────────────────
# Returns monthly trend data for ALL roads in one response.
# The dashboard imports fallback_data.json which has this built in,
# but if Flask is running this gives live data.
@app.route("/chart-data-all")
def chart_data_all():
    if df is None:
        return jsonify({})
    month_names = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    result = {}
    for road in df["Road/Intersection Name"].unique():
        rdf = df[df["Road/Intersection Name"] == road]
        monthly = (
            rdf.groupby("month")
               .agg(avg_volume=("Traffic Volume","mean"),
                    avg_congestion=("Congestion Level","mean"),
                    avg_speed=("Average Speed","mean"))
               .round(1).reset_index()
        )
        monthly["month_name"] = monthly["month"].apply(lambda m: month_names[m])
        result[road] = monthly.to_dict(orient="records")
    return jsonify(result)