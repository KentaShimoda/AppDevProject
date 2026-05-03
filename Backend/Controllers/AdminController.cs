using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

[Authorize(Roles = "Admin")] // RBAC Security
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _service;
    public AdminController(IAdminService service) { _service = service; }

    // Helper to get the Admin's ID from JWT[cite: 12]
    private long CurrentAdminId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers() => Ok(await _service.GetAllUsersAsync());

    [HttpPatch("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(long id, [FromBody] UpdateRoleDto dto)
    {
        if (CurrentAdminId == 0) return Unauthorized();
        
        var success = await _service.UpdateUserRoleAsync(id, dto.NewRole, CurrentAdminId);
        return success ? Ok(new { message = "Role updated." }) : NotFound();
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetLogs() => Ok(await _service.GetAuditLogsAsync());

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(long id)
    {
        if (CurrentAdminId == 0) return Unauthorized();
        return await _service.DeleteUserAsync(id, CurrentAdminId) ? NoContent() : NotFound();
    }

    // Backup functionality[cite: 12]
    [HttpGet("backup/metadata")]
    public async Task<IActionResult> ExportMetadata()
    {
        var users = await _service.GetAllUsersAsync();
        return Ok(new { 
            timestamp = DateTime.UtcNow, 
            source = "Filipino Scholar Archive",
            data = users 
        });
    }
}