import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from prophet import Prophet
import warnings

warnings.filterwarnings("ignore")

# ================= CONFIG ================= #
INPUT_FILE = "hourlyLoadDataIndia2.xlsx" 
SCALING_FACTOR = 0.00012 
PRICE_PER_UNIT = 6.50  # ₹6.50 per kVAh

# 1. LOAD DATA
df = pd.read_excel(INPUT_FILE)
df["ds"] = pd.to_datetime(df["datetime"])
df["y"] = df["Southern Region Hourly Demand"] * SCALING_FACTOR
df = df[["ds", "y"]].sort_values("ds").tail(8000)

# 2. TRAIN MODEL
model = Prophet(daily_seasonality=True, weekly_seasonality=True)
model.fit(df)

# 3. FORECAST 30 DAYS (720 Hours)
future = model.make_future_dataframe(periods=720, freq='h')
forecast = model.predict(future)
predictions = forecast.tail(720)[['ds', 'yhat']]

# --- OUTPUT 1: NEXT 24 HOURS (LOAD) ---
next_day = predictions.head(24).copy()
next_day['hour'] = next_day['ds'].dt.strftime('%H:%M')
next_day.rename(columns={'yhat': 'predicted_kVAh'}, inplace=True)
next_day[['hour', 'predicted_kVAh']].to_csv("next_day_energy_prediction.csv", index=False)

# --- OUTPUT 2: NEXT 30 DAYS (PRICE) ---
predictions['date'] = predictions['ds'].dt.date
monthly_price = predictions.groupby('date')['yhat'].sum().reset_index()
monthly_price['predicted_price'] = (monthly_price['yhat'] * PRICE_PER_UNIT).round(2)
monthly_price.to_csv("monthly_price_prediction.csv", index=False)

print("✅ Brain Updated! Daily Load and Monthly Price files created.")