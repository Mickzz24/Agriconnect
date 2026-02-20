from flask import Flask, jsonify
from flask_cors import CORS
import os
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine

app = Flask(__name__)
CORS(app)

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'ML', 'AgricultureData.csv')

# Use DATABASE_URL if available (Vercel Prod with Postgres), else fallback to SQLite
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    db_url = f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'database.sqlite')}"
elif db_url.startswith("postgres://"):
    # SQLAlchemy requires 'postgresql://' instead of 'postgres://'
    db_url = db_url.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(db_url)
except Exception as e:
    print(f"Error creating engine: {e}")
    engine = None

def load_data():
    df_csv = None
    df_sql = None
    
    # Load CSV
    if os.path.exists(CSV_PATH):
        try:
            df_csv = pd.read_csv(CSV_PATH)
            df_csv['sale_date'] = pd.to_datetime(df_csv['sale_date'])
            
            # --- DEMO MODE: Shift dates to be current ---
            max_date = df_csv['sale_date'].max()
            titles_demo = True
            if titles_demo and max_date < pd.Timestamp.now() - pd.Timedelta(days=30):
                shift = pd.Timestamp.now() - max_date
                # Shift all dates so the last sale happened "today"
                df_csv['sale_date'] = df_csv['sale_date'] + shift
                print(f"Shifted data by {shift} for Demo Mode")
            # --------------------------------------------

            # SCALE DOWN FACTOR: 1000
            df_csv['total_sales'] = (df_csv['price_per_kg'] * df_csv['units_sold_kg']) / 1000
            df_csv = df_csv[['sale_date', 'total_sales']]
        except Exception as e:
            print(f"Error loading CSV: {e}")

    # Load SQL via SQLAlchemy
    if engine is not None:
        try:
            # We use SQLAlchemy engine to read from either Postgres or SQLite
            query = "SELECT \"createdAt\" as sale_date, total_amount as total_sales FROM \"Orders\" WHERE status IN ('Paid', 'Delivered', 'Shipped', 'Packed', 'Approved')"
            df_sql = pd.read_sql_query(query, engine)
            df_sql['sale_date'] = pd.to_datetime(df_sql['sale_date'])
        except Exception as e:
            print(f"Error loading SQL (Postgres/SQLite): {e}")
            # Fallback for strict SQLite dialect if quotes failed
            try:
                query = "SELECT createdAt as sale_date, total_amount as total_sales FROM Orders WHERE status IN ('Paid', 'Delivered', 'Shipped', 'Packed', 'Approved')"
                df_sql = pd.read_sql_query(query, engine)
                df_sql['sale_date'] = pd.to_datetime(df_sql['sale_date'])
            except Exception as e2:
                print(f"Fallback SQL error: {e2}")

    # Merge
    if df_csv is not None and df_sql is not None:
        df = pd.concat([df_csv, df_sql], ignore_index=True)
    elif df_csv is not None:
        df = df_csv
    elif df_sql is not None:
        df = df_sql
    else:
        return None

    df['profit'] = df['total_sales'] * 0.20
    return df

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "service": "flask-backend"})

@app.route('/api/analytics/advanced', methods=['GET'])
def advanced_analytics():
    try:
        df = load_data()
        if df is None:
            return jsonify({"error": "Dataset not found"}), 404

        # Ensure sale_date is datetime
        df['sale_date'] = pd.to_datetime(df['sale_date'], errors='coerce')
        # Drop rows where sale_date conversion failed
        df = df.dropna(subset=['sale_date'])

        # Monthly Data
        df['month'] = df['sale_date'].dt.strftime('%Y-%m')
        monthly = df.groupby('month').agg({
            'total_sales': 'sum',
            'profit': 'sum'
        }).reset_index().sort_values('month')
        
        monthly['expenses'] = monthly['total_sales'] * 0.80 # 80% expenses
        
        historical = monthly.rename(columns={'total_sales': 'sales'}).to_dict(orient='records')

        # Linear Regression for Forecast
        monthly['month_idx'] = np.arange(len(monthly))
        X = monthly[['month_idx']]
        y_sales = monthly['total_sales']
        y_profit = monthly['profit']

        model_sales = LinearRegression().fit(X, y_sales)
        model_profit = LinearRegression().fit(X, y_profit)

        # Forecast next 6 months
        forecast = []
        last_idx = len(monthly)
        last_date = df['sale_date'].max()

        for i in range(1, 7):
            next_month_date = last_date + pd.DateOffset(months=i)
            next_month_str = next_month_date.strftime('%Y-%m')
            
            p_sales = model_sales.predict([[last_idx + i - 1]])[0]
            forecast.append({
                "month": next_month_str,
                "predicted_sales": round(float(p_sales), 2),
                "conf_upper": round(float(p_sales * 1.15), 2),
                "conf_lower": round(float(p_sales * 0.85), 2)
            })

        next_month_sales = model_sales.predict([[last_idx]])[0]
        next_month_profit = model_profit.predict([[last_idx]])[0]

        return jsonify({
            "historical": historical,
            "forecast": forecast,
            "next_month": {
                "sales": round(float(next_month_sales), 2),
                "profit": round(float(next_month_profit), 2)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/forecast', methods=['GET'])
def forecast_sales():
    try:
        df = load_data()
        if df is None:
            return jsonify({"error": "Dataset not found"}), 404

        # Daily aggregations for the last 30 days
        daily = df.groupby('sale_date')['total_sales'].sum().reset_index()
        daily = daily.sort_values('sale_date').tail(30)

        daily['date_ordinal'] = daily['sale_date'].map(datetime.toordinal)
        X = daily[['date_ordinal']]
        y = daily['total_sales']

        model = LinearRegression().fit(X, y)
        
        last_date = daily['sale_date'].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, 8)]
        future_X = np.array([d.toordinal() for d in future_dates]).reshape(-1, 1)
        predictions = model.predict(future_X)

        forecast = []
        for d, p in zip(future_dates, predictions):
            forecast.append({
                "date": d.strftime('%Y-%m-%d'),
                "predicted_sales": max(0, round(float(p), 2))
            })

        return jsonify({
            "forecast": forecast,
            "trend": "up" if model.coef_[0] > 0 else "down"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
