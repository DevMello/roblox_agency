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

# Setup
Clear-Host
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║         ROBLOX AGENCY WEBUI LAUNCHER              ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

Write-Host "Checking environment..." -ForegroundColor Cyan

$repoRoot = Find-RepoRoot
$webuiDir = "$repoRoot\webui"
$serverDir = "$webuiDir\server"
$clientDir = "$webuiDir\client"

# Validate directories
$dirs = @(
  @{ name = "Repo root"; path = $repoRoot }
  @{ name = "WebUI"; path = $webuiDir }
  @{ name = "Backend"; path = $serverDir }
  @{ name = "Frontend"; path = $clientDir }
)

foreach ($dir in $dirs) {
  if (Test-Path $dir.path) {
    Write-Host "  ✓ $($dir.name)" -ForegroundColor Green
  } else {
    Write-Host "  ✗ $($dir.name) not found: $($dir.path)" -ForegroundColor Red
    exit 1
  }
}

# Check Python
try {
  $pythonVer = & python --version 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Python: $pythonVer" -ForegroundColor Green
  } else {
    throw "Python check failed"
  }
} catch {
  Write-Host "  ✗ Python not found" -ForegroundColor Red
  exit 1
}

# Check Node
try {
  $nodeVer = & node --version 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Node.js: $nodeVer" -ForegroundColor Green
  } else {
    throw "Node check failed"
  }
} catch {
  Write-Host "  ✗ Node.js not found" -ForegroundColor Red
  exit 1
}

# Check npm
try {
  $npmVer = & npm --version 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ npm: $npmVer" -ForegroundColor Green
  } else {
    throw "npm check failed"
  }
} catch {
  Write-Host "  ✗ npm not found" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan

# Start backend
Write-Host "  → Backend on http://127.0.0.1:$Port" -ForegroundColor Cyan
$backendProc = Start-Process `
  -FilePath python `
  -ArgumentList "-m uvicorn webui.server.main:app --host 127.0.0.1 --port $Port --reload" `
  -WorkingDirectory $repoRoot `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $backendProc) {
  Write-Host "  ✗ Failed to start backend" -ForegroundColor Red
  exit 1
}

Write-Host "  ✓ Backend started (PID: $($backendProc.Id))" -ForegroundColor Green

# Wait for backend ready
Write-Host "  Waiting for backend..." -NoNewline
$maxWait = 10
for ($i = 0; $i -lt $maxWait; $i++) {
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/v1/games/" -TimeoutSec 1 -ErrorAction SilentlyContinue
    Write-Host " ✓" -ForegroundColor Green
    break
  } catch {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
  }
}

if ($i -eq $maxWait) {
  Write-Host " ⚠" -ForegroundColor Yellow
}

# Start frontend
Write-Host "  → Frontend on http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
$frontendProc = Start-Process `
  -FilePath npm `
  -ArgumentList "run dev -- --host 127.0.0.1 --port $FrontendPort" `
  -WorkingDirectory $clientDir `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $frontendProc) {
  Write-Host "  ✗ Failed to start frontend" -ForegroundColor Red
  Stop-Process -Id $backendProc.Id -Force
  exit 1
}

Write-Host "  ✓ Frontend started (PID: $($frontendProc.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              SERVERS RUNNING                      ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Backend API:    http://127.0.0.1:$Port/api/v1/" -ForegroundColor Cyan
Write-Host "  Frontend:       http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
Write-Host "  WebSocket:      ws://127.0.0.1:$Port/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop gracefully" -ForegroundColor Yellow
Write-Host ""

# Open browser
if (-not $NoBrowser) {
  Write-Host "  Opening browser..." -NoNewline
  Start-Sleep -Seconds 2
  Start-Process "http://127.0.0.1:$FrontendPort" -ErrorAction SilentlyContinue
  Write-Host " ✓" -ForegroundColor Green
  Write-Host ""
}

# Monitor
while ($true) {
  if (-not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Backend stopped." -ForegroundColor Yellow
    Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    break
  }
  if (-not (Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Frontend stopped." -ForegroundColor Yellow
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    break
  }
  Start-Sleep -Seconds 1
}

Write-Host "Goodbye! 👋" -ForegroundColor Green
