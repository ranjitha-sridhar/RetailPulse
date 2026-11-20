"""
Inventory Optimization and Multi-Store Analytics Routes
RetailPulse Platform
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..services.data_service import (
    get_dashboard_summary,
    get_store_summary,
    get_store_inventory,
    get_recommendations,
    get_inventory_risks
)
from ..services.optimization_service import run_inventory_optimization
from ..auth.database import record_optimization_run, get_optimization_history

router = APIRouter()


class OptimizeResponse(BaseModel):
    status: str
    solver: str
    total_transfers_count: int
    total_transfer_units: int
    total_transfer_cost: float
    total_external_units: int
    total_procurement_cost: float
    estimated_savings: float
    transfers: list
    external_replenishment: list
    store_summary: list


@router.get("/inventory/overview")
def inventory_overview():
    """Returns multi-store inventory overview metrics (surplus, shortage, totals)."""
    summary = get_dashboard_summary()
    return summary


@router.get("/inventory/store/{store_id}")
def store_inventory(store_id: str):
    """Returns inventory records for a specific store."""
    records = get_store_inventory(store_id)
    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"No inventory records found for store '{store_id}'"
        )
    return {
        "store_id": store_id.upper(),
        "total_skus": len(records),
        "inventory": records
    }


@router.post("/inventory/optimize", response_model=OptimizeResponse)
def execute_optimization():
    """
    Triggers Google OR-Tools CP-SAT multi-store inventory transfer optimization.
    Minimizes transportation costs and unmet demand while preserving safety stock.
    Persists run results to SQLite and returns the transfer plan.
    """
    try:
        results = run_inventory_optimization()
        # Persist run to database
        record_optimization_run(results)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inventory optimization failed: {str(e)}"
        )


@router.get("/inventory/transfers/recommendations")
def transfer_recommendations():
    """Returns the latest transfer recommendations and external replenishment manifests."""
    return get_recommendations()


@router.get("/inventory/transfers/history")
def transfer_history(limit: int = Query(10, ge=1, le=50)):
    """Returns historical optimization runs."""
    history = get_optimization_history(limit=limit)
    return {"history": history}


@router.get("/analytics/store-comparison")
def store_comparison():
    """Cross-store analytics: demand, accuracy, inventory health, and transfers across all 4 stores."""
    stores = get_store_summary()
    return {
        "total_stores": len(stores),
        "stores": stores
    }
