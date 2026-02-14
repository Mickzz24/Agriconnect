import pandas as pd
import numpy as np
import sqlite3
from sklearn.linear_model import LinearRegression

DOLLAR_TO_INR = 90.59
PROFIT_MARGIN = 0.20


def predict_sales_profit(selected_month):
    """
    selected_month format: 'YYYY-MM'
    Example: '2026-03'
    """

    # ===============================
    # 1️⃣ LOAD CSV DATA (30%)
    # ===============================
    csv_df = pd.read_csv("ML\AgricultureData.csv")

    csv_df = csv_df.drop(columns=[
        'product_id',
        'unit_sold_kg',
        'supplier',
        'farm_location'
    ], errors='ignore')

    csv_df['price_per_kg'] *= DOLLAR_TO_INR
    csv_df['date'] = pd.to_datetime(csv_df['date'])

    csv_df['total_sales'] = csv_df['price_per_kg'] * csv_df['units_shipped_kg']
    csv_df['profit'] = csv_df['total_sales'] * PROFIT_MARGIN


    # ===============================
    # 2️⃣ LOAD SQLITE DATA (70%)
    # ===============================
    conn = sqlite3.connect("sales.db")
    db_df = pd.read_sql("SELECT * FROM sales", conn)
    conn.close()

    db_df['date'] = pd.to_datetime(db_df['date'])

    db_df['total_sales'] = db_df['price_per_kg'] * db_df['units_shipped_kg']
    db_df['profit'] = db_df['total_sales'] * PROFIT_MARGIN


    # ===============================
    # 3️⃣ MONTHLY AGGREGATION
    # ===============================
    csv_df['year_month'] = csv_df['date'].dt.to_period('M')
    db_df['year_month'] = db_df['date'].dt.to_period('M')

    csv_monthly = csv_df.groupby('year_month')[['total_sales','profit']].sum().reset_index()
    db_monthly = db_df.groupby('year_month')[['total_sales','profit']].sum().reset_index()

    # Apply weight
    csv_monthly[['total_sales','profit']] *= 0.30
    db_monthly[['total_sales','profit']] *= 0.70

    combined = pd.concat([csv_monthly, db_monthly])
    final_monthly = combined.groupby('year_month')[['total_sales','profit']].sum().reset_index()

    final_monthly = final_monthly.sort_values('year_month')
    final_monthly['month_index'] = np.arange(len(final_monthly))


    # ===============================
    # 4️⃣ TRAIN MODEL
    # ===============================
    X = final_monthly[['month_index']]
    y_sales = final_monthly['total_sales']
    y_profit = final_monthly['profit']

    sales_model = LinearRegression()
    profit_model = LinearRegression()

    sales_model.fit(X, y_sales)
    profit_model.fit(X, y_profit)


    # ===============================
    # 5️⃣ CALCULATE SELECTED MONTH INDEX
    # ===============================
    last_month = final_monthly['year_month'].max()
    selected_period = pd.Period(selected_month, freq='M')

    month_difference = selected_period - last_month
    next_index = final_monthly['month_index'].max() + month_difference.n

    predicted_sales = sales_model.predict([[next_index]])[0]
    predicted_profit = profit_model.predict([[next_index]])[0]

    return {
        "predicted_sales": round(float(predicted_sales), 2),
        "predicted_profit": round(float(predicted_profit), 2)
    }