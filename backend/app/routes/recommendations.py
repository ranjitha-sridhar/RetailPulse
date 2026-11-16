
from fastapi import APIRouter
from ..services.data_service import get_recommendations

router = APIRouter()

@router.get("/recommendations")
def recommendations():
    return get_recommendations()
