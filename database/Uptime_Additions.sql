/*
 Uptime Student App - SQL Server 2022 additions
 Run in SSMS against the existing Uptime database.
 Safe to rerun for table creation and ringtone seed rows.
 NOTE: existing tables from the old Python version are left untouched.
*/
USE [Uptime];
GO

IF OBJECT_ID('dbo.UptimeStudentProfiles','U') IS NULL
BEGIN
 CREATE TABLE dbo.UptimeStudentProfiles(
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FirstName NVARCHAR(80) NOT NULL,
  LastName NVARCHAR(80) NOT NULL,
  PreferredName NVARCHAR(80) NULL,
  InstitutionName NVARCHAR(150) NOT NULL,
  Email NVARCHAR(150) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentProfiles_UpdatedAt DEFAULT SYSUTCDATETIME()
 );
 CREATE UNIQUE INDEX UX_StudentProfiles_Email ON dbo.UptimeStudentProfiles(Email) WHERE Email IS NOT NULL;
END;
GO
IF OBJECT_ID('dbo.UptimeClassSchedules','U') IS NULL
CREATE TABLE dbo.UptimeClassSchedules(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Course NVARCHAR(150) NOT NULL, DayOfWeek NVARCHAR(10) NOT NULL,
 StartTime TIME(0) NOT NULL, EndTime TIME(0) NOT NULL,
 Location NVARCHAR(150) NOT NULL, Instructor NVARCHAR(120) NULL,
 CONSTRAINT FK_ClassSchedules_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT CK_ClassSchedules_Time CHECK(EndTime>StartTime)
);
GO
IF OBJECT_ID('dbo.UptimeCalendarEvents','U') IS NULL
CREATE TABLE dbo.UptimeCalendarEvents(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Title NVARCHAR(150) NOT NULL, EventDate DATE NOT NULL, EventTime TIME(0) NULL,
 Description NVARCHAR(1000) NULL,
 CONSTRAINT FK_CalendarEvents_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE
);
GO
IF OBJECT_ID('dbo.UptimeExpenses','U') IS NULL
CREATE TABLE dbo.UptimeExpenses(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Name NVARCHAR(150) NOT NULL, Amount DECIMAL(10,2) NOT NULL,
 Category NVARCHAR(50) NOT NULL, ExpenseDate DATE NOT NULL,
 CONSTRAINT FK_Expenses_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT CK_Expenses_Amount CHECK(Amount>0)
);
GO
IF OBJECT_ID('dbo.UptimeStudentTasks','U') IS NULL
CREATE TABLE dbo.UptimeStudentTasks(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Title NVARCHAR(180) NOT NULL, Description NVARCHAR(1000) NULL,
 DueDate DATE NULL, Status NVARCHAR(20) NOT NULL CONSTRAINT DF_StudentTasks_Status DEFAULT 'Pending',
 Priority NVARCHAR(20) NOT NULL CONSTRAINT DF_StudentTasks_Priority DEFAULT 'Normal',
 CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentTasks_CreatedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_StudentTasks_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT CK_StudentTasks_Status CHECK(Status IN ('Pending','In Progress','Completed')),
 CONSTRAINT CK_StudentTasks_Priority CHECK(Priority IN ('Low','Normal','High'))
);
GO
IF OBJECT_ID('dbo.UptimeStudySessions','U') IS NULL
CREATE TABLE dbo.UptimeStudySessions(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Subject NVARCHAR(150) NOT NULL, DurationMinutes INT NOT NULL,
 StartedAt DATETIME2 NOT NULL CONSTRAINT DF_StudySessions_StartedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_StudySessions_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT CK_StudySessions_Duration CHECK(DurationMinutes BETWEEN 1 AND 1440)
);
GO
IF OBJECT_ID('dbo.UptimeRingtones','U') IS NULL
CREATE TABLE dbo.UptimeRingtones(
 Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(80) NOT NULL UNIQUE,
 Category NVARCHAR(40) NOT NULL, AudioFilePath NVARCHAR(250) NOT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_Ringtones_IsActive DEFAULT 1,
 CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Ringtones_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.UptimeAlarms','U') IS NULL
CREATE TABLE dbo.UptimeAlarms(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL,
 Label NVARCHAR(100) NOT NULL CONSTRAINT DF_Alarms_Label DEFAULT 'Alarm',
 AlarmTime TIME(0) NOT NULL, IsEnabled BIT NOT NULL CONSTRAINT DF_Alarms_IsEnabled DEFAULT 1,
 RepeatDays NVARCHAR(13) NOT NULL CONSTRAINT DF_Alarms_RepeatDays DEFAULT '',
 RingtoneId INT NOT NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Alarms_CreatedAt DEFAULT SYSUTCDATETIME(),
 UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Alarms_UpdatedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Alarms_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT FK_Alarms_Ringtones FOREIGN KEY(RingtoneId) REFERENCES dbo.UptimeRingtones(Id)
);
GO
IF OBJECT_ID('dbo.UptimeStudentSettings','U') IS NULL
CREATE TABLE dbo.UptimeStudentSettings(
 Id INT IDENTITY(1,1) PRIMARY KEY, StudentId INT NOT NULL UNIQUE,
 ReminderMinutes INT NOT NULL CONSTRAINT DF_StudentSettings_Reminder DEFAULT 60,
 NotificationsEnabled BIT NOT NULL CONSTRAINT DF_StudentSettings_Notifications DEFAULT 1,
 RingtoneEnabled BIT NOT NULL CONSTRAINT DF_StudentSettings_Ringtone DEFAULT 1,
 Volume INT NOT NULL CONSTRAINT DF_StudentSettings_Volume DEFAULT 70,
 MonthlyBudgetLimit DECIMAL(10,2) NOT NULL CONSTRAINT DF_StudentSettings_Budget DEFAULT 500,
 CONSTRAINT FK_StudentSettings_StudentProfiles FOREIGN KEY(StudentId) REFERENCES dbo.UptimeStudentProfiles(Id) ON DELETE CASCADE,
 CONSTRAINT CK_StudentSettings_Reminder CHECK(ReminderMinutes BETWEEN 1 AND 1440),
 CONSTRAINT CK_StudentSettings_Volume CHECK(Volume BETWEEN 0 AND 100),
 CONSTRAINT CK_StudentSettings_Budget CHECK(MonthlyBudgetLimit>0)
);
GO

-- Seed nine original, brand-inspired ringtone labels. Audio files are optional previews.
IF NOT EXISTS(SELECT 1 FROM dbo.UptimeRingtones)
BEGIN
 INSERT INTO dbo.UptimeRingtones(Name,Category,AudioFilePath) VALUES
 ('Rising Bell','Samsung-inspired','/audio/tone1.wav'),
 ('Orbit Chime','Samsung-inspired','/audio/tone2.wav'),
 ('Soft Horizon','Samsung-inspired','/audio/tone3.wav'),
 ('Marimba Pulse','iPhone-inspired','/audio/tone4.wav'),
 ('Radar Ping','iPhone-inspired','/audio/tone5.wav'),
 ('Twin Drops','iPhone-inspired','/audio/tone6.wav'),
 ('Aurora','Huawei-inspired','/audio/tone7.wav'),
 ('Crystal Ping','Huawei-inspired','/audio/tone8.wav'),
 ('Calm Waves','Huawei-inspired','/audio/tone9.wav');
END;
GO

-- Helpful indexes for common student-scoped lookups.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_ClassSchedules_Student_Day_Time')
 CREATE INDEX IX_ClassSchedules_Student_Day_Time ON dbo.UptimeClassSchedules(StudentId,DayOfWeek,StartTime);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Alarms_Student_Time')
 CREATE INDEX IX_Alarms_Student_Time ON dbo.UptimeAlarms(StudentId,IsEnabled,AlarmTime);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Expenses_Student_Date')
 CREATE INDEX IX_Expenses_Student_Date ON dbo.UptimeExpenses(StudentId,ExpenseDate);
GO
