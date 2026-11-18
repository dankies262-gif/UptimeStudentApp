// ============================================================
// UPTIME STUDENT APP
// File: Services.cs
// Purpose: Contains all application services in one file.
// Framework: ASP.NET Core / .NET 10
// Database: SQL Server using Entity Framework Core
// ============================================================

using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

// ============================================================
// SECTION 1: STUDENT PROFILE SERVICE
// Purpose:
// - Get all student profiles.
// - Get a student by ID.
// - Create a student profile.
// - Update a student profile.
// ============================================================

public interface IStudentService
{
    Task<List<StudentProfile>> ListAsync();
    Task<StudentProfile?> GetAsync(int id);
    Task<StudentProfile> CreateAsync(StudentProfileRequest request);
    Task<StudentProfile?> UpdateAsync(int id, StudentProfileRequest request);
    Task<bool> DeleteAsync(int id);
}

public class StudentService(ApplicationDbContext db) : IStudentService
{
    public Task<List<StudentProfile>> ListAsync() =>
        db.StudentProfiles
            .OrderBy(x => x.Id)
            .ToListAsync();

    public Task<StudentProfile?> GetAsync(int id) =>
        db.StudentProfiles.FirstOrDefaultAsync(x => x.Id == id);

    public async Task<StudentProfile> CreateAsync(StudentProfileRequest request)
    {
        var student = new StudentProfile
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PreferredName = request.PreferredName?.Trim(),
            InstitutionName = request.InstitutionName.Trim(),

            Email = string.IsNullOrWhiteSpace(request.Email)
                ? null
                : request.Email.Trim(),

            Settings = new StudentSetting()
        };

        db.StudentProfiles.Add(student);

        await db.SaveChangesAsync();

        return student;
    }

    public async Task<StudentProfile?> UpdateAsync(
        int id,
        StudentProfileRequest request)
    {
        var student = await db.StudentProfiles.FindAsync(id);

        if (student is null)
            return null;

        student.FirstName = request.FirstName.Trim();
        student.LastName = request.LastName.Trim();
        student.PreferredName = request.PreferredName?.Trim();
        student.InstitutionName = request.InstitutionName.Trim();

        student.Email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim();

        student.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return student;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var student = await db.StudentProfiles.FindAsync(id);
        if (student is null)
            return false;

        db.StudentProfiles.Remove(student);
        await db.SaveChangesAsync();
        return true;
    }
}


// ============================================================
// SECTION 2: CLASS SCHEDULE SERVICE
// Purpose:
// - List a student's classes.
// - Add a class.
// - Update a class.
// - Delete a class.
// ============================================================

public interface IClassService
{
    Task<List<ClassSchedule>> ListAsync(int studentId);

    Task<ClassSchedule> AddAsync(
        int studentId,
        ClassRequest request);

    Task<bool> UpdateAsync(
        int id,
        int studentId,
        ClassRequest request);

    Task<bool> DeleteAsync(int id, int studentId);
}

public class ClassService(ApplicationDbContext db) : IClassService
{
    public Task<List<ClassSchedule>> ListAsync(int studentId) =>
        db.ClassSchedules
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.DayOfWeek)
            .ThenBy(x => x.StartTime)
            .ToListAsync();

    public async Task<ClassSchedule> AddAsync(
        int studentId,
        ClassRequest request)
    {
        var schedule = new ClassSchedule
        {
            StudentId = studentId,
            Course = request.Course.Trim(),
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Venue = request.Venue.Trim(),
            Instructor = request.Instructor
        };

        db.ClassSchedules.Add(schedule);

        await db.SaveChangesAsync();

        return schedule;
    }

    public async Task<bool> UpdateAsync(
        int id,
        int studentId,
        ClassRequest request)
    {
        var schedule = await db.ClassSchedules.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (schedule is null)
            return false;

        schedule.Course = request.Course.Trim();
        schedule.DayOfWeek = request.DayOfWeek;
        schedule.StartTime = request.StartTime;
        schedule.EndTime = request.EndTime;
        schedule.Venue = request.Venue.Trim();
        schedule.Instructor = request.Instructor;

        await db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, int studentId)
    {
        var schedule = await db.ClassSchedules.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (schedule is null)
            return false;

        db.ClassSchedules.Remove(schedule);

        await db.SaveChangesAsync();

        return true;
    }
}


// ============================================================
// SECTION 3: CALENDAR EVENT SERVICE
// Purpose:
// - List calendar events.
// - Add an event.
// - Delete an event.
// ============================================================

public interface IEventService
{
    Task<List<CalendarEvent>> ListAsync(int studentId);

    Task<CalendarEvent> AddAsync(
        int studentId,
        EventRequest request);

    Task<bool> UpdateAsync(
        int id,
        int studentId,
        EventRequest request);

    Task<bool> DeleteAsync(int id, int studentId);
}

