@echo off
echo ============================================
echo IDMC Profiling Extractor - Backend Only
echo ============================================
echo.

echo Starting Backend API...
start "Backend API" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo Backend API started on http://localhost:8000

echo.
echo ============================================
echo Backend started successfully!
echo ============================================
echo.
echo Available URLs:
echo   - Backend API:     http://localhost:8000
echo   - API Docs:        http://localhost:8000/docs
echo.
echo To use the application:
echo   1. Open http://localhost:8000/docs in your browser
echo   2. Use the interactive API documentation
echo.
echo Press Ctrl+C in each window to stop services
echo.
pause
