using System.Data;
using System.Data.Common;
using System.Diagnostics;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

public interface ISchemaService
{
    Task<SchemaSnapshotDto> GetSnapshotAsync(CancellationToken ct = default);
    Task<TablePreviewDto?> GetTablePreviewAsync(string table, int limit, CancellationToken ct = default);
    IReadOnlyList<SqlLabQueryDto> GetCuratedQueries();
    Task<SqlLabResultDto?> RunCuratedAsync(string key, CancellationToken ct = default);
}

/// <summary>
/// Reads INFORMATION_SCHEMA for the in-app ERD and exposes a small read-only SQL
/// lab. SQL Server and PostgreSQL share the same information_schema views, so
/// only the schema name, identifier quoting and a few date functions differ.
/// Only curated statements and allow-listed tables can run.
/// </summary>
public class SchemaService(ApplicationDbContext db) : ISchemaService
{
    private readonly bool _isPostgres = string.Equals(
        db.Database.ProviderName,
        "Npgsql.EntityFrameworkCore.PostgreSQL",
        StringComparison.Ordinal);

    private static readonly SqlLabQueryDto[] SqlServerCurated =
    [
        new(
            "budget-by-category",
            "Budget by category",
            "Groups expenses per student and category. Demonstrates INNER JOIN, SUM and GROUP BY.",
            """
            SELECT CONCAT(s.[FirstName], ' ', s.[LastName]) AS student,
                   e.[Category] AS category,
                   SUM(e.[Amount]) AS total_spent,
                   COUNT(*) AS entries
            FROM [UptimeExpenses] e
            JOIN [UptimeStudentProfiles] s ON s.[Id] = e.[StudentId]
            GROUP BY s.[Id], s.[FirstName], s.[LastName], e.[Category]
            ORDER BY total_spent DESC, student, category;
            """),
        new(
            "study-by-subject",
            "Study minutes by subject",
            "Shows which subjects receive the most focused time. Great for an aggregate-function demo.",
            """
            SELECT [Subject] AS subject,
                   COUNT(*) AS sessions,
                   SUM([DurationMinutes]) AS total_minutes,
                   ROUND(AVG(CAST([DurationMinutes] AS decimal(10,2))), 1) AS average_minutes
            FROM [UptimeStudySessions]
            GROUP BY [Subject]
            ORDER BY total_minutes DESC;
            """),
        new(
            "timetable-load",
            "Weekly timetable load",
            "Counts classes and contact hours per weekday using a CASE expression for ordering.",
            """
            SELECT [DayOfWeek] AS day,
                   COUNT(*) AS classes,
                   ROUND(SUM(DATEDIFF(SECOND, [StartTime], [EndTime])) / 3600.0, 1) AS contact_hours
            FROM [UptimeClassSchedules]
            GROUP BY [DayOfWeek]
            ORDER BY CASE [DayOfWeek]
                         WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
                         WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 ELSE 7
                     END;
            """),
        new(
            "upcoming-deadlines",
            "Upcoming deadlines",
            "Joins tasks to students and calculates days remaining with T-SQL date arithmetic.",
            """
            SELECT CONCAT(s.[FirstName], ' ', s.[LastName]) AS student,
                   t.[Title] AS task,
                   t.[Status] AS status,
                   t.[Priority] AS priority,
                   t.[DueDate] AS due_date,
                   DATEDIFF(DAY, CAST(GETDATE() AS date), t.[DueDate]) AS days_left
            FROM [UptimeStudentTasks] t
            JOIN [UptimeStudentProfiles] s ON s.[Id] = t.[StudentId]
            WHERE t.[Status] <> 'Completed'
              AND t.[DueDate] BETWEEN CAST(GETDATE() AS date) AND DATEADD(DAY, 14, CAST(GETDATE() AS date))
            ORDER BY t.[DueDate], t.[Priority];
            """),
        new(
            "task-status-summary",
            "Task status summary",
            "A compact pivot of task status and priority. Useful when explaining grouping and ordering.",
            """
            SELECT [Status] AS status,
                   [Priority] AS priority,
                   COUNT(*) AS tasks
            FROM [UptimeStudentTasks]
            GROUP BY [Status], [Priority]
            ORDER BY CASE [Status]
                         WHEN 'Pending' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3
                     END,
                     priority;
            """),
        new(
            "study-leaderboard",
            "Study leaderboard",
            "Uses a CTE and a window function (RANK) to rank students by total study minutes.",
            """
            WITH daily AS (
                SELECT [StudentId],
                       CAST([StartedAt] AS date) AS day,
                       SUM([DurationMinutes]) AS minutes
                FROM [UptimeStudySessions]
                GROUP BY [StudentId], CAST([StartedAt] AS date)
            )
            SELECT CONCAT(s.[FirstName], ' ', s.[LastName]) AS student,
                   COUNT(d.day) AS active_days,
                   SUM(d.minutes) AS total_minutes,
                   MAX(d.minutes) AS best_day,
                   RANK() OVER (ORDER BY SUM(d.minutes) DESC) AS study_rank
            FROM daily d
            JOIN [UptimeStudentProfiles] s ON s.[Id] = d.[StudentId]
            GROUP BY s.[Id], s.[FirstName], s.[LastName]
            ORDER BY study_rank;
            """)
    ];

