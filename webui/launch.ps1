param(
  [switch]$NoBrowser,
  [int]$Port = 7432,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'

function Find-RepoRoot {
  $current = Get-Location
  while ($current -ne $null) {
    if (Test-Path "$current\.git") {
      return $current
    }
    $current = $current.Parent
  }
  throw "Could not find repo root"
}

Clear-Host
Write-Host ""
Write-Host "ROBLOX AGENCY WEBUI LAUNCHER" -ForegroundColor Magenta
Write-Host ""

Write-Host "Checking environment..." -ForegroundColor Cyan

$repoRoot = Find-RepoRoot
$webuiDir = "$repoRoot\webui"
$serverDir = "$webuiDir\server"
$clientDir = "$webuiDir\client"

# Validate directories
if (-not (Test-Path $repoRoot)) {
  Write-Host "  ERROR: Repo root not found" -ForegroundColor Red
  exit 1
}
Write-Host "  OK: Repo root" -ForegroundColor Green

if (-not (Test-Path $webuiDir)) {
  Write-Host "  ERROR: WebUI not found" -ForegroundColor Red
  exit 1
}
Write-Host "  OK: WebUI" -ForegroundColor Green

if (-not (Test-Path $serverDir)) {
  Write-Host "  ERROR: Backend not found" -ForegroundColor Red
  exit 1
}
Write-Host "  OK: Backend" -ForegroundColor Green

if (-not (Test-Path $clientDir)) {
  Write-Host "  ERROR: Frontend not found" -ForegroundColor Red
  exit 1
}
Write-Host "  OK: Frontend" -ForegroundColor Green

# Check Python
$pythonVer = & python --version 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  OK: Python $pythonVer" -ForegroundColor Green
} else {
  Write-Host "  ERROR: Python not found" -ForegroundColor Red
  exit 1
}

# Check Node
$nodeVer = & node --version 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  OK: Node.js $nodeVer" -ForegroundColor Green
} else {
  Write-Host "  ERROR: Node.js not found" -ForegroundColor Red
  exit 1
}

# Check npm
$npmVer = & npm --version 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  OK: npm $npmVer" -ForegroundColor Green
} else {
  Write-Host "  ERROR: npm not found" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan

# Start backend
Write-Host "  Starting Backend on http://127.0.0.1:$Port" -ForegroundColor Cyan
$backendProc = Start-Process `
  -FilePath python `
  -ArgumentList "-m uvicorn webui.server.main:app --host 127.0.0.1 --port $Port --reload" `
  -WorkingDirectory $repoRoot `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $backendProc) {
  Write-Host "  ERROR: Failed to start backend" -ForegroundColor Red
  exit 1
}

Write-Host "  OK: Backend started (PID: $($backendProc.Id))" -ForegroundColor Green

# Wait for backend
Write-Host "  Waiting for backend..." -NoNewline
for ($i = 0; $i -lt 10; $i++) {
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/v1/games/" -TimeoutSec 1 -ErrorAction SilentlyContinue
    Write-Host " OK" -ForegroundColor Green
    break
  } catch {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
  }
}

# Start frontend
Write-Host "  Starting Frontend on http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
$frontendProc = Start-Process `
  -FilePath npm `
  -ArgumentList "run dev -- --host 127.0.0.1 --port $FrontendPort" `
  -WorkingDirectory $clientDir `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $frontendProc) {
  Write-Host "  ERROR: Failed to start frontend" -ForegroundColor Red
  Stop-Process -Id $backendProc.Id -Force
  exit 1
}

Write-Host "  OK: Frontend started (PID: $($frontendProc.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "SERVERS RUNNING" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Backend:  http://127.0.0.1:$Port/api/v1/" -ForegroundColor Cyan
Write-Host "  Frontend: http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
Write-Host "  WebSocket: ws://127.0.0.1:$Port/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Open browser
if (-not $NoBrowser) {
  Write-Host "  Opening browser..." -NoNewline
  Start-Sleep -Seconds 2
  Start-Process "http://127.0.0.1:$FrontendPort" -ErrorAction SilentlyContinue
  Write-Host " OK" -ForegroundColor Green
  Write-Host ""
}

# Monitor processes
while ($true) {
  $backendAlive = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
  $frontendAlive = Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue
  
  if (-not $backendAlive -or -not $frontendAlive) {
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
    if ($backendAlive) { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendAlive) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
    break
  }
  
  Start-Sleep -Seconds 1
}

Write-Host "Done." -ForegroundColor Green
