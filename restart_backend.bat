@echo off
echo Restarting Backend Server...
echo.

REM Find and kill process on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Stopping backend server (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Waiting for port to be released...
timeout /t 3 /nobreak >nul

echo.
echo Starting backend server...
cd backend
start "IDMC Backend" cmd /k "venv\Scripts\activate && uvicorn app.main:app --reload"

echo.
echo Backend server is starting...
echo Check the new window for server logs
echo.
pause
