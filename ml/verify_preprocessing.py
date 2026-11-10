import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

df = pd.read_csv(ROOT / "ml/data/processed_sales.csv")

print("Dataset shape:", df.shape)

print("\nAvailability counts:")
print(df["is_available"].value_counts())

print("\nMissing values:")
print(df[["sell_price", "is_available", "units_sold"]].isna().sum())

print("\nSales when unavailable:")
print(df[df["is_available"] == 0]["units_sold"].sum())