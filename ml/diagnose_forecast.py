
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

df = pd.read_csv(DATA_DIR / "forecast_7day_backtest.csv")

df["abs_error"] = (
    df["actual_sales"] - df["predicted_sales"]
).abs()

df["error"] = (
    df["predicted_sales"] - df["actual_sales"]
)

print("\n========== STORE-WISE PERFORMANCE ==========")

store_results = df.groupby("store_id").agg(
    actual=("actual_sales", "sum"),
    predicted=("predicted_sales", "sum"),
    abs_error=("abs_error", "sum")
)

store_results["WAPE"] = (
    store_results["abs_error"] /
    store_results["actual"] * 100
)

print(store_results.round(2))

print("\n========== TOP 10 MOST DIFFICULT PRODUCTS ==========")

product_results = df.groupby(
    ["store_id", "item_id"]
).agg(
    actual=("actual_sales", "sum"),
    predicted=("predicted_sales", "sum"),
    abs_error=("abs_error", "sum"),
    MAE=("abs_error", "mean")
)

product_results = product_results[
    product_results["actual"] > 0
].copy()

product_results["WAPE"] = (
    product_results["abs_error"] /
    product_results["actual"] * 100
)

print(
    product_results.sort_values(
        "WAPE", ascending=False
    ).head(10).round(2)
)

print("\n========== OVERALL PREDICTION BIAS ==========")

actual_total = df["actual_sales"].sum()
predicted_total = df["predicted_sales"].sum()

print("Actual total demand:", round(actual_total, 2))
print("Predicted total demand:", round(predicted_total, 2))
print(
    "Prediction bias:",
    round(predicted_total - actual_total, 2)
)

print(
    "Percentage bias:",
    round(
        (predicted_total - actual_total) /
        actual_total * 100, 2
    ), "%"
)

print("\n========== ZERO-DEMAND ANALYSIS ==========")

print(
    "Actual zero-sales records:",
    (df["actual_sales"] == 0).sum()
)

print(
    "Predicted zero-sales records:",
    (df["predicted_sales"] == 0).sum()
)

print("\nDiagnostics completed!")
