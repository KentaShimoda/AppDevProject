using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; //

[Table("Users")] // Forces EF to use the capitalized table name
public class User
{
    [Key]
    [Column("id")] // Maps to your 'Id' column
    public long Id { get; set; }
    
    [Column("firstname")] // Maps to 'FirstName' in your SQL
    public string FirstName { get; set; } = string.Empty;
    
    [Column("lastname")]
    public string LastName { get; set; } = string.Empty;
    
    [Column("suffix")]
    public string? Suffix { get; set; }
    
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    
    [Column("passwordhash")] // Matches 'PasswordHash' from your script
    public string PasswordHash { get; set; } = string.Empty;
    
    [Column("birthdate")] // Matches 'BirthDate' from your script
    public DateTime BirthDate { get; set; }
    
    [Column("organization")]
    public string Organization { get; set; } = string.Empty;
    
    [Column("usertype")]
    public string UserType { get; set; } = "Student";
    
    [Column("createdat")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Add these to your existing User class
    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("verification_code")]
    public string? VerificationCode { get; set; }

    [Column("code_expires_at")]
    public DateTime? CodeExpiresAt { get; set; }
}