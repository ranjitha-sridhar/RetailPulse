import pandas as pd
import numpy as np

from pathlib import Path
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

print("Loading sales data...")

sales = pd.read_csv(
    DATA_DIR / "processed_sales.csv",
    low_memory=False
)

sales["date"] = pd.to_datetime(sales["date"])

# Use the same chronological split as our XGBoost experiments
engineered = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)

engineered["date"] = pd.to_datetime(engineered["date"])

features = [
    "lag_1", "lag_7", "lag_14", "lag_28",
    "rolling_mean_7", "rolling_mean_28", "rolling_std_7",
    "day_of_week", "month", "day_of_month",
    "is_weekend", "is_event"
]

engineered = engineered.dropna(subset=features)

dates = sorted(engineered["date"].unique())
split_date = dates[int(len(dates) * 0.8)]

print("Split date:", split_date)


def croston_forecast(history, alpha=0.1):
    demand = np.asarray(history, dtype=float)

    nonzero_positions = np.where(demand > 0)[0]

    if len(nonzero_positions) == 0:
        return 0.0, 0.0

    first_position = nonzero_positions[0]

    demand_size = demand[first_position]
    interval = first_position + 1

    previous_position = first_position

    for position in nonzero_positions[1:]:
        current_demand = demand[position]
        current_interval = position - previous_position

        demand_size = (
            alpha * current_demand
            + (1 - alpha) * demand_size
        )

        interval = (
            alpha * current_interval
            + (1 - alpha) * interval
        )

        previous_position = position

    croston = demand_size / interval

    # SBA bias correction
    sba = (1 - alpha / 2) * croston

    return croston, sba


results = []

print("\nGenerating Croston forecasts...")

for (store, item), group in sales.groupby(
    ["store_id", "item_id"]
):
    group = group.sort_values("date").reset_index(drop=True)

    history_rows = group[group["date"] < split_date]
    future_rows = group[group["date"] >= split_date].head(7)

    history = history_rows["units_sold"].astype(float).tolist()

    if len(history) < 28 or len(future_rows) != 7:
        continue

    croston_prediction, sba_prediction = croston_forecast(history)
    for _, row in future_rows.iterrows():
        results.append({
        "store_id": store,
        "item_id": item,
        "date": row["date"],
        "actual": float(row["units_sold"]),
        "croston": croston_prediction,
        "sba": sba_prediction
    })


results_df = pd.DataFrame(results)

results_df.to_csv(
    DATA_DIR / "forecast_7day_croston_sba.csv",
    index=False
)

actual = results_df["actual"].to_numpy()

for model_name in ["croston", "sba"]:

    predicted = results_df[model_name].to_numpy()

    mae = mean_absolute_error(actual, predicted)

    wape = (
        np.abs(actual - predicted).sum()
        / actual.sum()
    ) * 100

    print(f"\n{model_name.upper()} RESULTS")
    print("-----------------------")
    print("MAE:", round(mae, 4))
    print("WAPE:", round(wape, 2), "%")

print("\nSaved forecast to forecast_7day_croston_sba.csv")