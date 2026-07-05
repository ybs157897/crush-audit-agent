# Start Crush API server and the web frontend.
# Usage:
#   .\scripts\start-web.ps1
#   .\scripts\start-web.ps1 -NoBrowser
#   .\scripts\start-web.ps1 -ApiPort 7600 -WebPort 3000

[CmdletBinding()]
param(
    [int] $ApiPort = 7600,
    [int] $WebPort = 3000,
    [switch] $NoBrowser,
    [switch] $Force
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$CrushExe = Join-Path $Root "crush.exe"
$WebDir = Join-Path $Root "web"
$ApiUrl = "http://127.0.0.1:$ApiPort"
$WebUrl = "http://localhost:$WebPort"

function Test-PortListening {
    param([int] $Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-HttpReady {
    param(
        [string] $Url,
        [int] $TimeoutSec = 30
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    return $false
}

if (-not (Test-Path $CrushExe)) {
    Write-Error "未找到 crush.exe。请先在项目根目录执行: go build -o crush.exe ."
}

if (-not (Test-Path $WebDir)) {
    Write-Error "未找到 web 目录: $WebDir"
}

if ((Test-PortListening -Port $ApiPort) -and -not $Force) {
    Write-Host "Crush API 已在端口 $ApiPort 运行，跳过启动。" -ForegroundColor Yellow
} else {
    if ($Force -and (Test-PortListening -Port $ApiPort)) {
        & (Join-Path $PSScriptRoot "stop-web.ps1") -ApiPort $ApiPort -WebPort $WebPort -Quiet
        Start-Sleep -Seconds 1
    }

    Write-Host "启动 Crush API ($ApiUrl) ..."
    Start-Process `
        -FilePath $CrushExe `
        -ArgumentList @("server", "-H", "tcp://127.0.0.1:$ApiPort") `
        -WorkingDirectory $Root `
        -WindowStyle Minimized | Out-Null

    if (-not (Wait-HttpReady -Url "$ApiUrl/v1/workspaces")) {
        Write-Error "Crush API 启动超时，请检查 crush.exe 是否正常。"
    }
    Write-Host "Crush API 已就绪: $ApiUrl" -ForegroundColor Green
}

if ((Test-PortListening -Port $WebPort) -and -not $Force) {
    Write-Host "Web 前端已在端口 $WebPort 运行，跳过启动。" -ForegroundColor Yellow
} else {
    if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
        Write-Host "安装 Web 依赖 (npm install) ..."
        Push-Location $WebDir
        npm install
        Pop-Location
    }

    Write-Host "启动 Web 前端 (http://localhost:$WebPort) ..."
    $viteCmd = "Set-Location '$WebDir'; npm run dev -- --port $WebPort"
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-Command", $viteCmd) `
        -WorkingDirectory $WebDir | Out-Null

    if (-not (Wait-HttpReady -Url $WebUrl)) {
        Write-Error "Web 前端启动超时，请查看 Vite 窗口日志。"
    }
    Write-Host "Web 前端已就绪: $WebUrl" -ForegroundColor Green
}

if (-not $NoBrowser) {
    Start-Process $WebUrl
}

Write-Host ""
Write-Host "全部就绪。" -ForegroundColor Cyan
Write-Host "  API: $ApiUrl"
Write-Host "  Web: $WebUrl"
Write-Host "停止服务: .\scripts\stop-web.ps1"
