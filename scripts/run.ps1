# ============================================================
# UPTIME STUDENT APP — LOCAL RUNNER
# Uses the saved SQL Server connection string (Windows
# Authentication by default), then runs the app on
# http://localhost:5000.
#
#   .\scripts\run.ps1
#   .\scripts\run.ps1 -Open        # also opens the browser
# ============================================================

[CmdletBinding()]
param(
    [switch]$Open,
    [int]$Port = 5000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$secrets = Join-Path $env:APPDATA 'Microsoft\UserSecrets\UptimeStudentApp-LocalDevelopment\secrets.json'
$appSettings = Join-Path $root 'appsettings.json'

# ---------- find the configured database connection ----------

$connection = $env:UPTIME_DB_CONNECTION
if (-not $connection) { $connection = $env:ConnectionStrings__DefaultConnection }
if (-not $connection -and (Test-Path $secrets)) {
    $saved = Get-Content $secrets -Raw | ConvertFrom-Json
    $connection = $saved.'ConnectionStrings:DefaultConnection'
}
if (-not $connection -and (Test-Path $appSettings)) {
    $settings = Get-Content $appSettings -Raw | ConvertFrom-Json
    $connection = $settings.ConnectionStrings.DefaultConnection
}

if ([string]::IsNullOrWhiteSpace($connection)) {
    Write-Host 'No database connection was found.' -ForegroundColor Red
    Write-Host 'Set UPTIME_DB_CONNECTION or configure ConnectionStrings:DefaultConnection.' -ForegroundColor Yellow
    exit 1
}

# ---------- sanity-check the database ----------

if ($connection -match '(?i)(Host|Server)\s*=\s*(localhost|127\.0\.0\.1|\(local\)|\.|\[?::1\]?)') {
    Write-Host 'The connection string points at a local database server.' -ForegroundColor Gray
    Write-Host 'Make sure that the SQL Server instance is running before continuing.' -ForegroundColor Gray
}
else {
    Write-Host 'Using the database server from user-secrets / environment.' -ForegroundColor Gray
}

$env:ASPNETCORE_ENVIRONMENT = 'Development'

if ($Open) {
    Start-Job -ScriptBlock {
        param($url)
        Start-Sleep -Seconds 5
        Start-Process $url
    } -ArgumentList "http://localhost:$Port" | Out-Null
}

Write-Host ''
Write-Host 'Starting Uptime Student App' -ForegroundColor Cyan
Write-Host "  App:     http://localhost:$Port"
Write-Host "  Swagger: http://localhost:$Port/swagger"
Write-Host "  Health:  http://localhost:$Port/health"
Write-Host '  Press Ctrl+C to stop.'
Write-Host ''

dotnet run --project (Join-Path $root 'UptimeStudentApp.csproj') --urls "http://localhost:$Port"
