
import pandas as pd
import numpy as np
import joblib

from pathlib import Path
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "ml" / "models"

print("Loading trained model and processed data...")

# Load trained XGBoost model
saved = joblib.load(MODEL_DIR / "demand_forecaster.pkl")
model = saved["model"]
features = saved["features"]

# Load historical sales and price information
df = pd.read_csv(
    DATA_DIR / "processed_sales.csv",
    low_memory=False
)

df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(
    ["store_id", "item_id", "date"]
).reset_index(drop=True)

# Reproduce the chronological split used during training
engineered = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)

engineered["date"] = pd.to_datetime(engineered["date"])
valid = engineered.dropna(subset=features)

dates = sorted(valid["date"].unique())
split_date = pd.Timestamp(dates[int(len(dates) * 0.8)])

print("Backtest starting date:", split_date.date())

forecast_end = split_date + pd.Timedelta(days=6)

results = []

group_cols = ["store_id", "item_id"]

print("\nGenerating recursive 7-day forecasts...")

for (store, item), group in df.groupby(group_cols):

    group = group.sort_values("date").reset_index(drop=True)

    # Only historical sales before the forecast begins
    history = group.loc[
        group["date"] < split_date,
        "units_sold"
    ].astype(float).tolist()

    # Actual records are used only for evaluation,
    # never as inputs for later recursive predictions.
    future = group[
        (group["date"] >= split_date)
        & (group["date"] <= forecast_end)
    ]

    if len(history) < 28 or len(future) != 7:
        continue

    for _, row in future.iterrows():

        # Construct features from history available so far
        feature_row = {
        "lag_1": history[-1],
        "lag_7": history[-7],
        "lag_14": history[-14],
        "lag_28": history[-28],

        "rolling_mean_7": np.mean(history[-7:]),
        "rolling_mean_28": np.mean(history[-28:]),
        "rolling_std_7": np.std(history[-7:], ddof=1),

        "day_of_week": row["date"].dayofweek,
        "month": row["date"].month,
        "day_of_month": row["date"].day,
        "is_weekend": int(row["date"].dayofweek in [5, 6]),
        "is_event": int(
            pd.notna(row["event_name_1"])
            and str(row["event_name_1"]) != "None"
            )
        }

        # Preserve the exact feature order used in training
        X = pd.DataFrame([feature_row])[features]

        prediction = float(model.predict(X)[0])
        prediction = max(0, prediction)

        # Seasonal-naive prediction: same weekday last week
        seasonal_prediction = history[-7]

        actual = float(row["units_sold"])

        results.append({
            "store_id": store,
            "item_id": item,
            "date": row["date"],
            "forecast_horizon": (
                row["date"] - split_date
            ).days + 1,
            "actual_sales": actual,
            "predicted_sales": prediction,
            "seasonal_prediction": seasonal_prediction,
        })

        # Critical: feed the prediction into the next day's history
        history.append(prediction)

# Save forecasts
forecast_df = pd.DataFrame(results)

output_path = DATA_DIR / "forecast_7day_backtest.csv"
forecast_df.to_csv(output_path, index=False)

print("\n7-DAY FORECAST GENERATED")
print("------------------------")
print("Forecast records:", len(forecast_df))
print("Products:", forecast_df["item_id"].nunique())
print("Stores:", forecast_df["store_id"].nunique())

# Evaluate each forecast horizon independently
print("\nHORIZON-WISE PERFORMANCE")
print("------------------------")

for horizon, group in forecast_df.groupby("forecast_horizon"):

    actual = group["actual_sales"].to_numpy()
    predicted = group["predicted_sales"].to_numpy()

    mae = mean_absolute_error(actual, predicted)

    denominator = actual.sum()
    wape = (
        np.abs(actual - predicted).sum() / denominator * 100
        if denominator != 0 else np.nan
    )

    print(
        f"Day {horizon}: "
        f"MAE={mae:.4f}, WAPE={wape:.2f}%"
    )

# Overall 7-day performance
actual = forecast_df["actual_sales"].to_numpy()
predicted = forecast_df["predicted_sales"].to_numpy()

overall_mae = mean_absolute_error(actual, predicted)

overall_wape = (
    np.abs(actual - predicted).sum()
    / actual.sum()
) * 100

print("\nOVERALL 7-DAY PERFORMANCE")
print("-------------------------")
print("MAE:", round(overall_mae, 4))
print("WAPE:", round(overall_wape, 2), "%")

print("\nSaved to:", output_path)
print("\n7-DAY MODEL COMPARISON")
print("----------------------")

for name, column in [
    ("Seasonal Naive", "seasonal_prediction"),
    ("XGBoost", "predicted_sales")
]:
    actual = forecast_df["actual_sales"].to_numpy()
    predicted = forecast_df[column].to_numpy()

    mae = mean_absolute_error(actual, predicted)

    wape = (
        np.abs(actual - predicted).sum()
        / actual.sum()
    ) * 100

    print(f"{name}: MAE={mae:.4f}, WAPE={wape:.2f}%")