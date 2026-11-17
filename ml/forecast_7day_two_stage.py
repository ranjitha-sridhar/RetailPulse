import pandas as pd
import numpy as np
import joblib

from pathlib import Path
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "ml" / "models"

print("Loading two-stage model...")

saved = joblib.load(
    MODEL_DIR / "two_stage_demand_forecaster.pkl"
)

classifier = saved["classifier"]
regressor = saved["regressor"]
features = saved["features"]

print("Loading data...")

sales = pd.read_csv(
    DATA_DIR / "processed_sales.csv",
    low_memory=False
)

engineered = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)

sales["date"] = pd.to_datetime(sales["date"])
engineered["date"] = pd.to_datetime(engineered["date"])

# Reproduce the original chronological split
engineered = engineered.dropna(subset=features)
dates = sorted(engineered["date"].unique())
split_date = dates[int(len(dates) * 0.8)]

print("Split date:", split_date)

results = []

print("\nGenerating recursive seven-day forecasts...")

for (store, item), group in sales.groupby(
    ["store_id", "item_id"]
):
    group = group.sort_values("date").reset_index(drop=True)

    history_rows = group[group["date"] < split_date]
    future_rows = group[group["date"] >= split_date].head(7)

    history = history_rows["units_sold"].astype(float).tolist()

    if len(history) < 28 or len(future_rows) != 7:
        continue

    # Actual sales lookup for the seasonal-naive baseline
    actual_lookup = dict(
        zip(group["date"], group["units_sold"])
    )

    for _, row in future_rows.iterrows():

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

        X = pd.DataFrame([feature_row])[features]

        # Stage 1: Probability of a sale
        sale_probability = classifier.predict_proba(X)[0, 1]

        # Stage 2: Expected quantity if a sale occurs
        positive_quantity = max(
            regressor.predict(X)[0],
            0
        )

        # Combined expected demand
        prediction = sale_probability * positive_quantity

        actual = float(row["units_sold"])

        # Same weekday from the previous week
        previous_week_date = row["date"] - pd.Timedelta(days=7)
        seasonal_naive = float(
            actual_lookup.get(previous_week_date, history[-7])
        )

        results.append({
            "store_id": store,
            "item_id": item,
            "date": row["date"],
            "day": (row["date"] - split_date).days + 1,
            "actual": actual,
            "predicted": prediction,
            "seasonal_naive": seasonal_naive
        })

        # Feed the prediction, NOT actual sales, into next day's history
        history.append(prediction)


results_df = pd.DataFrame(results)

results_df.to_csv(
    DATA_DIR / "forecast_7day_two_stage.csv",
    index=False
)

# Overall evaluation
actual = results_df["actual"].to_numpy()
predicted = results_df["predicted"].to_numpy()
naive = results_df["seasonal_naive"].to_numpy()

mae = mean_absolute_error(actual, predicted)
wape = np.abs(actual - predicted).sum() / actual.sum() * 100

naive_mae = mean_absolute_error(actual, naive)
naive_wape = np.abs(actual - naive).sum() / actual.sum() * 100

print("\nTWO-STAGE SEVEN-DAY RESULTS")
print("---------------------------")
print("Forecast rows:", len(results_df))
print("MAE:", round(mae, 4))
print("WAPE:", round(wape, 2), "%")

print("\nSEASONAL NAIVE BASELINE")
print("-----------------------")
print("MAE:", round(naive_mae, 4))
print("WAPE:", round(naive_wape, 2), "%")

print("\nDAY-WISE PERFORMANCE")

for day, day_df in results_df.groupby("day"):
    day_actual = day_df["actual"].to_numpy()
    day_predicted = day_df["predicted"].to_numpy()

    day_mae = mean_absolute_error(day_actual, day_predicted)
    day_wape = (
        np.abs(day_actual - day_predicted).sum()
        / day_actual.sum()
    ) * 100

    print(
        f"Day {day}: "
        f"MAE = {day_mae:.4f}, "
        f"WAPE = {day_wape:.2f}%"
    )

print("\nSaved forecast to forecast_7day_two_stage.csv")