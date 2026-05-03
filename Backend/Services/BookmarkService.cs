using Microsoft.EntityFrameworkCore;

public class BookmarkService : IBookmarkService
{
    private readonly AppDbContext _context;

    public BookmarkService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BookmarkToggleResponse> ToggleBookmarkAsync(long userId, long researchId)
    {
        var existing = await _context.Bookmarks
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ResearchId == researchId);

        if (existing != null)
        {
            _context.Bookmarks.Remove(existing);
            await _context.SaveChangesAsync();
            return new BookmarkToggleResponse(false, "Removed from bookmarks.");
        }

        var bookmark = new Bookmark 
        { 
            UserId = userId, 
            ResearchId = researchId,
            CreatedAt = DateTime.UtcNow 
        };

        _context.Bookmarks.Add(bookmark);
        await _context.SaveChangesAsync();
        
        return new BookmarkToggleResponse(true, "Added to bookmarks.");
    }

    public async Task<List<BookmarkedResearchDto>> GetUserBookmarksAsync(long userId)
    {
        return await _context.Bookmarks
            .Where(b => b.UserId == userId)
            .Include(b => b.Research)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BookmarkedResearchDto(
                b.Research.Id,
                b.Research.Title,
                b.Research.Tags,
                b.Research.Status,
                b.Research.Views,
                b.Research.Validations, // Map the actual validations from Research
                b.CreatedAt // This is when it was bookmarked
            ))
            .ToListAsync();
    }
}