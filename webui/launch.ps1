#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Launch the complete WebUI stack (backend + frontend)
  
.DESCRIPTION
  Starts the FastAPI backend server on port 7432 and the Vite dev server on port 5173.
  Opens the browser automatically and provides a unified interface for managing both processes.

.PARAMETER NoBrowser
  Skip opening the browser automatically
  
.PARAMETER Port
  Backend port (default: 7432)

.PARAMETER FrontendPort
  Frontend port (default: 5173)

.EXAMPLE
  ./launch.ps1
  # Starts backend and frontend, opens browser
  
  ./launch.ps1 -NoBrowser
  # Starts both but doesn't open browser
  
  ./launch.ps1 -Port 8000 -FrontendPort 3000
  # Uses custom ports

.NOTES
  Requires Python 3.10+ and Node.js 18+
  Press Ctrl+C to stop both servers gracefully
#>
param(
  [switch]$NoBrowser,
  [int]$Port = 7432,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'
$WarningPreference = 'SilentlyContinue'

# Colors
$colors = @{
  success = [System.ConsoleColor]::Green
  error = [System.ConsoleColor]::Red
  warning = [System.ConsoleColor]::Yellow
  info = [System.ConsoleColor]::Cyan
  header = [System.ConsoleColor]::Magenta
}

function Write-Color {
  param([string]$Message, [System.ConsoleColor]$Color = 'White')
  Write-Host $Message -ForegroundColor $Color
}

function Get-RepoRoot {
  $current = Get-Location
  while ($current -ne $current.Parent) {
    if (Test-Path "$current/.git") {
      return $current
    }
    $current = $current.Parent
  }
  throw "Could not find repo root"
}

# Header
Clear-Host
Write-Color "╔═══════════════════════════════════════════════════╗" $colors.header
Write-Color "║         ROBLOX AGENCY WEBUI LAUNCHER              ║" $colors.header
Write-Color "╚═══════════════════════════════════════════════════╝" $colors.header
Write-Host ""

# Validate environment
Write-Color "Checking environment..." $colors.info
$repoRoot = Get-RepoRoot
$webuiDir = "$repoRoot/webui"
$serverDir = "$webuiDir/server"
$clientDir = "$webuiDir/client"

@(
  @{ name = "Repo root"; path = $repoRoot; type = "directory" }
  @{ name = "WebUI"; path = $webuiDir; type = "directory" }
  @{ name = "Backend"; path = $serverDir; type = "directory" }
  @{ name = "Frontend"; path = $clientDir; type = "directory" }
  @{ name = "Python"; cmd = "python --version"; type = "command" }
  @{ name = "Node.js"; cmd = "node --version"; type = "command" }
  @{ name = "npm"; cmd = "npm --version"; type = "command" }
) | ForEach-Object {
  if ($_.type -eq "directory") {
    if (-not (Test-Path $_.path)) {
      Write-Color "  ✗ $($_.name) not found: $($_.path)" $colors.error
      exit 1
    }
    Write-Color "  ✓ $($_.name)" $colors.success
  } else {
    $result = & cmd /c "$($_.cmd) 2>&1"
    if ($LASTEXITCODE -eq 0) {
      Write-Color "  ✓ $($_.name): $($result)" $colors.success
    } else {
      Write-Color "  ✗ $($_.name) not found" $colors.error
      exit 1
    }
  }
}

Write-Host ""
Write-Color "Starting servers..." $colors.info

# Start backend
Write-Color "  → Backend on http://127.0.0.1:$Port" $colors.info
$backendProc = Start-Process `
  -FilePath python `
  -ArgumentList "-m uvicorn webui.server.main:app --host 127.0.0.1 --port $Port --reload" `
  -WorkingDirectory $repoRoot `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $backendProc) {
  Write-Color "  ✗ Failed to start backend" $colors.error
  exit 1
}

Write-Color "  ✓ Backend started (PID: $($backendProc.Id))" $colors.success

# Wait for backend to be ready
Write-Host "  Waiting for backend to be ready..." -NoNewline
$maxWait = 10
$waited = 0
while ($waited -lt $maxWait) {
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/v1/games/" -TimeoutSec 1 -ErrorAction SilentlyContinue
    Write-Host " ✓" -ForegroundColor Green
    break
  } catch {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
    $waited++
  }
}

if ($waited -eq $maxWait) {
  Write-Color "  ⚠ Backend may not be fully ready (continuing anyway)" $colors.warning
}

# Start frontend
Write-Color "  → Frontend on http://127.0.0.1:$FrontendPort" $colors.info
$frontendProc = Start-Process `
  -FilePath npm `
  -ArgumentList "run dev -- --host 127.0.0.1 --port $FrontendPort" `
  -WorkingDirectory $clientDir `
  -PassThru `
  -WindowStyle Normal `
  -ErrorAction SilentlyContinue

if (-not $frontendProc) {
  Write-Color "  ✗ Failed to start frontend" $colors.error
  Stop-Process -Id $backendProc.Id -Force
  exit 1
}

Write-Color "  ✓ Frontend started (PID: $($frontendProc.Id))" $colors.success

Write-Host ""
Write-Color "╔═══════════════════════════════════════════════════╗" $colors.header
Write-Color "║              SERVERS RUNNING                      ║" $colors.header
Write-Color "╚═══════════════════════════════════════════════════╝" $colors.header
Write-Host ""
Write-Color "  Backend API:    http://127.0.0.1:$Port/api/v1/" $colors.info
Write-Color "  Frontend:       http://127.0.0.1:$FrontendPort" $colors.info
Write-Color "  WebSocket:      ws://127.0.0.1:$Port/ws" $colors.info
Write-Host ""
Write-Color "  Backend logs:   Press Ctrl+C to stop gracefully" $colors.warning
Write-Host ""

# Open browser if not suppressed
if (-not $NoBrowser) {
  Write-Host "  Opening browser..." -NoNewline
  Start-Sleep -Seconds 2  # Give frontend time to start
  Start-Process "http://127.0.0.1:$FrontendPort" -ErrorAction SilentlyContinue
  Write-Color " ✓" $colors.success
}

# Setup graceful shutdown
$stopRequested = $false
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
  $stopRequested = $true
} | Out-Null

# Monitor processes
Write-Host ""
while ($true) {
  # Check if processes are still running
  $backendAlive = Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue
  $frontendAlive = Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue

  if (-not $backendAlive -or -not $frontendAlive) {
    Write-Host ""
    Write-Color "One or more servers stopped. Cleaning up..." $colors.warning
    
    if ($backendAlive) {
      Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendAlive) {
      Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    }
    break
  }

  Start-Sleep -Seconds 1
}

Write-Color "Goodbye! 👋" $colors.success
exit 0
