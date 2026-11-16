
from fastapi import APIRouter, HTTPException
from ..services.data_service import load_data

router = APIRouter()


@router.get("/forecast/{store_id}/{product_id}")
def get_product_forecast(store_id: str, product_id: str):

    data = load_data()
    forecasts = data["forecasts"]

    result = forecasts[
        (forecasts["store_id"] == store_id) &
        (forecasts["item_id"] == product_id)
    ].copy()

    if result.empty:
        raise HTTPException(
            status_code=404,
            detail="No forecast found for this store and product"
        )

    result["date"] = result["date"].astype(str)

    result = result.sort_values("forecast_horizon")

    actual = result["actual_sales"]
    predicted = result["predicted_sales"]

    mae = float((actual - predicted).abs().mean())

    total_actual = float(actual.sum())
    wape = (
        float((actual - predicted).abs().sum() / total_actual * 100)
        if total_actual > 0 else 0
    )

    return {
        "store_id": store_id,
        "product_id": product_id,
        "forecast_horizon": 7,
        "mae": round(mae, 2),
        "wape": round(wape, 2),
        "forecasts": result[
            [
                "date",
                "forecast_horizon",
                "actual_sales",
                "predicted_sales",
                "seasonal_prediction"
            ]
        ].to_dict(orient="records")
    }
