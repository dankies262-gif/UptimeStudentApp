using System.ComponentModel.DataAnnotations;

namespace UptimeStudentApp.Models;

// DTOs keep API input validation separate from database entities.
public record StudentProfileRequest(
    [Required, StringLength(80, MinimumLength = 1)] string FirstName,
    [Required, StringLength(80, MinimumLength = 1)] string LastName,
    [StringLength(80)] string? PreferredName,
    [Required, StringLength(150, MinimumLength = 2)] string InstitutionName,
    [OptionalEmailAddress, StringLength(150)] string? Email);

public sealed class OptionalEmailAddressAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is null ||
        value is string email &&
        (string.IsNullOrWhiteSpace(email) || new EmailAddressAttribute().IsValid(email));
}

public record ClassRequest(
    [Required, StringLength(150)] string Course,
    [Required, RegularExpression("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$")] string DayOfWeek,
    TimeSpan StartTime, TimeSpan EndTime,
    [Required, StringLength(150)] string Venue,
    [StringLength(120)] string? Instructor);

public record EventRequest(
    [Required, StringLength(150)] string Title,
    DateOnly EventDate, TimeSpan? EventTime,
    [StringLength(1000)] string? Description);

public record ExpenseRequest(
    [Required, StringLength(150)] string Name,
    decimal Amount,
    [Required, StringLength(50)] string Category,
    DateOnly ExpenseDate);

public record TaskRequest(
    [Required, StringLength(180)] string Title,
    [StringLength(1000)] string? Description,
    DateOnly? DueDate,
    [RegularExpression("^(Pending|In Progress|Completed)$")] string Status = "Pending",
    [RegularExpression("^(Low|Normal|High)$")] string Priority = "Normal");

public record AlarmRequest(
    [Required, StringLength(100)] string Label,
    TimeSpan AlarmTime,
    bool IsEnabled,
    [RegularExpression("^([1-7](,[1-7])*)?$")] string RepeatDays,
    int RingtoneId);

public record SettingsRequest(
    [Range(1, 1440)] int ReminderMinutes,
    bool NotificationsEnabled,
    bool RingtoneEnabled,
    [Range(0, 100)] int Volume,
    [Range(typeof(decimal), "0.01", "9999999")] decimal MonthlyBudgetLimit);

public record StudySessionRequest(
    [Required, StringLength(150)] string Subject,
    [Range(1, 1440)] int DurationMinutes,
    DateTime? StartedAt = null);
