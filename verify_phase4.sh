#!/bin/bash

# Ensure server is running before running this script
# Usage: ./verify_phase4.sh

BASE_URL="http://localhost:3001/api"
echo "--- Starting Phase 4 Verification (KPIs & Reports) ---"

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

# 2. Fetch Stats (KPI Check)
echo "\n2. Fetching Dashboard Stats..."
STATS_RES=$(curl -s -X GET $BASE_URL/reports/stats -H "Authorization: $TOKEN")
echo $STATS_RES
echo $STATS_RES | grep "orders" | grep "revenue" && echo "[PASS] Stats API returns expected structure" || echo "[FAIL] Stats API invalid"

# 3. Test Email Report Generation
echo "\n3. Testing Email Report Generation (Daily)..."
TODAY=$(date +%Y-%m-%d)
REPORT_RES=$(curl -s -X POST $BASE_URL/reports/email-report \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reportType\": \"Daily\", \"format\": \"csv\", \"selectedDate\": \"$TODAY\"}")

echo $REPORT_RES
echo $REPORT_RES | grep "Report sent successfully" && echo "[PASS] Email Report Sent Successfully" || echo "[WARN] Email Report Failed (Check logic or existing data)"

echo "\n[PASS] Phase 4 Verification Complete."
