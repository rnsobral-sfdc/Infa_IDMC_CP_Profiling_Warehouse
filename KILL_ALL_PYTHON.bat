@echo off
echo Killing all Python processes...
echo.

REM Kill all python.exe processes
taskkill /F /IM python.exe /T 2>nul

echo.
echo All Python processes killed.
echo You can now run START.bat to restart services.
echo.
pause
