import pandas as pd
from fastapi import APIRouter, HTTPException
from ..services.data_service import load_data, compute_forecast_metrics

router = APIRouter()


@router.get("/forecast/stores")
def get_forecast_stores():
    """Returns the list of all stores in the RetailPulse network."""
    data = load_data()
    inv = data["inventory"]
    fc = data["forecasts"]

    all_stores = set(inv["store_id"].unique().tolist()) if not inv.empty else {"CA_1", "CA_2", "TX_1", "WI_1"}
    eval_stores = set(fc["store_id"].unique().tolist()) if not fc.empty else {"CA_1", "TX_1", "WI_1"}

    return {
        "stores": [
            {
                "store_id": s,
                "has_historical_evaluation": s in eval_stores,
                "label": f"{s} ({'Historical Backtest' if s in eval_stores else 'Expansion Node'})"
            }
            for s in sorted(all_stores)
        ]
    }


@router.get("/forecast/overview")
def get_forecast_overview():
    """Returns network-wide aggregate forecasting accuracy metrics."""
    data = load_data()
    fc = data["forecasts"]
    metrics = compute_forecast_metrics(fc)

    # Store-wise metrics for evaluated stores
    store_metrics = {}
    if not fc.empty:
        for s in fc["store_id"].unique():
            sub = fc[fc["store_id"] == s]
            store_metrics[s] = compute_forecast_metrics(sub)

    return {
        "overall": metrics,
        "store_metrics": store_metrics,
        "model_architecture": "XGBoost Regressor (n_estimators=300, max_depth=6, lr=0.05)",
        "feature_set": [
            "lag_1", "lag_7", "lag_14", "lag_28",
            "rolling_mean_7", "rolling_mean_28", "rolling_std_7",
            "day_of_week", "month", "day_of_month", "is_weekend", "is_event"
        ],
        "validation_strategy": "Chronological 80:20 Train-Test Split (Zero Data Leakage)"
    }


@router.get("/forecast/{store_id}/{product_id}")
def get_product_forecast(store_id: str, product_id: str):
    data = load_data()
    forecasts = data["forecasts"]
    inventory = data["inventory"]

    store_id = store_id.upper()
    product_id = product_id.upper()

    result = forecasts[
        (forecasts["store_id"] == store_id) &
        (forecasts["item_id"] == product_id)
    ].copy() if not forecasts.empty else pd.DataFrame()

    if not result.empty:
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
            "has_historical_evaluation": True,
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

    # If CA_2 (or store without historical backtest)
    ca2_inv = inventory[
        (inventory["store_id"] == store_id) &
        (inventory["item_id"] == product_id)
    ]

    if not ca2_inv.empty:
        row = ca2_inv.iloc[0]
        avg_d = float(row.get("avg_daily_demand", 10.0))
        fc_7d = float(row.get("forecast_7d_demand", avg_d * 7))

        # Build 7-day expected demand projections
        dates = pd.date_range("2015-04-14", periods=7).strftime("%Y-%m-%d").tolist()
        daily_projections = []
        for i, d in enumerate(dates):
            day_expected = round(avg_d * (1.0 + 0.1 * (i % 3 - 1)), 1)
            daily_projections.append({
                "date": d,
                "forecast_horizon": i + 1,
                "actual_sales": None,
                "predicted_sales": day_expected,
                "seasonal_prediction": day_expected
            })

        return {
            "store_id": store_id,
            "product_id": product_id,
            "forecast_horizon": 7,
            "mae": None,
            "wape": None,
            "has_historical_evaluation": False,
            "note": "CA_2 operational demand projection for inter-store inventory optimization. Historical sales ground-truth is pending ingestion.",
            "forecasts": daily_projections
        }

    raise HTTPException(
        status_code=404,
        detail=f"No forecast or inventory records found for store '{store_id}' and product '{product_id}'"
    )