    private static readonly SqlLabQueryDto[] PostgresCurated =
    [
        new(
            "budget-by-category",
            "Budget by category",
            "Groups expenses per student and category. Demonstrates INNER JOIN, SUM and GROUP BY.",
            """
            SELECT CONCAT(s."FirstName", ' ', s."LastName") AS student,
                   e."Category" AS category,
                   SUM(e."Amount") AS total_spent,
                   COUNT(*) AS entries
            FROM "UptimeExpenses" e
            JOIN "UptimeStudentProfiles" s ON s."Id" = e."StudentId"
            GROUP BY s."Id", s."FirstName", s."LastName", e."Category"
            ORDER BY total_spent DESC, student, category;
            """),
        new(
            "study-by-subject",
            "Study minutes by subject",
            "Shows which subjects receive the most focused time. Great for an aggregate-function demo.",
            """
            SELECT "Subject" AS subject,
                   COUNT(*) AS sessions,
                   SUM("DurationMinutes") AS total_minutes,
                   ROUND(AVG("DurationMinutes"::numeric), 1) AS average_minutes
            FROM "UptimeStudySessions"
            GROUP BY "Subject"
            ORDER BY total_minutes DESC;
            """),
        new(
            "timetable-load",
            "Weekly timetable load",
            "Counts classes and contact hours per weekday using a CASE expression for ordering.",
            """
            SELECT c."DayOfWeek" AS day,
                   COUNT(*) AS classes,
                   ROUND(SUM(EXTRACT(EPOCH FROM (c."EndTime" - c."StartTime"))) / 3600.0, 1) AS contact_hours
            FROM "UptimeClassSchedules" c
            GROUP BY c."DayOfWeek"
            ORDER BY CASE c."DayOfWeek"
                         WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
                         WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 ELSE 7
                     END;
            """),
        new(
            "upcoming-deadlines",
            "Upcoming deadlines",
            "Joins tasks to students and calculates days remaining with PostgreSQL date arithmetic.",
            """
            SELECT CONCAT(s."FirstName", ' ', s."LastName") AS student,
                   t."Title" AS task,
                   t."Status" AS status,
                   t."Priority" AS priority,
                   t."DueDate" AS due_date,
                   t."DueDate"::date - CURRENT_DATE AS days_left
            FROM "UptimeStudentTasks" t
            JOIN "UptimeStudentProfiles" s ON s."Id" = t."StudentId"
            WHERE t."Status" <> 'Completed'
              AND t."DueDate"::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
            ORDER BY t."DueDate", t."Priority";
            """),
        new(
            "task-status-summary",
            "Task status summary",
            "A compact pivot of task status and priority. Useful when explaining grouping and ordering.",
            """
            SELECT "Status" AS status,
                   "Priority" AS priority,
                   COUNT(*) AS tasks
            FROM "UptimeStudentTasks"
            GROUP BY "Status", "Priority"
            ORDER BY CASE "Status"
                         WHEN 'Pending' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3
                     END,
                     "Priority";
            """),
        new(
            "study-leaderboard",
            "Study leaderboard",
            "Uses a CTE and a window function (RANK) to rank students by total study minutes.",
            """
            WITH daily AS (
                SELECT "StudentId",
                       CAST("StartedAt" AS date) AS day,
                       SUM("DurationMinutes") AS minutes
                FROM "UptimeStudySessions"
                GROUP BY "StudentId", CAST("StartedAt" AS date)
            )
            SELECT CONCAT(s."FirstName", ' ', s."LastName") AS student,
                   COUNT(d.day) AS active_days,
                   SUM(d.minutes) AS total_minutes,
                   MAX(d.minutes) AS best_day,
                   RANK() OVER (ORDER BY SUM(d.minutes) DESC) AS study_rank
            FROM daily d
            JOIN "UptimeStudentProfiles" s ON s."Id" = d."StudentId"
            GROUP BY s."Id", s."FirstName", s."LastName"
            ORDER BY study_rank;
            """)
    ];

