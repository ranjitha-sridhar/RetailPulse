
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

df = pd.read_csv(DATA_DIR / "processed_sales.csv")

df["date"] = pd.to_datetime(df["date"])

print("\n========== DEMAND PATTERN ANALYSIS ==========")

results = []

for (store, item), group in df.groupby(
    ["store_id", "item_id"]
):

    sales = group["units_sold"]

    nonzero_days = (sales > 0).sum()
    total_days = len(sales)

    results.append({
        "store_id": store,
        "item_id": item,
        "avg_daily_demand": sales.mean(),
        "nonzero_days": nonzero_days,
        "zero_sales_pct": (sales == 0).mean() * 100,
        "demand_std": sales.std(),
        "demand_cv": (
            sales.std() / sales.mean()
            if sales.mean() > 0 else np.nan
        )
    })

analysis = pd.DataFrame(results)

print("\nDemand summary:")
print(analysis[
    ["avg_daily_demand", "zero_sales_pct", "demand_cv"]
].describe().round(2))

print("\n========== MOST INTERMITTENT PRODUCTS ==========")

print(
    analysis.sort_values(
        "zero_sales_pct", ascending=False
    ).head(15).round(2).to_string(index=False)
)

print("\n========== LEAST INTERMITTENT PRODUCTS ==========")

print(
    analysis.sort_values(
        "zero_sales_pct", ascending=True
    ).head(15).round(2).to_string(index=False)
)

print("\nAnalysis completed!")
