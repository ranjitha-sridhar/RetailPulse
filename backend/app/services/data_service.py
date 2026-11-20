from pathlib import Path
import numpy as np
import pandas as pd

# Project root: RetailPulse/
ROOT = Path(__file__).resolve().parents[3]

DATA_FILES = {
    "forecasts": ROOT / "ml/data/forecast_7day_backtest.csv",
    "inventory": ROOT / "ml/data/inventory_analysis.csv",
    "transfers": ROOT / "optimization/transfer_recommendations.csv",
    "external": ROOT / "optimization/external_replenishment.csv",
    "store_summary": ROOT / "optimization/store_transfer_summary.csv"
}


def load_data():
    data = {}

    for name, path in DATA_FILES.items():
        if path.exists():
            data[name] = pd.read_csv(path, low_memory=False)
        else:
            # Create empty fallback DataFrame with appropriate structure
            data[name] = pd.DataFrame()

    return data


def compute_forecast_metrics(df: pd.DataFrame):
    """Compute overall and store-wise MAE, RMSE, and WAPE from backtest data."""
    if df.empty or "actual_sales" not in df.columns or "predicted_sales" not in df.columns:
        return {"mae": 0.0, "rmse": 0.0, "wape": 0.0, "seasonal_wape": 0.0}

    actual = df["actual_sales"].to_numpy(dtype=float)
    predicted = df["predicted_sales"].to_numpy(dtype=float)
    seasonal = df["seasonal_prediction"].to_numpy(dtype=float) if "seasonal_prediction" in df.columns else predicted

    mae = float(np.mean(np.abs(actual - predicted)))
    rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))

    total_actual = float(np.sum(actual))
    wape = float(np.sum(np.abs(actual - predicted)) / total_actual * 100) if total_actual > 0 else 0.0
    seasonal_wape = float(np.sum(np.abs(actual - seasonal)) / total_actual * 100) if total_actual > 0 else 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "wape": round(wape, 2),
        "seasonal_wape": round(seasonal_wape, 2)
    }


def get_dashboard_summary():
    data = load_data()

    inventory = data["inventory"]
    forecasts = data["forecasts"]
    transfers = data["transfers"]
    external = data["external"]

    risk_counts = (
        inventory["risk_level"]
        .value_counts()
        .to_dict()
    ) if not inventory.empty and "risk_level" in inventory.columns else {}

    # Health status breakdown
    health_counts = (
        inventory["inventory_status"]
        .value_counts()
        .to_dict()
    ) if not inventory.empty and "inventory_status" in inventory.columns else {}

    # Forecast accuracy metrics (calculated dynamically from actual backtest data)
    fc_metrics = compute_forecast_metrics(forecasts)

    # Surplus and shortage calculations
    total_surplus = int(inventory["surplus"].sum()) if "surplus" in inventory.columns else int(inventory.get("excess_units", pd.Series([0])).sum())
    total_shortage = int(inventory["shortage"].sum()) if "shortage" in inventory.columns else int(inventory.get("risk_gap", pd.Series([0])).sum())

    total_transfer_units = int(transfers["transfer_units"].sum()) if not transfers.empty and "transfer_units" in transfers.columns else 0
    total_transfer_cost = float(transfers["estimated_cost"].sum()) if not transfers.empty and "estimated_cost" in transfers.columns else 0.0

    ext_units = int(external["external_replenishment"].sum()) if not external.empty and "external_replenishment" in external.columns else 0

    return {
        "total_stores": int(inventory["store_id"].nunique()) if not inventory.empty else 4,
        "stores_list": sorted(inventory["store_id"].unique().tolist()) if not inventory.empty else ["CA_1", "CA_2", "TX_1", "WI_1"],
        "total_products": int(inventory["item_id"].nunique()) if not inventory.empty else 100,
        "total_inventory_units": int(inventory["on_hand_stock"].sum()) if not inventory.empty else 0,
        "total_surplus_units": total_surplus,
        "total_shortage_units": total_shortage,
        "high_risk_items": int(risk_counts.get("High", 0)),
        "medium_risk_items": int(risk_counts.get("Medium", 0)),
        "low_risk_items": int(risk_counts.get("Low", 0)),
        "healthy_items": int(health_counts.get("Healthy", 0)),
        "overstocked_items": int(health_counts.get("Overstocked", 0)),
        "understocked_items": int(health_counts.get("Understocked", 0)),
        "forecast_demand_7d": round(float(inventory["forecast_7d_demand"].sum()), 2) if "forecast_7d_demand" in inventory.columns else round(float(forecasts.get("predicted_sales", pd.Series([0])).sum()), 2),
        "forecast_accuracy": {
            "wape": fc_metrics["wape"],
            "mae": fc_metrics["mae"],
            "rmse": fc_metrics["rmse"],
            "seasonal_wape": fc_metrics["seasonal_wape"]
        },
        "total_transfer_units": total_transfer_units,
        "total_transfer_cost": total_transfer_cost,
        "total_transfers_count": len(transfers) if not transfers.empty else 0,
        "external_replenishment_units": ext_units,
        "estimated_procurement_cost": round(ext_units * 25.0, 2),
        "forecast_start": str(forecasts["date"].min()) if not forecasts.empty else "2015-04-14",
        "forecast_end": str(forecasts["date"].max()) if not forecasts.empty else "2015-04-20",
        "inventory_source": "Multi-Store Enterprise Network (CA_1, CA_2, TX_1, WI_1)",
        "forecast_type": "XGBoost 7-Day Multi-Stage Regressor"
    }


