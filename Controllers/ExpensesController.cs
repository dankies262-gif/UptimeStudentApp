using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/students/{studentId:int}/expenses")]
public class ExpensesController(IExpenseService service,ApplicationDbContext db):ControllerBase
{
    [HttpGet] public Task<List<Expense>> List(int studentId)=>service.ListAsync(studentId);
    [HttpPost] public async Task<IActionResult> Add(int studentId,ExpenseRequest r){if(!await db.StudentProfiles.AnyAsync(x=>x.Id==studentId))return NotFound("Student not found.");try{return Ok(await service.AddAsync(studentId,r));}catch(ArgumentException e){return BadRequest(e.Message);}}
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int studentId,int id)=>await service.DeleteAsync(id,studentId)?NoContent():NotFound();
}
