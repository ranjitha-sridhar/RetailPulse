
import pandas as pd
import numpy as np
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

print("Loading sales and forecast data...")

sales = pd.read_csv(
    DATA_DIR / "processed_sales.csv",
    low_memory=False
)

forecasts = pd.read_csv(
    DATA_DIR / "forecast_7day_backtest.csv"
)

sales["date"] = pd.to_datetime(sales["date"])
forecasts["date"] = pd.to_datetime(forecasts["date"])

# Forecast period and inventory snapshot
forecast_start = forecasts["date"].min()
snapshot_date = forecast_start - pd.Timedelta(days=1)

# Calculate recent average daily demand
recent_sales = sales[
    (sales["date"] <= snapshot_date) &
    (sales["date"] >= snapshot_date - pd.Timedelta(days=27))
]

average_demand = (
    recent_sales.groupby(["store_id", "item_id"])["units_sold"]
    .mean()
    .reset_index(name="avg_daily_demand")
)

# Aggregate forecast demand over the next 7 days
forecast_7d = (
    forecasts.groupby(["store_id", "item_id"])
    .agg(
        forecast_7d_demand=("predicted_sales", "sum"),
        lead_time_demand=("predicted_sales",
                          lambda x: x.iloc[:3].sum())
    )
    .reset_index()
)

# Combine historical demand and forecasts
inventory = average_demand.merge(
    forecast_7d,
    on=["store_id", "item_id"],
    how="inner"
)

# Avoid zero-demand items causing zero inventory assumptions
inventory["avg_daily_demand"] = (
    inventory["avg_daily_demand"].clip(lower=0.1)
)

# Create reproducible synthetic starting inventory
rng = np.random.default_rng(42)

inventory["stock_coverage_days"] = rng.uniform(
    3, 24, size=len(inventory)
)

inventory["on_hand_stock"] = np.ceil(
    inventory["avg_daily_demand"] *
    inventory["stock_coverage_days"]
).astype(int)

# Inventory planning assumptions
LEAD_TIME_DAYS = 3
REVIEW_PERIOD_DAYS = 7
SAFETY_STOCK_DAYS = 2

inventory["safety_stock"] = np.ceil(
    inventory["avg_daily_demand"] *
    SAFETY_STOCK_DAYS
)

inventory["target_stock"] = np.ceil(
    inventory["avg_daily_demand"] *
    (LEAD_TIME_DAYS + REVIEW_PERIOD_DAYS + SAFETY_STOCK_DAYS)
)

# Projected stock after the 7-day forecast
inventory["projected_stock"] = (
    inventory["on_hand_stock"] -
    inventory["forecast_7d_demand"]
)

# Detect stockout risk
inventory["stockout_risk"] = (
    inventory["on_hand_stock"] <
    inventory["lead_time_demand"] +
    inventory["safety_stock"]
)

# Classify risk levels
inventory["risk_level"] = np.select(
    [
        inventory["on_hand_stock"] <
        inventory["lead_time_demand"],

        inventory["stockout_risk"]
    ],
    ["High", "Medium"],
    default="Low"
)

# Detect excess inventory after forecast demand
inventory["excess_units"] = np.maximum(
    0,
    np.floor(
        inventory["projected_stock"] -
        inventory["target_stock"]
    )
).astype(int)

# Calculate suggested reorder quantity
inventory["reorder_quantity"] = np.maximum(
    0,
    np.ceil(
        inventory["target_stock"] -
        inventory["projected_stock"]
    )
).astype(int)

# Suggested action
inventory["recommendation"] = np.select(
    [
        inventory["risk_level"] == "High",
        inventory["risk_level"] == "Medium",
        inventory["excess_units"] > 0
    ],
    [
        "Urgent replenishment",
        "Monitor and replenish",
        "Potential transfer surplus"
    ],
    default="Stock sufficient"
)

# Mark the inventory source explicitly
inventory["inventory_source"] = "Synthetic scenario"

inventory["risk_gap"] = (
    inventory["lead_time_demand"]
    + inventory["safety_stock"]
    - inventory["on_hand_stock"]
)

inventory["risk_gap"] = inventory["risk_gap"].clip(lower=0)

# Save results
output_path = DATA_DIR / "inventory_analysis.csv"
inventory.to_csv(output_path, index=False)

print("\nINVENTORY ANALYSIS COMPLETE")
print("---------------------------")
print("Products:", inventory["item_id"].nunique())
print("Stores:", inventory["store_id"].nunique())
print("Records:", len(inventory))

print("\nRISK DISTRIBUTION")
print(inventory["risk_level"].value_counts())

print("\nRECOMMENDATION DISTRIBUTION")
print(inventory["recommendation"].value_counts())

print("\nTOP 10 STOCKOUT RISKS")

print(
    inventory.sort_values(
        ["risk_gap", "reorder_quantity"],
        ascending=False
    )[
        [
            "store_id",
            "item_id",
            "on_hand_stock",
            "lead_time_demand",
            "safety_stock",
            "risk_gap",
            "risk_level",
            "reorder_quantity"
        ]
    ].head(10).to_string(index=False)
)

print("\nSaved to:", output_path)
