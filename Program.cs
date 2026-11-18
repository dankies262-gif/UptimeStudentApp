
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Npgsql;
using UptimeStudentApp.Data;
using UptimeStudentApp.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 1. HOST CONFIGURATION
// ============================================================

var port = Environment.GetEnvironmentVariable("PORT");

if (!string.IsNullOrWhiteSpace(port) &&
    int.TryParse(port, out var portNumber) &&
    portNumber > 0 &&
    portNumber <= 65535)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{portNumber}");
}

builder.Configuration.AddUserSecrets(
    Assembly.GetExecutingAssembly(),
    optional: true,
    reloadOnChange: false);

// ============================================================
// 2. DATABASE CONNECTION
// ============================================================

var databaseProvider =
    Environment.GetEnvironmentVariable("UPTIME_DB_PROVIDER")
    ?? builder.Configuration["Database:Provider"]
    ?? "SqlServer";

var connectionString =
    Environment.GetEnvironmentVariable("UPTIME_DB_CONNECTION")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException("Configure UPTIME_DB_CONNECTION for PostgreSQL.");

    connectionString = NormalizePostgresConnectionString(connectionString);
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else if (databaseProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException(
            "Configure UPTIME_DB_CONNECTION or ConnectionStrings:DefaultConnection.");

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(connectionString));
}
else
{
    throw new InvalidOperationException(
        $"Unsupported UPTIME_DB_PROVIDER '{databaseProvider}'. Use SqlServer or PostgreSQL.");
}

// ============================================================
// 3. APPLICATION SERVICES
// ============================================================

builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IAlarmService, AlarmService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IProfilePhotoService, ProfilePhotoService>();
builder.Services.AddScoped<ICalendarSyncService, CalendarSyncService>();
builder.Services.AddScoped<IInsightsService, InsightsService>();
builder.Services.AddScoped<IDemoDataService, DemoDataService>();
builder.Services.AddScoped<ISchemaService, SchemaService>();

builder.Services.AddProblemDetails();

// ============================================================
// 4. CONTROLLERS
// ============================================================

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ============================================================
// 5. SWAGGER / OPENAPI
// ============================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Uptime Student App API",
        Version = "v1",
        Description =
            "Uptime Student Productivity API by Reinhold IT Solutions. " +
            "Includes students, profiles, timetable, calendar, tasks, " +
            "expenses, alarms, dashboards and insights."
    });

    options.OrderActionsBy(api => api.RelativePath);

    var xmlPath = Path.Combine(
        AppContext.BaseDirectory,
        $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");

    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(
            xmlPath,
            includeControllerXmlComments: true);
    }
});

// ============================================================
// 6. CORS CONFIGURATION
// Configure additional frontend origins in appsettings.json.
// ============================================================

var configuredOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? Array.Empty<string>();

var allowedOrigins = configuredOrigins
    .Where(origin => Uri.TryCreate(
        origin, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp ||
         uri.Scheme == Uri.UriSchemeHttps))
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddPolicy("UptimeLocal", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;

            // Explicitly configured frontend origins.
            if (allowedOrigins.Contains(origin))
                return true;

            // Local development addresses.
            return uri.Host.Equals("localhost",
                       StringComparison.OrdinalIgnoreCase)
                || uri.Host.Equals("127.0.0.1",
                       StringComparison.OrdinalIgnoreCase)
                || uri.Host.Equals("::1",
                       StringComparison.OrdinalIgnoreCase);
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// ============================================================
// 7. BUILD APPLICATION
// ============================================================

var app = builder.Build();

if (databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase) &&
    bool.TryParse(Environment.GetEnvironmentVariable("UPTIME_DB_INITIALIZE"), out var initializeDatabase) &&
    initializeDatabase)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.EnsureCreatedAsync();
}

// ============================================================
// 8. EXCEPTION HANDLING
// ============================================================

app.UseExceptionHandler();

// ============================================================
// 9. SECURITY HEADERS
// ============================================================

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] =
        "camera=(), microphone=(), geolocation=()";

    await next();
});

// ============================================================
// 10. ROUTING AND CORS
// ============================================================

app.UseRouting();

app.UseCors("UptimeLocal");

// ============================================================
// 11. SWAGGER
// ============================================================

app.UseSwagger();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint(
        "v1/swagger.json",
        "Uptime Student App API v1");

    options.RoutePrefix = "swagger";
    options.DocumentTitle = "Uptime API Explorer";
    options.DefaultModelsExpandDepth(0);
    options.DocExpansion(
        Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
    options.DisplayRequestDuration();
    options.EnableTryItOutByDefault();
    options.EnableDeepLinking();
    options.EnableFilter();
});

// ============================================================
// 12. STATIC FRONTEND FILES
// ============================================================

app.UseDefaultFiles();
app.UseStaticFiles();

// ============================================================
// 13. API CONTROLLERS
// ============================================================

app.MapControllers();

// ============================================================
// 14. API ROOT
// ============================================================

app.MapGet("/api", () =>
    Results.Redirect("/swagger"))
    .ExcludeFromDescription();

// ============================================================
// 15. HEALTH CHECK
// ============================================================

app.MapGet("/health", async (
    ApplicationDbContext db,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    try
    {
        var databaseAvailable =
            await db.Database.CanConnectAsync(cancellationToken);

        if (!databaseAvailable)
        {
            logger.LogError(
                "Uptime {Provider} database is unavailable.", databaseProvider);

            return Results.Problem(
                detail: $"API is running, but {databaseProvider} is unavailable.",
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Database unavailable");
        }

        return Results.Ok(new
        {
            status = "ok",
            app = "Uptime Student App",
            database = "connected",
            provider = databaseProvider,
            swagger = "/swagger"
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex,
            "Database health check encountered an error.");

        return Results.Problem(
            detail: $"Unable to verify the {databaseProvider} connection.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database health check failed");
    }
})
.WithName("HealthCheck")
.WithSummary("Check API and database availability");

// ============================================================
// 16. START APPLICATION
// ============================================================

app.Run();

static string NormalizePostgresConnectionString(string connectionString)
{
    if (!Uri.TryCreate(connectionString, UriKind.Absolute, out var uri) ||
        !(uri.Scheme.Equals("postgres", StringComparison.OrdinalIgnoreCase) ||
          uri.Scheme.Equals("postgresql", StringComparison.OrdinalIgnoreCase)))
    {
        return connectionString;
    }

    var credentials = uri.UserInfo.Split(':', 2);
    if (credentials.Length != 2 || string.IsNullOrWhiteSpace(uri.Host))
        throw new InvalidOperationException("UPTIME_DB_CONNECTION is not a valid PostgreSQL URL.");

    return new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
        Username = Uri.UnescapeDataString(credentials[0]),
        Password = Uri.UnescapeDataString(credentials[1]),
        SslMode = SslMode.Require
    }.ConnectionString;
}
