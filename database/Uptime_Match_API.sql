/*
 Uptime Student App - synchronize the SQL Server database with the .NET API model.
 Safe to rerun. This script does not create or delete legacy tables.
*/
USE [Uptime];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.UptimeStudentProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentProfiles (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FirstName NVARCHAR(80) NOT NULL,
        LastName NVARCHAR(80) NOT NULL,
        PreferredName NVARCHAR(80) NULL,
        InstitutionName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(150) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeStudentProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeStudentProfiles_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF COL_LENGTH('dbo.UptimeStudentProfiles', 'Email') IS NULL
    ALTER TABLE dbo.UptimeStudentProfiles ADD Email NVARCHAR(150) NULL;
GO
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN FirstName NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN LastName NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN PreferredName NVARCHAR(80) NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN InstitutionName NVARCHAR(150) NOT NULL;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeStudentProfiles') AND name = 'UX_StudentProfiles_Email')
    DROP INDEX UX_StudentProfiles_Email ON dbo.UptimeStudentProfiles;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeStudentProfiles') AND name = 'UX_UptimeStudentProfiles_Email')
    DROP INDEX UX_UptimeStudentProfiles_Email ON dbo.UptimeStudentProfiles;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN Email NVARCHAR(150) NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN CreatedAt DATETIME2 NOT NULL;
ALTER TABLE dbo.UptimeStudentProfiles ALTER COLUMN UpdatedAt DATETIME2 NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeStudentProfiles') AND name = 'UX_UptimeStudentProfiles_Email')
    CREATE UNIQUE INDEX UX_UptimeStudentProfiles_Email
    ON dbo.UptimeStudentProfiles(Email)
    WHERE Email IS NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeClassSchedules', 'U') IS NULL
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
GO
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Course NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN DayOfWeek NVARCHAR(10) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Location NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeClassSchedules ALTER COLUMN Instructor NVARCHAR(120) NULL;
GO

IF OBJECT_ID('dbo.UptimeCalendarEvents', 'U') IS NULL
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
GO
ALTER TABLE dbo.UptimeCalendarEvents ALTER COLUMN Title NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeCalendarEvents ALTER COLUMN Description NVARCHAR(1000) NULL;
GO

IF OBJECT_ID('dbo.UptimeExpenses', 'U') IS NULL
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
GO
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Name NVARCHAR(150) NOT NULL;
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Category NVARCHAR(50) NOT NULL;
ALTER TABLE dbo.UptimeExpenses ALTER COLUMN Amount DECIMAL(10,2) NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeStudentTasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentTasks (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Title NVARCHAR(180) NOT NULL,
        Description NVARCHAR(1000) NULL,
        DueDate DATE NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_UptimeStudentTasks_Status DEFAULT 'Pending',
        Priority NVARCHAR(20) NOT NULL CONSTRAINT DF_UptimeStudentTasks_Priority DEFAULT 'Normal',
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeStudentTasks_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Title NVARCHAR(180) NOT NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Description NVARCHAR(1000) NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Status NVARCHAR(20) NOT NULL;
ALTER TABLE dbo.UptimeStudentTasks ALTER COLUMN Priority NVARCHAR(20) NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeStudySessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudySessions (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Subject NVARCHAR(150) NOT NULL,
        DurationMinutes INT NOT NULL,
        StartedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeStudySessions_StartedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO
ALTER TABLE dbo.UptimeStudySessions ALTER COLUMN Subject NVARCHAR(150) NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeRingtones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeRingtones (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name NVARCHAR(80) NOT NULL,
        Category NVARCHAR(40) NOT NULL,
        AudioFilePath NVARCHAR(250) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_UptimeRingtones_IsActive DEFAULT 1
    );
END;
GO
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN Name NVARCHAR(80) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN Category NVARCHAR(40) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN AudioFilePath NVARCHAR(250) NOT NULL;
ALTER TABLE dbo.UptimeRingtones ALTER COLUMN IsActive BIT NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeAlarms', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeAlarms (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        Label NVARCHAR(100) NOT NULL CONSTRAINT DF_UptimeAlarms_Label DEFAULT 'Alarm',
        AlarmTime TIME(0) NOT NULL,
        IsEnabled BIT NOT NULL CONSTRAINT DF_UptimeAlarms_IsEnabled DEFAULT 1,
        RepeatDays NVARCHAR(13) NOT NULL CONSTRAINT DF_UptimeAlarms_RepeatDays DEFAULT '',
        RingtoneId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeAlarms_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UptimeAlarms_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN Label NVARCHAR(100) NOT NULL;
ALTER TABLE dbo.UptimeAlarms ALTER COLUMN RepeatDays NVARCHAR(13) NOT NULL;
GO

IF OBJECT_ID('dbo.UptimeStudentSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UptimeStudentSettings (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        ReminderMinutes INT NOT NULL CONSTRAINT DF_UptimeStudentSettings_Reminder DEFAULT 60,
        NotificationsEnabled BIT NOT NULL CONSTRAINT DF_UptimeStudentSettings_Notifications DEFAULT 1,
        RingtoneEnabled BIT NOT NULL CONSTRAINT DF_UptimeStudentSettings_Ringtone DEFAULT 1,
        Volume INT NOT NULL CONSTRAINT DF_UptimeStudentSettings_Volume DEFAULT 70,
        MonthlyBudgetLimit DECIMAL(10,2) NOT NULL CONSTRAINT DF_UptimeStudentSettings_Budget DEFAULT 500
    );
END;
GO
ALTER TABLE dbo.UptimeStudentSettings ALTER COLUMN MonthlyBudgetLimit DECIMAL(10,2) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeStudentSettings') AND name = 'UX_UptimeStudentSettings_StudentId')
    CREATE UNIQUE INDEX UX_UptimeStudentSettings_StudentId ON dbo.UptimeStudentSettings(StudentId);
GO

/* Foreign keys. Name-independent checks preserve constraints created by the original script. */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeClassSchedules') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeClassSchedules') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT FK_UptimeClassSchedules_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeCalendarEvents') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeCalendarEvents') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeCalendarEvents ADD CONSTRAINT FK_UptimeCalendarEvents_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeExpenses') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeExpenses') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeExpenses ADD CONSTRAINT FK_UptimeExpenses_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeStudentTasks') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeStudentTasks') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT FK_UptimeStudentTasks_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeStudySessions') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeStudySessions') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudySessions ADD CONSTRAINT FK_UptimeStudySessions_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeAlarms') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeAlarms') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT FK_UptimeAlarms_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeAlarms') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeAlarms') AND name='RingtoneId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeRingtones'))
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT FK_UptimeAlarms_Ringtone FOREIGN KEY(RingtoneId) REFERENCES dbo.UptimeRingtones(Id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id WHERE fk.parent_object_id=OBJECT_ID('dbo.UptimeStudentSettings') AND fkc.parent_column_id=(SELECT column_id FROM sys.columns WHERE object_id=OBJECT_ID('dbo.UptimeStudentSettings') AND name='StudentId') AND fkc.referenced_object_id=OBJECT_ID('dbo.UptimeStudentProfiles'))
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT FK_UptimeStudentSettings_Student FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE;
GO

