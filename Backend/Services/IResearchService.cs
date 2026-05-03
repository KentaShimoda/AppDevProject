using System.Collections.Generic;
using System.Threading.Tasks;

public interface IResearchService
{
    // Reading Data
    Task<List<ResearchResponseDto>> GetAllAsync();
    Task<ResearchResponseDto?> GetByIdAsync(long id);
    Task<Research?> GetRawByIdAsync(long id);

    // Actions (Updated with userId for Audit Logs)
    Task<ResearchResponseDto> CreateAsync(ResearchUploadDto dto, long userId);
    Task<bool> EditDetailsAsync(long id, EditDetailsDto dto, long userId);
    Task<ResearchResponseDto?> UploadVersionAsync(long id, NewVersionDto dto, long userId);
    Task<bool> EvaluateAsync(long id, string status, string feedback, long userId);
    Task<bool> UpdateFeedbackAsync(long id, int version, string feedback, long userId);
    Task<bool> ToggleValidationAsync(long id, string facultyEmail, long userId);
    
    // Metrics
    Task<bool> IncrementViewAsync(long id);
}