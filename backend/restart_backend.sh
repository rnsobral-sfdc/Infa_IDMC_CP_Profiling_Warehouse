#!/bin/bash

echo "Stopping existing backend servers..."

# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

sleep 2

echo "Starting backend server with auto-reload..."
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -f venv/bin/activate ]; then
    source venv/bin/activate
fi

echo "Backend starting at http://localhost:8000"
echo "API docs at http://localhost:8000/docs"
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
