using Microsoft.EntityFrameworkCore;
using UptimeStudentApp.Data;
using UptimeStudentApp.Models;

namespace UptimeStudentApp.Services;

public interface IProfilePhotoService
{
    Task<StudentProfile?> SaveAsync(int studentId, IFormFile? file, CancellationToken ct = default);
    Task<StudentProfile?> RemoveAsync(int studentId, CancellationToken ct = default);
}

/// <summary>
/// Stores profile photos under wwwroot/uploads/avatars. Files are renamed to a
/// GUID, validated by extension, MIME type and magic bytes, and capped at 2 MB.
/// </summary>
public class ProfilePhotoService(
    ApplicationDbContext db,
    IWebHostEnvironment env,
    ILogger<ProfilePhotoService> logger) : IProfilePhotoService
{
    private const long MaxBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp"
    };

    public async Task<StudentProfile?> SaveAsync(int studentId, IFormFile? file, CancellationToken ct = default)
    {
        var student = await db.StudentProfiles.FirstOrDefaultAsync(x => x.Id == studentId, ct);
        if (student is null) return null;

        if (file is null || file.Length == 0)
            throw new ArgumentException("Choose an image file to upload.");

        if (file.Length > MaxBytes)
            throw new ArgumentException("Profile photos must be 2 MB or smaller.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) ||
            !AllowedExtensions.TryGetValue(extension, out var expectedContentType))
        {
            throw new ArgumentException("Use a JPG, PNG, or WebP image.");
        }

        if (!string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase) &&
            !(expectedContentType == "image/jpeg" &&
              string.Equals(file.ContentType, "image/jpg", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("The file type does not match the image extension.");
        }

        await using (var probe = file.OpenReadStream())
        {
            var header = new byte[12];
            var read = await probe.ReadAsync(header.AsMemory(0, header.Length), ct);
            if (!IsValidImage(header, read, extension))
            {
                throw new ArgumentException("The file content is not a valid JPG, PNG, or WebP image.");
            }
        }

        var folder = GetAvatarFolder();
        Directory.CreateDirectory(folder);

        var fileName = $"student-{student.Id}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(folder, fileName);

        await using (var stream = File.Create(fullPath))
        {
            await file.CopyToAsync(stream, ct);
        }

        DeleteOldPhoto(student.PhotoUrl, folder);

        student.PhotoUrl = $"/uploads/avatars/{fileName}";
        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Saved a profile photo for student {StudentId}", student.Id);
        return student;
    }

    public async Task<StudentProfile?> RemoveAsync(int studentId, CancellationToken ct = default)
    {
        var student = await db.StudentProfiles.FirstOrDefaultAsync(x => x.Id == studentId, ct);
        if (student is null) return null;

        DeleteOldPhoto(student.PhotoUrl, GetAvatarFolder());
        student.PhotoUrl = null;
        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return student;
    }

    private string GetAvatarFolder()
    {
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        return Path.Combine(webRoot, "uploads", "avatars");
    }

    private static bool IsValidImage(byte[] header, int read, string extension)
    {
        if (read < 12) return false;

        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" =>
                header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" =>
                header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            ".webp" =>
                header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F' &&
                header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P',
            _ => false
        };
    }

    private static void DeleteOldPhoto(string? photoUrl, string folder)
    {
        if (string.IsNullOrWhiteSpace(photoUrl) ||
            !photoUrl.StartsWith("/uploads/avatars/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var name = Path.GetFileName(photoUrl);
        if (string.IsNullOrWhiteSpace(name)) return;

        var candidate = Path.GetFullPath(Path.Combine(folder, name));
        var root = Path.GetFullPath(folder) + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase)) return;

        try
        {
            if (File.Exists(candidate)) File.Delete(candidate);
        }
        catch (IOException)
        {
            // The replacement photo is already saved; a locked old file is harmless.
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
