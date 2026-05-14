#!/bin/bash
echo "========================================"
echo "Starting IDMC Profiling Data Warehouse"
echo "========================================"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.10+ from https://www.python.org/downloads/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

echo "[Step 1/6] Checking backend dependencies..."
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment exists"
fi

echo ""
echo "[Step 2/6] Installing/updating Python packages..."
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python packages"
    exit 1
fi
cd ..
echo "✓ Python packages ready"

echo ""
echo "[Step 3/6] Checking backend configuration..."
if [ ! -f ".env" ]; then
    echo "Generating encryption key..."
    cd backend
    source venv/bin/activate
    python3 generate_env.py
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to generate .env file"
        exit 1
    fi
    cd ..
else
    echo "✓ .env file exists"
fi

echo ""
echo "[Step 4/6] Initializing database..."
cd backend
source venv/bin/activate
python3 -c "from app.core.database import init_db; init_db()" 2>/dev/null
cd ..
echo "✓ Database ready"

echo ""
echo "[Step 5/6] Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js packages..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install Node.js packages"
        exit 1
    fi
    echo "✓ Node.js packages installed"
else
    echo "Checking for updates..."
    npm install --silent
    echo "✓ Node.js packages ready"
fi
cd ..

echo ""
echo "[Step 6/6] Starting servers..."
echo ""

# Detect OS to use appropriate terminal command
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Starting Backend (FastAPI)..."
    osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && source venv/bin/activate && uvicorn app.main:app --reload --port 8000\""
    sleep 2

    echo "Starting Frontend (Next.js)..."
    osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm run dev\""
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Starting Backend (FastAPI)..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$SCRIPT_DIR/backend' && source venv/bin/activate && uvicorn app.main:app --reload --port 8000; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$SCRIPT_DIR/backend' && source venv/bin/activate && uvicorn app.main:app --reload --port 8000" &
    else
        echo "No suitable terminal found. Please run manually:"
        echo "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
    fi
    sleep 2

    echo "Starting Frontend (Next.js)..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$SCRIPT_DIR/frontend' && npm run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$SCRIPT_DIR/frontend' && npm run dev" &
    else
        echo "No suitable terminal found. Please run manually:"
        echo "  cd frontend && npm run dev"
    fi
fi

echo ""
echo "========================================"
echo "Servers Started Successfully!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "To stop the servers, press Ctrl+C in each terminal window"
echo ""
