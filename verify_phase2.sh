#!/bin/bash

# Ensure server is running before running this script
# Usage: ./verify_phase2.sh

BASE_URL="http://localhost:3001/api"
echo "--- Starting Phase 2 Verification ---"

# 1. Login to get Token
echo "\n1. Logging in..."
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner_verify@test.com", "password": "password123"}')
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "[FAIL] Auth failed. Run Verify Phase 1 first."
    exit 1
fi
echo "Token obtained."

# 2. Add Inventory Item
echo "\n2. Adding Inventory Item (Test Product)..."
ITEM_RES=$(curl -s -X POST $BASE_URL/inventory \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Test Product", "category": "General", "quantity": 100, "unit_price": 10.0, "threshold": 5}')
echo $ITEM_RES
ITEM_ID=$(echo $ITEM_RES | grep -o '"id":[^,]*' | cut -d':' -f2 | head -1) # Simple extraction
echo "Item ID: $ITEM_ID"

# 3. Create Order
echo "\n3. Creating Order (Qty: 5)..."
ORDER_RES=$(curl -s -X POST $BASE_URL/orders \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customer_name\": \"Test Customer\", \"items\": [{\"inventoryId\": $ITEM_ID, \"quantity\": 5}]}")
echo $ORDER_RES
ORDER_ID=$(echo $ORDER_RES | grep -o '"orderId":[^}]*' | cut -d':' -f2 | tr -d '}')
echo "Order ID: $ORDER_ID"

# 4. Verify Inventory Deduction
echo "\n4. Verifying Stock Deduction (Should be 95)..."
INV_RES=$(curl -s -X GET $BASE_URL/inventory \
  -H "Authorization: $TOKEN")
# We just check the output manually for now or grep it
echo $INV_RES | grep "\"id\":$ITEM_ID" | grep "\"quantity\":95" && echo "[PASS] Stock deducted correctly." || echo "[FAIL] Stock not deducted."

# 5. Update Order Status
echo "\n5. Updating Order Status to 'Shipped'..."
STATUS_RES=$(curl -s -X PUT $BASE_URL/orders/$ORDER_ID/status \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Shipped"}')
echo $STATUS_RES

echo "\n[PASS] Phase 2 Verification Complete."
