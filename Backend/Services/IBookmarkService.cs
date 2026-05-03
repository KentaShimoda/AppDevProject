using System.Collections.Generic;
using System.Threading.Tasks;

public interface IBookmarkService
{
    Task<BookmarkToggleResponse> ToggleBookmarkAsync(long userId, long researchId);
    Task<List<BookmarkedResearchDto>> GetUserBookmarksAsync(long userId);
}