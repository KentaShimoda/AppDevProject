using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("research_studies")]
public class Research
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("tags")]
    public string Tags { get; set; } = string.Empty;

    [Column("coordinator", TypeName = "jsonb")] 
    public string Coordinator { get; set; } = "{}";

    [Column("researchers", TypeName = "jsonb")] 
    public string Researchers { get; set; } = "[]";

    [Column("pdf_data")]
    public byte[]? PdfData { get; set; }

    [Column("content_type")]
    public string ContentType { get; set; } = "application/pdf";

    [Column("views")]
    public int Views { get; set; } = 0;

    [Column("validations")]
    public int Validations { get; set; } = 0;

    [Column("status")]
    public string Status { get; set; } = "Pending Review";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property for history
    public List<ResearchHistory> History { get; set; } = new();
    public List<ResearchValidation> ValidationLog { get; set; } = new();
}

[Table("research_history")]
public class ResearchHistory
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("research_id")]
    public long ResearchId { get; set; }

    [Column("version")]
    public int Version { get; set; }

    [Column("version_name")]
    public string? VersionName { get; set; }

    [Column("feedback")]
    public string? Feedback { get; set; }

    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

[Table("research_validations")]
public class ResearchValidation {
    [Key] [Column("id")] public int Id { get; set; }
    [Column("research_id")] public long ResearchId { get; set; }
    [Column("faculty_email")] public string FacultyEmail { get; set; } = string.Empty;
}