    private IReadOnlyList<SqlLabQueryDto> Curated =>
        _isPostgres ? PostgresCurated : SqlServerCurated;

    private string SchemaName => _isPostgres ? "public" : "dbo";

    private string ProviderName => _isPostgres ? "PostgreSQL" : "SQL Server";

    public async Task<SchemaSnapshotDto> GetSnapshotAsync(CancellationToken ct = default)
    {
        var connection = db.Database.GetDbConnection();
        var opened = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(ct);
            opened = true;
        }

        try
        {
            var columns = new Dictionary<string, List<SchemaColumnDto>>(StringComparer.Ordinal);
            var primaryKeys = new HashSet<string>(StringComparer.Ordinal);
            var foreignKeys = new Dictionary<string, (string Table, string Column)>(StringComparer.Ordinal);
            var relationships = new List<SchemaRelationshipDto>();

            await using (var command = connection.CreateCommand())
            {
                command.CommandText = """
                    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE,
                           c.CHARACTER_MAXIMUM_LENGTH, c.NUMERIC_PRECISION, c.NUMERIC_SCALE
                    FROM INFORMATION_SCHEMA.COLUMNS c
                    WHERE c.TABLE_SCHEMA = @schema
                      AND c.TABLE_NAME LIKE 'Uptime%'
                    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
                    """;
                AddParameter(command, "@schema", SchemaName);

                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    var table = reader.GetString(0);
                    if (!columns.TryGetValue(table, out var list))
                    {
                        list = [];
                        columns[table] = list;
                    }

                    var type = FormatType(
                        reader.GetString(2),
                        ReadInt(reader, 4),
                        ReadInt(reader, 5),
                        ReadInt(reader, 6));

                    list.Add(new SchemaColumnDto(
                        reader.GetString(1),
                        type,
                        reader.GetString(3) == "YES",
                        false,
                        null));
                }
            }

