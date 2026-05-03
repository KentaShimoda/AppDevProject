// Response for the toggle action
public record BookmarkToggleResponse(bool IsBookmarked, string Message);

// Simplified research data for the "My Archive" or Bookmarks list
// Added Validations to the record
public record BookmarkedResearchDto(
    long Id,
    string Title,
    string Tags,
    string Status,
    int Views,
    int Validations, // New Field
    DateTime DateBookmarked
);