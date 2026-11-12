# Uptime Student App

Uptime is a .NET 10 ASP.NET Core application with an Entity Framework Core API and a static HTML/CSS/JavaScript frontend served by the same app. PostgreSQL is the application database. The project does **not** implement login, passwords, roles, or tokens: the browser remembers a selected student profile in `localStorage`. Do not expose this demo API to an untrusted network.

## Requirements

- Windows 10/11, .NET 10 SDK, and Visual Studio Code.
- PostgreSQL 15 or later, listening on `localhost:5432` (change the connection string if your server uses another port).
- PostgreSQL command-line tools (`psql`) on `PATH`.
- A separate PostgreSQL application role named `uptime_app`; do not run the application as `postgres`.

## Create the database and application role

Start the installed PostgreSQL service from an elevated PowerShell window if it is stopped:

```powershell
Get-Service postgresql-x64-15
Start-Service postgresql-x64-15
```

Connect to the PostgreSQL server as its administrator. Enter the administrator password only at the prompt:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres
```

At the `psql` prompt, create the application role and set its password using PostgreSQL's hidden password prompt:

```sql
CREATE ROLE uptime_owner NOLOGIN;
CREATE ROLE uptime_app LOGIN;
\password uptime_app
CREATE DATABASE "Uptime" OWNER uptime_owner;
\q
```

If the role or database already exists, do not drop or recreate it. Reuse it and ask the PostgreSQL administrator to grant the schema-owner role the required schema permissions. If your administrator login is unavailable, ask the PostgreSQL administrator to create the roles and database; do not put the administrator password in project files.

## Initialize the schema

Back up any existing database before changing its schema. From the project root, run the idempotent PostgreSQL schema script as the PostgreSQL administrator. It temporarily assumes the non-login `uptime_owner` role; the application login receives only the table/sequence permissions needed for normal reads and writes:

```powershell
psql -h localhost -p 5432 -U postgres -d Uptime -v ON_ERROR_STOP=1 -f .\database\Uptime_PostgreSQL.sql
```

The script creates the nine tables used by the current EF model (`UptimeStudentProfiles`, `UptimeRingtones`, `UptimeClassSchedules`, `UptimeCalendarEvents`, `UptimeExpenses`, `UptimeStudentTasks`, `UptimeStudySessions`, `UptimeStudentSettings`, and `UptimeAlarms`), indexes, constraints and missing ringtone seed rows. It uses `CREATE TABLE IF NOT EXISTS` and does not delete or copy existing records. PostgreSQL supports timestamp precision up to 6 digits, so the script uses `timestamp(6)` for the source schema's `timestamp(7)` fields.

The script is for a new/compatible PostgreSQL schema; `IF NOT EXISTS` does not repair an existing table whose columns or constraints differ. The earlier SQL Server scripts under `database/` are historical SQL Server scripts and must **not** be run on PostgreSQL. This project has no automatic SQL Server-to-PostgreSQL data-copy tool. To move records from a separate SQL Server database, take a backup and perform a separately verified export/import before switching the application; the SQL Server source must be reachable and its schema/data must be checked first. This setup script is deliberately non-destructive and will not silently overwrite an existing PostgreSQL database.

## Configure the application connection

Store the application connection string in .NET user-secrets (outside the project directory). Replace the password prompt value locally; do not share or commit it:

```powershell
$password = Read-Host "PostgreSQL password for uptime_app" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $connectionString = "Host=localhost;Port=5432;Database=Uptime;Username=uptime_app;Password=$plainPassword"
    dotnet user-secrets set "ConnectionStrings:Uptime" $connectionString --project .\UptimeStudentApp.csproj
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    Remove-Variable plainPassword, connectionString, password -ErrorAction SilentlyContinue
}
```

The application also accepts `UPTIME_DB_CONNECTION` or the standard `ConnectionStrings__Uptime` environment variable. `UPTIME_DB_CONNECTION` takes precedence. There is intentionally no hard-coded fallback, so a missing connection string is reported instead of attempting a SQL Server or superuser connection. User-secrets are for local development; use your deployment platform's secret manager/environment injection outside development.

## Build and run in VS Code

Open the project root in VS Code and use its integrated PowerShell terminal. After configuring the secret above:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet restore .\UptimeStudentApp.csproj
dotnet build .\UptimeStudentApp.csproj --no-restore
dotnet run --project .\UptimeStudentApp.csproj --urls http://localhost:5000
```

