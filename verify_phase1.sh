#!/bin/bash

# Ensure server is running before running this script
# Usage: ./verify_phase1.sh

BASE_URL="http://localhost:3001/api"
echo "--- Starting Phase 1 Verification ---"

# 1. Register Owner
echo "\n1. Registering Owner (expecting 200 or 500 if exists)..."
REGISTER_RES=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "owner_verify", "email": "owner_verify@test.com", "password": "password123", "role": "owner"}')
echo "Response: $REGISTER_RES"

# Extract token
TOKEN=$(echo $REGISTER_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# If no token from register, try login
if [ -z "$TOKEN" ]; then
  echo "\nUser likely exists. Logging in..."
  LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "owner_verify@test.com", "password": "password123"}')
  echo "Login Response: $LOGIN_RES"
  TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo "\n[FAIL] Could not get auth token. Aborting."
    exit 1
else
    echo "\n[PASS] Auth Token verified."
fi

# 2. Add New Staff
echo "\n2. Adding Staff User..."
ADD_RES=$(curl -s -X POST $BASE_URL/users \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "staff_verify", "email": "staff_verify@test.com", "password": "password123", "role": "staff"}')
echo $ADD_RES

# 3. List Users
echo "\n3. Listing Users..."
LIST_RES=$(curl -s -X GET $BASE_URL/users -H "Authorization: $TOKEN")
echo $LIST_RES

# 4. Clean up (Delete the staff user we just created)
# Extract ID of staff_verify
STAFF_ID=$(curl -s -X GET $BASE_URL/users -H "Authorization: $TOKEN" | \
grep -o '{"id":[^}]*"username":"staff_verify"[^}]*}' | \
grep -o '"id":[^,]*' | cut -d':' -f2)

if [ ! -z "$STAFF_ID" ]; then
    echo "\n4. Deleting Test Staff User (ID: $STAFF_ID)..."
    DELETE_RES=$(curl -s -X DELETE $BASE_URL/users/$STAFF_ID -H "Authorization: $TOKEN")
    echo $DELETE_RES
    echo "\n[PASS] Cycle complete."
else
    echo "\n[WARN] Could not find created staff user to delete."
fi
