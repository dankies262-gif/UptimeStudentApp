using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>One-off calendar events for a student.</summary>
[ApiController, Route("api/students/{studentId:int}/events")]
public class EventsController(IEventService service, ApplicationDbContext db) : ControllerBase
{
    /// <summary>List calendar events ordered by date.</summary>
    [HttpGet]
    public Task<List<CalendarEvent>> List(int studentId) => service.ListAsync(studentId);

    /// <summary>Create a calendar event.</summary>
    [HttpPost]
    public async Task<IActionResult> Add(int studentId, EventRequest request)
    {
        if (!await db.StudentProfiles.AnyAsync(x => x.Id == studentId))
            return NotFound("Student not found.");

        return Ok(await service.AddAsync(studentId, request));
    }

    /// <summary>Update an existing calendar event.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int studentId, int id, EventRequest request) =>
        await service.UpdateAsync(id, studentId, request) ? NoContent() : NotFound();

    /// <summary>Delete a calendar event.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int studentId, int id) =>
        await service.DeleteAsync(id, studentId) ? NoContent() : NotFound();
}
