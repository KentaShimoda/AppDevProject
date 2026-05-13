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

    // ── Mapping ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Public static version so UserController.GetRecommended can call it
    /// without needing to inject ResearchService directly.
    /// </summary>
    public static ResearchResponseDto MapToDtoPublic(Research r) => MapToDto(r);

    private static ResearchResponseDto MapToDto(Research r)
    {
        var latest = r.History.OrderByDescending(h => h.Version).FirstOrDefault();
        return new ResearchResponseDto(
            r.Id, r.Title, r.Tags, r.Category,           // Category added
            r.Coordinator, r.Researchers,
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

    private ResearchResponseDto MapToResponse(Research r)
    {
        var latestHistory = r.History.OrderByDescending(h => h.Version).FirstOrDefault();
        return new ResearchResponseDto(
            r.Id, r.Title, r.Tags, r.Category,           // Category added
            r.Coordinator, r.Researchers,
            r.Views, r.Validations, r.Status,
            r.History.Any() ? r.History.Max(h => h.Version) : 1,
            latestHistory?.VersionName ?? "Initial",
            latestHistory?.Feedback,
            r.CreatedAt,
            r.History.Select(h => new HistoryResponseDto(h.Version, h.VersionName ?? "", h.Feedback, h.UploadedAt)).ToList(),
            r.ValidationLog.Select(v => new ValidationResponseDto(v.FacultyEmail)).ToList()
        );
    }

    // ── Read ──────────────────────────────────────────────────────────────────

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
            .FirstOrDefaultAsync(r => r.Id == id);

        return r == null ? null : MapToResponse(r);
    }

    public async Task<Research?> GetRawByIdAsync(long id) =>
        await _context.ResearchStudies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);

    /// <summary>
    /// Returns approved studies whose category matches (case-insensitive).
    /// Used by GET api/research/category/{category} and the recommendation feed.
    /// </summary>
    public async Task<List<ResearchResponseDto>> GetByCategoryAsync(string category)
    {
        var normalised = category.Trim().ToLower();
        var list = await _context.ResearchStudies
            .AsNoTracking()
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .Where(r => r.Status == "Approved" &&
                        r.Category != null &&
                        r.Category.ToLower() == normalised)
            .OrderByDescending(r => r.Views + r.Validations)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public async Task<ResearchResponseDto> CreateAsync(ResearchUploadDto dto, long userId)
    {
        using var ms = new MemoryStream();
        await dto.PdfFile.CopyToAsync(ms);

        var names  = dto.ResearcherNames.Split(", ",  StringSplitOptions.RemoveEmptyEntries);
        var emails = dto.ResearcherEmails.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var resList = names.Select((n, i) => new { name = n, email = emails.Length > i ? emails[i] : "" }).ToList();

        var research = new Research {
            Title      = dto.Title,
            Tags       = dto.Tags,
            Category   = dto.Category?.Trim(),            // NEW
            Coordinator  = JsonSerializer.Serialize(new { name = dto.CoordinatorName, email = dto.CoordinatorEmail }),
            Researchers  = JsonSerializer.Serialize(resList),
            PdfData      = ms.ToArray(),
            ContentType  = dto.PdfFile.ContentType,
            Status       = "Pending Review"
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

        r.Title    = dto.Title;
        r.Tags     = dto.Tags;
        r.Category = dto.Category?.Trim();                // NEW

        var names  = dto.ResearcherNames.Split(", ",  StringSplitOptions.RemoveEmptyEntries);
        var emails = dto.ResearcherEmails.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var resList = names.Select((n, i) => new { name = n, email = emails.Length > i ? emails[i] : "" }).ToList();
        r.Researchers = JsonSerializer.Serialize(resList);
        r.Coordinator = JsonSerializer.Serialize(new { name = dto.CoordinatorName, email = dto.CoordinatorEmail });
        r.UpdatedAt   = DateTime.UtcNow;

        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "RESEARCH_EDIT", $"Updated metadata for Study: {id}");
        return success;
    }

    public async Task<ResearchResponseDto?> UploadVersionAsync(long id, NewVersionDto dto, long userId)
    {
        var research = await _context.ResearchStudies
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (research == null) return null;

        int nextVersion = (research.History.Max(h => (int?)h.Version) ?? 0) + 1;

        using var ms = new MemoryStream();
        await dto.PdfFile.CopyToAsync(ms);

        _context.ResearchHistory.Add(new ResearchHistory {
            ResearchId  = id,
            Version     = nextVersion,
            VersionName = dto.VersionName,
            UploadedAt  = DateTime.UtcNow
        });

        research.PdfData   = ms.ToArray();
        research.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToResponse(research);
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

    public async Task<bool> UpdateFeedbackAsync(long id, int version, string feedback, long userId)
    {
        var entry = await _context.ResearchHistory
            .FirstOrDefaultAsync(h => h.ResearchId == id && h.Version == version);

        if (entry == null) return false;

        entry.Feedback = feedback;
        _context.ResearchHistory.Update(entry);
        return await _context.SaveChangesAsync() > 0;
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
        var existing = await _context.ResearchValidations
            .FirstOrDefaultAsync(v => v.ResearchId == id && v.FacultyEmail == facultyEmail);

        var research = await _context.ResearchStudies.FindAsync(id);
        if (research == null) return false;

        if (existing != null)
        {
            _context.ResearchValidations.Remove(existing);
            research.Validations = Math.Max(0, research.Validations - 1);
        }
        else
        {
            _context.ResearchValidations.Add(new ResearchValidation { ResearchId = id, FacultyEmail = facultyEmail });
            research.Validations += 1;
        }

        return await _context.SaveChangesAsync() > 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void FireAndForgetLog(long userId, string action, string details)
    {
        _ = Task.Run(async () => {
            try   { await _adminService.LogActionAsync(userId, action, details); }
            catch { /* Log failures must never break the main action */ }
        });
    }
}