# Uptime — API Workflow

This walkthrough is the script to follow when you present the API. It goes from a health check to every feature, in the same order the app uses them. Swagger at <http://localhost:5000/swagger> shows the same calls with request schemas and a **Try it out** button.

The in-app **API Workflow** page lists the same endpoints, grouped, with a **Try** button for GET calls and **Copy curl** for every call.

---

## Before you start

```powershell
# terminal 1 — run the app
.\scripts\run.ps1

# terminal 2 — set the base URL and keep it for the session
$base = 'http://localhost:5000'
```

| Check | Command | Expected |
| --- | --- | --- |
| API and database | `curl.exe -s $base/health` | `{"status":"ok","app":"Uptime Student App","database":"connected","swagger":"/swagger"}` |
| Swagger | open `$base/swagger` | The explorer loads with every controller |
| JSON content type | every response | `Content-Type: application/json` |

If `/health` returns **503**, SQL Server is not reachable or the Windows account lacks access to `Uptime`. Check TCP/IP on port 1433 and the API log for the SqlClient error.

---

## Step 1 — Seed the demo profile

```powershell
curl.exe -s -X POST $base/api/demo/seed
```

The response contains the demo student ID. Capture it:

```powershell
$id = (curl.exe -s $base/api/students | ConvertFrom-Json |
      Where-Object { $_.email -eq 'demo@uptime.local' }).id
$id
```

**Why it matters:** the seed is additive and idempotent. Running it twice does not duplicate data, which is exactly what you want during a live demo.

---

## Step 2 — Profiles and the dashboard

```powershell
# all profiles
curl.exe -s $base/api/students

# one profile
curl.exe -s $base/api/students/$id

# dashboard summary: today's classes, events, tasks, budget, alarms
curl.exe -s $base/api/students/$id/dashboard

# preferences
curl.exe -s $base/api/students/$id/settings
```

