
import pandas as pd
import numpy as np
import joblib

from pathlib import Path
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "ml" / "models"

df = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)
df["date"] = pd.to_datetime(df["date"])

saved = joblib.load(MODEL_DIR / "demand_forecaster.pkl")
model = saved["model"]
features = saved["features"]

df = df.dropna(subset=features).copy()

dates = sorted(df["date"].unique())
split_date = dates[int(len(dates) * 0.8)]

test = df[df["date"] >= split_date].copy()

X_test = test[features]
y_test = test["units_sold"]

# XGBoost predictions
predictions = np.maximum(model.predict(X_test), 0)

# Seasonal naive: predict using sales from 7 days ago
seasonal_predictions = test["lag_7"].to_numpy()

def calculate_metrics(actual, predicted):
    mae = mean_absolute_error(actual, predicted)
    wape = (
        np.abs(actual - predicted).sum()
        / actual.sum()
    ) * 100

    return round(mae, 4), round(wape, 2)

print("\nOVERALL MODEL COMPARISON")
print("------------------------")

for name, pred in [
    ("Seasonal Naive (lag_7)", seasonal_predictions),
    ("XGBoost", predictions)
]:
    mae, wape = calculate_metrics(y_test, pred)
    print(f"{name}: MAE={mae}, WAPE={wape}%")

# Store-wise performance
test["xgb_prediction"] = predictions

print("\nSTORE-WISE XGBOOST PERFORMANCE")
print("------------------------------")

for store, group in test.groupby("store_id"):
    mae, wape = calculate_metrics(
        group["units_sold"],
        group["xgb_prediction"]
    )

    print(f"{store}: MAE={mae}, WAPE={wape}%")

# Feature importance
importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
}).sort_values("importance", ascending=False)

print("\nTOP 10 IMPORTANT FEATURES")
print("-------------------------")
print(importance.head(10).to_string(index=False))
