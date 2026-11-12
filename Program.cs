
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using UptimeStudentApp.Data;
using UptimeStudentApp.Services;

// ============================================================
// UPTIME STUDENT APP
// Main application configuration and startup
// Framework: .NET 10
// Database: PostgreSQL
// API documentation: Swagger / OpenAPI
// ============================================================

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 1. DATABASE CONNECTION
// Read the connection string from UPTIME_DB_CONNECTION or
// ConnectionStrings__Uptime. Credentials are never stored in source.
// ============================================================

var connectionString = Environment.GetEnvironmentVariable("UPTIME_DB_CONNECTION")
    ?? builder.Configuration.GetConnectionString("Uptime");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Set UPTIME_DB_CONNECTION or ConnectionStrings__Uptime to a PostgreSQL connection string.");
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// ============================================================
// 2. REGISTER APPLICATION SERVICES
// Each service is created per request.
// ============================================================

builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IAlarmService, AlarmService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ============================================================
// 3. REGISTER CONTROLLERS
// ============================================================

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ============================================================
// 4. SWAGGER AND OPENAPI DOCUMENTATION
// Swashbuckle 10 uses Microsoft.OpenApi.OpenApiInfo.
// It does not use Microsoft.OpenApi.Models.OpenApiInfo.
// ============================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Uptime Student App API",
        Version = "v1",
        Description =
            "Student productivity API by Reinhold IT Solutions. " +
            "This local development version does not use authentication."
    });
});

// ============================================================
// 5. CORS CONFIGURATION
// Allows the configured local frontend addresses to call the API.
// Add your actual frontend origin here if it uses another port.
// ============================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("UptimeLocal", policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ============================================================
// 6. BUILD THE APPLICATION
// ============================================================

var app = builder.Build();

// ============================================================
// 7. SWAGGER MIDDLEWARE
// Swagger is enabled for local and hosted development deployments.
// ============================================================

app.UseSwagger();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint(
        "/swagger/v1/swagger.json",
        "Uptime Student App API v1"
    );

    options.RoutePrefix = "swagger";
});

// ============================================================
// 8. STATIC FILES AND CORS
// Serves frontend files from wwwroot, if present.
// ============================================================

app.UseCors("UptimeLocal");

app.UseDefaultFiles();
app.UseStaticFiles();

// ============================================================
// 9. MAP API CONTROLLERS
// ============================================================

app.MapControllers();

// ============================================================
// 10. HEALTH CHECK
// Visit /health to check whether the application is running.
// ============================================================

app.MapGet("/health", async (
    ApplicationDbContext db,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var databaseAvailable = await db.Database.CanConnectAsync(cancellationToken);
    if (!databaseAvailable)
    {
        logger.LogError("PostgreSQL health check failed for the Uptime database.");
        return Results.Problem(
            title: "Database unavailable",
            detail: "The API is running, but it cannot connect to the Uptime PostgreSQL database.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.Ok(new
    {
        status = "ok",
        app = "Uptime Student App",
        database = "connected"
    });
})
    .WithName("HealthCheck")
    .WithSummary("Check API and PostgreSQL availability");

// ============================================================
// 11. START APPLICATION
// ============================================================

app.Run();
