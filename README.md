# Uptime Student App

Uptime is a student productivity web app built with ASP.NET Core 10, Entity
Framework Core 10, Microsoft SQL Server 2022, and a static HTML/CSS/JavaScript
frontend served by the API.

It brings a student's timetable, calendar, tasks, budget, focus sessions,
alarms, study insights, and assignment planner together in one dashboard. The
browser uses the same REST API documented by Swagger; records are stored in the
SQL Server database.

## Features

- Dashboard, weekly timetable, calendar, clash detection, and `.ics` sync.
- Tasks, assignment milestones, budget tracking, and study timer.
- Repeating alarms, bundled ringtones, browser notifications, and settings.
- Research hub, study recommendations, and presentation/demo tools.
- Live database schema/ERD view, safe table previews, and curated SQL queries.
- Profile photo uploads, profile switching, and JSON export.

## Architecture

```text
Chrome browser (wwwroot)
        | same-origin /api requests
ASP.NET Core 10 controllers and services + Swagger
        | Entity Framework Core 10
SQL Server 2022, database Uptime
```

The project is intentionally one ASP.NET Core application: it hosts the static
frontend, API, Swagger UI, and health check on the same origin.

## Database

`appsettings.json` contains the requested local Windows Authentication
connection:

```text
Server=192.168.1.162,1433;Database=Uptime;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=True;
```

Integrated Security uses the Windows identity running the app; on the
demonstration machine that must be `NBC\\rshilongo` and must have permission to
connect to `Uptime`. No SQL password is stored by the application.
`UPTIME_DB_CONNECTION` can override the configured connection string when
running in another environment.

The existing database has all nine application tables, their expected
relationships, and existing records. No schema migration was needed or applied.
`database/Uptime_SQLServer.sql` is the canonical idempotent SQL Server schema
for new/missing objects; it does not drop tables or rows. Back up the database
before any future destructive schema change.

## Run locally

Requirements: Windows, .NET 10 SDK, SQL Server network access, and a Windows
account permitted to access the `Uptime` database.

```powershell
.\scripts\run.ps1 -Open
```

The backend serves the frontend on port 5000:

- App: <http://localhost:5000>
- Swagger: <http://localhost:5000/swagger>
- Health/database check: <http://localhost:5000/health>

To select another port, use `.\scripts\run.ps1 -Port 5080`. To build without
starting the app, run `dotnet build`.

The optional `scripts/connect-sqlserver.ps1` verifies the Windows-authenticated
connection and applies the idempotent SQL Server schema only if the expected
tables are missing. It never drops or recreates the existing database.

## Deploy to Render

The local SQL Server at `192.168.1.162` is private to the campus network and
uses Windows Authentication, so Render's Linux container cannot reach it. The
hosted copy therefore runs the same EF Core model on a managed PostgreSQL
database. Nobody has to change code: `UPTIME_DB_PROVIDER` selects the provider.

`render.yaml` is a Blueprint that creates both pieces:

| Resource | Plan | Purpose |
| --- | --- | --- |
| `uptime-student-app` | free web service (Docker) | Runs the app from the root `Dockerfile`; Render injects `PORT`, which `Program.cs` honours. |
| `uptime-db` | free PostgreSQL | `UPTIME_DB_CONNECTION` is populated from the database automatically. |

The service also sets `UPTIME_DB_INITIALIZE=true`, so EF Core creates the nine
tables and seeds the ringtones on first boot. Open
<https://<service>.onrender.com/#/database> and the schema explorer labels
itself **PostgreSQL**; locally it still says **SQL Server**.

1. In the Render dashboard choose **New → Blueprint**.
2. Select the `dankies262-gif/UptimeStudentApp` repository and apply
   `render.yaml`.
3. Wait for the build, then load `/health`; it must return
   `"database":"connected"`.
4. `POST /api/demo/seed` once so the demo student and timetable exist.

Free-plan notes: the web service sleeps after 15 minutes idle, the container
filesystem is ephemeral (uploaded profile photos reset on deploy), and free
databases expire after 30 days unless upgraded. This app has no authentication:
keep it on demo data only.

## Project map

```text
Controllers/                 REST API endpoints
Data/ApplicationDbContext.cs EF Core table, index, and relationship mapping
Models/                      Entities, request models, and response contracts
Services/                    Business logic, integrations, and schema metadata
database/                    SQL Server schema and historical SQL changes
docs/                        API workflow, ERD, VS Code, and presentation guide
scripts/                     SQL Server setup and local run scripts
wwwroot/                     Frontend, styles, assets, fonts, and ringtones
Program.cs                   Dependency injection, middleware, Swagger, health
appsettings.json             Default SQL Server connection and logging
```

## Presentation

See [docs/PRESENTATION.md](docs/PRESENTATION.md) for a short demonstration
sequence. [docs/API_WORKFLOW.md](docs/API_WORKFLOW.md) maps the UI actions to
API calls; [docs/ERD.md](docs/ERD.md) explains the database relationships.

## Security note

This demonstration build has no authentication or per-student authorization.
Keep it on a trusted local network and do not expose the API or SQL Server
directly to an untrusted network.
