import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression


PROFIT_MARGIN = 0.20  # 20% assumed profit


def predict_sales_profit(selected_month):
    """
    selected_month format: 'YYYY-MM'
    Example: '2026-03'
    """

    # =====================================
    # 1️⃣ LOAD DATASET
    # =====================================
    df = pd.read_csv("ML/AgricultureData.csv")

    # Drop unwanted columns
    df = df.drop(columns=[
        'product_id',
        'unit_sold_kg',
        'supplier',
        'farm_location'
    ], errors='ignore')

    # Convert date
    df['date'] = pd.to_datetime(df['date'])

    # =====================================
    # 2️⃣ CALCULATE SALES & PROFIT (DOLLARS)
    # =====================================
    df['total_sales'] = df['price_per_kg'] * df['units_shipped_kg']
    df['profit'] = df['total_sales'] * PROFIT_MARGIN

    # =====================================
    # 3️⃣ MONTHLY AGGREGATION
    # =====================================
    df['year_month'] = df['date'].dt.to_period('M')

    monthly_data = df.groupby('year_month')[['total_sales', 'profit']].sum().reset_index()

    monthly_data = monthly_data.sort_values('year_month')

    # Create numeric month index for ML
    monthly_data['month_index'] = np.arange(len(monthly_data))

    # =====================================
    # 4️⃣ TRAIN LINEAR REGRESSION MODEL
    # =====================================
    X = monthly_data[['month_index']]
    y_sales = monthly_data['total_sales']
    y_profit = monthly_data['profit']

    sales_model = LinearRegression()
    profit_model = LinearRegression()

    sales_model.fit(X, y_sales)
    profit_model.fit(X, y_profit)

    # =====================================
    # 5️⃣ CALCULATE INDEX FOR SELECTED MONTH
    # =====================================
    last_period = monthly_data['year_month'].max()
    selected_period = pd.Period(selected_month, freq='M')

    month_difference = selected_period - last_period
    next_index = monthly_data['month_index'].max() + month_difference.n

    # =====================================
    # 6️⃣ PREDICT
    # =====================================
    predicted_sales = sales_model.predict([[next_index]])[0]
    predicted_profit = profit_model.predict([[next_index]])[0]

    return {
        "predicted_sales_dollars": round(float(predicted_sales), 2),
        "predicted_profit_dollars": round(float(predicted_profit), 2)
    }