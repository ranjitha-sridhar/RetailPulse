
from pathlib import Path

import pandas as pd
from ortools.sat.python import cp_model


# Project paths
ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = ROOT / "ml" / "data" / "inventory_analysis.csv"
OUTPUT_FILE = ROOT / "optimization" / "transfer_recommendations.csv"

inventory = pd.read_csv(INPUT_FILE, low_memory=False)

# Calculate how much stock each store can safely transfer
inventory["transferable_surplus"] = (
    inventory["on_hand_stock"]
    - inventory["lead_time_demand"]
    - inventory["safety_stock"]
).clip(lower=0).apply(int)

# Replenishment need at each store
inventory["transfer_need"] = (
    inventory["reorder_quantity"]
).clip(lower=0).apply(int)

all_transfers = []
unmet_records = []

# Optimize separately for each product
for item_id, group in inventory.groupby("item_id"):

    donors = group[group["transferable_surplus"] > 0]
    recipients = group[group["transfer_need"] > 0]

    if recipients.empty:
            continue

    if donors.empty:
        for _, recipient in recipients.iterrows():
            unmet_records.append({
                "item_id": item_id,
                "store_id": recipient["store_id"],
                "unmet_units": int(recipient["transfer_need"])
            })
        continue
    model = cp_model.CpModel()

    # Transfer quantity from each donor to each recipient
    transfer_vars = {}

    for donor_idx, donor in donors.iterrows():
        for recipient_idx, recipient in recipients.iterrows():

            if donor["store_id"] == recipient["store_id"]:
                continue

            transfer_vars[(donor_idx, recipient_idx)] = model.NewIntVar(
                0,
                int(donor["transferable_surplus"]),
                f"transfer_{donor_idx}_{recipient_idx}"
            )

    # Unmet replenishment need at each recipient
    unmet_vars = {}

    for recipient_idx, recipient in recipients.iterrows():
        unmet_vars[recipient_idx] = model.NewIntVar(
            0,
            int(recipient["transfer_need"]),
            f"unmet_{recipient_idx}"
        )

    # Donors cannot transfer more than their safe surplus
    for donor_idx, donor in donors.iterrows():
        outgoing = [
            var for (d, r), var in transfer_vars.items()
            if d == donor_idx
        ]

        if outgoing:
            model.Add(
                sum(outgoing) <= int(donor["transferable_surplus"])
            )

    # Incoming transfers + unmet need must equal recipient need
    for recipient_idx, recipient in recipients.iterrows():
        incoming = [
            var for (d, r), var in transfer_vars.items()
            if r == recipient_idx
        ]

        model.Add(
            sum(incoming) + unmet_vars[recipient_idx]
            == int(recipient["transfer_need"])
        )

    # Prioritize meeting demand; minimize units transferred
    model.Minimize(
        1000 * sum(unmet_vars.values())
        + sum(transfer_vars.values())
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 42

    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        continue

    # Collect recommended transfers
    for (donor_idx, recipient_idx), var in transfer_vars.items():

        quantity = solver.Value(var)

        if quantity > 0:
            donor = inventory.loc[donor_idx]
            recipient = inventory.loc[recipient_idx]

            all_transfers.append({
                "item_id": item_id,
                "from_store": donor["store_id"],
                "to_store": recipient["store_id"],
                "transfer_units": quantity,
                "donor_safe_surplus": int(donor["transferable_surplus"]),
                "recipient_need": int(recipient["transfer_need"])
            })

    # Record any need that could not be met by transfers
    for recipient_idx, var in unmet_vars.items():
        quantity = solver.Value(var)

        if quantity > 0:
            recipient = inventory.loc[recipient_idx]

            unmet_records.append({
                "item_id": item_id,
                "store_id": recipient["store_id"],
                "unmet_units": quantity
            })


# Save results
transfer_columns = [
    "item_id", "from_store", "to_store",
    "transfer_units", "donor_safe_surplus", "recipient_need"
]

transfers = pd.DataFrame(all_transfers, columns=transfer_columns)
transfers.to_csv(OUTPUT_FILE, index=False)

unmet = pd.DataFrame(
    unmet_records,
    columns=["item_id", "store_id", "unmet_units"]
)

print("\nSTORE-TO-STORE TRANSFER RECOMMENDATIONS")
print("--------------------------------------")

if transfers.empty:
    print("No feasible transfers were identified.")
else:
    print(transfers.sort_values(
        "transfer_units", ascending=False
    ).to_string(index=False))

print("\nUNMET REPLENISHMENT NEED")
print("-----------------------")

if unmet.empty:
    print("All transfer needs were covered by available donor surplus.")
else:
    print(unmet.to_string(index=False))

print(f"\nTotal transfer units: {transfers['transfer_units'].sum()}")
print(f"Total unmet units: {unmet['unmet_units'].sum()}")
print(f"\nSaved to: {OUTPUT_FILE}")
