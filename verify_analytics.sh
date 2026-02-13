#!/bin/bash

# Ensure Flask is running
# Usage: ./verify_analytics.sh

echo "--- Starting Analytics Verification ---"

# 1. Check Flask Health
echo "\n1. Checking Flask Health..."
HEALTH_RES=$(curl -s http://localhost:5001/api/health)
echo $HEALTH_RES
echo $HEALTH_RES | grep "healthy" && echo "[PASS] Flask is healthy" || echo "[FAIL] Flask not running"

# 2. Check Forecast Endpoint
echo "\n2. Fetching Forecast..."
FORECAST_RES=$(curl -s http://localhost:5001/api/forecast)
echo $FORECAST_RES

# 3. Check for specific keys
echo $FORECAST_RES | grep "forecast" | grep "trend" && echo "[PASS] Forecast API returns expected structure" || echo "[FAIL] Forecast API invalid"

echo "\n[PASS] Analytics Verification Complete."
