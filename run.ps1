# BloodChain AI — High-Speed Enterprise System Launcher (PowerShell)
$Host.UI.RawUI.WindowTitle = "BloodChain AI — High-Speed Enterprise Launcher"

Write-Host "====================================================================" -ForegroundColor Green
Write-Host "             BLOODCHAIN AI PLATFORM — FAST LAUNCHER" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

Write-Host "Checking and releasing ports 8000, 8001, and 5173..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 8000,8001,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Ports ready. Launching services concurrently..." -ForegroundColor Green
Write-Host ""

$rootDir = $PSScriptRoot

# 1. ML Service (Port 8001)
Write-Host "[1/3] Launching Python FastAPI ML Service (Port 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\ml-service'; python app/main.py"

# 2. Django Backend (Port 8000)
Write-Host "[2/3] Launching Django REST Framework Backend (Port 8000)..." -ForegroundColor Cyan
if ($args -contains "--migrate") {
    Write-Host "       [Note: Running database migrations...]" -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; python manage.py migrate; python manage.py runserver 8000"
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; python manage.py runserver 8000"
}

# 3. Vite Frontend (Port 5173)
Write-Host "[3/3] Launching React / Vite Frontend UI (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir'; npm run dev"

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "             SUCCESS! ALL 3 SERVICES LAUNCHED INSTANTLY" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "  - Frontend Web UI:        http://localhost:5173"
Write-Host "  - Django REST API:        http://localhost:8000/api/"
Write-Host "  - Django Admin Portal:    http://localhost:8000/admin/"
Write-Host "  - FastAPI ML Service:     http://localhost:8001"
Write-Host "  - FastAPI Swagger Docs:   http://localhost:8001/docs"
Write-Host "===================================================================="