            await using (var command = connection.CreateCommand())
            {
                command.CommandText = """
                    SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                     AND kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                      AND tc.TABLE_SCHEMA = @schema
                      AND tc.TABLE_NAME LIKE 'Uptime%';
                    """;
                AddParameter(command, "@schema", SchemaName);

                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    primaryKeys.Add($"{reader.GetString(0)}.{reader.GetString(1)}");
                }
            }

            await using (var command = connection.CreateCommand())
            {
                command.CommandText = """
                    SELECT tc.TABLE_NAME, kcu.COLUMN_NAME, ccu.TABLE_NAME, ccu.COLUMN_NAME
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                     AND kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
                    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                      ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                     AND ccu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                      AND tc.TABLE_SCHEMA = @schema
                      AND tc.TABLE_NAME LIKE 'Uptime%';
                    """;
                AddParameter(command, "@schema", SchemaName);

                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    var fromTable = reader.GetString(0);
                    var fromColumn = reader.GetString(1);
                    var toTable = reader.GetString(2);
                    var toColumn = reader.GetString(3);

                    foreignKeys[$"{fromTable}.{fromColumn}"] = (toTable, toColumn);
                    relationships.Add(new SchemaRelationshipDto(fromTable, fromColumn, toTable, toColumn));
                }
            }

            var tables = new List<SchemaTableDto>();
            long totalRows = 0;

            foreach (var (table, tableColumns) in columns.OrderBy(x => x.Key, StringComparer.Ordinal))
            {
                var rowCount = await CountRowsAsync(connection, table, ct);
                totalRows += rowCount;

                var mapped = tableColumns
                    .Select(column => column with
                    {
                        IsPrimaryKey = primaryKeys.Contains($"{table}.{column.Name}"),
                        References = foreignKeys.TryGetValue($"{table}.{column.Name}", out var reference)
                            ? $"{reference.Table}.{reference.Column}"
                            : null
                    })
                    .ToList();

                tables.Add(new SchemaTableDto(table, rowCount, mapped));
            }

            return new SchemaSnapshotDto(
                DateTime.UtcNow,
                connection.Database,
                ProviderName,
                tables.Count,
                totalRows,
                tables,
                relationships
                    .OrderBy(x => x.FromTable, StringComparer.Ordinal)
                    .ThenBy(x => x.FromColumn, StringComparer.Ordinal)
                    .ToList());
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }
    }

    public async Task<TablePreviewDto?> GetTablePreviewAsync(
        string table,
        int limit,
        CancellationToken ct = default)
    {
        var snapshot = await GetSnapshotAsync(ct);
        var match = snapshot.Tables.FirstOrDefault(x =>
            string.Equals(x.Name, table, StringComparison.Ordinal));

        if (match is null) return null;

        var safeLimit = Math.Clamp(limit, 1, 50);
        var connection = db.Database.GetDbConnection();
        var opened = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(ct);
            opened = true;
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = _isPostgres
                ? $"SELECT * FROM {Quote(match.Name)} LIMIT {safeLimit};"
                : $"SELECT TOP ({safeLimit}) * FROM {Quote(match.Name)};";

            await using var reader = await command.ExecuteReaderAsync(ct);
            var columnNames = Enumerable.Range(0, reader.FieldCount)
                .Select(reader.GetName)
                .ToList();

            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync(ct))
            {
                var row = new Dictionary<string, object?>(StringComparer.Ordinal);
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.GetValue(i);
                    row[columnNames[i]] = value is DBNull ? null : value;
                }
                rows.Add(row);
            }

            return new TablePreviewDto(match.Name, match.RowCount, columnNames, rows);
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }
    }

    public IReadOnlyList<SqlLabQueryDto> GetCuratedQueries() => Curated;

    public async Task<SqlLabResultDto?> RunCuratedAsync(string key, CancellationToken ct = default)
    {
        var query = Curated.FirstOrDefault(x =>
            string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase));

        if (query is null) return null;

        var connection = db.Database.GetDbConnection();
        var opened = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(ct);
            opened = true;
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = query.Sql;
            command.CommandTimeout = 15;

            await using var reader = await command.ExecuteReaderAsync(ct);
            var columnNames = Enumerable.Range(0, reader.FieldCount)
                .Select(reader.GetName)
                .ToList();

            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync(ct) && rows.Count < 200)
            {
                var row = new Dictionary<string, object?>(StringComparer.Ordinal);
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.GetValue(i);
                    row[columnNames[i]] = value is DBNull ? null : value;
                }
                rows.Add(row);
            }

            stopwatch.Stop();

            return new SqlLabResultDto(
                query.Key,
                query.Title,
                query.Sql,
                stopwatch.ElapsedMilliseconds,
                columnNames,
                rows);
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }
    }

    private async Task<long> CountRowsAsync(DbConnection connection, string table, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT COUNT(*) FROM {Quote(table)};";
        var result = await command.ExecuteScalarAsync(ct);
        return result is null or DBNull ? 0 : Convert.ToInt64(result, CultureInfo.InvariantCulture);
    }

    private static void AddParameter(DbCommand command, string name, string value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private static int? ReadInt(DbDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : Convert.ToInt32(reader.GetValue(ordinal), CultureInfo.InvariantCulture);

    private string Quote(string identifier) =>
        _isPostgres
            ? "\"" + identifier.Replace("\"", "\"\"", StringComparison.Ordinal) + "\""
            : "[" + identifier.Replace("]", "]]", StringComparison.Ordinal) + "]";

    private string FormatType(string dataType, int? length, int? precision, int? scale)
    {
        if (_isPostgres)
        {
            return dataType switch
            {
                "character varying" or "character" =>
                    length is null ? dataType : $"{dataType}({length})",
                "numeric" => precision is null
                    ? dataType
                    : scale is > 0 ? $"{dataType}({precision},{scale})" : $"{dataType}({precision})",
                _ => dataType
            };
        }

        // SQL Server reports -1 for MAX-length character columns.
        var effectiveLength = length is < 0 ? null : length;

        return dataType switch
        {
            "varchar" or "nvarchar" or "char" or "nchar" =>
                effectiveLength is null ? dataType : $"{dataType}({effectiveLength})",
            "decimal" or "numeric" => precision is null
                ? dataType
                : scale is > 0 ? $"{dataType}({precision},{scale})" : $"{dataType}({precision})",
            "datetime2" or "datetimeoffset" =>
                scale is null ? dataType : $"{dataType}({scale})",
            "time" => scale is null ? dataType : $"{dataType}({scale})",
            _ => dataType
        };
    }
}
