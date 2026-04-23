# ml/train.py
# ─────────────────────────────────────────────────────────────
# Trains TWO models on the real Bangalore traffic dataset:
#
#   1. volume_model.pkl    → predicts Traffic Volume (a number)
#   2. congestion_model.pkl → predicts Congestion Level (0–100)
#
# Run this once before starting Flask:
#   python ml/train.py
# ─────────────────────────────────────────────────────────────

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib, os, json

# ── Step 1: Load the real dataset ─────────────────────────────
print("Loading dataset...")
DATA_PATH = os.path.join(os.path.dirname(__file__), "Banglore_traffic_Dataset.csv")
df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

# ── Step 2: Feature engineering ───────────────────────────────
# Convert Date string "2022-01-15" → real date, then pull out
# day_of_week and month as separate number columns.
df["Date"]        = pd.to_datetime(df["Date"])
df["day_of_week"] = df["Date"].dt.dayofweek   # 0=Mon … 6=Sun
df["month"]       = df["Date"].dt.month        # 1=Jan … 12=Dec

# ── Step 3: Encode text columns → numbers ─────────────────────
# ML models can't work with strings — everything must be a number.
# LabelEncoder assigns each unique string a unique integer.
# We save the encoders so Flask uses the SAME mapping at predict time.
encoders = {}
for col in ["Area Name", "Road/Intersection Name", "Weather Conditions"]:
    le = LabelEncoder()
    df[col + "_enc"] = le.fit_transform(df[col])
    encoders[col] = le
    print(f"  Encoded '{col}': {list(zip(le.classes_, le.transform(le.classes_)))}")

# Yes/No column → 1/0
df["roadwork_enc"] = (df["Roadwork and Construction Activity"] == "Yes").astype(int)

# ── Step 4: Define features and targets ───────────────────────
FEATURE_COLS = [
    "Area Name_enc",
    "Road/Intersection Name_enc",
    "Weather Conditions_enc",
    "roadwork_enc",
    "day_of_week",
    "month",
    "Incident Reports",
]

X            = df[FEATURE_COLS]
y_volume     = df["Traffic Volume"]
y_congestion = df["Congestion Level"]

# ── Step 5: Train/test split ───────────────────────────────────
X_train, X_test, yv_train, yv_test = train_test_split(X, y_volume,     test_size=0.2, random_state=42)
_,       _,      yc_train, yc_test = train_test_split(X, y_congestion, test_size=0.2, random_state=42)

# ── Step 6: Train models ───────────────────────────────────────
print("\nTraining Traffic Volume model...")
volume_model = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
volume_model.fit(X_train, yv_train)
yv_pred = volume_model.predict(X_test)
print(f"  MAE: {mean_absolute_error(yv_test, yv_pred):.0f} vehicles   R²: {r2_score(yv_test, yv_pred):.3f}")

print("Training Congestion Level model...")
congestion_model = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
congestion_model.fit(X_train, yc_train)
yc_pred = congestion_model.predict(X_test)
print(f"  MAE: {mean_absolute_error(yc_test, yc_pred):.1f}%   R²: {r2_score(yc_test, yc_pred):.3f}")

# ── Step 7: Save everything ────────────────────────────────────
OUT = os.path.dirname(__file__)
joblib.dump(volume_model,     os.path.join(OUT, "volume_model.pkl"))
joblib.dump(congestion_model, os.path.join(OUT, "congestion_model.pkl"))
joblib.dump(encoders,         os.path.join(OUT, "encoders.pkl"))
print("\nSaved: volume_model.pkl, congestion_model.pkl, encoders.pkl")

# Metadata for frontend dropdowns and dashboard stats
metadata = {
    "areas":        sorted(df["Area Name"].unique().tolist()),
    "roads":        sorted(df["Road/Intersection Name"].unique().tolist()),
    "weathers":     sorted(df["Weather Conditions"].unique().tolist()),
    # Which area each road belongs to (for smart UI filtering)
    "road_to_area": df.groupby("Road/Intersection Name")["Area Name"].first().to_dict(),
    # Per-road averages for the dashboard table
    "road_stats":   df.groupby("Road/Intersection Name").agg(
                        avg_volume=("Traffic Volume", "mean"),
                        avg_congestion=("Congestion Level", "mean"),
                        avg_speed=("Average Speed", "mean"),
                    ).round(1).to_dict(orient="index"),
    "feature_cols": FEATURE_COLS,
}
with open(os.path.join(OUT, "metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)

# Save processed CSV for the dashboard chart
df.to_csv(os.path.join(OUT, "processed_data.csv"), index=False)
print("Saved: metadata.json, processed_data.csv")
print("\nAll done! Now run: python backend/app.py")