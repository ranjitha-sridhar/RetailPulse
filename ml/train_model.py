
import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.metrics import mean_absolute_error
from sklearn.dummy import DummyRegressor
from xgboost import XGBRegressor
import joblib

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "ml" / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("Loading feature-engineered data...")

df = pd.read_csv(DATA_DIR / "feature_engineered.csv",low_memory=False)
df["date"] = pd.to_datetime(df["date"])

# Features used by the model
features = [
    "sell_price",
    "is_available",
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "rolling_mean_7",
    "rolling_mean_28",
    "rolling_std_7",
    "day_of_week",
    "month",
    "day_of_month",
    "is_weekend",
    "is_event"
]

target = "units_sold"

# Remove rows without sufficient historical data
df = df.dropna(subset=features).copy()

# Chronological 80:20 split by date
dates = sorted(df["date"].unique())
split_index = int(len(dates) * 0.8)
split_date = dates[split_index]

train = df[df["date"] < split_date]
test = df[df["date"] >= split_date]

X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]

print("Training rows:", len(train))
print("Testing rows:", len(test))
print("Split date:", split_date)

# Baseline: predict average training demand
print("\nTraining baseline model...")

baseline = DummyRegressor(strategy="mean")
baseline.fit(X_train, y_train)

baseline_predictions = baseline.predict(X_test)

baseline_mae = mean_absolute_error(
    y_test, baseline_predictions
)

print("Baseline MAE:", round(baseline_mae, 4))

# XGBoost model
print("\nTraining XGBoost model...")

model = XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)
predictions = np.maximum(predictions, 0)

mae = mean_absolute_error(y_test, predictions)

# Weighted Absolute Percentage Error
wape = (
    np.abs(y_test - predictions).sum()
    / y_test.sum()
) * 100

print("\nMODEL RESULTS")
print("----------------------")
print("Baseline MAE:", round(baseline_mae, 4))
print("XGBoost MAE:", round(mae, 4))
print("XGBoost WAPE:", round(wape, 2), "%")

# Save model and feature names
joblib.dump(
    {"model": model, "features": features},
    MODEL_DIR / "demand_forecaster.pkl"
)

print("\nModel saved successfully!")
