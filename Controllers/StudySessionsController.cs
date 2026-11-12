using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students/{studentId:int}/study-sessions")]
public class StudySessionsController(ApplicationDbContext db):ControllerBase
{
    [HttpGet] public Task<List<StudySession>> List(int studentId)=>db.StudySessions.Where(x=>x.StudentId==studentId).OrderByDescending(x=>x.StartedAt).Take(100).ToListAsync();
    [HttpPost] public async Task<IActionResult> Add(int studentId,StudySessionRequest r)
    {
        if(!await db.StudentProfiles.AnyAsync(x=>x.Id==studentId))return NotFound("Student not found.");
        var x=new StudySession{StudentId=studentId,Subject=r.Subject.Trim(),DurationMinutes=r.DurationMinutes,StartedAt=DateTime.UtcNow};
        db.Add(x);await db.SaveChangesAsync();return Ok(x);
    }
}
