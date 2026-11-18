using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

public interface IInsightsService
{
    Task<StudyInsightDto?> GetAsync(int studentId, CancellationToken ct = default);
}

/// <summary>
/// Calculates focus analytics from study sessions, tasks and the student's
/// existing records. The weekly goal is 300 focused minutes.
/// </summary>
public class InsightsService(ApplicationDbContext db) : IInsightsService
{
    private const int WeeklyGoalMinutes = 300;

    public async Task<StudyInsightDto?> GetAsync(int studentId, CancellationToken ct = default)
    {
        var exists = await db.StudentProfiles.AnyAsync(x => x.Id == studentId, ct);
        if (!exists) return null;

        var sessions = await db.StudySessions.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

        var tasks = await db.StudentTasks.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

        var today = DateTime.Today;
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        var localSessions = sessions
            .Select(x => new { Session = x, Date = LocalDate(x.StartedAt) })
            .ToList();

        var recent = localSessions.Where(x => x.Date >= today.AddDays(-29)).ToList();

        var days = Enumerable.Range(0, 7)
            .Select(offset => today.AddDays(-6 + offset))
            .Select(day => new StudyDayDto(
                day.ToString("yyyy-MM-dd"),
                day.ToString("ddd"),
                localSessions.Where(x => x.Date == day).Sum(x => x.Session.DurationMinutes)))
            .ToList();

        var weekMinutes = localSessions
            .Where(x => x.Date >= weekStart && x.Date <= today)
            .Sum(x => x.Session.DurationMinutes);

        var subjects = recent
            .GroupBy(x => x.Session.Subject)
            .Select(group => new SubjectMinutesDto(group.Key, group.Sum(x => x.Session.DurationMinutes)))
            .OrderByDescending(x => x.Minutes)
            .Take(6)
            .ToList();

        var streak = 0;
        var cursor = today;
        if (!localSessions.Any(x => x.Date == today)) cursor = today.AddDays(-1);
        while (localSessions.Any(x => x.Date == cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        var totalMinutes = sessions.Sum(x => x.DurationMinutes);
        var sessionCount = sessions.Count;
        var average = sessionCount == 0 ? 0 : Math.Round(sessions.Average(x => x.DurationMinutes), 1);

        return new StudyInsightDto(
            WeekMinutes: weekMinutes,
            TotalMinutes: totalMinutes,
            Sessions: sessionCount,
            StreakDays: streak,
            FocusScore: Math.Min(100, (int)Math.Round(weekMinutes / (double)WeeklyGoalMinutes * 100)),
            AverageSession: average,
            OpenTasks: tasks.Count(x => x.Status != "Completed"),
            CompletedTasks: tasks.Count(x => x.Status == "Completed"),
            OverdueTasks: tasks.Count(x =>
                x.Status != "Completed" &&
                x.DueDate is { } due &&
                due < DateOnly.FromDateTime(today)),
            StudyGoalMinutes: WeeklyGoalMinutes,
            Days: days,
            Subjects: subjects);
    }

    private static DateTime LocalDate(DateTime value)
    {
        // EF stores timestamps as UTC without a zone; mark and convert for
        // grouping so late-night sessions land on the right local day.
        var utc = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return utc.ToLocalTime().Date;
    }
}
