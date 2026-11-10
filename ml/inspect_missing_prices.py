
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "processed_sales.csv"

df = pd.read_csv(DATA_PATH, parse_dates=["date"])

# Find first and last dates with an available price
price_periods = (
    df[df["sell_price"].notna()]
    .groupby(["store_id", "item_id"])["date"]
    .agg(first_price_date="min", last_price_date="max")
    .reset_index()
)

df = df.merge(
    price_periods,
    on=["store_id", "item_id"],
    how="left"
)

missing = df[df["sell_price"].isna()].copy()

# Classify missing prices
missing["reason"] = "Internal or unavailable price"

missing.loc[
    missing["first_price_date"].isna(),
    "reason"
] = "No price records for this product-store"

missing.loc[
    missing["date"] < missing["first_price_date"],
    "reason"
] = "Before first recorded price"

missing.loc[
    missing["date"] > missing["last_price_date"],
    "reason"
] = "After last recorded price"

print("\n========== MISSING PRICE ANALYSIS ==========")

print("Total rows:", len(df))
print("Missing prices:", len(missing))
print("Missing percentage:", round(len(missing) / len(df) * 100, 2), "%")

print("\nMissing price categories:")
print(missing["reason"].value_counts())

print("\nMissing prices by store:")
print(
    missing.groupby("store_id").size()
)

print("\nMissing prices by product:")
print(
    missing.groupby("item_id").size()
    .sort_values(ascending=False)
    .head(10)
)

print("\nSample missing price records:")
print(
    missing[[
        "date", "store_id", "item_id",
        "units_sold", "first_price_date",
        "last_price_date", "reason"
    ]].head(15).to_string(index=False)
)
