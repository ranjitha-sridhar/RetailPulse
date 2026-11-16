
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

# Recalculate the same capacities used by the optimizer
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

# Validation checks
result["donor_safe"] = (
    result["outgoing_units"] <= result["safe_surplus"]
)

result["recipient_not_overfilled"] = (
    result["incoming_units"] <= result["transfer_need"]
)

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

# External replenishment requirements
external = result[
    result["external_replenishment"] > 0
][[
    "item_id",
    "store_id",
    "external_replenishment",
    "risk_level"
]].sort_values(
    "external_replenishment", ascending=False
)

external.to_csv(REPLENISHMENT_FILE, index=False)

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
print("\nTRANSFER VALIDATION REPORT")
print("=" * 40)

print(f"Total transfer units: {transfers['transfer_units'].sum()}")
print(f"Total outgoing units: {result['outgoing_units'].sum()}")
print(f"Total incoming units: {result['incoming_units'].sum()}")

print(
    f"\nValidation passed: "
    f"{result['validation_passed'].all()}"
)

print(
    f"Failed inventory checks: "
    f"{(~result['validation_passed']).sum()}"
)

print(
    f"Total external replenishment required: "
    f"{result['external_replenishment'].sum()}"
)

print("\nSTORE-WISE SUMMARY")
print(store_summary.to_string(index=False))

print("\nTOP 10 EXTERNAL REPLENISHMENT REQUIREMENTS")
print(external.head(10).to_string(index=False))

print("\nGenerated files:")
print(OUTPUT_FILE)
print(REPLENISHMENT_FILE)
print(STORE_SUMMARY_FILE)

# Diagnose failed validation rows
failed = result[~result["validation_passed"]].copy()

print("\nFAILED VALIDATION BREAKDOWN")
print("---------------------------")

print("Donor safe failures:",
      (~failed["donor_safe"]).sum())

print("Recipient overfilled failures:",
      (~failed["recipient_not_overfilled"]).sum())

print("Donor stock protection failures:",
      (~failed["donor_stock_protected"]).sum())

print("\nFAILED ROW DETAILS")

columns = [
    "item_id",
    "store_id",
    "on_hand_stock",
    "safe_surplus",
    "outgoing_units",
    "incoming_units",
    "transfer_need",
    "donor_safe",
    "recipient_not_overfilled",
    "donor_stock_protected"
]

print(failed[columns].to_string(index=False))
