using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

[Authorize(Roles = "Admin")] // Strict RBAC Requirement 4.1
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _service;
    public AdminController(IAdminService service) { _service = service; }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers() => Ok(await _service.GetAllUsersAsync());

    [HttpPatch("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(long id, [FromBody] UpdateRoleDto dto)
    {
        // Retrieve Admin ID from the JWT claims
        var adminIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(adminIdString)) return Unauthorized();
        
        var adminId = long.Parse(adminIdString);
        
        // Pass the role from the DTO to the service
        var success = await _service.UpdateUserRoleAsync(id, dto.NewRole, adminId);
        
        return success 
            ? Ok(new { message = "Protocol updated: Access level modified." }) 
            : NotFound(new { message = "Subject not found in registry." });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetLogs() => Ok(await _service.GetAuditLogsAsync());

    // Requirement 4.4: Data Backup (Metadata Export)
    [HttpGet("backup/metadata")]
    public async Task<IActionResult> ExportMetadata()
    {
        // For simple recovery, we export users and research metadata as JSON
        var users = await _service.GetAllUsersAsync();
        return Ok(new { timestamp = DateTime.UtcNow, data = users });
    }
}