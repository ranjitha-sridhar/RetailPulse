
import pandas as pd
import os

# Dataset directory
DATA_DIR = "ml/data"

# Load datasets
sales = pd.read_csv(os.path.join(DATA_DIR, "sales_train_validation.csv"))
calendar = pd.read_csv(os.path.join(DATA_DIR, "calendar.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "sell_prices.csv"))

print("\n========== SALES DATA ==========")
print("Shape:", sales.shape)
print("\nFirst 5 rows:")
print(sales.head())

print("\n========== CALENDAR DATA ==========")
print("Shape:", calendar.shape)
print("\nFirst 5 rows:")
print(calendar.head())

print("\n========== SELLING PRICES ==========")
print("Shape:", prices.shape)
print("\nFirst 5 rows:")
print(prices.head())

# Check missing values
print("\n========== MISSING VALUES ==========")
print("\nSales:")
print(sales.isnull().sum().sort_values(ascending=False).head(10))

print("\nCalendar:")
print(calendar.isnull().sum().sort_values(ascending=False))

print("\nPrices:")
print(prices.isnull().sum().sort_values(ascending=False))

# Basic dataset information
print("\n========== DATASET SUMMARY ==========")
print("Unique products:", sales["item_id"].nunique())
print("Unique stores:", sales["store_id"].nunique())
print("Unique departments:", sales["dept_id"].nunique())
print("Unique categories:", sales["cat_id"].nunique())
print("Total sales records:", len(sales))

print("\nDataset exploration completed!")
