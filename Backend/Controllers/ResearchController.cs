using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IO;

[ApiController]
[Route("api/[controller]")]
public class ResearchController : ControllerBase
{
    private readonly IResearchService _service;
    private readonly IAdminService _adminService; // For logging uploads and edits
    public ResearchController(IResearchService service, IAdminService adminService) { _service = service; _adminService = adminService; }

    // GET: api/Research
    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _service.GetAllAsync());

    // GET: api/Research/{id}
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Research not found" });
        return Ok(result);
    }

    // PATCH: api/Research/{id}/details
    // Updates only Title and Category
    [Authorize]
    [HttpPatch("{id:long}/details")]
    public async Task<IActionResult> UpdateDetails(long id, [FromBody] EditDetailsDto dto)
    {
        var success = await _service.EditDetailsAsync(id, dto);
        await _adminService.LogActionAsync(id, "RESEARCH_EDIT", $"Modified metadata for study ID: {id}");
        return success ? NoContent() : NotFound();
    }

    // POST: api/Research/{id}/version
    // Replaces the current PDF and adds a new record to the history table
    [Authorize]
    [HttpPost("{id:long}/version")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> NewVersion(long id, [FromForm] NewVersionDto dto)
    {
        var result = await _service.UploadVersionAsync(id, dto);
        await _adminService.LogActionAsync(id, "VERSION_UPLOAD", $"New version uploaded for: {result?.Title}");
        return result != null ? Ok(result) : NotFound();
    }

    // PATCH: api/Research/{id}/evaluate
    // Coordinator approves/rejects and leaves a message in the history record
    [Authorize(Roles = "Faculty / Professional")]
    [HttpPatch("{id:long}/evaluate")]
    public async Task<IActionResult> Evaluate(long id, [FromBody] EvaluationDto dto)
    {
        // Passes Status and Feedback message to the service
        var success = await _service.EvaluateAsync(id, dto.Status, dto.Feedback);
        await _adminService.LogActionAsync(id, "RESEARCH_EVALUATE", $"Study evaluated: {id}");
        return success ? NoContent() : NotFound();
    }

    // GET: api/Research/{id}/view
    [HttpGet("{id:long}/view")]
    public async Task<IActionResult> GetView(long id)
    {
        var research = await _service.GetRawByIdAsync(id);
        if (research == null || research.PdfData == null) return NotFound();

        Response.Headers["Content-Disposition"] = "inline"; 
        return File(research.PdfData, research.ContentType);
    }

    // GET: api/Research/{id}/download
    [HttpGet("{id:long}/download")]
    public async Task<IActionResult> DownloadPdf(long id)
    {
        var research = await _service.GetRawByIdAsync(id);
        if (research == null || research.PdfData == null) return NotFound();

        string safeTitle = string.Join("_", research.Title.Split(Path.GetInvalidFileNameChars()));
        await _adminService.LogActionAsync(id, "VERSION_UPLOAD", $"Study downloaded: {research.Title}");
        return File(research.PdfData, research.ContentType, $"{safeTitle}.pdf");
    }

    // POST: api/Research/upload
    [Authorize]
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] ResearchUploadDto dto) 
    {
        var result = await _service.CreateAsync(dto);
        await _adminService.LogActionAsync(result.Id, "RESEARCH_UPLOAD", $"Study uploaded: {result.Title}");
        return Ok(result);
    }

    [Authorize(Roles = "Faculty / Professional")]
    [HttpPatch("{id:long}/history/{version:int}/feedback")]
    public async Task<IActionResult> UpdateHistoryFeedback(long id, int version, [FromBody] string feedback)
    {
        var success = await _service.UpdateHistoryFeedbackAsync(id, version, feedback);
        await _adminService.LogActionAsync(id, "HISTORY_FEEDBACK_UPDATE", $"Feedback updated for version {version} of study ID: {id}");
        return success ? NoContent() : NotFound();
    }

        // POST: api/Research/{id}/view
    [HttpPost("{id:long}/view")]
    public async Task<IActionResult> AddView(long id) {
        await _service.IncrementViewAsync(id);
        return NoContent();
    }

    // POST: api/Research/{id}/validate
    [Authorize(Roles = "Faculty / Professional")]
    [HttpPost("{id:long}/validate")]
    public async Task<IActionResult> ToggleValidation(long id) {
        // Extract email from JWT Token
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var success = await _service.ToggleValidationAsync(id, email);
        await _adminService.LogActionAsync(id, "VALIDATION_TOGGLE", $"Validation status updated for: {id}");
        return success ? Ok() : NotFound();
    }
}