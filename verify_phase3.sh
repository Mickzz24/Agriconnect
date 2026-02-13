#!/bin/bash

# Ensure server is running before running this script
# Usage: ./verify_phase3.sh

BASE_URL="http://localhost:3001/api"
echo "--- Starting Phase 3 Verification ---"

# 1. Login to get Token
echo "\n1. Logging in..."
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner_verify@test.com", "password": "password123"}')
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "[FAIL] Auth failed."
    exit 1
fi

# 2. Add Expense
echo "\n2. Adding Expense..."
EXP_RES=$(curl -s -X POST $BASE_URL/expenses \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "Utilities", "amount": 150.50, "description": "Electricity Bill"}')
echo $EXP_RES

# 3. List Expenses
echo "\n3. Listing Expenses..."
curl -s -X GET $BASE_URL/expenses -H "Authorization: $TOKEN"

# 4. Add Inventory with Cost Price
echo "\n4. Adding Inventory with Cost Price..."
INV_RES=$(curl -s -X POST $BASE_URL/inventory \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Premium Seeds", "category": "Seeds", "quantity": 50, "unit_price": 25.0, "cost_price": 15.0, "threshold": 5}')
echo $INV_RES

echo "\n[PASS] Phase 3 Verification Complete."
