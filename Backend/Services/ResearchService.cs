using Microsoft.EntityFrameworkCore;
using System.Text.Json;

public class ResearchService : IResearchService
{
    private readonly AppDbContext _context;
    private readonly IAdminService _adminService;

    public ResearchService(AppDbContext context, IAdminService adminService)
    {
        _context = context;
        _adminService = adminService;
    }

    private static ResearchResponseDto MapToDto(Research r)
    {
        var latest = r.History.OrderByDescending(h => h.Version).FirstOrDefault();
        return new ResearchResponseDto(
            r.Id, r.Title, r.Tags, r.Coordinator, r.Researchers, 
            r.Views, r.Validations, r.Status,
            latest?.Version ?? 1,
            latest?.VersionName ?? "Initial Submission",
            latest?.Feedback,
            r.CreatedAt,
            r.History.OrderByDescending(h => h.Version)
                    .Select(h => new HistoryResponseDto(h.Version, h.VersionName ?? "", h.Feedback, h.UploadedAt))
                    .ToList(),
            r.ValidationLog.Select(v => new ValidationResponseDto(v.FacultyEmail)).ToList()
        );
    }

    // 🚀 Speed: Uses AsNoTracking to reduce memory load
    public async Task<List<ResearchResponseDto>> GetAllAsync()
    {
        var list = await _context.ResearchStudies
            .AsNoTracking()
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .ToListAsync();
        return list.Select(MapToDto).ToList();
    }

    public async Task<ResearchResponseDto?> GetByIdAsync(long id)
    {
        var r = await _context.ResearchStudies
            .AsNoTracking()
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .FirstOrDefaultAsync(x => x.Id == id);
        return r == null ? null : MapToDto(r);
    }

    public async Task<Research?> GetRawByIdAsync(long id) => 
        await _context.ResearchStudies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);

    public async Task<ResearchResponseDto> CreateAsync(ResearchUploadDto dto, long userId)
    {
        using var ms = new MemoryStream();
        await dto.PdfFile.CopyToAsync(ms);

        var names = dto.ResearcherNames.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var emails = dto.ResearcherEmails.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var resList = names.Select((n, i) => new { name = n, email = emails.Length > i ? emails[i] : "" }).ToList();

        var research = new Research {
            Title = dto.Title,
            Tags = dto.Tags,
            Coordinator = JsonSerializer.Serialize(new { name = dto.CoordinatorName, email = dto.CoordinatorEmail }),
            Researchers = JsonSerializer.Serialize(resList),
            PdfData = ms.ToArray(),
            ContentType = dto.PdfFile.ContentType,
            Status = "Pending Review"
        };

        _context.ResearchStudies.Add(research);
        await _context.SaveChangesAsync();

        _context.Add(new ResearchHistory { ResearchId = research.Id, Version = 1, VersionName = "Initial Submission" });
        await _context.SaveChangesAsync();

        FireAndForgetLog(userId, "RESEARCH_UPLOAD", $"Uploaded: {research.Title}");
        return MapToDto(research);
    }

    public async Task<bool> EditDetailsAsync(long id, EditDetailsDto dto, long userId)
    {
        var r = await _context.ResearchStudies.FindAsync(id);
        if (r == null) return false;

        r.Title = dto.Title;
        r.Tags = dto.Tags;
        r.UpdatedAt = DateTime.UtcNow;

        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "RESEARCH_EDIT", $"Modified ID: {id}");
        return success;
    }

    public async Task<ResearchResponseDto?> UploadVersionAsync(long id, NewVersionDto dto, long userId)
    {
        var r = await _context.ResearchStudies.Include(r => r.History).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;

        int nextVersion = (r.History.Any() ? r.History.Max(h => h.Version) : 0) + 1;

        using var ms = new MemoryStream();
        await dto.PdfFile.CopyToAsync(ms);
        r.PdfData = ms.ToArray();
        r.ContentType = dto.PdfFile.ContentType;
        r.Status = "Pending Review";

        _context.Add(new ResearchHistory { ResearchId = r.Id, Version = nextVersion, VersionName = dto.VersionName });
        await _context.SaveChangesAsync();

        FireAndForgetLog(userId, "VERSION_UPLOAD", $"New version for ID: {id}");
        return MapToDto(r);
    }

    public async Task<bool> EvaluateAsync(long id, string status, string feedback, long userId)
    {
        var r = await _context.ResearchStudies.Include(r => r.History).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return false;

        r.Status = status;
        var latest = r.History.OrderByDescending(h => h.Version).FirstOrDefault();
        if (latest != null) latest.Feedback = feedback;

        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "RESEARCH_EVALUATE", $"Evaluated ID: {id}");
        return success;
    }

    public async Task<bool> UpdateHistoryFeedbackAsync(long id, int version, string feedback, long userId)
    {
        var entry = await _context.ResearchHistory.FirstOrDefaultAsync(h => h.ResearchId == id && h.Version == version);
        if (entry == null) return false;

        entry.Feedback = feedback;
        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "HISTORY_FEEDBACK_UPDATE", $"Feedback updated for version {version}");
        return success;
    }

    public async Task<bool> IncrementViewAsync(long id)
    {
        var r = await _context.ResearchStudies.FindAsync(id);
        if (r == null) return false;
        r.Views++;
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ToggleValidationAsync(long id, string facultyEmail, long userId)
    {
        var r = await _context.ResearchStudies.Include(x => x.ValidationLog).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return false;

        var existing = r.ValidationLog.FirstOrDefault(v => v.FacultyEmail == facultyEmail);
        if (existing != null) {
            _context.ResearchValidations.Remove(existing);
            r.Validations = Math.Max(0, r.Validations - 1);
        } else {
            _context.ResearchValidations.Add(new ResearchValidation { ResearchId = id, FacultyEmail = facultyEmail });
            r.Validations++;
        }

        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "VALIDATION_TOGGLE", $"Validation updated for ID: {id}");
        return success;
    }

    private void FireAndForgetLog(long userId, string action, string details)
    {
        _ = Task.Run(async () => {
            try { await _adminService.LogActionAsync(userId, action, details); }
            catch { /* Log fails won't break the main action */ }
        });
    }
}