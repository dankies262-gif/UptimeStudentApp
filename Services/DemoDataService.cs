using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

public interface IDemoDataService
{
    Task<DemoSeedResult> SeedAsync(CancellationToken ct = default);
    Task<DemoSeedResult> ResetAsync(CancellationToken ct = default);
}

/// <summary>
/// Creates a realistic showcase profile for classroom demos. The profile is
/// identified by demo@uptime.local so resetting only affects seeded data.
/// </summary>
public class DemoDataService(ApplicationDbContext db, ILogger<DemoDataService> logger) : IDemoDataService
{
    private const string DemoEmail = "demo@uptime.local";

    public async Task<DemoSeedResult> SeedAsync(CancellationToken ct = default)
    {
        var existing = await db.StudentProfiles
            .FirstOrDefaultAsync(x => x.Email == DemoEmail, ct);

        if (existing is not null)
        {
            return new DemoSeedResult(
                existing.Id,
                false,
                "Demo profile already loaded. Use Reset demo to rebuild it.",
                existing.PhotoUrl);
        }

        var ringtoneIds = await db.Ringtones
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .Select(x => x.Id)
            .Take(3)
            .ToListAsync(ct);

        if (ringtoneIds.Count == 0)
        {
            var defaults = new List<Ringtone>
            {
                new() { Name = "Rising Bell", Category = "Uptime", AudioFilePath = "/audio/tone1.wav", IsActive = true },
                new() { Name = "Marimba Pulse", Category = "Uptime", AudioFilePath = "/audio/tone4.wav", IsActive = true },
                new() { Name = "Crystal Ping", Category = "Uptime", AudioFilePath = "/audio/tone8.wav", IsActive = true }
            };
            db.Ringtones.AddRange(defaults);
            await db.SaveChangesAsync(ct);
            ringtoneIds = defaults.Select(x => x.Id).ToList();
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        var student = new StudentProfile
        {
            FirstName = "Lina",
            LastName = "Shilongo",
            PreferredName = "Lina",
            InstitutionName = "Triumphant College",
            Email = DemoEmail,
            PhotoUrl = "/images/demo-avatar.svg",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.StudentProfiles.Add(student);
        await db.SaveChangesAsync(ct);

        db.StudentSettings.Add(new StudentSetting
        {
            StudentId = student.Id,
            ReminderMinutes = 45,
            NotificationsEnabled = true,
            RingtoneEnabled = true,
            Volume = 70,
            MonthlyBudgetLimit = 2500m
        });

        db.ClassSchedules.AddRange(
            CreateLesson(student.Id, "Database Systems", "Mon", 8, 0, 9, 30, "Lab 2", "Mr. K. Amutenya"),
            CreateLesson(student.Id, "Web Development", "Mon", 11, 0, 12, 30, "Room 14", "Ms. T. Nghidengwa"),
            CreateLesson(student.Id, "Computer Forensics", "Tue", 9, 0, 10, 30, "Forensics Lab", "Dr. S. Uusiku"),
            CreateLesson(student.Id, "Networks", "Wed", 8, 0, 9, 30, "Room 7", "Mr. J. Kavari"),
            CreateLesson(student.Id, "Mathematics for Computing", "Wed", 14, 0, 15, 30, "Room 3", "Ms. L. Iipinge"),
            CreateLesson(student.Id, "Database Systems", "Thu", 10, 0, 11, 30, "Lab 2", "Mr. K. Amutenya"),
            CreateLesson(student.Id, "Web Development", "Fri", 9, 0, 10, 30, "Room 14", "Ms. T. Nghidengwa"),
            CreateLesson(student.Id, "Study Skills Workshop", "Fri", 13, 0, 14, 30, "Library", "Ms. H. Nangolo"));

        db.CalendarEvents.AddRange(
            CreateEvent(student.Id, "Database assignment due", today.AddDays(2), 23, 59, "Normalise the ERD to 3NF and submit the SQL script."),
            CreateEvent(student.Id, "Career & Internship Fair", today.AddDays(4), 9, 0, "Main Hall. Bring printed CVs and your student card."),
            CreateEvent(student.Id, "Forensics study group", today.AddDays(6), 17, 0, "Review evidence handling and chain-of-custody notes."),
            CreateEvent(student.Id, "Mid-semester exam briefing", today.AddDays(9), 12, 0, "Exam rules, venues and calculator policy."),
            CreateEvent(student.Id, "Web Development project demo", today.AddDays(12), 10, 0, "Five-minute demo plus a short Q&A."),
            CreateEvent(student.Id, "Campus closed — public holiday", today.AddDays(15), null, null, "No lectures scheduled."));

        db.StudentTasks.AddRange(
            CreateTask(student.Id, "Normalise the ERD to 3NF", "Resolve repeating groups and document each normal form.", today.AddDays(2), "In Progress", "High"),
            CreateTask(student.Id, "Write forensics lab report", "Include acquisition steps, hashes and findings.", today.AddDays(3), "Pending", "High"),
            CreateTask(student.Id, "Build login page prototype", "Use the approved Uptime colour palette.", today.AddDays(5), "In Progress", "Normal"),
            CreateTask(student.Id, "Read Chapter 4: Subnetting", "Summarise the worked examples in one page.", today.AddDays(6), "Pending", "Normal"),
            CreateTask(student.Id, "Submit DB assignment", "Final proofread and upload the PDF plus SQL file.", today.AddDays(7), "Pending", "High"),
            CreateTask(student.Id, "Prepare 5 slides for project demo", "Problem, demo, data model, API, lessons learned.", today.AddDays(10), "Pending", "Normal"),
            CreateTask(student.Id, "Set up Zotero library", "Add the Uptime sources and choose APA 7.", today.AddDays(1), "Pending", "Low"),
            CreateTask(student.Id, "Revise SQL joins", "Practice INNER, LEFT and self joins.", today.AddDays(-1), "Completed", "Normal"));

        db.Expenses.AddRange(
            CreateExpense(student.Id, "Rent", 850m, "Accommodation", today.AddDays(-20)),
            CreateExpense(student.Id, "Mobile data bundle", 99m, "Data", today.AddDays(-15)),
            CreateExpense(student.Id, "Database textbook", 320m, "Books", today.AddDays(-10)),
            CreateExpense(student.Id, "Taxi to campus", 120m, "Transport", today.AddDays(-8)),
            CreateExpense(student.Id, "Lunch", 65m, "Food", today.AddDays(-5)),
            CreateExpense(student.Id, "Printing assignment", 40m, "Other", today.AddDays(-3)),
            CreateExpense(student.Id, "Coffee study break", 35m, "Food", today.AddDays(-2)),
            CreateExpense(student.Id, "Lab fee", 250m, "Other", today.AddDays(-1)),
            CreateExpense(student.Id, "Groceries", 180m, "Food", today));

        var tones = ringtoneIds.Concat(ringtoneIds).Concat(ringtoneIds).ToList();
        db.Alarms.AddRange(
            CreateAlarm(student.Id, "Morning revision", 6, 30, "1,2,3,4,5", tones[0]),
            CreateAlarm(student.Id, "Deep work block", 17, 30, "1,3,5", tones[1]),
            CreateAlarm(student.Id, "Plan tomorrow", 21, 30, "1,2,3,4,5,6,7", tones[2]));

        var sessions = new (int Offset, int Minutes, string Subject, int Hour)[]
        {
            (0, 45, "Database Systems", 9),
            (0, 60, "Computer Forensics", 19),
            (1, 50, "Web Development", 18),
            (2, 70, "Networks", 19),
            (3, 45, "Mathematics for Computing", 17),
            (4, 60, "Database Systems", 18),
            (5, 40, "Computer Forensics", 20),
            (6, 90, "Web Development", 10),
            (7, 55, "Networks", 18),
            (8, 45, "Database Systems", 19),
            (9, 60, "Mathematics for Computing", 16),
            (10, 50, "Computer Forensics", 18),
            (11, 75, "Web Development", 19),
            (12, 40, "Database Systems", 17),
            (13, 60, "Networks", 18)
        };

        foreach (var item in sessions)
        {
            var localStart = DateTime.Today.AddDays(-item.Offset).AddHours(item.Hour);
            if (localStart > DateTime.Now)
                localStart = DateTime.Now.AddMinutes(-item.Minutes - 20);

            db.StudySessions.Add(new StudySession
            {
                StudentId = student.Id,
                Subject = item.Subject,
                DurationMinutes = item.Minutes,
                StartedAt = DateTime.SpecifyKind(localStart, DateTimeKind.Local).ToUniversalTime()
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded demo profile {StudentId}", student.Id);

        return new DemoSeedResult(
            student.Id,
            true,
            "Loaded Lina Shilongo with 8 classes, 6 events, 8 tasks, 9 expenses, 3 alarms and 15 study sessions.",
            student.PhotoUrl);
    }

    public async Task<DemoSeedResult> ResetAsync(CancellationToken ct = default)
    {
        var existing = await db.StudentProfiles
            .FirstOrDefaultAsync(x => x.Email == DemoEmail, ct);

        if (existing is not null)
        {
            db.StudentProfiles.Remove(existing);
            await db.SaveChangesAsync(ct);
        }

        return await SeedAsync(ct);
    }

    private static ClassSchedule CreateLesson(
        int studentId, string course, string day, int startHour, int startMinute,
        int endHour, int endMinute, string venue, string instructor) => new()
        {
            StudentId = studentId,
            Course = course,
            DayOfWeek = day,
            StartTime = new TimeSpan(startHour, startMinute, 0),
            EndTime = new TimeSpan(endHour, endMinute, 0),
            Venue = venue,
            Instructor = instructor
        };

    private static CalendarEvent CreateEvent(
        int studentId, string title, DateOnly date, int? hour, int? minute, string description) => new()
        {
            StudentId = studentId,
            Title = title,
            EventDate = date,
            EventTime = hour is null ? null : new TimeSpan(hour.Value, minute ?? 0, 0),
            Description = description
        };

    private static StudentTask CreateTask(
        int studentId, string title, string description, DateOnly due,
        string status, string priority) => new()
        {
            StudentId = studentId,
            Title = title,
            Description = description,
            DueDate = due,
            Status = status,
            Priority = priority,
            CreatedAt = DateTime.UtcNow.AddDays(-7)
        };

    private static Expense CreateExpense(
        int studentId, string name, decimal amount, string category, DateOnly date) => new()
        {
            StudentId = studentId,
            Name = name,
            Amount = amount,
            Category = category,
            ExpenseDate = date
        };

    private static Alarm CreateAlarm(
        int studentId, string label, int hour, int minute, string repeatDays, int ringtoneId) => new()
        {
            StudentId = studentId,
            Label = label,
            AlarmTime = new TimeSpan(hour, minute, 0),
            IsEnabled = true,
            RepeatDays = repeatDays,
            RingtoneId = ringtoneId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
}
