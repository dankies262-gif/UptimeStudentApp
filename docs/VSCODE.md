# Run Uptime from VS Code

## Database access

The app uses Microsoft SQL Server at `192.168.1.162,1433`, database `Uptime`,
with Windows Authentication. The app uses the Windows identity of the process
running it; on the demonstration workstation this is `NBC\\rshilongo`.

The project is configured in `appsettings.json`. Verify the server login and
the nine application tables with the SQL Server (mssql) extension or SSMS.
The optional `scripts/connect-sqlserver.ps1` uses `sqlcmd` to verify access and
can apply the idempotent SQL Server schema if the application tables are
missing. It does not drop or recreate an existing database or table.

Recommended VS Code extensions: C# Dev Kit, C#, SQL Server (mssql), and REST
Client.

## Start the application

1. Open the repository folder in VS Code.
2. Select **Run and Debug → Launch Uptime API + Swagger** and press **F5**, or
   run `.\scripts\run.ps1 -Open` in the integrated PowerShell terminal.
3. Use these local addresses:
   - Frontend: <http://localhost:5000>
   - Swagger: <http://localhost:5000/swagger>
   - Health/database check: <http://localhost:5000/health>

The frontend and API are served by the same ASP.NET Core process. In Chrome's
Network panel, requests to `/api/...` show the browser-to-API flow.

## Quick API demonstration

1. Run `GET /health`; expect HTTP 200 and `database: connected`.
2. Run `GET /api/students` and choose a profile ID.
3. Run `GET /api/students/{id}/dashboard`.
4. Run `GET /api/meta/schema` to inspect table counts and relationships.
5. Run `GET /api/students/{id}/calendar/ics` to show the calendar feed.
6. To demonstrate writes, create a clearly named demo task or expense, verify
   it in SQL Server, then remove only that demo row.

## Useful commands

```powershell
dotnet build
.\scripts\run.ps1 -Open
.\scripts\run.ps1 -Port 5080
```

The SQL Server Windows login must have database access and the permissions
needed for the demonstrated CRUD operations. If `/health` returns 503, verify
port 1433, TCP/IP, Windows authentication, and the API log.
