@echo off
TITLE BloodChain AI — High-Speed Enterprise System Launcher
COLOR 0A

echo ====================================================================
echo             BLOODCHAIN AI PLATFORM — FAST LAUNCHER
echo ====================================================================
echo.

:: Set UTF-8 encoding for Python
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

:: Fast-clearing active ports (8000, 8001, 5173) in one single pass
echo Checking and releasing ports 8000, 8001, and 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000,8001,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Ports ready. Launching services concurrently...
echo.

:: 1. Launch FastAPI ML Service (Port 8001)
echo [1/3] Launching Python FastAPI ML Service (Port 8001)...
start "BloodChain ML Service (Port 8001)" cmd /k "cd /d %~dp0ml-service && python app/main.py"

:: 2. Launch Django REST Framework Backend (Port 8000)
echo [2/3] Launching Django REST Framework Backend (Port 8000)...
if "%1"=="--migrate" (
    echo       [Note: Running database migrations...]
    start "BloodChain Django Backend (Port 8000)" cmd /k "cd /d %~dp0backend && python manage.py migrate && python manage.py runserver 8000"
) else (
    start "BloodChain Django Backend (Port 8000)" cmd /k "cd /d %~dp0backend && python manage.py runserver 8000"
)

:: 3. Launch Vite Frontend Dev Server (Port 5173)
echo [3/3] Launching React / Vite Frontend UI (Port 5173)...
start "BloodChain Frontend UI (Port 5173)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ====================================================================
echo             SUCCESS! ALL 3 SERVICES LAUNCHED INSTANTLY
echo ====================================================================
echo.
echo  - Frontend Web UI:        http://localhost:5173
echo  - Django REST API:        http://localhost:8000/api/
echo  - Django Admin Portal:    http://localhost:8000/admin/
echo  - FastAPI ML Service:     http://localhost:8001
echo  - FastAPI Swagger Docs:   http://localhost:8001/docs
echo.
echo  - Note: Run 'run.bat --migrate' if you ever update database schemas.
echo ====================================================================
echo.
pause
