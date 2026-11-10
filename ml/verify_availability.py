
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv(ROOT / "ml/data/processed_sales.csv")

missing = df[df["sell_price"].isna()]

print("Missing-price records:", len(missing))

print("\nSales distribution for missing-price records:")
print(missing["units_sold"].describe())

print("\nNon-zero sales despite missing prices:")
print((missing["units_sold"] > 0).sum())

print("\nRecords with zero sales:")
print((missing["units_sold"] == 0).sum())

print("\nAvailability distribution:")
print(df["sell_price"].notna().value_counts())
