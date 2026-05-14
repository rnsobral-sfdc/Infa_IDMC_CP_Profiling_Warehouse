@echo off
REM Clean Install Script - Removes warnings by cleaning dependencies
echo =========================================
echo IDMC Profiling - Clean Installation
echo =========================================
echo.

cd /d %~dp0

echo Step 1: Cleaning old installations...
echo ------------------------------------

if exist "frontend\node_modules\" (
    echo Removing frontend node_modules...
    rd /s /q frontend\node_modules
    echo OK - Removed
) else (
    echo OK - No frontend node_modules found
)

if exist "frontend\package-lock.json" (
    echo Removing frontend package-lock.json...
    del /f /q frontend\package-lock.json
    echo OK - Removed
) else (
    echo OK - No frontend package-lock.json found
)

if exist "frontend\.next\" (
    echo Removing frontend .next cache...
    rd /s /q frontend\.next
    echo OK - Removed
) else (
    echo OK - No frontend .next cache found
)

echo.
echo Step 2: Installing frontend packages (this may take a moment)...
echo ------------------------------------
cd frontend
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed
    pause
    exit /b 1
)

cd ..

echo.
echo =========================================
echo SUCCESS! Clean installation complete
echo =========================================
echo.
echo What was done:
echo OK - Removed old node_modules
echo OK - Removed old package-lock.json
echo OK - Removed Next.js cache
echo OK - Installed fresh dependencies
echo.
echo The deprecation warnings should now be minimal or gone.
echo.
pause
