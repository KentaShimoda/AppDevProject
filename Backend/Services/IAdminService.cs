using System.Collections.Generic;
using System.Threading.Tasks;

public interface IAdminService
{
    // User Management
    Task<List<UserResponseDto>> GetAllUsersAsync();
    Task<bool> UpdateUserRoleAsync(long userId, string newRole, long adminId);
    Task<bool> DeleteUserAsync(long userId, long adminId);

    // Audit & Logging
    Task<List<AuditLog>> GetAuditLogsAsync();
    Task LogActionAsync(long userId, string action, string details);
}