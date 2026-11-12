using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Controllers;

[ApiController, Route("api/ringtones")]
public class RingtonesController(ApplicationDbContext db):ControllerBase
{
    [HttpGet] public Task<List<Ringtone>> List()=>db.Ringtones.Where(x=>x.IsActive).OrderBy(x=>x.Category).ThenBy(x=>x.Id).ToListAsync();
}
