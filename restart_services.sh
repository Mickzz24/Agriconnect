#!/bin/bash

# Kill ports 3001 (Node) and 5001 (Flask)
echo "Stopping existing services..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null

echo "Starting AgriConnect..."

# Start Flask in background
cd backend_flask
python3 app.py > ../flask.log 2>&1 &
FLASK_PID=$!
cd ..

# Start Node in background
node server.js > server.log 2>&1 &
NODE_PID=$!

echo "Services started!"
echo "Node PID: $NODE_PID (Port 3001)"
echo "Flask PID: $FLASK_PID (Port 5001)"
echo "Logs available in server.log and flask.log"
