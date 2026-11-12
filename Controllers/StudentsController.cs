using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students")]
public class StudentsController(IStudentService service, ApplicationDbContext db) : ControllerBase
{
    [HttpGet] public Task<List<StudentProfile>> List() => service.ListAsync();
    [HttpGet("{id:int}")] public async Task<IActionResult> Get(int id) => (await service.GetAsync(id)) is { } p ? Ok(p) : NotFound();
    [HttpPost] public async Task<IActionResult> Create(StudentProfileRequest request)
    {
        var profile = await service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = profile.Id }, profile);
    }
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, StudentProfileRequest request) => (await service.UpdateAsync(id, request)) is { } p ? Ok(p) : NotFound();
    [HttpGet("{id:int}/dashboard")] public async Task<IActionResult> Dashboard(int id, IDashboardService dashboard) => await dashboard.GetAsync(id) is { } data ? Ok(data) : NotFound();
    [HttpGet("{id:int}/settings")] public async Task<IActionResult> Settings(int id) => await db.StudentSettings.FirstOrDefaultAsync(x=>x.StudentId==id) is { } s ? Ok(s) : NotFound();
    [HttpPut("{id:int}/settings")] public async Task<IActionResult> SaveSettings(int id, SettingsRequest r)
    {
        var s=await db.StudentSettings.FirstOrDefaultAsync(x=>x.StudentId==id);
        if(s is null) return NotFound("Student or settings not found.");
        s.ReminderMinutes=r.ReminderMinutes;s.NotificationsEnabled=r.NotificationsEnabled;s.RingtoneEnabled=r.RingtoneEnabled;s.Volume=r.Volume;s.MonthlyBudgetLimit=r.MonthlyBudgetLimit;
        await db.SaveChangesAsync();return Ok(s);
    }
}
