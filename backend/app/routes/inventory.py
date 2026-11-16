
from fastapi import APIRouter, Query
from typing import Optional
from ..services.data_service import get_inventory_risks

router = APIRouter()

@router.get("/inventory/risks")
def inventory_risks(
    risk_level: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=300)
):
    return get_inventory_risks(
        risk_level=risk_level,
        store_id=store_id,
        limit=limit
    )
