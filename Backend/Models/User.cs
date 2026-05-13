using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Users")]
public class User
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("firstname")]
    public string FirstName { get; set; } = string.Empty;

    [Column("lastname")]
    public string LastName { get; set; } = string.Empty;

    [Column("suffix")]
    public string? Suffix { get; set; }

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("passwordhash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("birthdate")]
    public DateTime BirthDate { get; set; }

    [Column("organization")]
    public string Organization { get; set; } = string.Empty;

    [Column("usertype")]
    public string UserType { get; set; } = "Student";

    [Column("createdat")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("verification_code")]
    public string? VerificationCode { get; set; }

    [Column("code_expires_at")]
    public DateTime? CodeExpiresAt { get; set; }

    // --- NEW: stores the user's declared research interest topic ---
    [Column("research_interest")]
    public string? ResearchInterest { get; set; }
}