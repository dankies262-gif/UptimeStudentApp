using Microsoft.AspNetCore.Mvc;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>
/// Read-only database metadata for the in-app ERD, table browser and SQL lab.
/// These endpoints never accept arbitrary SQL; only curated statements run.
/// </summary>
[ApiController, Route("api/meta")]
public class MetaController(ISchemaService schema) : ControllerBase
{
    /// <summary>
    /// Live schema snapshot from SQL Server's INFORMATION_SCHEMA: tables, row
    /// counts, columns, primary keys and foreign-key relationships.
    /// </summary>
    [HttpGet("schema")]
    public Task<SchemaSnapshotDto> Schema(CancellationToken ct) =>
        schema.GetSnapshotAsync(ct);

    /// <summary>
    /// Preview up to 50 rows from one application table. The table name is
    /// checked against the live schema before it is quoted into SQL.
    /// </summary>
    [HttpGet("tables/{table}")]
    public async Task<IActionResult> Table(
        string table,
        [FromQuery] int limit = 10,
        CancellationToken ct = default) =>
        await schema.GetTablePreviewAsync(table, limit, ct) is { } preview
            ? Ok(preview)
            : NotFound("Table not found. Only Uptime application tables can be previewed.");

    /// <summary>List the curated, read-only SQL Lab queries.</summary>
    [HttpGet("queries")]
    public IReadOnlyList<SqlLabQueryDto> Queries() => schema.GetCuratedQueries();

    /// <summary>
    /// Run one curated SQL Lab query. Keys: budget-by-category,
    /// study-by-subject, timetable-load, upcoming-deadlines,
    /// task-status-summary, study-leaderboard.
    /// </summary>
    [HttpGet("queries/{key}")]
    public async Task<IActionResult> Run(string key, CancellationToken ct) =>
        await schema.RunCuratedAsync(key, ct) is { } result
            ? Ok(result)
            : NotFound("Unknown SQL Lab query key.");
}
