
from pathlib import Path
import pandas as pd

files = {
    "Sales": "ml/data/processed_sales.csv",
    "Forecasts": "ml/data/forecast_7day_backtest.csv",
    "Inventory": "ml/data/inventory_analysis.csv",
    "Transfers": "optimization/transfer_recommendations.csv",
    "External replenishment": "optimization/external_replenishment.csv",
}

root = Path(__file__).resolve().parent.parent

for name, relative_path in files.items():
    path = root / relative_path

    print("\n" + "=" * 65)
    print(name.upper())

    if not path.exists():
        print("FILE NOT FOUND:", path)
        continue

    df = pd.read_csv(path, low_memory=False)

    print("Shape:", df.shape)
    print("Columns:", df.columns.tolist())
    print("\nSample:")
    print(df.head(2).to_string(index=False))
