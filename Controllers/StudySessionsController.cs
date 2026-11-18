using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Controllers;

/// <summary>Focus and study sessions recorded by the timer.</summary>
[ApiController, Route("api/students/{studentId:int}/study-sessions")]
public class StudySessionsController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>List the 100 most recent study sessions.</summary>
    [HttpGet]
    public Task<List<StudySession>> List(int studentId) =>
        db.StudySessions
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.StartedAt)
            .Take(100)
            .ToListAsync();

    /// <summary>Record a completed study session.</summary>
    [HttpPost]
    public async Task<IActionResult> Add(int studentId, StudySessionRequest request)
    {
        if (!await db.StudentProfiles.AnyAsync(x => x.Id == studentId))
            return NotFound("Student not found.");

        var session = new StudySession
        {
            StudentId = studentId,
            Subject = request.Subject.Trim(),
            DurationMinutes = request.DurationMinutes,
            StartedAt = request.StartedAt?.ToUniversalTime() ?? DateTime.UtcNow
        };

        db.StudySessions.Add(session);
        await db.SaveChangesAsync();
        return Ok(session);
    }

    /// <summary>Update a study session.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int studentId, int id, StudySessionRequest request)
    {
        var session = await db.StudySessions.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (session is null) return NotFound();

        session.Subject = request.Subject.Trim();
        session.DurationMinutes = request.DurationMinutes;
        if (request.StartedAt is { } startedAt)
            session.StartedAt = startedAt.ToUniversalTime();

        await db.SaveChangesAsync();
        return Ok(session);
    }

    /// <summary>Delete a study session.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int studentId, int id)
    {
        var session = await db.StudySessions.FirstOrDefaultAsync(
            x => x.Id == id && x.StudentId == studentId);

        if (session is null) return NotFound();

        db.StudySessions.Remove(session);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
