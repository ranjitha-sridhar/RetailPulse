
from pathlib import Path
import pandas as pd

# Project root: RetailPulse/
ROOT = Path(__file__).resolve().parents[3]

DATA_FILES = {
    "forecasts": ROOT / "ml/data/forecast_7day_backtest.csv",
    "inventory": ROOT / "ml/data/inventory_analysis.csv",
    "transfers": ROOT / "optimization/transfer_recommendations.csv",
    "external": ROOT / "optimization/external_replenishment.csv",
}


def load_data():
    data = {}

    for name, path in DATA_FILES.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing data file: {path}")

        data[name] = pd.read_csv(path, low_memory=False)

    return data


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
    )

    return {
        "total_stores": int(inventory["store_id"].nunique()),
        "total_products": int(inventory["item_id"].nunique()),
        "total_inventory_units": int(inventory["on_hand_stock"].sum()),
        "high_risk_items": int(risk_counts.get("High", 0)),
        "medium_risk_items": int(risk_counts.get("Medium", 0)),
        "low_risk_items": int(risk_counts.get("Low", 0)),
        "forecast_demand_7d": round(
            float(forecasts["predicted_sales"].sum()), 2
        ),
        "total_transfer_units": int(transfers["transfer_units"].sum()),
        "external_replenishment_units": int(
            external["external_replenishment"].sum()
        ),
        "forecast_start": str(forecasts["date"].min()),
        "forecast_end": str(forecasts["date"].max()),
        "inventory_source": "Synthetic scenario",
        "forecast_type": "Historical backtest"
    }


def get_store_summary():
    data = load_data()

    inventory = data["inventory"]
    transfers = data["transfers"]
    external = data["external"]

    summary = inventory.groupby("store_id").agg(
        on_hand_units=("on_hand_stock", "sum"),
        forecast_demand=("forecast_7d_demand", "sum"),
        high_risk_items=("risk_level", lambda x: (x == "High").sum()),
        medium_risk_items=("risk_level", lambda x: (x == "Medium").sum()),
        low_risk_items=("risk_level", lambda x: (x == "Low").sum()),
        excess_units=("excess_units", "sum"),
        reorder_units=("reorder_quantity", "sum")
    )

    outgoing = transfers.groupby("from_store")["transfer_units"].sum()
    incoming = transfers.groupby("to_store")["transfer_units"].sum()
    external_units = external.groupby("store_id")[
        "external_replenishment"
    ].sum()

    summary["outgoing_units"] = outgoing
    summary["incoming_units"] = incoming
    summary["external_replenishment"] = external_units

    summary = summary.fillna(0).reset_index()

    return summary.to_dict(orient="records")


def get_inventory_risks(risk_level=None, store_id=None, limit=50):
    inventory = load_data()["inventory"].copy()

    if risk_level:
        inventory = inventory[
            inventory["risk_level"].str.lower() == risk_level.lower()
        ]

    if store_id:
        inventory = inventory[
            inventory["store_id"].str.upper() == store_id.upper()
        ]

    inventory = inventory.sort_values(
        by="risk_gap", ascending=False
    ).head(limit)

    return inventory.to_dict(orient="records")


def get_recommendations():
    data = load_data()

    return {
        "transfers": data["transfers"].to_dict(orient="records"),
        "external_replenishment": data["external"].to_dict(
            orient="records"
        )
    }
