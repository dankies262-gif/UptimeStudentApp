# Uptime presentation guide

## Before the demonstration

1. Confirm this Windows session is `NBC\\rshilongo` and can access
   `192.168.1.162,1433`, database `Uptime`.
2. From the project root, run `.\scripts\run.ps1 -Open`.
3. Keep the application at <http://localhost:5000> and Swagger at
   <http://localhost:5000/swagger> open in Google Chrome.
4. Confirm <http://localhost:5000/health> reports `database: connected`.
5. If the dashboard has no demo profile, use **Presentation Kit → Seed demo
   data** or `POST /api/demo/seed` in Swagger. The action is additive and
   idempotent.

## Suggested 8-minute walkthrough

| Time | Show | Explain |
| --- | --- | --- |
| 0:00 | Dashboard | Uptime combines timetable, calendar, tasks, budget, alarms, and study time for one student. |
| 1:00 | Navigation and modules | Open Timetable, Calendar, Tasks, Budget, Study Timer, and Alarms; point out that these are existing app features, not static mock screens. |
| 2:30 | Frontend to backend | In DevTools Network, refresh a page and show same-origin `/api/...` requests. The browser loads `wwwroot/js/app.js`; the ASP.NET Core app serves both frontend and API. |
| 3:30 | Swagger | Open `GET /api/students`, then run `GET /api/students/{id}/dashboard` and `GET /api/students/{id}/calendar/ics`. Show the documented request/response shapes and Try it out. |
| 5:00 | SQL Server | Show `/health`, then query the nine `dbo.Uptime*` tables in VS Code's SQL Server extension or SSMS. Point out the `StudentId` foreign keys and the related rows. |
| 6:00 | Persisted change | Create or update a harmless demo task/expense through the UI or Swagger, refresh the table/query, and show that the row is persisted in SQL Server. Delete only the demo record created for the demonstration. |
| 7:00 | Architecture | Open `Program.cs`, `Data/ApplicationDbContext.cs`, a controller, and its service to trace the request through EF Core to SQL Server. |

## Files to open

- [Program.cs](../Program.cs): service registration, SQL Server configuration,
  CORS, Swagger, static files, and health endpoint.
- [Data/ApplicationDbContext.cs](../Data/ApplicationDbContext.cs): table names,
  SQL Server types, keys, indexes, seed data, and relationships.
- [Models/Entities.cs](../Models/Entities.cs) and
  [Models/Requests.cs](../Models/Requests.cs): persisted entities and validated
  API inputs.
- [Controllers/StudentsController.cs](../Controllers/StudentsController.cs):
  profile, dashboard, settings, and export endpoints.
- [Services/Services.cs](../Services/Services.cs): core CRUD operations.
- [wwwroot/js/app.js](../wwwroot/js/app.js) and
  [wwwroot/index.html](../wwwroot/index.html): frontend API calls and page
  layout.
- [database/Uptime_SQLServer.sql](../database/Uptime_SQLServer.sql): additive,
  idempotent SQL Server schema script.

## Key addresses

- Frontend: <http://localhost:5000>
- Swagger: <http://localhost:5000/swagger>
- Health and database connectivity: <http://localhost:5000/health>

## Important limitation

The demonstration app does not implement authentication or per-student
authorization. Keep it on a trusted local network; do not expose it as a
production service.
