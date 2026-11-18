# ============================================================
# UPTIME STUDENT APP — CONNECT SQL SERVER (WINDOWS AUTHENTICATION)
#
# Creates the Uptime database and schema on a SQL Server instance
# if they are missing, then saves the connection string in .NET
# user-secrets. No password is needed or stored: the app connects
# with the Windows identity of whoever runs it.
#
#   .\scripts\connect-sqlserver.ps1
#   .\scripts\connect-sqlserver.ps1 -Server "192.168.1.162" -Database "Uptime"
# ============================================================

[CmdletBinding()]
param(
    [string]$Server = '192.168.1.162',
    [int]$Port = 1433,
    [string]$Database = 'Uptime'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# ---------- locate sqlcmd ----------

$sqlcmd = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
if (-not $sqlcmd) {
    $candidates = @(
        'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
        'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
    ) | Where-Object { Test-Path $_ }
    if ($candidates) { $sqlcmd = $candidates[0] }
}
if (-not $sqlcmd) {
    throw 'sqlcmd was not found. Install SQL Server Command Line Tools (ODBC 17/18) or SQL Server Management Studio.'
}

# ---------- create the database if it is missing ----------

Write-Host ''
Write-Host 'Connect Uptime to SQL Server' -ForegroundColor Cyan
Write-Host "  Server:   $Server,$Port (Windows Authentication)"
Write-Host "  Database: $Database"
Write-Host ''

$sqlServer = "tcp:$Server,$Port"
$databaseExists = & $sqlcmd -S $sqlServer -E -l 5 -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$Database';"
if ($LASTEXITCODE -ne 0) {
    throw "Could not reach SQL Server at $Server. Check the server name, that SQL Server allows remote connections, and that TCP/IP is enabled."
}

if (($databaseExists | Select-Object -First 1) -ne '1') {
    Write-Host "Creating database $Database..." -ForegroundColor Yellow
    & $sqlcmd -S $sqlServer -E -Q "CREATE DATABASE [$Database];"
    if ($LASTEXITCODE -ne 0) { throw "Could not create database $Database." }
    Write-Host "  database created" -ForegroundColor Green
}
else {
    Write-Host "  database $Database already exists" -ForegroundColor Green
}

# ---------- apply the schema if the tables are missing ----------

$tableCount = & $sqlcmd -S $sqlServer -E -d $Database -l 5 -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = N'dbo' AND TABLE_NAME LIKE N'Uptime%';"
if (($tableCount | Select-Object -First 1) -ne '9') {
    $schema = Join-Path $root 'database\Uptime_SQLServer.sql'
    if (-not (Test-Path $schema)) { throw "Missing schema file: $schema" }

    Write-Host '  applying the schema...' -ForegroundColor Yellow
    & $sqlcmd -S $sqlServer -E -d $Database -b -i $schema
    if ($LASTEXITCODE -ne 0) { throw 'The schema script failed. See the sqlcmd output above.' }

    $tableCount = & $sqlcmd -S $sqlServer -E -d $Database -l 5 -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = N'dbo' AND TABLE_NAME LIKE N'Uptime%';"
    Write-Host "  schema ready: $(($tableCount | Select-Object -First 1)) tables" -ForegroundColor Green
}
else {
    Write-Host '  schema already present (9 tables)' -ForegroundColor Green
}

# ---------- save the connection string outside the project ----------

$projText = Get-Content (Join-Path $root 'UptimeStudentApp.csproj') -Raw
$match = [regex]::Match($projText, '<UserSecretsId>\s*([^<]+?)\s*</UserSecretsId>')
if (-not $match.Success) { throw 'The project has no <UserSecretsId>.' }

$secretsFolder = Join-Path $env:APPDATA "Microsoft\UserSecrets\$($match.Groups[1].Value)"
$secretsFile = Join-Path $secretsFolder 'secrets.json'
New-Item -ItemType Directory -Path $secretsFolder -Force | Out-Null

$settings = @{}
if (Test-Path $secretsFile) {
    $current = Get-Content $secretsFile -Raw | ConvertFrom-Json
    foreach ($property in $current.PSObject.Properties) {
        $settings[$property.Name] = $property.Value
    }
}

$connectionString = "Server=$Server,$Port;Database=$Database;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=True;"
$previous = $settings['ConnectionStrings:DefaultConnection']
if ($previous -and $previous -ne $connectionString) {
    $backup = "$secretsFile.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $secretsFile $backup -Force
    Write-Host "  previous connection string backed up to: $backup" -ForegroundColor Yellow
}

$settings['ConnectionStrings:DefaultConnection'] = $connectionString
$settings | ConvertTo-Json -Depth 5 | Set-Content -Path $secretsFile -Encoding UTF8
Write-Host '  connection string saved to .NET user-secrets' -ForegroundColor Green

if ($env:UPTIME_DB_CONNECTION) {
    Write-Host ''
    Write-Host 'Note: UPTIME_DB_CONNECTION is set in this terminal and overrides the saved secret.' -ForegroundColor Yellow
    Write-Host '      Close this terminal or set it to the same string before running the app.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'SQL Server connection ready.' -ForegroundColor Cyan
Write-Host "  Server:   $Server"
Write-Host "  Port:     $Port"
Write-Host "  Database: $Database"
Write-Host '  Auth:     Windows (Integrated Security) - no password'
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Green
Write-Host '  1. Start the app:  .\scripts\run.ps1 -Open'
Write-Host '  2. Check:          http://localhost:5000/health'
Write-Host '  3. Seed demo data: http://localhost:5000/swagger -> POST /api/demo/seed'
