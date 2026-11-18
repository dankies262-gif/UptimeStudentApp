using Microsoft.AspNetCore.Mvc;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>Focus analytics calculated from study sessions and tasks.</summary>
[ApiController, Route("api/students/{studentId:int}/insights")]
public class InsightsController(IInsightsService insights) : ControllerBase
{
    /// <summary>
    /// Weekly focus minutes, streak, seven-day series, subject breakdown, focus
    /// score (300-minute weekly goal) and task counters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(int studentId, CancellationToken ct) =>
        await insights.GetAsync(studentId, ct) is { } data
            ? Ok(data)
            : NotFound("Student not found.");
}
