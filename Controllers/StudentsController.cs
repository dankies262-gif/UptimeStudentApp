using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>Student profiles, settings, profile photos, exports and the dashboard summary.</summary>
[ApiController, Route("api/students")]
public class StudentsController(
    IStudentService service,
    ApplicationDbContext db,
    IProfilePhotoService photos) : ControllerBase
{
    /// <summary>List every student profile.</summary>
    [HttpGet]
    public Task<List<StudentProfile>> List() => service.ListAsync();

    /// <summary>Get one student profile.</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) =>
        (await service.GetAsync(id)) is { } profile ? Ok(profile) : NotFound();

    /// <summary>Create a student profile and its default settings.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(StudentProfileRequest request)
    {
        var profile = await service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = profile.Id }, profile);
    }

    /// <summary>Update a student profile.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, StudentProfileRequest request) =>
        (await service.UpdateAsync(id, request)) is { } profile ? Ok(profile) : NotFound();

    /// <summary>Delete a student profile and its related records.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await service.DeleteAsync(id) ? NoContent() : NotFound();

    /// <summary>Dashboard summary: today's classes, upcoming events, pending tasks, budget and alarms.</summary>
    [HttpGet("{id:int}/dashboard")]
    public async Task<IActionResult> Dashboard(int id, IDashboardService dashboard) =>
        await dashboard.GetAsync(id) is { } data ? Ok(data) : NotFound();

    /// <summary>Get the student's reminder, notification, volume and budget preferences.</summary>
    [HttpGet("{id:int}/settings")]
    public async Task<IActionResult> Settings(int id) =>
        await db.StudentSettings.AsNoTracking().FirstOrDefaultAsync(x => x.StudentId == id) is { } settings
            ? Ok(settings)
            : NotFound();

    /// <summary>Update reminder, notification, volume and budget preferences.</summary>
    [HttpPut("{id:int}/settings")]
    public async Task<IActionResult> SaveSettings(int id, SettingsRequest request)
    {
        var settings = await db.StudentSettings.FirstOrDefaultAsync(x => x.StudentId == id);

        if (settings is null)
        {
            if (!await db.StudentProfiles.AnyAsync(x => x.Id == id))
                return NotFound("Student not found.");

            settings = new StudentSetting { StudentId = id };
            db.StudentSettings.Add(settings);
        }

        settings.ReminderMinutes = request.ReminderMinutes;
        settings.NotificationsEnabled = request.NotificationsEnabled;
        settings.RingtoneEnabled = request.RingtoneEnabled;
        settings.Volume = request.Volume;
        settings.MonthlyBudgetLimit = request.MonthlyBudgetLimit;

        await db.SaveChangesAsync();
        return Ok(settings);
    }

    /// <summary>
    /// Upload a profile photo (JPG, PNG or WebP, maximum 2 MB). The previous
    /// photo is removed. Use multipart/form-data with the field name "file".
    /// </summary>
    [HttpPost("{id:int}/photo")]
    [RequestSizeLimit(3_000_000)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile? file, CancellationToken ct)
    {
        try
        {
            return await photos.SaveAsync(id, file, ct) is { } profile
                ? Ok(profile)
                : NotFound("Student not found.");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Remove the profile photo and delete the stored file.</summary>
    [HttpDelete("{id:int}/photo")]
    public async Task<IActionResult> DeletePhoto(int id, CancellationToken ct) =>
        await photos.RemoveAsync(id, ct) is { } profile
            ? Ok(profile)
            : NotFound("Student not found.");

    /// <summary>
    /// Download a complete JSON backup of the profile and every related record.
    /// Useful for demonstrating the one-to-many relationships in the database.
    /// </summary>
    [HttpGet("{id:int}/export")]
    public async Task<IActionResult> Export(int id, CancellationToken ct)
    {
        var profile = await db.StudentProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (profile is null) return NotFound("Student not found.");

        var bundle = new
        {
            exportedAt = DateTime.UtcNow,
            application = "Uptime Student App",
            profile = new
            {
                profile.Id,
                profile.FirstName,
                profile.LastName,
                profile.PreferredName,
                profile.InstitutionName,
                profile.Email,
                profile.PhotoUrl,
                profile.CreatedAt,
                profile.UpdatedAt
            },
            settings = await db.StudentSettings.AsNoTracking()
                .FirstOrDefaultAsync(x => x.StudentId == id, ct),
            classes = await db.ClassSchedules.AsNoTracking()
                .Where(x => x.StudentId == id).OrderBy(x => x.DayOfWeek).ThenBy(x => x.StartTime).ToListAsync(ct),
            events = await db.CalendarEvents.AsNoTracking()
                .Where(x => x.StudentId == id).OrderBy(x => x.EventDate).ToListAsync(ct),
            expenses = await db.Expenses.AsNoTracking()
                .Where(x => x.StudentId == id).OrderByDescending(x => x.ExpenseDate).ToListAsync(ct),
            tasks = await db.StudentTasks.AsNoTracking()
                .Where(x => x.StudentId == id).OrderBy(x => x.DueDate).ToListAsync(ct),
            alarms = await db.Alarms.AsNoTracking()
                .Where(x => x.StudentId == id).OrderBy(x => x.AlarmTime).ToListAsync(ct),
            studySessions = await db.StudySessions.AsNoTracking()
                .Where(x => x.StudentId == id).OrderByDescending(x => x.StartedAt).ToListAsync(ct)
        };

        var json = JsonSerializer.Serialize(bundle, new JsonSerializerOptions
        {
            WriteIndented = true,
            ReferenceHandler = ReferenceHandler.IgnoreCycles
        });

        return File(
            Encoding.UTF8.GetBytes(json),
            "application/json",
            $"uptime-student-{id}-{DateTime.UtcNow:yyyyMMdd}.json");
    }
}
