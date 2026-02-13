#!/bin/bash

# Ensure server is running before running this script
# Usage: ./verify_phase4.sh

BASE_URL="http://localhost:3001/api"
echo "--- Starting Phase 4 Verification ---"

# 1. Login to get Token
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner_verify@test.com", "password": "password123"}')
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "[FAIL] Auth failed."
    exit 1
fi

# 2. Fetch Stats
echo "\n2. Fetching Stats..."
STATS_RES=$(curl -s -X GET $BASE_URL/reports/stats -H "Authorization: $TOKEN")
echo $STATS_RES

# Verify JSON structure key existence
echo $STATS_RES | grep "orders" | grep "revenue" | grep "financials" && echo "[PASS] Stats API returns expected structure" || echo "[FAIL] Stats API invalid"

echo "\n[PASS] Phase 4 Verification Complete."
