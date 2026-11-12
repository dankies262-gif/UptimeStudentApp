using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students/{studentId:int}/events")]
public class EventsController(IEventService service,ApplicationDbContext db):ControllerBase
{
    [HttpGet] public Task<List<CalendarEvent>> List(int studentId)=>service.ListAsync(studentId);
    [HttpPost] public async Task<IActionResult> Add(int studentId,EventRequest r){if(!await db.StudentProfiles.AnyAsync(x=>x.Id==studentId))return NotFound("Student not found.");return Ok(await service.AddAsync(studentId,r));}
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int studentId,int id)=>await service.DeleteAsync(id,studentId)?NoContent():NotFound();
}
