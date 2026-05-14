@echo off
echo ========================================
echo Starting IDMC Profiling Data Warehouse
echo ========================================
echo.

REM Get the script directory
cd /d %~dp0

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [Step 1/6] Checking backend dependencies...
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo OK - Virtual environment created
) else (
    echo OK - Virtual environment exists
)

echo.
echo [Step 2/6] Installing/updating Python packages...
cd backend
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Python packages
    pause
    exit /b 1
)
cd ..
echo OK - Python packages ready

echo.
echo [Step 3/6] Checking backend configuration...
if not exist ".env" (
    echo Generating encryption key...
    cd backend
    call venv\Scripts\activate.bat
    python generate_env.py
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to generate .env file
        pause
        exit /b 1
    )
    cd ..
) else (
    echo OK - .env file exists
)

echo.
echo [Step 4/6] Initializing database...
cd backend
call venv\Scripts\activate.bat
python -c "from app.core.database import init_db; init_db()" 2>nul
cd ..
echo OK - Database ready

echo.
echo [Step 5/6] Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo Installing Node.js packages...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install Node.js packages
        pause
        exit /b 1
    )
    echo OK - Node.js packages installed
) else (
    echo Checking for updates...
    call npm install --silent
    echo OK - Node.js packages ready
)
cd ..

echo.
echo [Step 6/6] Starting servers...
echo.

echo Starting Backend (FastAPI)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
timeout /t 3 >nul

echo Starting Frontend (Next.js)...
start "Frontend - Next.js" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000 (check Frontend window if different)
echo API Docs: http://localhost:8000/docs
echo.
echo To stop the servers, press Ctrl+C in each window
echo.
echo Press any key to close this setup window...
pause >nul
