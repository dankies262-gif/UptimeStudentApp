/*
 Uptime Student App - complete SQL Server API schema rebuild/synchronization
 Run once in SSMS or sqlcmd against the Uptime database.
 This is idempotent and preserves existing data.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF DB_ID(N'Uptime') IS NULL
BEGIN
    RAISERROR(N'Database [Uptime] does not exist. Create it first, then rerun this script.', 16, 1);
END;
GO
USE [Uptime];
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.UptimeStudentProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentProfiles (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FirstName NVARCHAR(80) NOT NULL,
        LastName NVARCHAR(80) NOT NULL,
        PreferredName NVARCHAR(80) NULL,
        InstitutionName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(150) NULL,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL
    );
END;

IF COL_LENGTH(N'dbo.UptimeStudentProfiles', N'Email') IS NULL
    ALTER TABLE dbo.UptimeStudentProfiles ADD Email NVARCHAR(150) NULL;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND name=N'UX_StudentProfiles_Email')
    DROP INDEX UX_StudentProfiles_Email ON dbo.UptimeStudentProfiles;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND name=N'UX_UptimeStudentProfiles_Email')
    DROP INDEX UX_UptimeStudentProfiles_Email ON dbo.UptimeStudentProfiles;

ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN FirstName NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN LastName NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN PreferredName NVARCHAR(80) NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN InstitutionName NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN Email NVARCHAR(150) NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN CreatedAt DATETIME2 NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN UpdatedAt DATETIME2 NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentProfiles'), N'CreatedAt', 'ColumnId'))
    ALTER TABLE dbo.UptimeStudentProfiles ADD CONSTRAINT DF_API_StudentProfiles_CreatedAt DEFAULT SYSUTCDATETIME() FOR CreatedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentProfiles'), N'UpdatedAt', 'ColumnId'))
    ALTER TABLE dbo.UptimeStudentProfiles ADD CONSTRAINT DF_API_StudentProfiles_UpdatedAt DEFAULT SYSUTCDATETIME() FOR UpdatedAt;

IF OBJECT_ID(N'dbo.UptimeClassSchedules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeClassSchedules (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Course NVARCHAR(150) NOT NULL,
        DayOfWeek NVARCHAR(10) NOT NULL,
        StartTime TIME(0) NOT NULL,
        EndTime TIME(0) NOT NULL,
        Location NVARCHAR(150) NOT NULL,
        Instructor NVARCHAR(120) NULL
    );
END;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Course NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN DayOfWeek NVARCHAR(10) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Location NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Instructor NVARCHAR(120) NULL;

IF OBJECT_ID(N'dbo.UptimeCalendarEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeCalendarEvents (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        EventDate DATE NOT NULL,
        EventTime TIME(0) NULL,
        Description NVARCHAR(1000) NULL
    );
END;
ALTER TABLE dbo.UptimeCalendarEvents ALTER COLUMN Title NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeCalendarEvents ALTER COLUMN Description NVARCHAR(1000) NULL;

IF OBJECT_ID(N'dbo.UptimeExpenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeExpenses (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        ExpenseDate DATE NOT NULL
    );
END;
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Name NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Amount DECIMAL(10,2) NOT NULL;
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Category NVARCHAR(50) NOT NULL;

IF OBJECT_ID(N'dbo.UptimeStudentTasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentTasks (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Title NVARCHAR(180) NOT NULL,
        Description NVARCHAR(1000) NULL,
        DueDate DATE NULL,
        Status NVARCHAR(20) NOT NULL,
        Priority NVARCHAR(20) NOT NULL,
        CreatedAt DATETIME2 NOT NULL
    );
END;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Title NVARCHAR(180) NOT NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Description NVARCHAR(1000) NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Status NVARCHAR(20) NOT NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Priority NVARCHAR(20) NOT NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN CreatedAt DATETIME2 NOT NULL;

IF OBJECT_ID(N'dbo.UptimeStudySessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudySessions (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Subject NVARCHAR(150) NOT NULL,
        DurationMinutes INT NOT NULL,
        StartedAt DATETIME2 NOT NULL
    );
END;
ALTER TABLE dbo.UptimeStudySessions ALTER COLUMN Subject NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeStudySessions ALTER COLUMN DurationMinutes INT NOT NULL;
ALTER TABLE dbo.UptimeStudySessions ALTER COLUMN StartedAt DATETIME2 NOT NULL;

IF OBJECT_ID(N'dbo.UptimeRingtones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeRingtones (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name NVARCHAR(80) NOT NULL,
        Category NVARCHAR(40) NOT NULL,
        AudioFilePath NVARCHAR(250) NOT NULL,
        IsActive BIT NOT NULL,
        CreatedAt DATETIME2 NOT NULL
    );
END;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN Name NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN Category NVARCHAR(40) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN AudioFilePath NVARCHAR(250) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN IsActive BIT NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN CreatedAt DATETIME2 NOT NULL;

IF OBJECT_ID(N'dbo.UptimeAlarms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeAlarms (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Label NVARCHAR(100) NOT NULL,
        AlarmTime TIME(0) NOT NULL,
        IsEnabled BIT NOT NULL,
        RepeatDays NVARCHAR(13) NOT NULL,
        RingtoneId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL
    );
END;
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN Label NVARCHAR(100) NOT NULL;
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN RepeatDays NVARCHAR(13) NOT NULL;
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN CreatedAt DATETIME2 NOT NULL;
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN UpdatedAt DATETIME2 NOT NULL;

IF OBJECT_ID(N'dbo.UptimeStudentSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentSettings (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        ReminderMinutes INT NOT NULL,
        NotificationsEnabled BIT NOT NULL,
        RingtoneEnabled BIT NOT NULL,
        Volume INT NOT NULL,
        MonthlyBudgetLimit DECIMAL(10,2) NOT NULL
    );
END;
ALTER TABLE dbo.UptimeStudentSettings ALTER COLUMN MonthlyBudgetLimit DECIMAL(10,2) NOT NULL;

-- Normalize existing API values before applying check constraints.
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Mon' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'monday',N'mon');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Tue' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'tuesday',N'tue');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Wed' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'wednesday',N'wed');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Thu' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'thursday',N'thu');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Fri' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'friday',N'fri');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Sat' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'saturday',N'sat');
UPDATE dbo.UptimeClassSchedules SET DayOfWeek=N'Sun' WHERE LOWER(LTRIM(RTRIM(DayOfWeek))) IN (N'sunday',N'sun');

UPDATE dbo.UptimeStudentTasks SET Status=N'Pending' WHERE Status IS NULL OR Status NOT IN (N'Pending',N'In Progress',N'Completed');
UPDATE dbo.UptimeStudentTasks SET Priority=N'Normal' WHERE Priority IS NULL OR Priority NOT IN (N'Low',N'Normal',N'High');
UPDATE dbo.UptimeStudentProfiles SET CreatedAt=SYSUTCDATETIME() WHERE CreatedAt IS NULL;
UPDATE dbo.UptimeStudentProfiles SET UpdatedAt=SYSUTCDATETIME() WHERE UpdatedAt IS NULL;
UPDATE dbo.UptimeRingtones SET IsActive=1 WHERE IsActive IS NULL;
UPDATE dbo.UptimeAlarms SET Label=N'Alarm' WHERE Label IS NULL OR LTRIM(RTRIM(Label))=N'';
UPDATE dbo.UptimeAlarms SET RepeatDays=N'' WHERE RepeatDays IS NULL;
UPDATE dbo.UptimeAlarms SET IsEnabled=1 WHERE IsEnabled IS NULL;
UPDATE dbo.UptimeAlarms SET CreatedAt=SYSUTCDATETIME() WHERE CreatedAt IS NULL;
UPDATE dbo.UptimeAlarms SET UpdatedAt=SYSUTCDATETIME() WHERE UpdatedAt IS NULL;

-- Defaults
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeClassSchedules'))
BEGIN END;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentTasks'),N'Status','ColumnId'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT DF_API_StudentTasks_Status DEFAULT N'Pending' FOR Status;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentTasks'),N'Priority','ColumnId'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT DF_API_StudentTasks_Priority DEFAULT N'Normal' FOR Priority;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentTasks'),N'CreatedAt','ColumnId'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT DF_API_StudentTasks_CreatedAt DEFAULT SYSUTCDATETIME() FOR CreatedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudySessions') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudySessions'),N'StartedAt','ColumnId'))
    ALTER TABLE dbo.UptimeStudySessions ADD CONSTRAINT DF_API_StudySessions_StartedAt DEFAULT SYSUTCDATETIME() FOR StartedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeRingtones') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeRingtones'),N'IsActive','ColumnId'))
    ALTER TABLE dbo.UptimeRingtones ADD CONSTRAINT DF_API_Ringtones_IsActive DEFAULT 1 FOR IsActive;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeRingtones') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeRingtones'),N'CreatedAt','ColumnId'))
    ALTER TABLE dbo.UptimeRingtones ADD CONSTRAINT DF_API_Ringtones_CreatedAt DEFAULT SYSUTCDATETIME() FOR CreatedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeAlarms'),N'Label','ColumnId'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT DF_API_Alarms_Label DEFAULT N'Alarm' FOR Label;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeAlarms'),N'IsEnabled','ColumnId'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT DF_API_Alarms_IsEnabled DEFAULT 1 FOR IsEnabled;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeAlarms'),N'RepeatDays','ColumnId'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT DF_API_Alarms_RepeatDays DEFAULT N'' FOR RepeatDays;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeAlarms'),N'CreatedAt','ColumnId'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT DF_API_Alarms_CreatedAt DEFAULT SYSUTCDATETIME() FOR CreatedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeAlarms'),N'UpdatedAt','ColumnId'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT DF_API_Alarms_UpdatedAt DEFAULT SYSUTCDATETIME() FOR UpdatedAt;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentSettings'),N'ReminderMinutes','ColumnId'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT DF_API_Settings_Reminder DEFAULT 60 FOR ReminderMinutes;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentSettings'),N'NotificationsEnabled','ColumnId'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT DF_API_Settings_Notifications DEFAULT 1 FOR NotificationsEnabled;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentSettings'),N'RingtoneEnabled','ColumnId'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT DF_API_Settings_Ringtone DEFAULT 1 FOR RingtoneEnabled;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentSettings'),N'Volume','ColumnId'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT DF_API_Settings_Volume DEFAULT 70 FOR Volume;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID(N'dbo.UptimeStudentSettings'),N'MonthlyBudgetLimit','ColumnId'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT DF_API_Settings_Budget DEFAULT 500 FOR MonthlyBudgetLimit;

-- Remove duplicate API constraints by replacing known old names where necessary.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ClassSchedules_Day' AND parent_object_id=OBJECT_ID(N'dbo.UptimeClassSchedules'))
    ALTER TABLE dbo.UptimeClassSchedules DROP CONSTRAINT CK_ClassSchedules_Day;

-- API foreign-key relationships
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeClassSchedules') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT FK_API_ClassSchedules_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeCalendarEvents') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeCalendarEvents ADD CONSTRAINT FK_API_CalendarEvents_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeExpenses') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeExpenses ADD CONSTRAINT FK_API_Expenses_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT FK_API_StudentTasks_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeStudySessions') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudySessions ADD CONSTRAINT FK_API_StudySessions_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT FK_API_Alarms_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeRingtones'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT FK_API_Alarms_Ringtone FOREIGN KEY(RingtoneId) REFERENCES dbo.UptimeRingtones(Id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND fkc.referenced_object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT FK_API_Settings_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;

-- API validation constraints
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_ClassSchedules_Day' AND parent_object_id=OBJECT_ID(N'dbo.UptimeClassSchedules'))
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT CK_API_ClassSchedules_Day CHECK(DayOfWeek IN (N'Mon',N'Tue',N'Wed',N'Thu',N'Fri',N'Sat',N'Sun'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_ClassSchedules_Time' AND parent_object_id=OBJECT_ID(N'dbo.UptimeClassSchedules'))
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT CK_API_ClassSchedules_Time CHECK(EndTime>StartTime);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Expenses_Amount' AND parent_object_id=OBJECT_ID(N'dbo.UptimeExpenses'))
    ALTER TABLE dbo.UptimeExpenses ADD CONSTRAINT CK_API_Expenses_Amount CHECK(Amount>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Tasks_Status' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT CK_API_Tasks_Status CHECK(Status IN (N'Pending',N'In Progress',N'Completed'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Tasks_Priority' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudentTasks'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT CK_API_Tasks_Priority CHECK(Priority IN (N'Low',N'Normal',N'High'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_StudySessions_Duration' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudySessions'))
    ALTER TABLE dbo.UptimeStudySessions ADD CONSTRAINT CK_API_StudySessions_Duration CHECK(DurationMinutes BETWEEN 1 AND 1440);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Alarms_RepeatDays' AND parent_object_id=OBJECT_ID(N'dbo.UptimeAlarms'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT CK_API_Alarms_RepeatDays CHECK(RepeatDays=N'' OR RepeatDays NOT LIKE N'%[^1-7,]%');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Settings_Reminder' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_API_Settings_Reminder CHECK(ReminderMinutes BETWEEN 1 AND 1440);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Settings_Volume' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_API_Settings_Volume CHECK(Volume BETWEEN 0 AND 100);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_API_Settings_Budget' AND parent_object_id=OBJECT_ID(N'dbo.UptimeStudentSettings'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_API_Settings_Budget CHECK(MonthlyBudgetLimit>0);

-- Create settings for existing profiles and preserve existing settings.
INSERT dbo.UptimeStudentSettings(StudentId,ReminderMinutes,NotificationsEnabled,RingtoneEnabled,Volume,MonthlyBudgetLimit)
SELECT p.Id,60,1,1,70,500
FROM dbo.UptimeStudentProfiles p
WHERE NOT EXISTS (SELECT 1 FROM dbo.UptimeStudentSettings s WHERE s.StudentId=p.Id);

-- Seed ringtone catalog. Existing names are preserved; missing names are added.
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Rising Bell') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Rising Bell',N'Samsung-inspired',N'/audio/tone1.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Orbit Chime') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Orbit Chime',N'Samsung-inspired',N'/audio/tone2.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Soft Horizon') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Soft Horizon',N'Samsung-inspired',N'/audio/tone3.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Marimba Pulse') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Marimba Pulse',N'iPhone-inspired',N'/audio/tone4.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Radar Ping') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Radar Ping',N'iPhone-inspired',N'/audio/tone5.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Twin Drops') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Twin Drops',N'iPhone-inspired',N'/audio/tone6.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Aurora') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Aurora',N'Huawei-inspired',N'/audio/tone7.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Crystal Ping') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Crystal Ping',N'Huawei-inspired',N'/audio/tone8.wav',1);
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones WHERE Name=N'Calm Waves') INSERT dbo.UptimeRingtones(Name,Category,AudioFilePath,IsActive) VALUES(N'Calm Waves',N'Huawei-inspired',N'/audio/tone9.wav',1);

-- Correctly rebuild dependent indexes without duplicate names.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND name=N'UX_StudentProfiles_Email')
    DROP INDEX UX_StudentProfiles_Email ON dbo.UptimeStudentProfiles;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentProfiles') AND name=N'UX_UptimeStudentProfiles_Email')
    DROP INDEX UX_UptimeStudentProfiles_Email ON dbo.UptimeStudentProfiles;
CREATE UNIQUE INDEX UX_UptimeStudentProfiles_Email ON dbo.UptimeStudentProfiles(Email) WHERE Email IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentSettings') AND name=N'UX_UptimeStudentSettings_StudentId')
    CREATE UNIQUE INDEX UX_UptimeStudentSettings_StudentId ON dbo.UptimeStudentSettings(StudentId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeClassSchedules') AND name=N'IX_API_ClassSchedules_Student_Day_Time')
    CREATE INDEX IX_API_ClassSchedules_Student_Day_Time ON dbo.UptimeClassSchedules(StudentId,DayOfWeek,StartTime);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeAlarms') AND name=N'IX_API_Alarms_Student_Time')
    CREATE INDEX IX_API_Alarms_Student_Time ON dbo.UptimeAlarms(StudentId,IsEnabled,AlarmTime);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeExpenses') AND name=N'IX_API_Expenses_Student_Date')
    CREATE INDEX IX_API_Expenses_Student_Date ON dbo.UptimeExpenses(StudentId,ExpenseDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudentTasks') AND name=N'IX_API_Tasks_Student_DueDate')
    CREATE INDEX IX_API_Tasks_Student_DueDate ON dbo.UptimeStudentTasks(StudentId,DueDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeCalendarEvents') AND name=N'IX_API_Events_Student_Date')
    CREATE INDEX IX_API_Events_Student_Date ON dbo.UptimeCalendarEvents(StudentId,EventDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UptimeStudySessions') AND name=N'IX_API_StudySessions_Student_Started')
    CREATE INDEX IX_API_StudySessions_Student_Started ON dbo.UptimeStudySessions(StudentId,StartedAt DESC);

COMMIT TRANSACTION;

SELECT N'Database schema synchronized successfully.' AS Result;
GO
