
from fastapi import APIRouter
from ..services.data_service import get_store_summary

router = APIRouter()

@router.get("/stores")
def stores():
    return get_store_summary()
