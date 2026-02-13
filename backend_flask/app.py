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
    try:
        conn = get_db_connection()
        # Query daily sales aggregations from Orders (completed only)
        # Note: SQLite date functions might need tweaking based on storage format
        # We assume standard ISO format YYYY-MM-DD...
        query = """
            SELECT date(createdAt) as date, SUM(total_amount) as total_sales
            FROM Orders
            WHERE status != 'Cancelled'
            GROUP BY date(createdAt)
            ORDER BY date(createdAt) ASC
        """
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty or len(df) < 2:
            return jsonify({
                "message": "Not enough data for forecasting",
                "forecast": [],
                "trend": "insufficient_data"
            })

        # Prepare data for Linear Regression
        df['date'] = pd.to_datetime(df['date'])
        df['day_ordinal'] = df['date'].map(datetime.toordinal)

        X = df[['day_ordinal']].values
        y = df['total_sales'].values

        model = LinearRegression()
        model.fit(X, y)

        # Predict next 7 days
        last_date = df['date'].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, 8)]
        future_X = np.array([d.toordinal() for d in future_dates]).reshape(-1, 1)
        predictions = model.predict(future_X)

        forecast = []
        for d, p in zip(future_dates, predictions):
            forecast.append({
                "date": d.strftime('%Y-%m-%d'),
                "predicted_sales": max(0, round(p, 2)) # No negative sales
            })

        trend = "up" if model.coef_[0] > 0 else "down"

        return jsonify({
            "message": "Forecast generated successfully",
            "forecast": forecast,
            "trend": trend,
            "slope": round(model.coef_[0], 4)
        })

    except Exception as e:
        return jsonify({"error": str(e), "message": "Forecasting failed"}), 500

@app.route('/api/analytics/cogs', methods=['GET']) # Redundant if Node handles it, but good for verification
def cogs_analytics():
    # Placeholder for advanced COGS analysis
    return jsonify({"message": "Advanced COGS analysis endpoint"})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
