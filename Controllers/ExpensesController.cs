using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>Student expenses used by the budget tracker.</summary>
[ApiController, Route("api/students/{studentId:int}/expenses")]
public class ExpensesController(IExpenseService service, ApplicationDbContext db) : ControllerBase
{
    /// <summary>List expenses, newest first.</summary>
    [HttpGet]
    public Task<List<Expense>> List(int studentId) => service.ListAsync(studentId);

    /// <summary>Create an expense. Amount must be greater than zero.</summary>
    [HttpPost]
    public async Task<IActionResult> Add(int studentId, ExpenseRequest request)
    {
        if (!await db.StudentProfiles.AnyAsync(x => x.Id == studentId))
            return NotFound("Student not found.");

        try
        {
            return Ok(await service.AddAsync(studentId, request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Update an existing expense. Amount must be greater than zero.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int studentId, int id, ExpenseRequest request)
    {
        try
        {
            return await service.UpdateAsync(id, studentId, request) ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Delete an expense.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int studentId, int id) =>
        await service.DeleteAsync(id, studentId) ? NoContent() : NotFound();
}
