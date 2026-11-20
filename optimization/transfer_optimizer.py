"""
Standalone CLI Runner for RetailPulse Inter-Store Transfer Optimizer
Uses Google OR-Tools CP-SAT solver to optimize 4-store inventory transfers.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from backend.app.services.optimization_service import run_inventory_optimization

if __name__ == "__main__":
    print("\nExecuting Google OR-Tools 4-Store Inventory Optimizer...")
    results = run_inventory_optimization()
    print("=" * 60)
    print(f"Status: {results['status']}")
    print(f"Solver Engine: {results['solver']}")
    print(f"Total Transfers Generated: {results['total_transfers_count']}")
    print(f"Total Transfer Units: {results['total_transfer_units']}")
    print(f"Total Estimated Transport Cost: ${results['total_transfer_cost']:,.2f}")
    print(f"External Procurement Units: {results['total_external_units']}")
    print(f"Total Cost Savings vs Fresh Procurement: ${results['estimated_savings']:,.2f}")
    print("=" * 60)
    print("\nStore Summary:")
    for s in results["store_summary"]:
        print(f"  Store {s['store_id']}: Outgoing: {s['outgoing_units']} | Incoming: {s['incoming_units']} | Net: {s['net_transfer']} | External Replenishment: {s['external_replenishment']}")
    print("\nResults successfully saved to optimization/ directory.")
