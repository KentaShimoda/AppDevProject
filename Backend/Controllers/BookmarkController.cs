using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BookmarkController : ControllerBase
{
    private readonly IBookmarkService _service;

    public BookmarkController(IBookmarkService service)
    {
        _service = service;
    }

    // Helper to safely get the current logged-in user's ID
    private long CurrentUserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpPost("toggle/{researchId:long}")]
    public async Task<IActionResult> Toggle(long researchId)
    {
        if (CurrentUserId == 0) return Unauthorized(new { message = "Invalid session" });

        var result = await _service.ToggleBookmarkAsync(CurrentUserId, researchId);
        return Ok(result);
    }

    [HttpGet("my-list")]
    public async Task<IActionResult> GetMyBookmarks()
    {
        if (CurrentUserId == 0) return Unauthorized(new { message = "Invalid session" });

        var list = await _service.GetUserBookmarksAsync(CurrentUserId);
        return Ok(list);
    }
}