# Start Crush API + Web + Electron desktop GUI.
# Usage: .\scripts\start-gui.ps1

[CmdletBinding()]
param(
    [int] $ApiPort = 7600,
    [int] $WebPort = 3000
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DesktopDir = Join-Path $Root "desktop"
$WebDir = Join-Path $Root "web"
$ApiUrl = "http://127.0.0.1:$ApiPort"
$WebUrl = "http://localhost:$WebPort"

function Test-PortListening {
    param([int] $Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-HttpReady {
    param([string] $Url, [int] $TimeoutSec = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

# --- Crush API ---
if (Test-PortListening -Port $ApiPort) {
    Write-Host "Crush API 已在端口 $ApiPort 运行。" -ForegroundColor Yellow
} else {
    $CrushExe = Join-Path $Root "crush.exe"
    if (-not (Test-Path $CrushExe)) {
        Write-Error "未找到 crush.exe，请先构建: go build -o crush.exe ."
    }
    Write-Host "启动 Crush API ($ApiUrl) ..."
    Start-Process `
        -FilePath $CrushExe `
        -ArgumentList @("server", "-H", "tcp://127.0.0.1:$ApiPort") `
        -WorkingDirectory $Root `
        -WindowStyle Minimized | Out-Null
    if (-not (Wait-HttpReady -Url "$ApiUrl/v1/workspaces")) {
        Write-Error "Crush API 启动超时"
    }
    Write-Host "Crush API 已就绪" -ForegroundColor Green
}

# --- Web frontend (Vite) ---
if (Test-PortListening -Port $WebPort) {
    Write-Host "Web 前端已在端口 $WebPort 运行。" -ForegroundColor Yellow
} else {
    if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
        Write-Host "安装 Web 依赖..."
        Push-Location $WebDir; npm install; Pop-Location
    }
    Write-Host "启动 Web 前端 ($WebUrl) ..."
    $viteCmd = "Set-Location '$WebDir'; npm run dev -- --port $WebPort"
    Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $viteCmd) -WorkingDirectory $WebDir | Out-Null
    if (-not (Wait-HttpReady -Url $WebUrl)) {
        Write-Error "Web 前端启动超时"
    }
    Write-Host "Web 前端已就绪" -ForegroundColor Green
}

# --- Electron ---
if (-not (Test-Path (Join-Path $DesktopDir "node_modules\electron"))) {
    Write-Host "安装 Electron 依赖（首次较慢）..."
    Push-Location $DesktopDir; npm install; Pop-Location
}

Write-Host "启动 Electron 桌面 GUI..." -ForegroundColor Cyan
$env:CRUSH_WEB_URL = $WebUrl
$env:CRUSH_WEB_PORT = "$WebPort"
$env:CRUSH_API_PORT = "$ApiPort"

Push-Location $DesktopDir
try {
    npm run dev
} finally {
    Pop-Location
}
