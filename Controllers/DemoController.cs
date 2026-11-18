using Microsoft.AspNetCore.Mvc;
using UptimeStudentApp.Services;

namespace UptimeStudentApp.Controllers;

/// <summary>
/// Classroom demo data. Seeding is additive and idempotent; resetting only
/// removes the profile with the demo@uptime.local email.
/// </summary>
[ApiController, Route("api/demo")]
public class DemoController(IDemoDataService demo) : ControllerBase
{
    /// <summary>Create the demo student with classes, events, tasks, expenses, alarms and study data.</summary>
    [HttpPost("seed")]
    public async Task<IActionResult> Seed(CancellationToken ct) =>
        Ok(await demo.SeedAsync(ct));

    /// <summary>Delete and rebuild the demo student. Other students are never touched.</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset(CancellationToken ct) =>
        Ok(await demo.ResetAsync(ct));
}
