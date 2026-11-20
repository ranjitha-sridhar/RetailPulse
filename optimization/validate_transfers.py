from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

INVENTORY_FILE = ROOT / "ml" / "data" / "inventory_analysis.csv"
TRANSFER_FILE = ROOT / "optimization" / "transfer_recommendations.csv"

OUTPUT_FILE = ROOT / "optimization" / "transfer_validation.csv"
REPLENISHMENT_FILE = ROOT / "optimization" / "external_replenishment.csv"
STORE_SUMMARY_FILE = ROOT / "optimization" / "store_transfer_summary.csv"

# Load data
inventory = pd.read_csv(INVENTORY_FILE, low_memory=False)
transfers = pd.read_csv(TRANSFER_FILE)

# Recalculate safe surplus and transfer need
inventory["safe_surplus"] = (
    inventory["on_hand_stock"]
    - inventory["lead_time_demand"]
    - inventory["safety_stock"]
).clip(lower=0).apply(int)

inventory["transfer_need"] = (
    inventory["reorder_quantity"]
).clip(lower=0).apply(int)

# Aggregate outgoing and incoming transfers per product and store
outgoing = (
    transfers.groupby(["item_id", "from_store"])["transfer_units"]
    .sum()
    .reset_index()
    .rename(columns={
        "from_store": "store_id",
        "transfer_units": "outgoing_units"
    })
)

incoming = (
    transfers.groupby(["item_id", "to_store"])["transfer_units"]
    .sum()
    .reset_index()
    .rename(columns={
        "to_store": "store_id",
        "transfer_units": "incoming_units"
    })
)

# Merge transfer data with original inventory
result = inventory.merge(
    outgoing, on=["item_id", "store_id"], how="left"
).merge(
    incoming, on=["item_id", "store_id"], how="left"
)

result[["outgoing_units", "incoming_units"]] = (
    result[["outgoing_units", "incoming_units"]].fillna(0).astype(int)
)

# Calculate stock after transfers
result["stock_after_transfer"] = (
    result["on_hand_stock"]
    - result["outgoing_units"]
    + result["incoming_units"]
)

# Remaining replenishment requirement
result["external_replenishment"] = (
    result["transfer_need"] - result["incoming_units"]
).clip(lower=0)

# Validation checks:
# 1. Donor cannot transfer more than its safe surplus
result["donor_safe"] = (
    result["outgoing_units"] <= result["safe_surplus"]
)

# 2. Recipient cannot receive more than its replenishment requirement
result["recipient_not_overfilled"] = (
    result["incoming_units"] <= result["transfer_need"]
)

# 3. Donor stock after transfer preserves lead time demand + safety stock
result["donor_stock_protected"] = (
    (result["outgoing_units"] == 0) |
    (
        result["on_hand_stock"] - result["outgoing_units"]
        >= result["lead_time_demand"] + result["safety_stock"]
    )
)

result["validation_passed"] = (
    result["donor_safe"]
    & result["recipient_not_overfilled"]
    & result["donor_stock_protected"]
)

# Save detailed validation
result.to_csv(OUTPUT_FILE, index=False)

# Store-level summary
store_summary = result.groupby("store_id").agg(
    outgoing_units=("outgoing_units", "sum"),
    incoming_units=("incoming_units", "sum"),
    external_replenishment=("external_replenishment", "sum")
).reset_index()

store_summary["net_transfer"] = (
    store_summary["incoming_units"]
    - store_summary["outgoing_units"]
)

store_summary.to_csv(STORE_SUMMARY_FILE, index=False)

# Final report
print("\n4-STORE TRANSFER VALIDATION REPORT")
print("=" * 45)
print(f"Total transfer units: {transfers['transfer_units'].sum()}")
print(f"Total outgoing units: {result['outgoing_units'].sum()}")
print(f"Total incoming units: {result['incoming_units'].sum()}")
print(f"All validation checks passed: {result['validation_passed'].all()}")
print(f"Failed inventory checks: {(~result['validation_passed']).sum()}")
print(f"Total external replenishment required: {result['external_replenishment'].sum()}")
print("\nSTORE-WISE TRANSFER SUMMARY:")
print(store_summary.to_string(index=False))
