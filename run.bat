@echo off
TITLE BloodChain AI — Enterprise System Launcher
COLOR 0A

echo ====================================================================
echo                   BLOODCHAIN AI PLATFORM LAUNCHER
echo ====================================================================
echo.

:: Set UTF-8 encoding for Python to prevent charmap codec errors on Windows
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

:: Clean up any existing processes on required ports to prevent "Address already in use" errors
echo Checking and clearing active ports 8000, 8001, and 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo Releasing port 8000 with PID %%a
    taskkill /f /t /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo Releasing port 8001 with PID %%a
    taskkill /f /t /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo Releasing port 5173 with PID %%a
    taskkill /f /t /pid %%a >nul 2>&1
)

echo Ports are clean and ready.
echo.
echo Initializing services...
echo.

:: 1. Launch FastAPI ML Service (Port 8001)
echo [1/3] Launching Python FastAPI ML Service (Port 8001)...
start "BloodChain ML Service (Port 8001)" cmd /k "cd /d %~dp0ml-service && python app/main.py"

:: 2. Launch Django REST Framework Backend (Port 8000)
echo [2/3] Launching Django REST Framework Enterprise Backend (Port 8000)...
start "BloodChain Django Backend (Port 8000)" cmd /k "cd /d %~dp0backend && python manage.py migrate && python manage.py runserver 8000"

:: 3. Launch Vite Frontend Dev Server (Port 5173)
echo [3/3] Launching React / Vite Frontend Application (Port 5173)...
start "BloodChain Frontend UI (Port 5173)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ====================================================================
echo              SUCCESS! ALL 3 SYSTEM SERVICES LAUNCHED
echo ====================================================================
echo.
echo  - Frontend Web UI:        http://localhost:5173
echo  - Django REST API:        http://localhost:8000/api/
echo  - Django Admin Portal:    http://localhost:8000/admin/
echo  - FastAPI ML Service:     http://localhost:8001
echo  - FastAPI Swagger Docs:   http://localhost:8001/docs
echo.
echo  - Database Target:        Neon Cloud PostgreSQL (via .env)
echo.
echo Close the individual terminal windows to stop the services.
echo ====================================================================
echo.
pause
