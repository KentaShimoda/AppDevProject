public record ResearchUploadDto(
    long UserId,
    string Title, 
    string Tags,
    string CoordinatorName, 
    string CoordinatorEmail,
    string ResearcherNames,
    string ResearcherEmails,
    IFormFile PdfFile
);

public record ResearchResponseDto(
    long Id,
    string Title,
    string Tags,
    string Coordinator,
    string Researchers,
    int Views,
    int Validations,
    string Status,
    int Version,
    string VersionName,
    string? Feedback,
    DateTime CreatedAt,
    List<HistoryResponseDto> History, // Added for clickable timeline,
    List<ValidationResponseDto> ValidationLog
);

public record EditDetailsDto(
    string Title, 
    string Tags,
    string CoordinatorName, 
    string CoordinatorEmail,
    string ResearcherNames,
    string ResearcherEmails
);
public record NewVersionDto(string VersionName, IFormFile PdfFile);
public record EvaluationDto(string Status, string Feedback);
public record HistoryResponseDto(int Version, string VersionName, string? Feedback, DateTime UploadedAt);
public record ValidationResponseDto(string FacultyEmail);
