"""
Build 4-Store Inventory Dataset for RetailPulse
Expands inventory dataset from 3 stores (CA_1, TX_1, WI_1) to 4 stores (adding CA_2).
For CA_2, data is clearly labelled as 'Simulated scenario (CA_2 expansion)'
in strict accordance with user guidelines (no fabricated historical sales data claimed).
"""

from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"

print("Loading existing 3-store inventory data...")
existing_inv = pd.read_csv(DATA_DIR / "inventory_analysis.csv")

# Extract the unique 100 items
items = existing_inv["item_id"].unique()
print(f"Loaded {len(items)} items from existing inventory.")

# Planning parameters
LEAD_TIME_DAYS = 3
REVIEW_PERIOD_DAYS = 7
SAFETY_STOCK_DAYS = 2

# Check if CA_2 is already present
if "CA_2" not in existing_inv["store_id"].values:
    print("Generating simulated inventory for CA_2 (expansion store)...")

    # We calibrate CA_2 demand based on CA_1 with realistic regional variation
    ca1_data = existing_inv[existing_inv["store_id"] == "CA_1"].set_index("item_id")

    rng = np.random.default_rng(2026)

    ca2_rows = []
    for item in items:
        ca1_row = ca1_data.loc[item]
        base_demand = float(ca1_row["avg_daily_demand"])
        # Slight variation for store 2 (e.g. 0.85 to 1.15 multiplier)
        multiplier = rng.uniform(0.85, 1.15)
        ca2_avg_daily_demand = max(0.1, round(base_demand * multiplier, 2))

        # 7-day demand forecast
        ca2_forecast_7d = round(ca2_avg_daily_demand * 7, 2)
        ca2_lead_time_demand = round(ca2_avg_daily_demand * LEAD_TIME_DAYS, 2)

        # Coverage days: vary between 2 and 22 days to create realistic surplus and shortage
        coverage_days = rng.uniform(2.5, 22.0)
        ca2_on_hand = int(np.ceil(ca2_avg_daily_demand * coverage_days))

        ca2_safety_stock = int(np.ceil(ca2_avg_daily_demand * SAFETY_STOCK_DAYS))
        ca2_target_stock = int(np.ceil(ca2_avg_daily_demand * (LEAD_TIME_DAYS + REVIEW_PERIOD_DAYS + SAFETY_STOCK_DAYS)))

        ca2_projected_stock = ca2_on_hand - ca2_forecast_7d
        ca2_stockout_risk = ca2_on_hand < (ca2_lead_time_demand + ca2_safety_stock)

        if ca2_on_hand < ca2_lead_time_demand:
            ca2_risk_level = "High"
        elif ca2_stockout_risk:
            ca2_risk_level = "Medium"
        else:
            ca2_risk_level = "Low"

        ca2_excess_units = max(0, int(np.floor(ca2_projected_stock - ca2_target_stock)))
        ca2_reorder_quantity = max(0, int(np.ceil(ca2_target_stock - ca2_projected_stock)))

        if ca2_risk_level == "High":
            ca2_rec = "Urgent replenishment"
        elif ca2_risk_level == "Medium":
            ca2_rec = "Monitor and replenish"
        elif ca2_excess_units > 0:
            ca2_rec = "Potential transfer surplus"
        else:
            ca2_rec = "Stock sufficient"

        ca2_risk_gap = max(0.0, float(ca2_lead_time_demand + ca2_safety_stock - ca2_on_hand))

        ca2_rows.append({
            "store_id": "CA_2",
            "item_id": item,
            "avg_daily_demand": ca2_avg_daily_demand,
            "forecast_7d_demand": ca2_forecast_7d,
            "lead_time_demand": ca2_lead_time_demand,
            "stock_coverage_days": round(coverage_days, 2),
            "on_hand_stock": ca2_on_hand,
            "safety_stock": ca2_safety_stock,
            "target_stock": ca2_target_stock,
            "projected_stock": round(ca2_projected_stock, 2),
            "stockout_risk": ca2_stockout_risk,
            "risk_level": ca2_risk_level,
            "excess_units": ca2_excess_units,
            "reorder_quantity": ca2_reorder_quantity,
            "recommendation": ca2_rec,
            "inventory_source": "Simulated scenario (CA_2 expansion)",
            "risk_gap": round(ca2_risk_gap, 2)
        })

    ca2_df = pd.DataFrame(ca2_rows)
    combined_inv = pd.concat([existing_inv, ca2_df], ignore_index=True)
else:
    print("CA_2 is already in inventory dataset.")
    combined_inv = existing_inv

# Add standardized columns for Part 2 requirements:
# Required stock = Forecasted demand over planning horizon (7d) + Safety stock
# Surplus = max(Available inventory - Required stock, 0)
# Shortage = max(Required stock - Available inventory, 0)
# Transferable surplus = max(on_hand_stock - lead_time_demand - safety_stock, 0)
# Inventory status: Overstocked, Healthy, Understocked

combined_inv["required_stock"] = (combined_inv["forecast_7d_demand"] + combined_inv["safety_stock"]).apply(np.ceil).astype(int)
combined_inv["surplus"] = np.maximum(0, combined_inv["on_hand_stock"] - combined_inv["required_stock"]).astype(int)
combined_inv["shortage"] = np.maximum(0, combined_inv["required_stock"] - combined_inv["on_hand_stock"]).astype(int)
combined_inv["transferable_surplus"] = np.maximum(0, combined_inv["on_hand_stock"] - (combined_inv["lead_time_demand"] + combined_inv["safety_stock"]).apply(np.ceil)).astype(int)

# Health classification
conditions = [
    combined_inv["on_hand_stock"] > combined_inv["target_stock"],
    combined_inv["on_hand_stock"] < combined_inv["required_stock"]
]
choices = ["Overstocked", "Understocked"]
combined_inv["inventory_status"] = np.select(conditions, choices, default="Healthy")

# Save expanded inventory dataset
output_path = DATA_DIR / "inventory_analysis.csv"
combined_inv.to_csv(output_path, index=False)

print("\n4-STORE INVENTORY DATASET CREATED SUCCESSFULLY")
print("=" * 45)
print(f"Total records: {len(combined_inv)}")
print(f"Stores: {combined_inv['store_id'].unique().tolist()}")
print(f"Items per store: {combined_inv.groupby('store_id')['item_id'].count().to_dict()}")
print("\nInventory Status Distribution:")
print(combined_inv.groupby(["store_id", "inventory_status"]).size().unstack(fill_value=0))
print(f"\nSaved to: {output_path}")
