namespace UptimeStudentApp.Models;

// Response contracts for the feature pack. Kept separate from EF entities so
// Swagger shows stable, documented shapes.

public record PhotoUploadResult(string PhotoUrl);

public record CalendarImportResult(
    int Imported,
    int Skipped,
    IReadOnlyList<string> Warnings);

public record ClashWarning(
    string Type,
    string Severity,
    string Title,
    string Detail,
    string Day,
    string Start,
    string End);

public record StudyDayDto(string Date, string Label, int Minutes);

public record SubjectMinutesDto(string Subject, int Minutes);

public record StudyInsightDto(
    int WeekMinutes,
    int TotalMinutes,
    int Sessions,
    int StreakDays,
    int FocusScore,
    double AverageSession,
    int OpenTasks,
    int CompletedTasks,
    int OverdueTasks,
    int StudyGoalMinutes,
    IReadOnlyList<StudyDayDto> Days,
    IReadOnlyList<SubjectMinutesDto> Subjects);

public record SchemaColumnDto(
    string Name,
    string Type,
    bool IsNullable,
    bool IsPrimaryKey,
    string? References);

public record SchemaTableDto(
    string Name,
    long RowCount,
    IReadOnlyList<SchemaColumnDto> Columns);

public record SchemaRelationshipDto(
    string FromTable,
    string FromColumn,
    string ToTable,
    string ToColumn);

public record SchemaSnapshotDto(
    DateTime GeneratedAt,
    string Database,
    string Provider,
    int TableCount,
    long TotalRows,
    IReadOnlyList<SchemaTableDto> Tables,
    IReadOnlyList<SchemaRelationshipDto> Relationships);

public record TablePreviewDto(
    string Table,
    long TotalRows,
    IReadOnlyList<string> Columns,
    IReadOnlyList<Dictionary<string, object?>> Rows);

public record SqlLabQueryDto(
    string Key,
    string Title,
    string Description,
    string Sql);

public record SqlLabResultDto(
    string Key,
    string Title,
    string Sql,
    long ElapsedMs,
    IReadOnlyList<string> Columns,
    IReadOnlyList<Dictionary<string, object?>> Rows);

public record DemoSeedResult(
    int StudentId,
    bool Created,
    string Message,
    string? PhotoUrl);
