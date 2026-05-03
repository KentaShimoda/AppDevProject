using Microsoft.EntityFrameworkCore; // CRITICAL: Fixes the ToListAsync error
using System.Collections.Generic;
using System.Threading.Tasks;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;
    public AdminService(AppDbContext context) { _context = context; }

    public async Task<List<User>> GetAllUsersAsync() => await _context.Users.ToListAsync();

    public async Task<bool> UpdateUserRoleAsync(long userId, string newRole, long adminId)
    {
        // 1. Find the subject in the registry
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        // 2. Track the change for the audit log
        string oldRole = user.UserType;
        user.UserType = newRole;

        // 3. Add the log entry to the context (DO NOT SAVE YET)
        _context.AuditLogs.Add(new AuditLog 
        { 
            UserId = adminId, 
            Action = "ROLE_CHANGE", 
            Details = $"User {user.Email} protocol updated from {oldRole} to {newRole}",
            Timestamp = DateTime.UtcNow 
        });

        // 4. Perform a SINGLE save. This pushes both the User change AND the Audit Log.
        // If either the user was updated OR a log was created, result will be > 0.
        var result = await _context.SaveChangesAsync();
        
        return result > 0;
    }

    public async Task<List<AuditLog>> GetAuditLogsAsync() => 
        await _context.AuditLogs.OrderByDescending(a => a.Timestamp).ToListAsync();

    public async Task LogActionAsync(long userId, string action, string details)
    {
        _context.AuditLogs.Add(new AuditLog { UserId = userId, Action = action, Details = details });
        await _context.SaveChangesAsync();
    }
    public async Task<bool> DeleteUserAsync(long userId, long adminId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        // Requirement 4.2: Log the deletion before removing the record
        await LogActionAsync(adminId, "ACCOUNT_DELETION", $"Permanently removed user: {user.Email}");

        _context.Users.Remove(user);
        return await _context.SaveChangesAsync() > 0;
    }
}