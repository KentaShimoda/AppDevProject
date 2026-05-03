using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("bookmarks")]
public class Bookmark
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }
    public User User { get; set; } = null!;

    [Column("research_id")]
    public long ResearchId { get; set; }
    public Research Research { get; set; } = null!; // Links to your existing Research class

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}