public class EventService(ApplicationDbContext db) : IEventService
{
    public Task<List<CalendarEvent>> ListAsync(int studentId) =>
        db.CalendarEvents
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.EventDate)
            .ToListAsync();

    public async Task<CalendarEvent> AddAsync(
        int studentId,
        EventRequest request)
    {
        var calendarEvent = new CalendarEvent
        {
            StudentId = studentId,
            Title = request.Title.Trim(),
            EventDate = request.EventDate,
            EventTime = request.EventTime,
            Description = request.Description
        };

        db.CalendarEvents.Add(calendarEvent);

        await db.SaveChangesAsync();

        return calendarEvent;
    }

    public async Task<bool> UpdateAsync(
        int id,
        int studentId,
        EventRequest request)
    {
        var calendarEvent = await db.CalendarEvents.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (calendarEvent is null)
            return false;

        calendarEvent.Title = request.Title.Trim();
        calendarEvent.EventDate = request.EventDate;
        calendarEvent.EventTime = request.EventTime;
        calendarEvent.Description = request.Description;

        await db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, int studentId)
    {
        var calendarEvent = await db.CalendarEvents.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (calendarEvent is null)
            return false;

        db.CalendarEvents.Remove(calendarEvent);

        await db.SaveChangesAsync();

        return true;
    }
}


// ============================================================
// SECTION 4: EXPENSE SERVICE
// Purpose:
// - List student expenses.
// - Add an expense.
// - Delete an expense.
// - Reject expenses with invalid amounts.
// ============================================================

public interface IExpenseService
{
    Task<List<Expense>> ListAsync(int studentId);

    Task<Expense> AddAsync(
        int studentId,
        ExpenseRequest request);

    Task<bool> UpdateAsync(
        int id,
        int studentId,
        ExpenseRequest request);

    Task<bool> DeleteAsync(int id, int studentId);
}

public class ExpenseService(ApplicationDbContext db) : IExpenseService
{
    public Task<List<Expense>> ListAsync(int studentId) =>
        db.Expenses
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.ExpenseDate)
            .ToListAsync();

    public async Task<Expense> AddAsync(
        int studentId,
        ExpenseRequest request)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentException(
                "Amount must be greater than zero.");
        }

        var expense = new Expense
        {
            StudentId = studentId,
            Name = request.Name.Trim(),
            Amount = request.Amount,
            Category = request.Category.Trim(),
            ExpenseDate = request.ExpenseDate
        };

        db.Expenses.Add(expense);

        await db.SaveChangesAsync();

        return expense;
    }

    public async Task<bool> UpdateAsync(
        int id,
        int studentId,
        ExpenseRequest request)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentException(
                "Amount must be greater than zero.");
        }

        var expense = await db.Expenses.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (expense is null)
            return false;

        expense.Name = request.Name.Trim();
        expense.Amount = request.Amount;
        expense.Category = request.Category.Trim();
        expense.ExpenseDate = request.ExpenseDate;

        await db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, int studentId)
    {
        var expense = await db.Expenses.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (expense is null)
            return false;

        db.Expenses.Remove(expense);

        await db.SaveChangesAsync();

        return true;
    }
}


// ============================================================
// SECTION 5: STUDENT TASK SERVICE
// Purpose:
// - List student tasks.
// - Add a task.
// - Update a task.
// - Delete a task.
// ============================================================

public interface ITaskService
{
    Task<List<StudentTask>> ListAsync(int studentId);

    Task<StudentTask> AddAsync(
        int studentId,
        TaskRequest request);

    Task<bool> UpdateAsync(
        int id,
        int studentId,
        TaskRequest request);

    Task<bool> DeleteAsync(int id, int studentId);
}

public class TaskService(ApplicationDbContext db) : ITaskService
{
    public Task<List<StudentTask>> ListAsync(int studentId) =>
        db.StudentTasks
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.DueDate)
            .ToListAsync();

    public async Task<StudentTask> AddAsync(
        int studentId,
        TaskRequest request)
    {
        var task = new StudentTask
        {
            StudentId = studentId,
            Title = request.Title.Trim(),
            Description = request.Description,
            DueDate = request.DueDate,
            Status = request.Status,
            Priority = request.Priority
        };

        db.StudentTasks.Add(task);

        await db.SaveChangesAsync();

        return task;
    }

    public async Task<bool> UpdateAsync(
        int id,
        int studentId,
        TaskRequest request)
    {
        var task = await db.StudentTasks.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (task is null)
            return false;

        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.DueDate = request.DueDate;
        task.Status = request.Status;
        task.Priority = request.Priority;

        await db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, int studentId)
    {
        var task = await db.StudentTasks.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (task is null)
            return false;

        db.StudentTasks.Remove(task);

        await db.SaveChangesAsync();

        return true;
    }
}


// ============================================================
// SECTION 6: ALARM SERVICE
// Purpose:
// - List student alarms.
// - Add an alarm.
// - Update an alarm.
// - Delete an alarm.
// - Validate the selected ringtone.
// ============================================================

public interface IAlarmService
{
    Task<List<Alarm>> ListAsync(int studentId);

    Task<Alarm> AddAsync(
        int studentId,
        AlarmRequest request);

