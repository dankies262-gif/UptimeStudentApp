using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students/{studentId:int}/alarms")]
public class AlarmsController(IAlarmService service,ApplicationDbContext db):ControllerBase
{
    [HttpGet] public Task<List<Alarm>> List(int studentId)=>service.ListAsync(studentId);
    [HttpPost] public async Task<IActionResult> Add(int studentId,AlarmRequest r){if(!await db.StudentProfiles.AnyAsync(x=>x.Id==studentId))return NotFound("Student not found.");try{return Ok(await service.AddAsync(studentId,r));}catch(ArgumentException e){return BadRequest(e.Message);}}
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int studentId,int id,AlarmRequest r){try{return await service.UpdateAsync(id,studentId,r)?NoContent():NotFound();}catch(ArgumentException e){return BadRequest(e.Message);}}
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int studentId,int id)=>await service.DeleteAsync(id,studentId)?NoContent():NotFound();
    [HttpPatch("{id:int}/enabled")] public async Task<IActionResult> Enabled(int studentId,int id,[FromBody] bool enabled){var a=await db.Alarms.FirstOrDefaultAsync(x=>x.Id==id&&x.StudentId==studentId);if(a is null)return NotFound();a.IsEnabled=enabled;a.UpdatedAt=DateTime.UtcNow;await db.SaveChangesAsync();return Ok(a);}
}
