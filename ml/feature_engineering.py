
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

print("Loading processed dataset...")

df = pd.read_csv(DATA_DIR / "processed_sales.csv")
df["date"] = pd.to_datetime(df["date"])

# Sort chronologically for each product-store combination
df = df.sort_values(
    ["store_id", "item_id", "date"]
).reset_index(drop=True)

group_cols = ["store_id", "item_id"]

print("Creating lag features...")

# Previous sales values
for lag in [1, 7, 14, 28]:
    df[f"lag_{lag}"] = (
        df.groupby(group_cols)["units_sold"].shift(lag)
    )

print("Creating rolling statistics...")

# Shift by one day to prevent current-day sales leakage
df["rolling_mean_7"] = (
    df.groupby(group_cols)["units_sold"]
    .transform(lambda x: x.shift(1).rolling(7).mean())
)

df["rolling_mean_28"] = (
    df.groupby(group_cols)["units_sold"]
    .transform(lambda x: x.shift(1).rolling(28).mean())
)

df["rolling_std_7"] = (
    df.groupby(group_cols)["units_sold"]
    .transform(lambda x: x.shift(1).rolling(7).std())
)

print("Creating date features...")

df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["year"] = df["date"].dt.year
df["day_of_month"] = df["date"].dt.day

df["is_weekend"] = (
    df["day_of_week"].isin([5, 6]).astype(int)
)

df["is_event"] = (
    df["event_name_1"].ne("None").astype(int)
)

# Save engineered dataset
output_path = DATA_DIR / "feature_engineered.csv"
df.to_csv(output_path, index=False)

print("\nFeature engineering completed!")
print("Final shape:", df.shape)

print("\nNew features:")
print([
    "lag_1", "lag_7", "lag_14", "lag_28",
    "rolling_mean_7", "rolling_mean_28",
    "rolling_std_7", "day_of_week",
    "month", "year", "day_of_month",
    "is_weekend", "is_event"
])

print("\nMissing values in engineered features:")
feature_cols = [
    "lag_1", "lag_7", "lag_14", "lag_28",
    "rolling_mean_7", "rolling_mean_28",
    "rolling_std_7"
]
print(df[feature_cols].isna().sum())