Open the website at <http://localhost:5000>. The API is served on the same origin; no separate frontend server is required. Swagger UI is at <http://localhost:5000/swagger>, and the database-aware health check is at <http://localhost:5000/health>. `/health` returns `200` only when PostgreSQL is reachable and `503` when the database is unavailable.

### Run with VS Code

After creating the local user-secret, select **Launch Uptime API** in the Run and Debug panel and press **F5**. The project build task runs first, the API listens on port 5000, and VS Code opens the site when the server is ready. This requires the Microsoft C# extension in VS Code. Alternatively, use the terminal commands above.

To run again after restarting VS Code or Windows, start the PostgreSQL service, open the project folder, and press F5 or run the `dotnet run` command above. The user-secret is stored outside the project and persists across restarts. If PostgreSQL uses another service name or port, start that service and update the connection string.

## Current API routes

- `GET/POST /api/students`; `GET/PUT /api/students/{id}`; `GET /api/students/{id}/dashboard`; `GET/PUT /api/students/{id}/settings`
- `GET/POST /api/students/{studentId}/classes`; `PUT/DELETE /api/students/{studentId}/classes/{id}`
- `GET/POST /api/students/{studentId}/events`; `DELETE /api/students/{studentId}/events/{id}`
- `GET/POST /api/students/{studentId}/expenses`; `DELETE /api/students/{studentId}/expenses/{id}`
- `GET/POST/PUT/DELETE /api/students/{studentId}/tasks`
- `GET/POST/PUT/DELETE /api/students/{studentId}/alarms`; `PATCH /api/students/{studentId}/alarms/{id}/enabled`
- `GET /api/ringtones`
- `GET/POST /api/students/{studentId}/study-sessions`
- `GET /health`

The existing API does not include login/logout, event/expense update endpoints, or study-session update/delete endpoints. Those features are not invented as part of this database-provider migration.

## Verify the PostgreSQL database

Connect as the application role and inspect the created tables and preserved records:

```powershell
psql -h localhost -p 5432 -U uptime_app -d Uptime -c 'SELECT table_name FROM information_schema.tables WHERE table_schema = ''public'' ORDER BY table_name;'
psql -h localhost -p 5432 -U uptime_app -d Uptime -c 'SELECT COUNT(*) FROM "UptimeStudentProfiles";'
```

Check `http://localhost:5000/health` before using the app. A successful response includes `"database":"connected"`. Existing profiles can be loaded by the frontend and their settings, classes, alarms, calendar events, expenses, tasks, and study sessions remain linked by the existing student IDs.

## Troubleshooting

- **Connection refused:** verify the PostgreSQL service is running and listening on the configured host/port.
- **Password authentication failed:** reset the `uptime_app` password as the PostgreSQL administrator, then update the local user-secret.
- **Database unavailable at `/health`:** verify `Uptime` exists, `uptime_app` can connect, and the connection string's host/port/database/user are correct.
- **Missing relation/column:** compare the live schema with `database/Uptime_PostgreSQL.sql`. The create-if-missing script does not repair incompatible existing tables; back up and review a specific migration before applying it.
- **NuGet restore fails:** check internet/NuGet access and retry `dotnet restore .\UptimeStudentApp.csproj`.
- **Port 5000 is occupied:** stop the process using that port or choose another port consistently for the API URL.

## Authentication and data safety

This project intentionally has no authentication or authorization. A student ID stored in browser `localStorage` is not proof of identity, and API routes do not enforce ownership beyond filtering records by that ID. Do not expose the app or its database to the public internet. No password is stored in API responses because the current app has no user-password feature.
