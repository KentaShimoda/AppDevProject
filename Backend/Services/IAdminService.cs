public interface IAdminService
{
    Task<List<User>> GetAllUsersAsync();
    Task<bool> UpdateUserRoleAsync(long userId, string newRole, long adminId);
    Task<List<AuditLog>> GetAuditLogsAsync();
    Task LogActionAsync(long userId, string action, string details);
}