/* API validation constraints */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeClassSchedules_Day')
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT CK_UptimeClassSchedules_Day CHECK(DayOfWeek IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeClassSchedules_Time')
    ALTER TABLE dbo.UptimeClassSchedules ADD CONSTRAINT CK_UptimeClassSchedules_Time CHECK(EndTime > StartTime);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeExpenses_Amount')
    ALTER TABLE dbo.UptimeExpenses ADD CONSTRAINT CK_UptimeExpenses_Amount CHECK(Amount > 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudentTasks_Status')
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT CK_UptimeStudentTasks_Status CHECK(Status IN ('Pending','In Progress','Completed'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudentTasks_Priority')
    ALTER TABLE dbo.UptimeStudentTasks ADD CONSTRAINT CK_UptimeStudentTasks_Priority CHECK(Priority IN ('Low','Normal','High'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudySessions_Duration')
    ALTER TABLE dbo.UptimeStudySessions ADD CONSTRAINT CK_UptimeStudySessions_Duration CHECK(DurationMinutes BETWEEN 1 AND 1440);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeAlarms_RepeatDays')
    ALTER TABLE dbo.UptimeAlarms ADD CONSTRAINT CK_UptimeAlarms_RepeatDays CHECK(RepeatDays LIKE '' OR RepeatDays NOT LIKE '%[^1-7,]%');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudentSettings_Reminder')
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_UptimeStudentSettings_Reminder CHECK(ReminderMinutes BETWEEN 1 AND 1440);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudentSettings_Volume')
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_UptimeStudentSettings_Volume CHECK(Volume BETWEEN 0 AND 100);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_UptimeStudentSettings_Budget')
    ALTER TABLE dbo.UptimeStudentSettings ADD CONSTRAINT CK_UptimeStudentSettings_Budget CHECK(MonthlyBudgetLimit > 0);
GO

/* Seed the nine ringtones when the table has none. */
IF NOT EXISTS (SELECT 1 FROM dbo.UptimeRingtones)
BEGIN
    SET IDENTITY_INSERT dbo.UptimeRingtones ON;
    INSERT dbo.UptimeRingtones(Id, Name, Category, AudioFilePath, IsActive)
    VALUES
        (1, 'Rising Bell', 'Samsung-inspired', '/audio/tone1.wav', 1),
        (2, 'Orbit Chime', 'Samsung-inspired', '/audio/tone2.wav', 1),
        (3, 'Soft Horizon', 'Samsung-inspired', '/audio/tone3.wav', 1),
        (4, 'Marimba Pulse', 'iPhone-inspired', '/audio/tone4.wav', 1),
        (5, 'Radar Ping', 'iPhone-inspired', '/audio/tone5.wav', 1),
        (6, 'Twin Drops', 'iPhone-inspired', '/audio/tone6.wav', 1),
        (7, 'Aurora', 'Huawei-inspired', '/audio/tone7.wav', 1),
        (8, 'Crystal Ping', 'Huawei-inspired', '/audio/tone8.wav', 1),
        (9, 'Calm Waves', 'Huawei-inspired', '/audio/tone9.wav', 1);
    SET IDENTITY_INSERT dbo.UptimeRingtones OFF;
END;
GO

/* API lookup indexes */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeClassSchedules') AND name = 'IX_UptimeClassSchedules_Student_Day_Time')
    CREATE INDEX IX_UptimeClassSchedules_Student_Day_Time ON dbo.UptimeClassSchedules(StudentId, DayOfWeek, StartTime);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeAlarms') AND name = 'IX_UptimeAlarms_Student_Time')
    CREATE INDEX IX_UptimeAlarms_Student_Time ON dbo.UptimeAlarms(StudentId, IsEnabled, AlarmTime);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.UptimeExpenses') AND name = 'IX_UptimeExpenses_Student_Date')
    CREATE INDEX IX_UptimeExpenses_Student_Date ON dbo.UptimeExpenses(StudentId, ExpenseDate);
GO
