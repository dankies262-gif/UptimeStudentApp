using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Data;

/// <summary>
/// EF Core database context. Table and column names match the SQL Server schema.
/// </summary>
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    private static readonly ValueConverter<DateTime, DateTime> UtcTimestampConverter = new(
        value => DateTime.SpecifyKind(value, DateTimeKind.Unspecified),
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<ClassSchedule> ClassSchedules => Set<ClassSchedule>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<StudentTask> StudentTasks => Set<StudentTask>();
    public DbSet<StudySession> StudySessions => Set<StudySession>();
    public DbSet<Ringtone> Ringtones => Set<Ringtone>();
    public DbSet<Alarm> Alarms => Set<Alarm>();
    public DbSet<StudentSetting> StudentSettings => Set<StudentSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StudentProfile>().ToTable("UptimeStudentProfiles");
        modelBuilder.Entity<ClassSchedule>().ToTable("UptimeClassSchedules");
        modelBuilder.Entity<CalendarEvent>().ToTable("UptimeCalendarEvents");
        modelBuilder.Entity<Expense>().ToTable("UptimeExpenses");
        modelBuilder.Entity<StudentTask>().ToTable("UptimeStudentTasks");
        modelBuilder.Entity<StudySession>().ToTable("UptimeStudySessions");
        modelBuilder.Entity<Ringtone>().ToTable("UptimeRingtones");
        modelBuilder.Entity<Alarm>().ToTable("UptimeAlarms");
        modelBuilder.Entity<StudentSetting>().ToTable("UptimeStudentSettings");

        var isPostgres = Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL";
        var timestampType = isPostgres ? "timestamp without time zone" : "datetime2(6)";
        const string timeType = "time(0)";

        modelBuilder.Entity<StudentProfile>().HasIndex(x => x.Email).IsUnique()
            .HasFilter(isPostgres ? "\"Email\" IS NOT NULL" : "[Email] IS NOT NULL");
        modelBuilder.Entity<StudentProfile>().Property(x => x.CreatedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<StudentProfile>().Property(x => x.UpdatedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<ClassSchedule>().Property(x => x.StartTime).HasColumnType(timeType);
        modelBuilder.Entity<ClassSchedule>().Property(x => x.EndTime).HasColumnType(timeType);
        modelBuilder.Entity<CalendarEvent>().Property(x => x.EventTime).HasColumnType(timeType);
        modelBuilder.Entity<Alarm>().Property(x => x.AlarmTime).HasColumnType(timeType);
        modelBuilder.Entity<Alarm>().Property(x => x.CreatedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<Alarm>().Property(x => x.UpdatedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<StudentTask>().Property(x => x.CreatedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<StudySession>().Property(x => x.StartedAt)
            .HasColumnType(timestampType).HasConversion(UtcTimestampConverter);
        modelBuilder.Entity<ClassSchedule>().HasIndex(x => new { x.StudentId, x.DayOfWeek, x.StartTime });
        modelBuilder.Entity<CalendarEvent>().HasIndex(x => new { x.StudentId, x.EventDate });
        modelBuilder.Entity<Expense>().HasIndex(x => new { x.StudentId, x.ExpenseDate });
        modelBuilder.Entity<StudentTask>().HasIndex(x => new { x.StudentId, x.DueDate });
        modelBuilder.Entity<StudySession>().HasIndex(x => new { x.StudentId, x.StartedAt });
        modelBuilder.Entity<Alarm>().HasIndex(x => new { x.StudentId, x.IsEnabled, x.AlarmTime });

        modelBuilder.Entity<ClassSchedule>().HasOne(x => x.Student).WithMany(x => x.Classes)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CalendarEvent>().HasOne(x => x.Student).WithMany(x => x.Events)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Expense>().HasOne(x => x.Student).WithMany(x => x.Expenses)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StudentTask>().HasOne(x => x.Student).WithMany(x => x.Tasks)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StudySession>().HasOne(x => x.Student).WithMany(x => x.StudySessions)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StudentSetting>().HasOne(x => x.Student).WithOne(x => x.Settings)
            .HasForeignKey<StudentSetting>(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Alarm>().HasOne(x => x.Student).WithMany(x => x.Alarms)
            .HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Alarm>().HasOne(x => x.Ringtone).WithMany(x => x.Alarms)
            .HasForeignKey(x => x.RingtoneId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Expense>().Property(x => x.Amount).HasPrecision(10, 2);
        modelBuilder.Entity<StudentSetting>().Property(x => x.MonthlyBudgetLimit).HasPrecision(10, 2);
        modelBuilder.Entity<Ringtone>().HasData(
            new Ringtone { Id = 1, Name = "Rising Bell", Category = "Samsung-inspired", AudioFilePath = "/audio/tone1.wav", IsActive = true },
            new Ringtone { Id = 2, Name = "Orbit Chime", Category = "Samsung-inspired", AudioFilePath = "/audio/tone2.wav", IsActive = true },
            new Ringtone { Id = 3, Name = "Soft Horizon", Category = "Samsung-inspired", AudioFilePath = "/audio/tone3.wav", IsActive = true },
            new Ringtone { Id = 4, Name = "Marimba Pulse", Category = "iPhone-inspired", AudioFilePath = "/audio/tone4.wav", IsActive = true },
            new Ringtone { Id = 5, Name = "Radar Ping", Category = "iPhone-inspired", AudioFilePath = "/audio/tone5.wav", IsActive = true },
            new Ringtone { Id = 6, Name = "Twin Drops", Category = "iPhone-inspired", AudioFilePath = "/audio/tone6.wav", IsActive = true },
            new Ringtone { Id = 7, Name = "Aurora", Category = "Huawei-inspired", AudioFilePath = "/audio/tone7.wav", IsActive = true },
            new Ringtone { Id = 8, Name = "Crystal Ping", Category = "Huawei-inspired", AudioFilePath = "/audio/tone8.wav", IsActive = true },
            new Ringtone { Id = 9, Name = "Calm Waves", Category = "Huawei-inspired", AudioFilePath = "/audio/tone9.wav", IsActive = true }
        );
    }
}
