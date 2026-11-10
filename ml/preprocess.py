
import pandas as pd
from pathlib import Path

# Resolve paths relative to this script
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

print("Loading datasets...")

sales = pd.read_csv(DATA_DIR / "sales_train_validation.csv")
calendar = pd.read_csv(DATA_DIR / "calendar.csv")
prices = pd.read_csv(DATA_DIR / "sell_prices.csv")

# Select three stores
selected_stores = ["CA_1", "TX_1", "WI_1"]

sales = sales[sales["store_id"].isin(selected_stores)].copy()

# Select top 100 products by total historical sales
day_columns = [col for col in sales.columns if col.startswith("d_")]

product_sales = (
    sales.groupby("item_id")[day_columns]
    .sum()
    .sum(axis=1)
    .sort_values(ascending=False)
)

selected_products = product_sales.head(100).index

sales = sales[sales["item_id"].isin(selected_products)].copy()

print("Selected stores:", len(selected_stores))
print("Selected products:", len(selected_products))

# Convert wide sales format to long format
sales_long = sales.melt(
    id_vars=[
        "id", "item_id", "dept_id",
        "cat_id", "store_id", "state_id"
    ],
    value_vars=day_columns,
    var_name="d",
    value_name="units_sold"
)

print("Sales converted to long format.")

# Merge calendar information
data = sales_long.merge(
    calendar,
    on="d",
    how="left"
)

# Merge selling prices
data = data.merge(
    prices,
    on=["store_id", "item_id", "wm_yr_wk"],
    how="left"
)

# Convert date
data["date"] = pd.to_datetime(data["date"])

# Sort records
data = data.sort_values(
    ["store_id", "item_id", "date"]
).reset_index(drop=True)

# Fill missing event names
event_columns = [
    "event_name_1", "event_type_1",
    "event_name_2", "event_type_2"
]

for col in event_columns:
    data[col] = data[col].fillna("None")
# Identify whether the product was available in the store
data["is_available"] = data["sell_price"].notna().astype(int)

# Fill missing prices with 0
# is_available distinguishes unavailable products from genuinely priced products
data["sell_price"] = data["sell_price"].fillna(0)

# Missing selling prices remain NaN for now.
# We will investigate them before model training.

# Save processed dataset
output_path = DATA_DIR / "processed_sales.csv"
data.to_csv(output_path, index=False)

print("\n========== PREPROCESSING SUMMARY ==========")
print("Final shape:", data.shape)
print("Unique products:", data["item_id"].nunique())
print("Unique stores:", data["store_id"].nunique())
print("Date range:", data["date"].min(), "to", data["date"].max())
print("Missing prices:", data["sell_price"].isna().sum())
print("Missing sales:", data["units_sold"].isna().sum())

print("\nSample processed records:")
print(data[[
    "date", "store_id", "item_id",
    "units_sold", "sell_price"
]].head())

print("\nPreprocessing completed!")
