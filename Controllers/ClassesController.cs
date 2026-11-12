using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students/{studentId:int}/classes")]
public class ClassesController(IClassService service, ApplicationDbContext db) : ControllerBase
{
    [HttpGet] public Task<List<ClassSchedule>> List(int studentId)=>service.ListAsync(studentId);
    [HttpPost] public async Task<IActionResult> Add(int studentId,ClassRequest r)
    {
        if(!await db.StudentProfiles.AnyAsync(x=>x.Id==studentId))return NotFound("Student not found.");
        if(r.EndTime<=r.StartTime)return BadRequest("End time must be after start time.");
        return Ok(await service.AddAsync(studentId,r));
    }
    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int studentId,int id,ClassRequest r)
    {
        if(r.EndTime<=r.StartTime)return BadRequest("End time must be after start time.");
        return await service.UpdateAsync(id,studentId,r)?NoContent():NotFound();
    }
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int studentId,int id)=>await service.DeleteAsync(id,studentId)?NoContent():NotFound();
}
