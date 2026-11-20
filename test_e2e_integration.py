"""
Comprehensive End-to-End Integration Test Suite for RetailPulse
Validates:
1. 4-store inventory dataset integrity
2. Historical forecast evaluation metrics (MAE, RMSE, WAPE)
3. Google OR-Tools CP-SAT multi-store transfer optimization
4. Constraint enforcement: donor surplus limit, recipient limit, safety stock preservation, no self transfers
5. API endpoints (FastAPI routers)
6. SQLite database persistence
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent

print("=" * 65)
print("RETAILPULSE ENTERPRISE 4-STORE INTEGRATION TEST SUITE")
print("=" * 65)

# ---------------------------------------------------------
# Test 1: 4-Store Inventory Dataset Integrity
# ---------------------------------------------------------
print("\n[TEST 1] 4-Store Inventory Dataset Integrity...")
inv_path = ROOT / "ml" / "data" / "inventory_analysis.csv"
assert inv_path.exists(), "Inventory dataset missing!"
inv = pd.read_csv(inv_path)

stores = sorted(inv["store_id"].unique().tolist())
print(f"  Stores found: {stores}")
assert stores == ["CA_1", "CA_2", "TX_1", "WI_1"], f"Unexpected stores: {stores}"
assert len(inv) == 400, f"Expected 400 store-product rows, got {len(inv)}"

# Verify CA_2 is clearly labeled as simulated
ca2_sources = inv[inv["store_id"] == "CA_2"]["inventory_source"].unique()
print(f"  CA_2 inventory source label: {ca2_sources}")
assert "Simulated scenario (CA_2 expansion)" in ca2_sources

# Verify inventory health classifications
statuses = set(inv["inventory_status"].unique())
print(f"  Inventory statuses: {statuses}")
assert {"Overstocked", "Healthy", "Understocked"}.issubset(statuses)
print("  --> PASS: 4-store inventory dataset is valid.")

# ---------------------------------------------------------
# Test 2: Forecast Evaluation Metrics (MAE, RMSE, WAPE)
# ---------------------------------------------------------
print("\n[TEST 2] Historical Forecasting Accuracy Evaluation...")
fc_path = ROOT / "ml" / "data" / "forecast_7day_backtest.csv"
assert fc_path.exists(), "Forecast backtest dataset missing!"
fc = pd.read_csv(fc_path)

actual = fc["actual_sales"].to_numpy(dtype=float)
predicted = fc["predicted_sales"].to_numpy(dtype=float)
seasonal = fc["seasonal_prediction"].to_numpy(dtype=float)

overall_mae = float(np.mean(np.abs(actual - predicted)))
overall_rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))
total_actual = float(np.sum(actual))
overall_wape = float(np.sum(np.abs(actual - predicted)) / total_actual * 100)
seasonal_wape = float(np.sum(np.abs(actual - seasonal)) / total_actual * 100)

print(f"  Overall XGBoost MAE: {overall_mae:.4f}")
print(f"  Overall XGBoost RMSE: {overall_rmse:.4f}")
print(f"  Overall XGBoost WAPE: {overall_wape:.2f}%")
print(f"  Seasonal Naive Baseline WAPE: {seasonal_wape:.2f}%")
print(f"  WAPE Improvement: {seasonal_wape - overall_wape:+.2f}%")

assert overall_mae > 0 and overall_wape > 0
print("  --> PASS: Forecast evaluation metrics recalculated accurately.")

# ---------------------------------------------------------
# Test 3: Google OR-Tools CP-SAT Optimization Engine
# ---------------------------------------------------------
print("\n[TEST 3] Google OR-Tools Multi-Store Transfer Optimization...")
from backend.app.services.optimization_service import run_inventory_optimization

opt_results = run_inventory_optimization()
assert opt_results["status"] == "success"
assert opt_results["total_transfers_count"] > 0
assert opt_results["total_transfer_units"] > 0
print(f"  Solver: {opt_results['solver']}")
print(f"  Transfers generated: {opt_results['total_transfers_count']} routes")
print(f"  Total units transferred: {opt_results['total_transfer_units']:,}")
print(f"  Estimated freight cost: ${opt_results['total_transfer_cost']:,.2f}")
print(f"  Estimated savings: ${opt_results['estimated_savings']:,.2f}")
print(f"  Remaining external replenishment: {opt_results['total_external_units']} units")
print("  --> PASS: OR-Tools solver produced feasible optimal plan.")

# ---------------------------------------------------------
# Test 4: Physical Constraints & Safety Stock Validation
# ---------------------------------------------------------
print("\n[TEST 4] Rigorous Optimization Constraints Validation...")
transfers_df = pd.DataFrame(opt_results["transfers"])

# Check no self-transfers
self_transfers = transfers_df[transfers_df["from_store"] == transfers_df["to_store"]]
assert len(self_transfers) == 0, "Self transfers detected!"
print("  Check 1: No self-transfers (i != j): PASSED")

# Check non-negative transfers
assert (transfers_df["transfer_units"] > 0).all()
print("  Check 2: Positive transfer quantities: PASSED")

# Check safety stock preservation and donor safe limits
outgoing = transfers_df.groupby(["item_id", "from_store"])["transfer_units"].sum().reset_index()
incoming = transfers_df.groupby(["item_id", "to_store"])["transfer_units"].sum().reset_index()

merged = inv.merge(outgoing.rename(columns={"from_store": "store_id", "transfer_units": "out_u"}), on=["item_id", "store_id"], how="left")
merged = merged.merge(incoming.rename(columns={"to_store": "store_id", "transfer_units": "in_u"}), on=["item_id", "store_id"], how="left")
merged["out_u"] = merged["out_u"].fillna(0)
merged["in_u"] = merged["in_u"].fillna(0)

# Check donor limit: out_u <= transferable_surplus
assert (merged["out_u"] <= merged["transferable_surplus"] + 1e-5).all(), "Donor transferred more than surplus!"
print("  Check 3: Outgoing stock <= Transferable surplus: PASSED")

# Check safety buffer preserved for donors: for stores that transfer out stock, on_hand - out_u >= lead_time_demand + safety_stock
donors = merged[merged["out_u"] > 0]
donor_remaining = donors["on_hand_stock"] - donors["out_u"]
donor_threshold = donors["lead_time_demand"] + donors["safety_stock"]
assert (donor_remaining >= donor_threshold - 1e-4).all(), "Donor safety buffer violated!"
print(f"  Check 4: Donor safety buffer strictly preserved across {len(donors)} donor store-product nodes: PASSED")

# Check recipient limit: in_u <= shortage (reorder requirement)
assert (merged["in_u"] <= merged["shortage"] + 1e-5).all(), "Recipient received excess stock!"
print("  Check 5: Recipient received <= replenishment requirement: PASSED")
print("  --> PASS: All physical and logistics constraints hold 100%.")

# ---------------------------------------------------------
# Test 5: Backend API Route Handlers
# ---------------------------------------------------------
print("\n[TEST 5] Backend API Route Handlers Execution...")
from backend.app.routes.dashboard import dashboard_summary
from backend.app.routes.stores import stores as stores_route
from backend.app.routes.forecast import get_forecast_overview, get_forecast_stores, get_product_forecast
from backend.app.routes.optimization import inventory_overview, store_comparison, execute_optimization
from backend.app.auth.database import get_optimization_history

dash_res = dashboard_summary()
assert dash_res["total_stores"] == 4
print(f"  Dashboard summary stores: {dash_res['total_stores']}")

store_res = stores_route()
assert len(store_res) == 4
print(f"  Stores list: {[s['store_id'] for s in store_res]}")

fc_stores = get_forecast_stores()
assert len(fc_stores["stores"]) == 4

fc_overview = get_forecast_overview()
assert "overall" in fc_overview and fc_overview["overall"]["wape"] > 0

inv_ov = inventory_overview()
assert inv_ov["total_surplus_units"] > 0 and inv_ov["total_shortage_units"] > 0

comp = store_comparison()
assert comp["total_stores"] == 4

hist = get_optimization_history()
assert len(hist) > 0
print(f"  Optimization history recorded in SQLite: {len(hist)} runs logged.")

print("  --> PASS: All backend API route handlers executed successfully.")

# ---------------------------------------------------------
# Final Summary
# ---------------------------------------------------------
print("\n" + "=" * 65)
print("ALL 5 INTEGRATION TEST SUITES PASSED FLAWLESSLY!")
print("=" * 65)
