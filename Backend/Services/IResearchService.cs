using System.Collections.Generic;
using System.Threading.Tasks;

public interface IResearchService
{
    Task<List<ResearchResponseDto>> GetAllAsync();
    Task<ResearchResponseDto?> GetByIdAsync(long id);
    Task<Research?> GetRawByIdAsync(long id);
    Task<ResearchResponseDto> CreateAsync(ResearchUploadDto dto);
    // Fixed: Signature matching the Controller call
    Task<bool> EditDetailsAsync(long id, EditDetailsDto dto);
    Task<ResearchResponseDto?> UploadVersionAsync(long id, NewVersionDto dto);
    Task<bool> EvaluateAsync(long id, string status, string feedback);
    Task<bool> UpdateHistoryFeedbackAsync(long researchId, int version, string newFeedback);
    Task<bool> ToggleValidationAsync(long id, string facultyEmail);
    Task<bool> IncrementViewAsync(long id);
}