Create a profile from scratch (the app's onboarding form does this):

```powershell
curl.exe -s -X POST $base/api/students `
  -H "Content-Type: application/json" `
  -d '{"firstName":"Reinhold","lastName":"Shilongo","preferredName":"Reinhold","institutionName":"Triumphant College","email":"reinhold@example.na"}'
```

Expected: `201 Created`, a `Location` header, and a new `id`. The API also creates the matching settings row.

Update a profile:

```powershell
curl.exe -s -X PUT $base/api/students/$id `
  -H "Content-Type: application/json" `
  -d '{"firstName":"Reinhold","lastName":"Shilongo","preferredName":"Reinhold","institutionName":"Triumphant College","email":"reinhold@example.na"}'
```

---

## Step 3 — Timetable

```powershell
# list weekly classes
curl.exe -s $base/api/students/$id/classes

# add one
curl.exe -s -X POST $base/api/students/$id/classes `
  -H "Content-Type: application/json" `
  -d '{"course":"Database Systems","dayOfWeek":"Mon","startTime":"08:00:00","endTime":"10:00:00","venue":"Lab 2","instructor":"Ms Amupolo"}'
```

`dayOfWeek` must be `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat` or `Sun`. `endTime` must be later than `startTime`; the database check constraint and the API validation both enforce it.

Delete the class you just added (use the ID from the list):

```powershell
curl.exe -s -X DELETE $base/api/students/$id/classes/<classId> -i
```

Expected: `204 No Content`.

---

## Step 4 — Calendar events

```powershell
curl.exe -s -X POST $base/api/students/$id/events `
  -H "Content-Type: application/json" `
  -d '{"title":"Group project review","eventDate":"2026-11-20","eventTime":"11:00:00","description":"Bring the ERD printout"}'
```

`eventDate` is `yyyy-MM-dd`; `eventTime` is optional.

---

## Step 5 — Calendar sync (the differentiator)

```powershell
# 1. inspect the .ics feed as text
curl.exe -s $base/api/students/$id/calendar/ics

# 2. download it as a file
curl.exe -s -L -o uptime.ics $base/api/students/$id/calendar/ics/download

# 3. import an .ics file (multipart field name: file)
curl.exe -s -X POST $base/api/students/$id/calendar/import -F "file=@uptime.ics"

# 4. clash detection
curl.exe -s $base/api/students/$id/calendar/clashes
```

What to show the audience:

- The feed starts with `BEGIN:VCALENDAR` and contains one `VEVENT` per class with `RRULE:FREQ=WEEKLY;BYDAY=MO` (and so on), plus task deadlines as all-day events.
- The **import** response is `{ "imported": n, "skipped": n, "warnings": [] }`. Re-importing the same file skips duplicates.
- The **clashes** response lists overlapping classes, events and deadlines with `severity`, `day`, `start` and `end`.
- The same URL can be pasted into Google Calendar (*Other calendars → From URL*), Outlook (*Subscribe from web*) or Apple Calendar (*File → New Calendar Subscription*). No OAuth app registration is needed.

In the app, open **Calendar → Sync with Google or Outlook** to copy the feed URL, or use **Import .ics** to upload a file.

---

## Step 6 — Tasks

```powershell
# list
curl.exe -s $base/api/students/$id/tasks

# create
curl.exe -s -X POST $base/api/students/$id/tasks `
  -H "Content-Type: application/json" `
  -d '{"title":"Normalise the database schema","description":"Third normal form","dueDate":"2026-11-25","status":"Pending","priority":"High"}'
```

Allowed `status`: `Pending`, `In Progress`, `Completed`. Allowed `priority`: `Low`, `Normal`, `High`.

Move a task (this is what the Kanban drag-and-drop does):

```powershell
curl.exe -s -X PUT $base/api/students/$id/tasks/<taskId> `
  -H "Content-Type: application/json" `
  -d '{"title":"Normalise the database schema","description":"Third normal form","dueDate":"2026-11-25","status":"Completed","priority":"High"}' -i
```

Expected: `204 No Content`. The Dashboard's **Open tasks** count and the Insights endpoint update immediately.

---

## Step 7 — Budget

```powershell
curl.exe -s -X POST $base/api/students/$id/expenses `
  -H "Content-Type: application/json" `
  -d '{"name":"Groceries","amount":420.50,"category":"Food","expenseDate":"2026-11-16"}'

# change the monthly limit
curl.exe -s -X PUT $base/api/students/$id/settings `
  -H "Content-Type: application/json" `
  -d '{"reminderMinutes":15,"notificationsEnabled":true,"ringtoneEnabled":true,"volume":70,"monthlyBudgetLimit":3000}'
```

Amounts are `numeric(10,2)`; the API rejects zero and negative values.

---

## Step 8 — Focus sessions and insights

```powershell
curl.exe -s -X POST $base/api/students/$id/study-sessions `
  -H "Content-Type: application/json" `
  -d '{"subject":"Database Systems","durationMinutes":50,"startedAt":"2026-11-16T17:00:00Z"}'

curl.exe -s $base/api/students/$id/insights
```

The insights response contains the numbers behind the Dashboard and Study Timer:

```json
{
  "weekMinutes": 230,
  "totalMinutes": 845,
  "sessions": 18,
  "streakDays": 4,
  "focusScore": 78,
  "averageSession": 47,
  "openTasks": 3,
  "completedTasks": 5,
  "overdueTasks": 1,
  "studyGoalMinutes": 300,
  "days": [{ "date": "2026-11-10", "label": "Mon", "minutes": 50 }],
  "subjects": [{ "subject": "Database Systems", "minutes": 300 }]
}
```

`focusScore` is the percentage of the weekly goal (default 300 minutes) reached this week.

---

## Step 9 — Alarms and ringtones

```powershell
# available tones
curl.exe -s $base/api/ringtones

# create an alarm
curl.exe -s -X POST $base/api/students/$id/alarms `
  -H "Content-Type: application/json" `
  -d '{"label":"Study time","alarmTime":"18:00:00","isEnabled":true,"repeatDays":"1,2,3,4,5","ringtoneId":1}'

# switch it off / on
curl.exe -s -X PATCH $base/api/students/$id/alarms/<alarmId>/enabled `
  -H "Content-Type: application/json" -d 'false'
```

`repeatDays` uses ISO weekday numbers (`1` = Monday … `7` = Sunday); an empty string means once. The PATCH body is a raw JSON boolean, not an object.

The browser checks enabled alarms every 15 seconds while the tab is open, plays the selected WAV ringtone and, if permission was granted, shows a notification.

---

## Step 10 — Profile photo

```powershell
curl.exe -s -X POST $base/api/students/$id/photo -F "file=@C:\path\to\face.png"

# remove it
curl.exe -s -X DELETE $base/api/students/$id/photo
```

Rules: JPG, PNG or WebP, maximum 2 MB, content type and magic bytes are checked, and the file is stored under `wwwroot/uploads/avatars/` with a GUID name. The response includes `photoUrl`, which the avatar picks up everywhere in the UI.

In the app: **Settings → Profile photo → Upload**.

---

## Step 11 — Database metadata and SQL Lab

```powershell
# tables, row counts, columns, keys and relationships
curl.exe -s $base/api/meta/schema

# preview rows from one allow-listed table
curl.exe -s "$base/api/meta/tables/UptimeStudentProfiles?limit=5"

# list the curated queries
curl.exe -s $base/api/meta/queries

# run one
curl.exe -s $base/api/meta/queries/study-by-subject
```

Only application tables can be previewed, and only the curated statements can run. The API never accepts arbitrary SQL text.

Curated keys: `budget-by-category`, `study-by-subject`, `timetable-load`, `upcoming-deadlines`, `task-status-summary`, `study-leaderboard`.

---

## Step 12 — Prove the relationships

Download a full JSON backup of one student and every related table:

```powershell
curl.exe -s $base/api/students/$id/export | Out-File -Encoding utf8 uptime-export.json
```

Show the file during the presentation: one profile, its classes, events, expenses, tasks, sessions, alarms and settings in a single object. This is the one-to-many design in the ERD made concrete.

---

## Step 13 — Reset the demo

```powershell
curl.exe -s -X POST $base/api/demo/reset
```

Only the `demo@uptime.local` profile is deleted and recreated. Other profiles are never touched.

---

## Error handling you can demonstrate

| Request | Result | Meaning |
| --- | --- | --- |
| `GET /api/students/9999` | `404` | Unknown student |
| `POST …/classes` with `endTime` before `startTime` | `400` | Validation / check constraint |
| `POST …/tasks` with `priority: "Urgent"` | `400` | Allowed values are `Low`, `Normal`, `High` |
| `POST …/alarms` with `repeatDays: "1,9"` | `400` | Only `1–7` and commas |
| `POST …/photo` with a 5 MB file | `400` | 2 MB limit |
| `GET /api/meta/tables/Users` | `404` | Table is not an Uptime table |
| `GET /health` with SQL Server unavailable | `503` | API is up, database is down |

Problem responses use RFC 7807 (`application/problem+json`) with `title`, `detail` and `status`, and the frontend surfaces the `title`/`detail` in a toast.

---

## Suggested live order (5 minutes)

1. `/health` → `200` with `"database":"connected"`.
2. `POST /api/demo/seed` → capture the ID.
3. Swagger: `GET /api/students/{id}/dashboard`.
4. App: Dashboard → Calendar (show the `.ics` URL) → Tasks (drag a card).
5. Swagger: `GET …/calendar/ics` (show `BEGIN:VCALENDAR`) and `…/calendar/clashes`.
6. App: Database & ERD → schema → SQL Lab (`study-by-subject`).
7. Swagger: `GET …/insights` and `GET …/export`.
8. Close on `POST /api/demo/reset` so the demo is clean for the next run.
