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
        // 🚀 Protocol: Use Include to fetch related history and validations
        var r = await _context.ResearchStudies
            .AsNoTracking()
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r == null) return null;

        return MapToResponse(r);
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

        // 1. Update Basic Info
        r.Title = dto.Title;
        r.Tags = dto.Tags;

        // 2. Process Researchers (Splitting strings back into JSON)[cite: 2]
        var names = dto.ResearcherNames.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var emails = dto.ResearcherEmails.Split(", ", StringSplitOptions.RemoveEmptyEntries);
        var resList = names.Select((n, i) => new { name = n, email = emails.Length > i ? emails[i] : "" }).ToList();
        r.Researchers = JsonSerializer.Serialize(resList);

        // 3. Update Coordinator[cite: 2]
        r.Coordinator = JsonSerializer.Serialize(new { name = dto.CoordinatorName, email = dto.CoordinatorEmail });

        r.UpdatedAt = DateTime.UtcNow;

        var success = await _context.SaveChangesAsync() > 0;
        if (success) FireAndForgetLog(userId, "RESEARCH_EDIT", $"Updated metadata for Study: {id}");
        return success;
    }

    public async Task<ResearchResponseDto?> UploadVersionAsync(long id, NewVersionDto dto, long userId)
    {
        // 1. Fetch the research with its relational history
        var research = await _context.ResearchStudies
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (research == null) return null;

        // 2. Determine the next version number based on the history table
        int nextVersion = (research.History.Max(h => (int?)h.Version) ?? 0) + 1;

        using var ms = new MemoryStream();
        await dto.PdfFile.CopyToAsync(ms);

        // 3. Create the new history entry[cite: 34]
        var newHistory = new ResearchHistory 
        { 
            ResearchId = id,
            Version = nextVersion,
            VersionName = dto.VersionName,
            UploadedAt = DateTime.UtcNow
        };

        // 4. Update the main research record with new PDF data[cite: 34]
        research.PdfData = ms.ToArray();
        research.UpdatedAt = DateTime.UtcNow;
        
        _context.ResearchHistory.Add(newHistory);
        await _context.SaveChangesAsync();

        // 5. CRITICAL FIX: Return the full ResearchResponseDto to match the interface
        // We re-map the research object which now contains the updated history[cite: 34]
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
        // 🚀 Protocol: Directly update the ResearchHistory table
        var historyEntry = await _context.ResearchHistory
            .FirstOrDefaultAsync(h => h.ResearchId == id && h.Version == version);

        if (historyEntry == null) return false;

        historyEntry.Feedback = feedback;
        _context.ResearchHistory.Update(historyEntry);
        
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
        // 🚀 Protocol: Check for existing validation record
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
            _context.ResearchValidations.Add(new ResearchValidation 
            { 
                ResearchId = id, 
                FacultyEmail = facultyEmail 
            });
            research.Validations += 1;
        }

        return await _context.SaveChangesAsync() > 0;
    }

    private void FireAndForgetLog(long userId, string action, string details)
    {
        _ = Task.Run(async () => {
            try { await _adminService.LogActionAsync(userId, action, details); }
            catch { /* Log fails won't break the main action */ }
        });
    }

    private ResearchResponseDto MapToResponse(Research r)
    {
        // 🚀 Logic: Extract the latest iteration data from the History list[cite: 34]
        var latestHistory = r.History.OrderByDescending(h => h.Version).FirstOrDefault();

        return new ResearchResponseDto(
            r.Id, 
            r.Title, 
            r.Tags, 
            r.Coordinator, 
            r.Researchers, 
            r.Views, 
            r.Validations, 
            r.Status, 
            r.History.Any() ? r.History.Max(h => h.Version) : 1, // Current Version Number
            latestHistory?.VersionName ?? "Initial",            // Current Version Name
            latestHistory?.Feedback,                            // Latest Remarks
            r.CreatedAt,
            r.History.Select(h => new HistoryResponseDto(h.Version, h.VersionName ?? "", h.Feedback, h.UploadedAt)).ToList(),
            r.ValidationLog.Select(v => new ValidationResponseDto(v.FacultyEmail)).ToList()
        );
    }
}