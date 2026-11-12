using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace UptimeStudentApp.Models;

/// <summary>Profile for a local browser user. No login/authentication is used.</summary>
public class StudentProfile
{
    public int Id { get; set; }
    [Required, MaxLength(80)] public string FirstName { get; set; } = "";
    [Required, MaxLength(80)] public string LastName { get; set; } = "";
    [MaxLength(80)] public string? PreferredName { get; set; }
    [Required, MaxLength(150)] public string InstitutionName { get; set; } = "";
    [MaxLength(150)] public string? Email { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<ClassSchedule> Classes { get; set; } = [];
    public List<CalendarEvent> Events { get; set; } = [];
    public List<Expense> Expenses { get; set; } = [];
    public List<StudentTask> Tasks { get; set; } = [];
    public List<StudySession> StudySessions { get; set; } = [];
    public List<Alarm> Alarms { get; set; } = [];
    public StudentSetting? Settings { get; set; }
}

public class ClassSchedule
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(150)] public string Course { get; set; } = "";
    [Required, MaxLength(10)] public string DayOfWeek { get; set; } = "Mon";
    [Required] public TimeSpan StartTime { get; set; }
    [Required] public TimeSpan EndTime { get; set; }
    [MaxLength(150)] public string Venue { get; set; } = "";
    [MaxLength(120)] public string? Instructor { get; set; }
    [JsonIgnore] public StudentProfile? Student { get; set; }
}

public class CalendarEvent
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(150)] public string Title { get; set; } = "";
    public DateOnly EventDate { get; set; }
    public TimeSpan? EventTime { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [JsonIgnore] public StudentProfile? Student { get; set; }
}

public class Expense
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(150)] public string Name { get; set; } = "";
    [Column(TypeName = "decimal(10,2)")] public decimal Amount { get; set; }
    [Required, MaxLength(50)] public string Category { get; set; } = "Other";
    public DateOnly ExpenseDate { get; set; }
    [JsonIgnore] public StudentProfile? Student { get; set; }
}

public class StudentTask
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(180)] public string Title { get; set; } = "";
    [MaxLength(1000)] public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Pending";
    [MaxLength(20)] public string Priority { get; set; } = "Normal";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonIgnore] public StudentProfile? Student { get; set; }
}

public class StudySession
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(150)] public string Subject { get; set; } = "";
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    [JsonIgnore] public StudentProfile? Student { get; set; }
}

public class Ringtone
{
    public int Id { get; set; }
    [Required, MaxLength(80)] public string Name { get; set; } = "";
    [Required, MaxLength(40)] public string Category { get; set; } = "";
    [Required, MaxLength(250)] public string AudioFilePath { get; set; } = "";
    public bool IsActive { get; set; } = true;
    [JsonIgnore] public List<Alarm> Alarms { get; set; } = [];
}

public class Alarm
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    [Required, MaxLength(100)] public string Label { get; set; } = "Alarm";
    public TimeSpan AlarmTime { get; set; }
    public bool IsEnabled { get; set; } = true;
    // Empty means one-time; otherwise comma-separated ISO weekday numbers 1=Mon...7=Sun.
    [MaxLength(13)] public string RepeatDays { get; set; } = "";
    public int RingtoneId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonIgnore] public StudentProfile? Student { get; set; }
    public Ringtone? Ringtone { get; set; }
}

public class StudentSetting
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public int ReminderMinutes { get; set; } = 60;
    public bool NotificationsEnabled { get; set; } = true;
    public bool RingtoneEnabled { get; set; } = true;
    public int Volume { get; set; } = 70;
    public decimal MonthlyBudgetLimit { get; set; } = 500;
    [JsonIgnore] public StudentProfile? Student { get; set; }
}
