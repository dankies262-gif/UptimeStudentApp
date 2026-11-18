using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

public interface ICalendarSyncService
{
    Task<string?> BuildIcsAsync(int studentId, CancellationToken ct = default);
    Task<CalendarImportResult?> ImportAsync(int studentId, Stream stream, CancellationToken ct = default);
    Task<List<ClashWarning>?> FindClashesAsync(int studentId, CancellationToken ct = default);
}

/// <summary>
/// Builds RFC 5545 calendar feeds and imports external .ics files.
/// Times are written as floating local times, which Google Calendar, Outlook
/// and Apple Calendar interpret in the viewer's own timezone.
/// </summary>
public class CalendarSyncService(ApplicationDbContext db) : ICalendarSyncService
{
    private static readonly Dictionary<string, int> WeekdayNumbers = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Mon"] = 1, ["Tue"] = 2, ["Wed"] = 3, ["Thu"] = 4, ["Fri"] = 5, ["Sat"] = 6, ["Sun"] = 7
    };

    private static readonly Dictionary<string, string> WeekdayCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Mon"] = "MO", ["Tue"] = "TU", ["Wed"] = "WE", ["Thu"] = "TH",
        ["Fri"] = "FR", ["Sat"] = "SA", ["Sun"] = "SU"
    };

    private static readonly Dictionary<DayOfWeek, string> DayCodes = new()
    {
        [DayOfWeek.Monday] = "Mon", [DayOfWeek.Tuesday] = "Tue", [DayOfWeek.Wednesday] = "Wed",
        [DayOfWeek.Thursday] = "Thu", [DayOfWeek.Friday] = "Fri", [DayOfWeek.Saturday] = "Sat",
        [DayOfWeek.Sunday] = "Sun"
    };

    public async Task<string?> BuildIcsAsync(int studentId, CancellationToken ct = default)
    {
        var student = await db.StudentProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == studentId, ct);
        if (student is null) return null;

        var classes = await db.ClassSchedules.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.DayOfWeek)
            .ThenBy(x => x.StartTime)
            .ToListAsync(ct);

        var events = await db.CalendarEvents.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.EventDate)
            .ToListAsync(ct);

        var tasks = await db.StudentTasks.AsNoTracking()
            .Where(x => x.StudentId == studentId && x.DueDate != null && x.Status != "Completed")
            .OrderBy(x => x.DueDate)
            .ToListAsync(ct);

        var stamp = DateTime.UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var sb = new StringBuilder();

        void Line(string value) => sb.Append(Fold(value)).Append("\r\n");

        Line("BEGIN:VCALENDAR");
        Line("VERSION:2.0");
        Line("PRODID:-//Reinhold IT Solutions//Uptime Student App//EN");
        Line("CALSCALE:GREGORIAN");
        Line("METHOD:PUBLISH");
        Line($"X-WR-CALNAME:{Escape($"Uptime — {student.PreferredName ?? student.FirstName}")}");
        Line("X-WR-TIMEZONE:Africa/Windhoek");
        Line("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
        Line("X-PUBLISHED-TTL:PT1H");

        foreach (var item in classes)
        {
            var day = Resolve(classDate(item.DayOfWeek), item.StartTime);
            var end = Resolve(classDate(item.DayOfWeek), item.EndTime);
            var details = new List<string> { $"Course: {item.Course}", $"Venue: {item.Venue}" };
            if (!string.IsNullOrWhiteSpace(item.Instructor)) details.Add($"Lecturer: {item.Instructor}");
            details.Add("Created by Uptime Student App");

            Line("BEGIN:VEVENT");
            Line($"UID:class-{item.Id}@uptime.local");
            Line($"DTSTAMP:{stamp}");
            Line($"DTSTART:{Local(day)}");
            Line($"DTEND:{Local(end)}");
            Line($"RRULE:FREQ=WEEKLY;BYDAY={WeekdayCodes.GetValueOrDefault(item.DayOfWeek, "MO")}");
            Line($"SUMMARY:{Escape(item.Course)}");
            Line($"LOCATION:{Escape(item.Venue)}");
            Line($"DESCRIPTION:{Escape(string.Join("\n", details))}");
            Line("CATEGORIES:CLASS");
            Line("TRANSP:OPAQUE");
            Line("END:VEVENT");
        }

        foreach (var item in events)
        {
            Line("BEGIN:VEVENT");
            Line($"UID:event-{item.Id}@uptime.local");
            Line($"DTSTAMP:{stamp}");

            if (item.EventTime is { } time)
            {
                var start = item.EventDate.ToDateTime(TimeOnly.FromTimeSpan(time));
                Line($"DTSTART:{Local(start)}");
                Line($"DTEND:{Local(start.AddHours(1))}");
            }
            else
            {
                Line($"DTSTART;VALUE=DATE:{item.EventDate:yyyyMMdd}");
                Line($"DTEND;VALUE=DATE:{item.EventDate.AddDays(1):yyyyMMdd}");
            }

            Line($"SUMMARY:{Escape(item.Title)}");
            if (!string.IsNullOrWhiteSpace(item.Description))
                Line($"DESCRIPTION:{Escape(item.Description)}");
            Line("CATEGORIES:EVENT");
            Line("END:VEVENT");
        }

        foreach (var item in tasks)
        {
            if (item.DueDate is not { } due) continue;

            Line("BEGIN:VEVENT");
            Line($"UID:task-{item.Id}@uptime.local");
            Line($"DTSTAMP:{stamp}");
            Line($"DTSTART;VALUE=DATE:{due:yyyyMMdd}");
            Line($"DTEND;VALUE=DATE:{due.AddDays(1):yyyyMMdd}");
            Line($"SUMMARY:{Escape($"[Task] {item.Title}")}");
            var description = string.IsNullOrWhiteSpace(item.Description)
                ? $"Status: {item.Status} | Priority: {item.Priority}"
                : $"{item.Description}\nStatus: {item.Status} | Priority: {item.Priority}";
            Line($"DESCRIPTION:{Escape(description)}");
            Line("CATEGORIES:TASK");
            Line("STATUS:CONFIRMED");
            Line("END:VEVENT");
        }

        Line("END:VCALENDAR");
        return sb.ToString();
    }

    public async Task<CalendarImportResult?> ImportAsync(
        int studentId,
        Stream stream,
        CancellationToken ct = default)
    {
        var exists = await db.StudentProfiles.AnyAsync(x => x.Id == studentId, ct);
        if (!exists) return null;

        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var text = await reader.ReadToEndAsync(ct);

        var unfolded = Regex.Replace(text, "\\r?\\n[ \\t]", "");
        var lines = unfolded.Split('\n').Select(x => x.TrimEnd('\r')).ToList();

        var existing = await db.CalendarEvents.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .Select(x => new { x.Title, x.EventDate, x.EventTime })
            .ToListAsync(ct);

        var seen = existing
            .Select(x => (x.Title, x.EventDate, x.EventTime))
            .ToHashSet();

        var imported = new List<CalendarEvent>();
        var warnings = new List<string>();
        var skipped = 0;

        var inEvent = false;
        string? summary = null;
        string? description = null;
        string? location = null;
        string? startValue = null;

        foreach (var raw in lines)
        {
            if (raw.Equals("BEGIN:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                inEvent = true;
                summary = description = location = startValue = null;
                continue;
            }

            if (raw.Equals("END:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                if (inEvent)
                {
                    if (imported.Count >= 500)
                    {
                        skipped++;
                        warnings.Add("Import stopped at 500 events for safety.");
                    }
                    else if (!TryParseStart(startValue, out var date, out var time))
                    {
                        skipped++;
                        if (warnings.Count < 8) warnings.Add($"Skipped an event without a readable DTSTART: {summary ?? "(no summary)"}");
                    }
                    else
                    {
                        var title = Limit(string.IsNullOrWhiteSpace(summary) ? "Imported event" : Unescape(summary), 150);
                        if (!seen.Contains((title, date, time)))
                        {
                            var details = new List<string>();
                            if (!string.IsNullOrWhiteSpace(description)) details.Add(Unescape(description));
                            if (!string.IsNullOrWhiteSpace(location)) details.Add($"Location: {Unescape(location)}");

                            imported.Add(new CalendarEvent
                            {
                                StudentId = studentId,
                                Title = title,
                                EventDate = date,
                                EventTime = time,
                                Description = details.Count == 0 ? "Imported from an .ics calendar file" : Limit(string.Join("\n", details), 1000)
                            });
                            seen.Add((title, date, time));
                        }
                        else
                        {
                            skipped++;
                        }
                    }
                }

                inEvent = false;
                continue;
            }

            if (!inEvent) continue;

            var separator = raw.IndexOf(':');
            if (separator < 0) continue;

            var namePart = raw[..separator];
            var value = raw[(separator + 1)..];
            var property = namePart.Split(';')[0].ToUpperInvariant();

            switch (property)
            {
                case "SUMMARY": summary = value; break;
                case "DESCRIPTION": description = value; break;
                case "LOCATION": location = value; break;
                case "DTSTART": startValue = value; break;
            }
        }

        if (imported.Count > 0)
        {
            db.CalendarEvents.AddRange(imported);
            await db.SaveChangesAsync(ct);
        }

        return new CalendarImportResult(imported.Count, skipped, warnings);
    }

    public async Task<List<ClashWarning>?> FindClashesAsync(int studentId, CancellationToken ct = default)
    {
        var exists = await db.StudentProfiles.AnyAsync(x => x.Id == studentId, ct);
        if (!exists) return null;

        var classes = await db.ClassSchedules.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

        var events = await db.CalendarEvents.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

        var warnings = new List<ClashWarning>();

        foreach (var group in classes.GroupBy(x => x.DayOfWeek))
        {
            var items = group.OrderBy(x => x.StartTime).ToList();
            for (var i = 0; i < items.Count; i++)
            {
                for (var j = i + 1; j < items.Count; j++)
                {
                    var a = items[i];
                    var b = items[j];
                    if (a.StartTime >= b.EndTime || b.StartTime >= a.EndTime) continue;

                    warnings.Add(new ClashWarning(
                        "Timetable clash",
                        "high",
                        $"{a.Course} ↔ {b.Course}",
                        $"{a.Venue} and {b.Venue} overlap on {group.Key}.",
                        group.Key,
                        Format(a.StartTime),
                        Format(a.EndTime > b.EndTime ? a.EndTime : b.EndTime)));
                }
            }
        }

        foreach (var group in events.Where(x => x.EventTime is not null).GroupBy(x => x.EventDate))
        {
            var items = group.OrderBy(x => x.EventTime).ToList();
            for (var i = 0; i < items.Count; i++)
            {
                for (var j = i + 1; j < items.Count; j++)
                {
                    var a = items[i];
                    var b = items[j];
                    var aStart = a.EventTime!.Value;
                    var bStart = b.EventTime!.Value;
                    if (aStart.Add(TimeSpan.FromHours(1)) <= bStart) continue;

                    warnings.Add(new ClashWarning(
                        "Event overlap",
                        "medium",
                        $"{a.Title} ↔ {b.Title}",
                        "Two calendar events start within an hour of each other.",
                        a.EventDate.ToString("ddd dd MMM", CultureInfo.InvariantCulture),
                        Format(aStart),
                        Format(bStart.Add(TimeSpan.FromHours(1)))));
                }
            }
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        foreach (var item in events.Where(x => x.EventTime is not null && x.EventDate >= today && x.EventDate <= today.AddDays(56)))
        {
            var code = DayCodes[item.EventDate.DayOfWeek];
            var start = item.EventTime!.Value;
            var end = start.Add(TimeSpan.FromHours(1));

            foreach (var lesson in classes.Where(x => x.DayOfWeek.Equals(code, StringComparison.OrdinalIgnoreCase)))
            {
                if (lesson.StartTime >= end || start >= lesson.EndTime) continue;

                warnings.Add(new ClashWarning(
                    "Class vs event",
                    "medium",
                    $"{item.Title} ↔ {lesson.Course}",
                    $"The event overlaps your {code} class in {lesson.Venue}.",
                    item.EventDate.ToString("ddd dd MMM", CultureInfo.InvariantCulture),
                    Format(start > lesson.StartTime ? start : lesson.StartTime),
                    Format(end < lesson.EndTime ? end : lesson.EndTime)));
            }
        }

        return warnings
            .OrderByDescending(x => x.Severity)
            .ThenBy(x => x.Day)
            .Take(30)
            .ToList();
    }

    private static DateTime classDate(string dayOfWeek)
    {
        var target = WeekdayNumbers.GetValueOrDefault(dayOfWeek, 1);
        var today = ((int)DateTime.Today.DayOfWeek + 6) % 7 + 1;
        var delta = (target - today + 7) % 7;
        return DateTime.Today.AddDays(delta);
    }

    private static DateTime Resolve(DateTime date, TimeSpan time) => date.Date.Add(time);

    private static string Local(DateTime value) => value.ToString("yyyyMMdd'T'HHmmss", CultureInfo.InvariantCulture);

    private static string Format(TimeSpan value) => value.ToString(@"hh\:mm", CultureInfo.InvariantCulture);

    private static string Escape(string value) => value
        .Replace("\\", "\\\\")
        .Replace(";", "\\;")
        .Replace(",", "\\,")
        .Replace("\r\n", "\\n")
        .Replace("\n", "\\n")
        .Replace("\r", "\\n");

    private static string Unescape(string value) => value
        .Replace("\\n", "\n")
        .Replace("\\N", "\n")
        .Replace("\\,", ",")
        .Replace("\\;", ";")
        .Replace("\\\\", "\\");

    private static string Limit(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static string Fold(string line)
    {
        if (line.Length <= 73) return line;

        var builder = new StringBuilder();
        for (var i = 0; i < line.Length; i += 73)
        {
            if (i > 0) builder.Append("\r\n ");
            builder.Append(line, i, Math.Min(73, line.Length - i));
        }
        return builder.ToString();
    }

    private static bool TryParseStart(string? value, out DateOnly date, out TimeSpan? time)
    {
        date = default;
        time = null;

        if (string.IsNullOrWhiteSpace(value)) return false;
        var raw = value.Trim();
        var datePart = raw.Length >= 8 ? raw[..8] : raw;

        if (!DateOnly.TryParseExact(datePart, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            return false;

        if (raw.Length >= 15 && raw[8] == 'T')
        {
            if (!TimeSpan.TryParseExact(raw.Substring(9, 6), "hhmmss", CultureInfo.InvariantCulture, out var parsed))
                return false;

            if (raw.EndsWith('Z'))
            {
                var utc = new DateTime(date.Year, date.Month, date.Day, parsed.Hours, parsed.Minutes, parsed.Seconds, DateTimeKind.Utc);
                var local = utc.ToLocalTime();
                date = DateOnly.FromDateTime(local);
                parsed = local.TimeOfDay;
            }

            time = parsed;
        }

        return true;
    }
}
