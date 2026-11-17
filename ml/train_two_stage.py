
import pandas as pd
import numpy as np
import joblib

from pathlib import Path
from sklearn.metrics import mean_absolute_error
from xgboost import XGBClassifier, XGBRegressor

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "ml" / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("Loading feature-engineered data...")

df = pd.read_csv(
    DATA_DIR / "feature_engineered.csv",
    low_memory=False
)

df["date"] = pd.to_datetime(df["date"])

features = [
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "rolling_mean_7",
    "rolling_mean_28",
    "rolling_std_7",
    "day_of_week",
    "month",
    "day_of_month",
    "is_weekend",
    "is_event"
]

target = "units_sold"

df = df.dropna(subset=features).copy()

# Chronological split
dates = sorted(df["date"].unique())
split_date = dates[int(len(dates) * 0.8)]

train = df[df["date"] < split_date]
test = df[df["date"] >= split_date]

X_train = train[features]
X_test = test[features]

y_train = train[target]
y_test = test[target]

print("Training rows:", len(train))
print("Testing rows:", len(test))
print("Split date:", split_date)

# Stage 1: Sale probability classifier
print("\nTraining sale classifier...")

y_train_sale = (y_train > 0).astype(int)

classifier = XGBClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1
)

classifier.fit(X_train, y_train_sale)

# Stage 2: Positive-demand regressor
print("\nTraining positive-demand regressor...")

positive_mask = y_train > 0

regressor = XGBRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1
)

regressor.fit(
    X_train.loc[positive_mask],
    y_train.loc[positive_mask]
)

# Combine both models
print("\nEvaluating two-stage model...")

sale_probability = classifier.predict_proba(X_test)[:, 1]

positive_quantity = np.maximum(
    regressor.predict(X_test),
    0
)

predictions = sale_probability * positive_quantity

mae = mean_absolute_error(y_test, predictions)

wape = (
    np.abs(y_test.to_numpy() - predictions).sum()
    / y_test.sum()
) * 100

print("\nTWO-STAGE MODEL RESULTS")
print("-----------------------")
print("MAE:", round(mae, 4))
print("WAPE:", round(wape, 2), "%")

# Save separately; preserve the original model
joblib.dump(
    {
        "classifier": classifier,
        "regressor": regressor,
        "features": features
    },
    MODEL_DIR / "two_stage_demand_forecaster.pkl"
)

print("\nTwo-stage model saved successfully!")
