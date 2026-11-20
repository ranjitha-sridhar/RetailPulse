"""
Inter-Store Inventory Optimization Engine for RetailPulse
Uses Google OR-Tools CP-SAT Solver to find optimal inventory transfer routes
across all 4 stores (CA_1, CA_2, TX_1, WI_1) for all 100 SKUs.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from ortools.sat.python import cp_model

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "ml" / "data"
OPT_DIR = ROOT / "optimization"

# Transport cost table (in dollars per unit transferred)
# Intra-state is cheapest, long distance is more expensive
TRANSPORT_COSTS = {
    ("CA_1", "CA_2"): 1.50,
    ("CA_2", "CA_1"): 1.50,
    ("CA_1", "TX_1"): 3.50,
    ("TX_1", "CA_1"): 3.50,
    ("CA_2", "TX_1"): 3.50,
    ("TX_1", "CA_2"): 3.50,
    ("TX_1", "WI_1"): 3.00,
    ("WI_1", "TX_1"): 3.00,
    ("CA_1", "WI_1"): 5.00,
    ("WI_1", "CA_1"): 5.00,
    ("CA_2", "WI_1"): 5.00,
    ("WI_1", "CA_2"): 5.00,
}

DEFAULT_TRANSPORT_COST = 4.00
UNMET_DEMAND_PENALTY = 100.00   # Large penalty to prioritize serving demand
PROCUREMENT_COST_PER_UNIT = 25.00


def get_transport_cost(from_store: str, to_store: str) -> float:
    return TRANSPORT_COSTS.get((from_store, to_store), DEFAULT_TRANSPORT_COST)


class InventoryOptimizer:
    def __init__(self, inventory_df: Optional[pd.DataFrame] = None):
        if inventory_df is None:
            inv_path = DATA_DIR / "inventory_analysis.csv"
            if not inv_path.exists():
                raise FileNotFoundError(f"Inventory dataset not found: {inv_path}")
            self.inventory = pd.read_csv(inv_path, low_memory=False)
        else:
            self.inventory = inventory_df.copy()

        self._prepare_data()

    def _prepare_data(self):
        """Ensure required fields and calculated columns are ready for optimization."""
        # Ensure lead time and safety stock
        if "transferable_surplus" not in self.inventory.columns:
            self.inventory["transferable_surplus"] = np.maximum(
                0,
                self.inventory["on_hand_stock"]
                - self.inventory["lead_time_demand"]
                - self.inventory["safety_stock"]
            ).astype(int)

        if "transfer_need" not in self.inventory.columns:
            if "shortage" in self.inventory.columns:
                self.inventory["transfer_need"] = self.inventory["shortage"].astype(int)
            else:
                self.inventory["transfer_need"] = self.inventory["reorder_quantity"].astype(int)

        if "required_stock" not in self.inventory.columns:
            self.inventory["required_stock"] = (
                self.inventory["forecast_7d_demand"] + self.inventory["safety_stock"]
            ).apply(np.ceil).astype(int)

        if "surplus" not in self.inventory.columns:
            self.inventory["surplus"] = np.maximum(
                0, self.inventory["on_hand_stock"] - self.inventory["required_stock"]
            ).astype(int)

        if "shortage" not in self.inventory.columns:
            self.inventory["shortage"] = np.maximum(
                0, self.inventory["required_stock"] - self.inventory["on_hand_stock"]
            ).astype(int)

        # Inventory status classification
        if "inventory_status" not in self.inventory.columns:
            conds = [
                self.inventory["on_hand_stock"] > self.inventory["target_stock"],
                self.inventory["on_hand_stock"] < self.inventory["required_stock"]
            ]
            self.inventory["inventory_status"] = np.select(conds, ["Overstocked", "Understocked"], default="Healthy")

    def run_optimization(self) -> Dict[str, Any]:
        """
        Executes Google OR-Tools CP-SAT multi-store inventory transfer optimization.
        Solves product-by-product or globally across all stores.
        """
        all_transfers = []
        all_unmet = []
        all_store_impacts = {
            s: {"outgoing": 0, "incoming": 0, "external_needed": 0}
            for s in self.inventory["store_id"].unique()
        }

        unique_items = self.inventory["item_id"].unique()

        for item_id in unique_items:
            group = self.inventory[self.inventory["item_id"] == item_id]
            donors = group[group["transferable_surplus"] > 0]
            recipients = group[group["transfer_need"] > 0]

            if recipients.empty:
                continue

            # Case: No donors available, all recipient need becomes external purchase
            if donors.empty:
                for _, rec in recipients.iterrows():
                    need = int(rec["transfer_need"])
                    all_unmet.append({
                        "item_id": item_id,
                        "store_id": rec["store_id"],
                        "external_replenishment": need,
                        "risk_level": rec.get("risk_level", "Medium"),
                        "reason": "No store in the network has transferable surplus."
                    })
                    all_store_impacts[rec["store_id"]]["external_needed"] += need
                continue

            # Build Google OR-Tools CP-SAT Model
            model = cp_model.CpModel()

            # Decision variables: x[donor_idx, rec_idx] = quantity transferred
            transfer_vars = {}
            for d_idx, donor in donors.iterrows():
                for r_idx, rec in recipients.iterrows():
                    if donor["store_id"] == rec["store_id"]:
                        continue

                    max_possible = min(int(donor["transferable_surplus"]), int(rec["transfer_need"]))
                    var_name = f"x_{donor['store_id']}_{rec['store_id']}_{item_id}"
                    transfer_vars[(d_idx, r_idx)] = model.NewIntVar(0, max_possible, var_name)

            # Slack variables: unmet demand at recipient
            unmet_vars = {}
            for r_idx, rec in recipients.iterrows():
                u_name = f"unmet_{rec['store_id']}_{item_id}"
                unmet_vars[r_idx] = model.NewIntVar(0, int(rec["transfer_need"]), u_name)

            # Constraint 1: Donor cannot transfer more than its transferable surplus
            # sum_{j != i} x(i, j) <= transferable_surplus(i)
            for d_idx, donor in donors.iterrows():
                outgoing = [v for (d, r), v in transfer_vars.items() if d == d_idx]
                if outgoing:
                    model.Add(sum(outgoing) <= int(donor["transferable_surplus"]))

            # Constraint 2: Destination received stock + unmet = total recipient need
            # sum_{i != j} x(i, j) + unmet(j) == transfer_need(j)
            for r_idx, rec in recipients.iterrows():
                incoming = [v for (d, r), v in transfer_vars.items() if r == r_idx]
                model.Add(sum(incoming) + unmet_vars[r_idx] == int(rec["transfer_need"]))

            # Objective:
            # Minimize: 1000 * unmet_demand + sum(transport_cost * x_ij)
            # We scale transport cost to integer cents (e.g. $1.50 -> 150)
            objective_terms = []
            for r_idx, u_var in unmet_vars.items():
                objective_terms.append(int(UNMET_DEMAND_PENALTY * 100) * u_var)

            for (d_idx, r_idx), t_var in transfer_vars.items():
                from_s = donors.loc[d_idx, "store_id"]
                to_s = recipients.loc[r_idx, "store_id"]
                cost_cents = int(get_transport_cost(from_s, to_s) * 100)
                objective_terms.append(cost_cents * t_var)

            model.Minimize(sum(objective_terms))

            # Solve CP-SAT
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 5.0
            solver.parameters.num_search_workers = 1
            solver.parameters.random_seed = 42

            status = solver.Solve(model)

            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                # Extract transfers
                for (d_idx, r_idx), t_var in transfer_vars.items():
                    qty = solver.Value(t_var)
                    if qty > 0:
                        donor = donors.loc[d_idx]
                        rec = recipients.loc[r_idx]
                        unit_cost = get_transport_cost(donor["store_id"], rec["store_id"])
                        total_cost = round(qty * unit_cost, 2)
                        remaining_shortage = max(0, int(rec["transfer_need"]) - qty)

                        explanation = (
                            f"Transfer {qty} units of {item_id} from {donor['store_id']} to {rec['store_id']}. "
                            f"{donor['store_id']} has {int(donor['transferable_surplus'])} units of safe surplus, "
                            f"resolving anticipated shortage at {rec['store_id']} (cost: ${total_cost:.2f})."
                        )

                        all_transfers.append({
                            "item_id": item_id,
                            "from_store": donor["store_id"],
                            "to_store": rec["store_id"],
                            "transfer_units": qty,
                            "donor_safe_surplus": int(donor["transferable_surplus"]),
                            "recipient_need": int(rec["transfer_need"]),
                            "estimated_cost": total_cost,
                            "unit_cost": unit_cost,
                            "remaining_shortage": remaining_shortage,
                            "status": "Recommended",
                            "explanation": explanation
                        })

                        all_store_impacts[donor["store_id"]]["outgoing"] += qty
                        all_store_impacts[rec["store_id"]]["incoming"] += qty

                # Extract remaining unmet need
                for r_idx, u_var in unmet_vars.items():
                    unmet_qty = solver.Value(u_var)
                    if unmet_qty > 0:
                        rec = recipients.loc[r_idx]
                        all_unmet.append({
                            "item_id": item_id,
                            "store_id": rec["store_id"],
                            "external_replenishment": unmet_qty,
                            "risk_level": rec.get("risk_level", "Medium"),
                            "reason": f"Surplus from donor stores was insufficient to satisfy remaining {unmet_qty} units."
                        })
                        all_store_impacts[rec["store_id"]]["external_needed"] += unmet_qty

        # Build output dataframes
        transfers_df = pd.DataFrame(all_transfers)
        unmet_df = pd.DataFrame(all_unmet)

        # Save to optimization directory
        OPT_DIR.mkdir(parents=True, exist_ok=True)
        if not transfers_df.empty:
            transfers_df.to_csv(OPT_DIR / "transfer_recommendations.csv", index=False)
        else:
            transfers_df = pd.DataFrame(columns=[
                "item_id", "from_store", "to_store", "transfer_units",
                "donor_safe_surplus", "recipient_need", "estimated_cost",
                "unit_cost", "remaining_shortage", "status", "explanation"
            ])
            transfers_df.to_csv(OPT_DIR / "transfer_recommendations.csv", index=False)

        if not unmet_df.empty:
            unmet_df.to_csv(OPT_DIR / "external_replenishment.csv", index=False)
        else:
            unmet_df = pd.DataFrame(columns=["item_id", "store_id", "external_replenishment", "risk_level", "reason"])
            unmet_df.to_csv(OPT_DIR / "external_replenishment.csv", index=False)

        # Store transfer summary
        summary_rows = []
        for store_id, impact in all_store_impacts.items():
            summary_rows.append({
                "store_id": store_id,
                "outgoing_units": impact["outgoing"],
                "incoming_units": impact["incoming"],
                "external_replenishment": impact["external_needed"],
                "net_transfer": impact["incoming"] - impact["outgoing"]
            })
        summary_df = pd.DataFrame(summary_rows)
        summary_df.to_csv(OPT_DIR / "store_transfer_summary.csv", index=False)

        # Compute totals
        total_transfer_units = int(transfers_df["transfer_units"].sum()) if not transfers_df.empty else 0
        total_transfer_cost = float(transfers_df["estimated_cost"].sum()) if not transfers_df.empty else 0.0
        total_external_units = int(unmet_df["external_replenishment"].sum()) if not unmet_df.empty else 0
        total_procurement_cost = round(total_external_units * PROCUREMENT_COST_PER_UNIT, 2)
        total_savings = round((total_transfer_units * PROCUREMENT_COST_PER_UNIT) - total_transfer_cost, 2)

        return {
            "status": "success",
            "solver": "Google OR-Tools CP-SAT (v9.15)",
            "total_transfers_count": len(transfers_df),
            "total_transfer_units": total_transfer_units,
            "total_transfer_cost": total_transfer_cost,
            "total_external_units": total_external_units,
            "total_procurement_cost": total_procurement_cost,
            "estimated_savings": max(0.0, total_savings),
            "transfers": transfers_df.to_dict(orient="records"),
            "external_replenishment": unmet_df.to_dict(orient="records"),
            "store_summary": summary_df.to_dict(orient="records")
        }


def run_inventory_optimization() -> Dict[str, Any]:
    optimizer = InventoryOptimizer()
    return optimizer.run_optimization()
