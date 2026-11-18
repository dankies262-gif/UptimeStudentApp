-- ============================================================
-- Uptime application schema for Microsoft SQL Server.
-- Run with: sqlcmd -S <server> -E -d Uptime -i database\Uptime_SQLServer.sql
-- Uses Windows Authentication; no password is stored anywhere.
-- The script is idempotent: it creates missing objects and keeps existing rows.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.UptimeStudentProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentProfiles (
        Id             int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeStudentProfiles PRIMARY KEY,
        FirstName      nvarchar(80)  NOT NULL,
        LastName       nvarchar(80)  NOT NULL,
        PreferredName  nvarchar(80)  NULL,
        InstitutionName nvarchar(150) NOT NULL,
        Email          nvarchar(150) NULL,
        PhotoUrl       nvarchar(300) NULL,
        CreatedAt      datetime2(6)  NOT NULL CONSTRAINT DF_UptimeStudentProfiles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt      datetime2(6)  NOT NULL CONSTRAINT DF_UptimeStudentProfiles_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeStudentProfiles_Email' AND object_id = OBJECT_ID(N'dbo.UptimeStudentProfiles'))
BEGIN
    CREATE UNIQUE INDEX IX_UptimeStudentProfiles_Email
        ON dbo.UptimeStudentProfiles (Email)
        WHERE Email IS NOT NULL;
END

-- Additive migration for databases created before profile photos existed.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.UptimeStudentProfiles') AND name = N'PhotoUrl')
BEGIN
    ALTER TABLE dbo.UptimeStudentProfiles ADD PhotoUrl nvarchar(300) NULL;
END

IF OBJECT_ID(N'dbo.UptimeRingtones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeRingtones (
        Id            int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeRingtones PRIMARY KEY,
        Name          nvarchar(80)  NOT NULL,
        Category      nvarchar(40)  NOT NULL,
        AudioFilePath nvarchar(250) NOT NULL,
        IsActive      bit           NOT NULL CONSTRAINT DF_UptimeRingtones_IsActive DEFAULT (1),
        CreatedAt     datetime2(6)  NOT NULL CONSTRAINT DF_UptimeRingtones_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
END

IF OBJECT_ID(N'dbo.UptimeClassSchedules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeClassSchedules (
        Id         int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeClassSchedules PRIMARY KEY,
        StudentId  int NOT NULL,
        Course     nvarchar(150) NOT NULL,
        DayOfWeek  nvarchar(10)  NOT NULL,
        StartTime  time(0)       NOT NULL,
        EndTime    time(0)       NOT NULL,
        Venue      nvarchar(150) NOT NULL,
        Instructor nvarchar(120) NULL,
        CONSTRAINT FK_ClassSchedules_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT CK_UptimeClassSchedules_Day
            CHECK (DayOfWeek IN (N'Sun', N'Sat', N'Fri', N'Thu', N'Wed', N'Tue', N'Mon')),
        CONSTRAINT CK_UptimeClassSchedules_Time
            CHECK (EndTime > StartTime)
    );
END

IF OBJECT_ID(N'dbo.UptimeCalendarEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeCalendarEvents (
        Id          int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeCalendarEvents PRIMARY KEY,
        StudentId   int NOT NULL,
        Title       nvarchar(150)  NOT NULL,
        EventDate   date           NOT NULL,
        EventTime   time(0)        NULL,
        Description nvarchar(1000) NULL,
        CONSTRAINT FK_CalendarEvents_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE
    );
END

IF OBJECT_ID(N'dbo.UptimeExpenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeExpenses (
        Id          int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeExpenses PRIMARY KEY,
        StudentId   int NOT NULL,
        Name        nvarchar(150) NOT NULL,
        Amount      decimal(10,2) NOT NULL,
        Category    nvarchar(50)  NOT NULL,
        ExpenseDate date          NOT NULL,
        CONSTRAINT FK_Expenses_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT CK_UptimeExpenses_Amount CHECK (Amount > 0)
    );
END

IF OBJECT_ID(N'dbo.UptimeStudentTasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentTasks (
        Id          int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeStudentTasks PRIMARY KEY,
        StudentId   int NOT NULL,
        Title       nvarchar(180)  NOT NULL,
        Description nvarchar(1000) NULL,
        DueDate     date           NULL,
        Status      nvarchar(20)   NOT NULL CONSTRAINT DF_UptimeStudentTasks_Status DEFAULT (N'Pending'),
        Priority    nvarchar(20)   NOT NULL CONSTRAINT DF_UptimeStudentTasks_Priority DEFAULT (N'Normal'),
        CreatedAt   datetime2(6)   NOT NULL CONSTRAINT DF_UptimeStudentTasks_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_StudentTasks_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT CK_UptimeStudentTasks_Priority
            CHECK (Priority IN (N'High', N'Normal', N'Low')),
        CONSTRAINT CK_UptimeStudentTasks_Status
            CHECK (Status IN (N'Completed', N'In Progress', N'Pending'))
    );
END

IF OBJECT_ID(N'dbo.UptimeStudySessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudySessions (
        Id              int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeStudySessions PRIMARY KEY,
        StudentId       int NOT NULL,
        Subject         nvarchar(150) NOT NULL,
        DurationMinutes int           NOT NULL,
        StartedAt       datetime2(6)  NOT NULL CONSTRAINT DF_UptimeStudySessions_StartedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_StudySessions_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT CK_UptimeStudySessions_Duration
            CHECK (DurationMinutes BETWEEN 1 AND 1440)
    );
END

IF OBJECT_ID(N'dbo.UptimeStudentSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentSettings (
        Id                 int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeStudentSettings PRIMARY KEY,
        StudentId          int NOT NULL,
        ReminderMinutes    int           NOT NULL CONSTRAINT DF_UptimeStudentSettings_Reminder DEFAULT (60),
        NotificationsEnabled bit         NOT NULL CONSTRAINT DF_UptimeStudentSettings_Notifications DEFAULT (1),
        RingtoneEnabled    bit           NOT NULL CONSTRAINT DF_UptimeStudentSettings_Ringtone DEFAULT (1),
        Volume             int           NOT NULL CONSTRAINT DF_UptimeStudentSettings_Volume DEFAULT (70),
        MonthlyBudgetLimit decimal(10,2) NOT NULL CONSTRAINT DF_UptimeStudentSettings_Budget DEFAULT (500),
        CONSTRAINT FK_StudentSettings_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT UQ_UptimeStudentSettings_Student UNIQUE (StudentId),
        CONSTRAINT CK_UptimeStudentSettings_Budget CHECK (MonthlyBudgetLimit > 0),
        CONSTRAINT CK_UptimeStudentSettings_Reminder CHECK (ReminderMinutes BETWEEN 1 AND 1440),
        CONSTRAINT CK_UptimeStudentSettings_Volume CHECK (Volume BETWEEN 0 AND 100)
    );
END

IF OBJECT_ID(N'dbo.UptimeAlarms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeAlarms (
        Id         int IDENTITY(1,1) NOT NULL CONSTRAINT PK_UptimeAlarms PRIMARY KEY,
        StudentId  int NOT NULL,
        Label      nvarchar(100) NOT NULL CONSTRAINT DF_UptimeAlarms_Label DEFAULT (N'Alarm'),
        AlarmTime  time(0)       NOT NULL,
        IsEnabled  bit           NOT NULL CONSTRAINT DF_UptimeAlarms_IsEnabled DEFAULT (1),
        RepeatDays nvarchar(13)  NOT NULL CONSTRAINT DF_UptimeAlarms_RepeatDays DEFAULT (N''),
        RingtoneId int           NOT NULL,
        CreatedAt  datetime2(6)  NOT NULL CONSTRAINT DF_UptimeAlarms_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt  datetime2(6)  NOT NULL CONSTRAINT DF_UptimeAlarms_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Alarms_Ringtones
            FOREIGN KEY (RingtoneId) REFERENCES dbo.UptimeRingtones (Id),
        CONSTRAINT FK_Alarms_StudentProfiles
            FOREIGN KEY (StudentId) REFERENCES dbo.UptimeStudentProfiles (Id) ON DELETE CASCADE,
        CONSTRAINT CK_UptimeAlarms_RepeatDays
            CHECK (RepeatDays = N'' OR RepeatDays NOT LIKE N'%[^1-7,]%')
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeClassSchedules_Student_Day_Time' AND object_id = OBJECT_ID(N'dbo.UptimeClassSchedules'))
    CREATE INDEX IX_UptimeClassSchedules_Student_Day_Time ON dbo.UptimeClassSchedules (StudentId, DayOfWeek, StartTime);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeCalendarEvents_Student_Date' AND object_id = OBJECT_ID(N'dbo.UptimeCalendarEvents'))
    CREATE INDEX IX_UptimeCalendarEvents_Student_Date ON dbo.UptimeCalendarEvents (StudentId, EventDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeExpenses_Student_Date' AND object_id = OBJECT_ID(N'dbo.UptimeExpenses'))
    CREATE INDEX IX_UptimeExpenses_Student_Date ON dbo.UptimeExpenses (StudentId, ExpenseDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeStudentTasks_Student_DueDate' AND object_id = OBJECT_ID(N'dbo.UptimeStudentTasks'))
    CREATE INDEX IX_UptimeStudentTasks_Student_DueDate ON dbo.UptimeStudentTasks (StudentId, DueDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeStudySessions_Student_Started' AND object_id = OBJECT_ID(N'dbo.UptimeStudySessions'))
    CREATE INDEX IX_UptimeStudySessions_Student_Started ON dbo.UptimeStudySessions (StudentId, StartedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UptimeAlarms_Student_Time' AND object_id = OBJECT_ID(N'dbo.UptimeAlarms'))
    CREATE INDEX IX_UptimeAlarms_Student_Time ON dbo.UptimeAlarms (StudentId, IsEnabled, AlarmTime);

IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones)
BEGIN
    SET IDENTITY_INSERT dbo.UptimeRingtones ON;
    INSERT INTO dbo.UptimeRingtones (Id, Name, Category, AudioFilePath, IsActive)
    VALUES
        (1, N'Rising Bell',   N'Samsung-inspired', N'/audio/tone1.wav', 1),
        (2, N'Orbit Chime',   N'Samsung-inspired', N'/audio/tone2.wav', 1),
        (3, N'Soft Horizon',  N'Samsung-inspired', N'/audio/tone3.wav', 1),
        (4, N'Marimba Pulse', N'iPhone-inspired',  N'/audio/tone4.wav', 1),
        (5, N'Radar Ping',    N'iPhone-inspired',  N'/audio/tone5.wav', 1),
        (6, N'Twin Drops',    N'iPhone-inspired',  N'/audio/tone6.wav', 1),
        (7, N'Aurora',        N'Huawei-inspired',  N'/audio/tone7.wav', 1),
        (8, N'Crystal Ping',  N'Huawei-inspired',  N'/audio/tone8.wav', 1),
        (9, N'Calm Waves',    N'Huawei-inspired',  N'/audio/tone9.wav', 1);
    SET IDENTITY_INSERT dbo.UptimeRingtones OFF;
END

COMMIT TRANSACTION;

SELECT COUNT(*) AS UptimeTables
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = N'dbo' AND TABLE_NAME LIKE N'Uptime%';
