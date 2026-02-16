from flask import Flask, jsonify
from flask_cors import CORS
import os
import sqlite3
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), '../database.sqlite')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "service": "flask-backend"})

@app.route('/api/forecast', methods=['GET'])
def forecast_sales():
    # Keep existing daily forecast for fallback/sidebar
    try:
        conn = get_db_connection()
        query = "SELECT date(createdAt) as date, SUM(total_amount) as total_sales FROM Orders WHERE status != 'Cancelled' GROUP BY date(createdAt) ORDER BY date(createdAt) ASC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        if df.empty or len(df) < 2:
            return jsonify({"message": "Not enough data", "forecast": [], "trend": "none"})
        df['date'] = pd.to_datetime(df['date'])
        df['day_ordinal'] = df['date'].map(datetime.toordinal)
        X, y = df[['day_ordinal']].values, df['total_sales'].values
        model = LinearRegression().fit(X, y)
        last_date = df['date'].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, 8)]
        future_X = np.array([d.toordinal() for d in future_dates]).reshape(-1, 1)
        predictions = model.predict(future_X)
        forecast = [{"date": d.strftime('%Y-%m-%d'), "predicted_sales": max(0, round(p, 2))} for d, p in zip(future_dates, predictions)]
        return jsonify({"forecast": forecast, "trend": "up" if model.coef_[0] > 0 else "down"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/advanced', methods=['GET'])
def advanced_analytics():
    try:
        # Configuration (Matching model.py)
        DOLLAR_TO_INR = 90.59
        PROFIT_MARGIN = 0.20
        CSV_WEIGHT = 0.30
        DB_WEIGHT = 0.70
        CSV_PATH = os.path.join(os.path.dirname(__file__), '../ML/AgricultureData.csv')

        # 1. Load Data
        conn = get_db_connection()
        db_orders = pd.read_sql_query("SELECT createdAt as date, total_amount as sales FROM Orders WHERE status != 'Cancelled'", conn)
        db_expenses = pd.read_sql_query("SELECT date, amount as expenses FROM Expenses", conn)
        conn.close()

        csv_df = pd.read_csv(CSV_PATH)
        # Use sale_date from CSV
        csv_df['date'] = pd.to_datetime(csv_df['sale_date'])
        # Convert CSV prices to same scale as DB if needed (following model.py)
        csv_df['price_per_kg'] *= DOLLAR_TO_INR 
        csv_df['sales'] = csv_df['price_per_kg'] * csv_df['units_shipped_kg']

        # 2. Process DB Data
        db_orders['date'] = pd.to_datetime(db_orders['date'])
        db_expenses['date'] = pd.to_datetime(db_expenses['date'])
        
        db_orders['year_month'] = db_orders['date'].dt.to_period('M')
        db_expenses['year_month'] = db_expenses['date'].dt.to_period('M')
        csv_df['year_month'] = csv_df['date'].dt.to_period('M')

        # 3. Aggregate Monthly
        db_monthly_sales = db_orders.groupby('year_month')['sales'].sum().reset_index()
        db_monthly_exp = db_expenses.groupby('year_month')['expenses'].sum().reset_index()
        csv_monthly_sales = csv_df.groupby('year_month')['sales'].sum().reset_index()

        # Merge for Historical Trend
        all_months = pd.concat([db_monthly_sales['year_month'], csv_monthly_sales['year_month']]).unique()
        all_months = sorted(all_months)
        
        historical = []
        for month in all_months:
            s_csv = csv_monthly_sales[csv_monthly_sales['year_month'] == month]['sales'].sum()
            s_db = db_monthly_sales[db_monthly_sales['year_month'] == month]['sales'].sum()
            
            # Weighted sales as per model.py
            final_sales = (s_csv * CSV_WEIGHT) + (s_db * DB_WEIGHT)
            final_profit = final_sales * PROFIT_MARGIN
            
            final_expenses = db_monthly_exp[db_monthly_exp['year_month'] == month]['expenses'].sum()
            
            historical.append({
                "month": str(month),
                "sales": round(final_sales, 2),
                "profit": round(final_profit, 2),
                "expenses": round(final_expenses, 2)
            })

        # 4. ML Forecast (Next 6 Months)
        hist_df = pd.DataFrame(historical)
        hist_df['index'] = np.arange(len(hist_df))
        
        X = hist_df[['index']].values
        y_sales = hist_df['sales'].values
        
        model_sales = LinearRegression().fit(X, y_sales)
        
        residuals = y_sales - model_sales.predict(X)
        std_err = np.std(residuals) if len(residuals) > 1 else (y_sales[-1] * 0.1 if len(y_sales) > 0 else 100)
        
        last_idx = hist_df['index'].max()
        last_month_period = hist_df['month'].iloc[-1]
        last_month = pd.Period(last_month_period, freq='M')
        
        forecast = []
        for i in range(1, 7):
            idx = last_idx + i
            pred_s = max(0, model_sales.predict([[idx]])[0])
            
            forecast.append({
                "month": str(last_month + i),
                "predicted_sales": round(pred_s, 2),
                "conf_upper": round(pred_s + (1.96 * std_err), 2),
                "conf_lower": round(max(0, pred_s - (1.96 * std_err)), 2)
            })

        next_month_pred = forecast[0]
        
        return jsonify({
            "historical": historical,
            "forecast": forecast,
            "next_month": {
                "sales": next_month_pred['predicted_sales'],
                "profit": round(next_month_pred['predicted_sales'] * PROFIT_MARGIN, 2)
            }
        })

    except Exception as e:
        return jsonify({"error": str(e), "message": "Advanced analytics failed"}), 500

@app.route('/api/analytics/cogs', methods=['GET']) # Redundant if Node handles it, but good for verification
def cogs_analytics():
    # Placeholder for advanced COGS analysis
    return jsonify({"message": "Advanced COGS analysis endpoint"})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
