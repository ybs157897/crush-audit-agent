# Stop Crush API server and the web frontend.
# Usage:
#   .\scripts\stop-web.ps1

[CmdletBinding()]
param(
    [int] $ApiPort = 7600,
    [int] $WebPort = 3000,
    [switch] $Quiet
)

function Stop-PortListeners {
    param([int] $Port)

    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            if (-not $Quiet) {
                Write-Host "停止进程 $($proc.ProcessName) (PID $pid, 端口 $Port)"
            }
            Stop-Process -Id $pid -Force -ErrorAction Stop
        } catch {
            if (-not $Quiet) {
                Write-Warning "无法停止 PID $pid : $($_.Exception.Message)"
            }
        }
    }
}

Stop-PortListeners -Port $ApiPort
Stop-PortListeners -Port $WebPort

if (-not $Quiet) {
    Write-Host "已尝试停止端口 $ApiPort 和 $WebPort 上的服务。" -ForegroundColor Green
}
