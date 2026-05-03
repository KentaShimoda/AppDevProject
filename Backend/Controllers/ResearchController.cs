using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
public class ResearchController : ControllerBase
{
    private readonly IResearchService _service;
    public ResearchController(IResearchService service) { _service = service; }

    private long CurrentUserId => long.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _service.GetByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    [Authorize]
    [HttpPatch("{id:long}/details")]
    public async Task<IActionResult> UpdateDetails(long id, [FromBody] EditDetailsDto dto) =>
        await _service.EditDetailsAsync(id, dto, CurrentUserId) ? NoContent() : NotFound();

    [Authorize]
    [HttpPost("{id:long}/version")]
    public async Task<IActionResult> NewVersion(long id, [FromForm] NewVersionDto dto)
    {
        var result = await _service.UploadVersionAsync(id, dto, CurrentUserId);
        return result != null ? Ok(result) : NotFound();
    }

    [Authorize(Roles = "Faculty / Professional")]
    [HttpPatch("{id:long}/evaluate")]
    public async Task<IActionResult> Evaluate(long id, [FromBody] EvaluationDto dto) =>
        await _service.EvaluateAsync(id, dto.Status, dto.Feedback, CurrentUserId) ? NoContent() : NotFound();

    [HttpGet("{id:long}/view")]
    public async Task<IActionResult> GetView(long id)
    {
        var r = await _service.GetRawByIdAsync(id);
        if (r?.PdfData == null) return NotFound();
        return File(r.PdfData, r.ContentType);
    }

    [Authorize]
    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] ResearchUploadDto dto) => 
        Ok(await _service.CreateAsync(dto, CurrentUserId));

    [Authorize(Roles = "Faculty / Professional")]
    [HttpPost("{id:long}/validate")]
    public async Task<IActionResult> ToggleValidation(long id)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();
        return await _service.ToggleValidationAsync(id, email, CurrentUserId) ? Ok() : NotFound();
    }
}