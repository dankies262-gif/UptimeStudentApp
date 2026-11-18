using System.Text;
using Microsoft.AspNetCore.Mvc;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>
/// Calendar interoperability: a live .ics feed you can subscribe to from
/// Google Calendar, Outlook or Apple Calendar, an .ics importer, and a clash
/// detector that compares classes, events and deadlines.
/// </summary>
[ApiController, Route("api/students/{studentId:int}/calendar")]
public class CalendarSyncController(ICalendarSyncService calendar) : ControllerBase
{
    /// <summary>
    /// Live iCalendar feed. Add the URL to Google Calendar ("From URL"), Outlook
    /// ("Subscribe from web") or Apple Calendar ("New Calendar Subscription").
    /// Classes are exported as weekly recurring events, tasks as all-day events.
    /// </summary>
    [HttpGet("ics")]
    [Produces("text/calendar")]
    public async Task<IActionResult> Feed(int studentId, CancellationToken ct)
    {
        var ics = await calendar.BuildIcsAsync(studentId, ct);
        return ics is null
            ? NotFound("Student not found.")
            : Content(ics, "text/calendar; charset=utf-8");
    }

    /// <summary>Download the same feed as an .ics file for manual import.</summary>
    [HttpGet("ics/download")]
    [Produces("text/calendar")]
    public async Task<IActionResult> Download(int studentId, CancellationToken ct)
    {
        var ics = await calendar.BuildIcsAsync(studentId, ct);
        if (ics is null) return NotFound("Student not found.");

        return File(
            Encoding.UTF8.GetBytes(ics),
            "text/calendar; charset=utf-8",
            $"uptime-student-{studentId}.ics");
    }

    /// <summary>
    /// Import events from an .ics file (Google Calendar or Outlook export).
    /// Duplicate title/date/time combinations are skipped. Maximum 2 MB.
    /// </summary>
    [HttpPost("import")]
    [RequestSizeLimit(3_000_000)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import(int studentId, IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("Choose an .ics calendar file.");

        if (file.Length > 2 * 1024 * 1024)
            return BadRequest("Calendar files must be 2 MB or smaller.");

        if (!string.Equals(Path.GetExtension(file.FileName), ".ics", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Upload a file with the .ics extension.");

        await using var stream = file.OpenReadStream();
        var result = await calendar.ImportAsync(studentId, stream, ct);

        return result is null ? NotFound("Student not found.") : Ok(result);
    }

    /// <summary>
    /// Detect overlapping classes, overlapping events, and events that collide
    /// with a weekly class. Event duration is assumed to be one hour.
    /// </summary>
    [HttpGet("clashes")]
    public async Task<IActionResult> Clashes(int studentId, CancellationToken ct)
    {
        var clashes = await calendar.FindClashesAsync(studentId, ct);
        return clashes is null ? NotFound("Student not found.") : Ok(clashes);
    }
}
