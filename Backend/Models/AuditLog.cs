using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }
    
    // Action types: "LOGIN", "UPLOAD", "MODERATION", "ROLE_CHANGE", etc.
    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Column("details")]
    public string Details { get; set; } = string.Empty;

    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}