using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
public class ResearchController : ControllerBase
{
    private readonly IResearchService _service;
    public ResearchController(IResearchService service) { _service = service; }

    private long CurrentUserId =>
        long.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

    // ── GET api/research ──────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(await _service.GetAllAsync());

    // ── GET api/research/{id} ─────────────────────────────────────────────────
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _service.GetByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    // ── GET api/research/category/{category} ──────────────────────────────────
    /// <summary>
    /// Returns all approved studies matching a specific category.
    /// Used by the frontend to browse by interest topic.
    /// </summary>
    [HttpGet("category/{category}")]
    public async Task<IActionResult> GetByCategory(string category) =>
        Ok(await _service.GetByCategoryAsync(category));

    // ── PATCH api/research/{id}/details ──────────────────────────────────────
    [Authorize]
    [HttpPatch("{id:long}/details")]
    public async Task<IActionResult> UpdateDetails(long id, [FromBody] EditDetailsDto dto) =>
        await _service.EditDetailsAsync(id, dto, CurrentUserId) ? NoContent() : NotFound();

    // ── POST api/research/{id}/version ────────────────────────────────────────
    [Authorize]
    [HttpPost("{id:long}/version")]
    public async Task<IActionResult> NewVersion(long id, [FromForm] NewVersionDto dto)
    {
        var result = await _service.UploadVersionAsync(id, dto, CurrentUserId);
        return result != null ? Ok(result) : NotFound();
    }

    // ── PATCH api/research/{id}/evaluate ─────────────────────────────────────
    [Authorize(Roles = "Faculty / Professional")]
    [HttpPatch("{id:long}/evaluate")]
    public async Task<IActionResult> Evaluate(long id, [FromBody] EvaluationDto dto) =>
        await _service.EvaluateAsync(id, dto.Status, dto.Feedback, CurrentUserId) ? NoContent() : NotFound();

    // ── GET api/research/{id}/view ────────────────────────────────────────────
    [HttpGet("{id:long}/view")]
    public async Task<IActionResult> GetView(long id)
    {
        var r = await _service.GetRawByIdAsync(id);
        if (r?.PdfData == null) return NotFound();
        return File(r.PdfData, r.ContentType);
    }

    // ── POST api/research/upload ──────────────────────────────────────────────
    /// <summary>
    /// Now accepts an optional Category field via ResearchUploadDto.
    /// </summary>
    [Authorize]
    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] ResearchUploadDto dto) =>
        Ok(await _service.CreateAsync(dto, CurrentUserId));

    // ── POST api/research/{id}/validate ──────────────────────────────────────
    [Authorize(Roles = "Faculty / Professional")]
    [HttpPost("{id:long}/validate")]
    public async Task<IActionResult> ToggleValidation(long id)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var success = await _service.ToggleValidationAsync(id, email, CurrentUserId);
        return success ? Ok() : NotFound();
    }

    // ── PATCH api/research/{id}/history/{version}/feedback ───────────────────
    [Authorize(Roles = "Faculty / Professional")]
    [HttpPatch("{id:long}/history/{version:int}/feedback")]
    public async Task<IActionResult> UpdateFeedbackAsync(long id, int version, [FromBody] string feedback)
    {
        var success = await _service.UpdateFeedbackAsync(id, version, feedback, CurrentUserId);
        return success ? NoContent() : NotFound();
    }

    // ── POST api/research/{id}/view ───────────────────────────────────────────
    [HttpPost("{id:long}/view")]
    public async Task<IActionResult> RecordView(long id)
    {
        var success = await _service.IncrementViewAsync(id);
        return success ? Ok() : NotFound();
    }
}