# TrafficPulse: Bangalore Traffic Analysis Web App

## Overview

TrafficPulse is a full-stack web application designed to analyze and predict traffic patterns in Bangalore, India. Using machine learning models trained on real traffic data, the app provides insights into traffic volume, congestion levels, and estimated speeds across various roads and intersections.

## Features

### Dashboard
- **Road Statistics Table**: Displays average traffic volume, congestion levels, and speeds for different roads
- **Interactive Charts**: Monthly trend visualizations for traffic volume, congestion, and speed
- **Real-time Data**: Fetches live data from the backend API

### Traffic Prediction
- **Predictive Modeling**: Input parameters like area, road, weather conditions, day of week, month, roadwork status, and incident reports
- **ML Predictions**: Uses trained Random Forest models to predict:
  - Traffic volume (number of vehicles)
  - Congestion level (percentage 0-100)
  - Estimated speed (km/h)
- **Congestion Classification**: Automatically categorizes congestion as low, moderate, high, or critical

## Technology Stack

### Backend
- **Python Flask**: REST API server
- **Scikit-learn**: Machine learning models (Random Forest Regressor)
- **Pandas & NumPy**: Data processing and analysis
- **Joblib**: Model serialization

### Frontend
- **React**: User interface framework
- **Vite**: Build tool and development server
- **CSS**: Custom styling with CSS variables

### Machine Learning
- **Data Source**: Bangalore traffic dataset (CSV)
- **Models**: Two separate models for volume and congestion prediction
- **Features**: Encoded categorical variables (area, road, weather), temporal features (day of week, month), and incident data

## Model Setup

Trained model files (.pkl) are not included due to size constraints.

To generate them, run:
```bash
python train.py

## Project Structure

```
Traffic-Analysis/
├── Banglore_traffic_Dataset.csv    # Raw traffic data
├── train.py                        # ML model training script
├── Backend/
│   ├── app.py                      # Flask API server
│   ├── requirements.txt            # Python dependencies
│   └── package.json                # (Note: appears to be misplaced)
├── Frontend/
│   ├── index.html                  # Main HTML file
│   ├── package.json                # Node.js dependencies
│   ├── vite.config.js              # Vite configuration
│   └── src/
│       ├── App.jsx                 # Main React component
│       ├── main.jsx                # React entry point
│       ├── style.css               # Global styles
│       └── pages/
│           ├── Dashboard.jsx       # Dashboard page
│           ├── Predict.jsx         # Prediction page
│           └── fallback_data.json  # Static data fallback
└── ml/
    ├── metadata.json               # Model metadata and mappings
    ├── processed_data.csv          # Processed dataset
    ├── volume_model.pkl            # Traffic volume model
    ├── congestion_model.pkl        # Congestion level model
    └── encoders.pkl                # Label encoders
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

### Machine Learning Setup
1. Train the models (run once):
   ```bash
   python train.py
   ```

## Running the Application

### Start the Backend
```bash
cd Backend
python app.py
```
The Flask server will start on `http://localhost:5000`

### Start the Frontend
```bash
cd Frontend
npm run dev
```
The React app will start on `http://localhost:5173`

## API Endpoints

- `GET /health` - Server and model status
- `GET /metadata` - Dropdown options (areas, roads, weather)
- `POST /predict` - Traffic predictions
- `GET /road-stats` - Road statistics for dashboard
- `GET /chart-data?road=<road_name>` - Monthly trends for specific road
- `GET /chart-data-all` - Monthly trends for all roads

## Data Processing

The ML pipeline includes:
1. **Feature Engineering**: Date parsing, categorical encoding, temporal features
2. **Model Training**: Random Forest regression for volume and congestion
3. **Encoding**: Label encoding for categorical variables with persistence for inference
4. **Validation**: Train/test split with performance metrics (MAE, R²)

## Contributing

1. Ensure models are retrained after any data changes
2. Test both frontend and backend functionality
3. Update documentation for new features

## License

This project is for educational and demonstration purposes.