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

    [HttpPost("toggle/{researchId:long}")]
    public async Task<IActionResult> Toggle(long researchId)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _service.ToggleBookmarkAsync(userId, researchId);
        return Ok(result);
    }

    [HttpGet("my-list")]
    public async Task<IActionResult> GetMyBookmarks()
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var list = await _service.GetUserBookmarksAsync(userId);
        return Ok(list);
    }
}