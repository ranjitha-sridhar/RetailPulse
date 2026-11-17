
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

df = pd.read_csv(DATA_DIR / "processed_sales.csv")
df["date"] = pd.to_datetime(df["date"])

# Reproduce the original training split
features = [
    "lag_1", "lag_7", "lag_14", "lag_28",
    "rolling_mean_7", "rolling_mean_28",
    "rolling_std_7", "day_of_week", "month",
    "day_of_month", "is_weekend", "is_event"
]

engineered = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)

engineered["date"] = pd.to_datetime(engineered["date"])
valid = engineered.dropna(subset=features)

dates = sorted(valid["date"].unique())
split_date = pd.Timestamp(dates[int(len(dates) * 0.8)])

print("Training cutoff:", split_date.date())

# Use training period only
train = df[df["date"] < split_date].copy()

results = []

for (store, item), group in train.groupby(
    ["store_id", "item_id"]
):
    sales = group["units_sold"].to_numpy()

    positive = sales[sales > 0]

    if len(positive) == 0:
        continue

    adi = len(sales) / len(positive)

    cv_squared = (
        (np.std(positive, ddof=1) / np.mean(positive)) ** 2
        if len(positive) > 1 else 0
    )

    if adi < 1.32:
        category = (
            "Smooth" if cv_squared < 0.49 else "Erratic"
        )
    else:
        category = (
            "Intermittent" if cv_squared < 0.49 else "Lumpy"
        )

    results.append({
        "store_id": store,
        "item_id": item,
        "ADI": adi,
        "CV_squared": cv_squared,
        "category": category
    })

result = pd.DataFrame(results)

print("\n========== DEMAND CLASSIFICATION ==========")

print(
    result["category"]
    .value_counts()
    .to_string()
)

print("\n========== CATEGORY PERCENTAGES ==========")

print(
    (result["category"].value_counts(normalize=True) * 100)
    .round(2)
    .to_string()
)

print("\n========== PRODUCT DETAILS ==========")

print(
    result.sort_values(
        ["category", "ADI"],
        ascending=[True, False]
    ).to_string(index=False)
)

result.to_csv(
    DATA_DIR / "demand_classification.csv",
    index=False
)

print("\nSaved demand classification successfully!")
