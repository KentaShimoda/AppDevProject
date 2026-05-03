using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;
    public AdminService(AppDbContext context) { _context = context; }

    // 🚀 Lightweight: Uses AsNoTracking and projects only public data
    public async Task<List<UserResponseDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .AsNoTracking()
            .Select(u => new UserResponseDto(
                u.Id, 
                $"{u.FirstName} {u.LastName}", 
                u.Email, 
                u.UserType, 
                u.Organization, 
                u.BirthDate, 
                null // Token not needed for list
            ))
            .ToListAsync();
    }

    public async Task<bool> UpdateUserRoleAsync(long userId, string newRole, long adminId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        string oldRole = user.UserType;
        user.UserType = newRole;

        // One transaction: Updates the role AND adds the log entry
        _context.AuditLogs.Add(new AuditLog 
        { 
            UserId = adminId, 
            Action = "ROLE_CHANGE", 
            Details = $"Updated {user.Email} from {oldRole} to {newRole}",
            Timestamp = DateTime.UtcNow 
        });

        return await _context.SaveChangesAsync() > 0;
    }

    // 🚀 Speed: Fast retrieval for logs without overhead
    public async Task<List<AuditLog>> GetAuditLogsAsync() => 
        await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();

    // 🛡️ Stability Fix: Prevents FK violations (Error 23503)
    public async Task LogActionAsync(long userId, string action, string details)
    {
        // Check if the user exists before logging to avoid a database crash
        if (!await _context.Users.AnyAsync(u => u.Id == userId)) return;

        _context.AuditLogs.Add(new AuditLog 
        { 
            UserId = userId, 
            Action = action, 
            Details = details,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteUserAsync(long userId, long adminId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        // Log the removal before the user record is gone
        _context.AuditLogs.Add(new AuditLog {
            UserId = adminId,
            Action = "ACCOUNT_DELETION",
            Details = $"Removed user: {user.Email}",
            Timestamp = DateTime.UtcNow
        });

        _context.Users.Remove(user);
        return await _context.SaveChangesAsync() > 0;
    }
}