    Task<bool> UpdateAsync(
        int id,
        int studentId,
        AlarmRequest request);

    Task<bool> DeleteAsync(int id, int studentId);
}

public class AlarmService(ApplicationDbContext db) : IAlarmService
{
    public Task<List<Alarm>> ListAsync(int studentId) =>
        db.Alarms
            .Include(x => x.Ringtone)
            .Where(x => x.StudentId == studentId)
            .OrderBy(x => x.AlarmTime)
            .ToListAsync();

    public async Task<Alarm> AddAsync(
        int studentId,
        AlarmRequest request)
    {
        // Only allow an active ringtone to be selected.
        bool ringtoneExists = await db.Ringtones.AnyAsync(
            x => x.Id == request.RingtoneId && x.IsActive);

        if (!ringtoneExists)
        {
            throw new ArgumentException(
                "Select a valid active ringtone.");
        }

        var alarm = new Alarm
        {
            StudentId = studentId,
            Label = request.Label.Trim(),
            AlarmTime = request.AlarmTime,
            IsEnabled = request.IsEnabled,
            RepeatDays = request.RepeatDays ?? "",
            RingtoneId = request.RingtoneId
        };

        db.Alarms.Add(alarm);

        await db.SaveChangesAsync();

        return alarm;
    }

    public async Task<bool> UpdateAsync(
        int id,
        int studentId,
        AlarmRequest request)
    {
        var alarm = await db.Alarms.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (alarm is null)
            return false;

        bool ringtoneExists = await db.Ringtones.AnyAsync(
            x => x.Id == request.RingtoneId && x.IsActive);

        if (!ringtoneExists)
        {
            throw new ArgumentException(
                "Select a valid active ringtone.");
        }

        alarm.Label = request.Label.Trim();
        alarm.AlarmTime = request.AlarmTime;
        alarm.IsEnabled = request.IsEnabled;
        alarm.RepeatDays = request.RepeatDays ?? "";
        alarm.RingtoneId = request.RingtoneId;
        alarm.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, int studentId)
    {
        var alarm = await db.Alarms.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (alarm is null)
            return false;

        db.Alarms.Remove(alarm);

        await db.SaveChangesAsync();

        return true;
    }
}


// ============================================================
// SECTION 7: DASHBOARD SERVICE
// Purpose:
// - Get the student dashboard information.
// - Display a personalised greeting.
// - Display today's classes.
// - Display upcoming calendar events.
// - Count pending tasks.
// - Calculate the monthly budget.
// - Count enabled alarms.
// ============================================================

public interface IDashboardService
{
    Task<object?> GetAsync(int studentId);
}

public class DashboardService(ApplicationDbContext db)
    : IDashboardService
{
    public async Task<object?> GetAsync(int studentId)
    {
        // 1. Find the student.
        var student = await db.StudentProfiles
            .FirstOrDefaultAsync(x => x.Id == studentId);

        if (student is null)
            return null;

        // 2. Get today's day abbreviation.
        // IMPORTANT: DayOfWeek must use the same format as the
        // DayOfWeek values saved in the ClassSchedules table.
        string today = DateTime.Now.ToString("ddd");

        // 3. Calculate expenses for the current month.
        DateTime now = DateTime.Now;

        var monthlyExpenses = await db.Expenses
            .Where(x =>
                x.StudentId == studentId &&
                x.ExpenseDate.Year == now.Year &&
                x.ExpenseDate.Month == now.Month)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        // 4. Retrieve the student's budget settings.
        var settings = await db.StudentSettings
            .FirstOrDefaultAsync(x => x.StudentId == studentId);

        decimal budgetLimit = settings?.MonthlyBudgetLimit ?? 500m;

        // 5. Return all dashboard information.
        return new
        {
            student,

            greeting = $"Hello, {student.PreferredName ?? student.FirstName}!",

            welcome = $"Welcome back, {student.PreferredName ?? student.FirstName}.",

            today,

            // Today's class timetable.
            classes = await db.ClassSchedules
                .Where(x =>
                    x.StudentId == studentId &&
                    x.DayOfWeek == today)
                .OrderBy(x => x.StartTime)
                .ToListAsync(),

            // The next five events, including today's events.
            upcomingEvents = await db.CalendarEvents
                .Where(x =>
                    x.StudentId == studentId &&
                    x.EventDate >= DateOnly.FromDateTime(DateTime.Today))
                .OrderBy(x => x.EventDate)
                .Take(5)
                .ToListAsync(),

            // Count tasks that are not completed.
            pendingTasks = await db.StudentTasks
                .CountAsync(x =>
                    x.StudentId == studentId &&
                    x.Status != "Completed"),

            // Monthly budget summary.
            budget = new
            {
                limit = budgetLimit,
                spent = monthlyExpenses,
                remaining = budgetLimit - monthlyExpenses
            },

            // Count alarms that are currently enabled.
            enabledAlarms = await db.Alarms
                .CountAsync(x =>
                    x.StudentId == studentId &&
                    x.IsEnabled)
        };
    }
}