def get_store_summary():
    data = load_data()

    inventory = data["inventory"]
    transfers = data["transfers"]
    external = data["external"]
    forecasts = data["forecasts"]

    if inventory.empty:
        return []

    summary = inventory.groupby("store_id").agg(
        on_hand_units=("on_hand_stock", "sum"),
        forecast_demand=("forecast_7d_demand", "sum"),
        high_risk_items=("risk_level", lambda x: (x == "High").sum()),
        medium_risk_items=("risk_level", lambda x: (x == "Medium").sum()),
        low_risk_items=("risk_level", lambda x: (x == "Low").sum()),
        surplus_units=("surplus", "sum") if "surplus" in inventory.columns else ("excess_units", "sum"),
        shortage_units=("shortage", "sum") if "shortage" in inventory.columns else ("risk_gap", "sum"),
        excess_units=("excess_units", "sum"),
        reorder_units=("reorder_quantity", "sum"),
        healthy_count=("inventory_status", lambda x: (x == "Healthy").sum()) if "inventory_status" in inventory.columns else ("risk_level", lambda x: (x == "Low").sum()),
        overstocked_count=("inventory_status", lambda x: (x == "Overstocked").sum()) if "inventory_status" in inventory.columns else ("risk_level", lambda x: 0),
        understocked_count=("inventory_status", lambda x: (x == "Understocked").sum()) if "inventory_status" in inventory.columns else ("risk_level", lambda x: (x == "High").sum()),
    )

    if not transfers.empty:
        outgoing = transfers.groupby("from_store")["transfer_units"].sum()
        incoming = transfers.groupby("to_store")["transfer_units"].sum()
    else:
        outgoing = pd.Series(dtype=int)
        incoming = pd.Series(dtype=int)

    if not external.empty and "external_replenishment" in external.columns:
        external_units = external.groupby("store_id")["external_replenishment"].sum()
    else:
        external_units = pd.Series(dtype=int)

    summary["outgoing_units"] = outgoing
    summary["incoming_units"] = incoming
    summary["external_replenishment"] = external_units

    summary = summary.fillna(0).reset_index()

    # Store-wise forecast accuracy
    records = summary.to_dict(orient="records")
    for r in records:
        s_id = r["store_id"]
        s_fc = forecasts[forecasts["store_id"] == s_id] if not forecasts.empty else pd.DataFrame()
        m = compute_forecast_metrics(s_fc)
        r["accuracy_wape"] = m["wape"]
        r["accuracy_mae"] = m["mae"]
        r["accuracy_rmse"] = m["rmse"]
        r["has_historical_evaluation"] = not s_fc.empty

    return records


def get_inventory_risks(risk_level=None, store_id=None, limit=50):
    inventory = load_data()["inventory"].copy()

    if inventory.empty:
        return []

    if risk_level and risk_level != "All":
        inventory = inventory[
            inventory["risk_level"].str.lower() == risk_level.lower()
        ]

    if store_id and store_id != "All":
        inventory = inventory[
            inventory["store_id"].str.upper() == store_id.upper()
        ]

    sort_col = "risk_gap" if "risk_gap" in inventory.columns else "shortage"
    inventory = inventory.sort_values(
        by=sort_col, ascending=False
    ).head(limit)

    return inventory.to_dict(orient="records")


def get_store_inventory(store_id: str):
    inventory = load_data()["inventory"].copy()
    if inventory.empty:
        return []
    subset = inventory[inventory["store_id"].str.upper() == store_id.upper()]
    return subset.to_dict(orient="records")


def get_recommendations():
    data = load_data()

    return {
        "transfers": data["transfers"].to_dict(orient="records") if not data["transfers"].empty else [],
        "external_replenishment": data["external"].to_dict(orient="records") if not data["external"].empty else [],
        "store_summary": data["store_summary"].to_dict(orient="records") if not data["store_summary"].empty else []
    }
