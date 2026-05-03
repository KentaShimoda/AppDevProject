using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Research> ResearchStudies { get; set; }
    public DbSet<User> Users { get; set; } 
    public DbSet<ResearchHistory> ResearchHistory { get; set; }
    public DbSet<ResearchValidation> ResearchValidations { get; set; }
    public DbSet<Bookmark> Bookmarks { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Force the table name to be capitalized "Users"
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Bookmark>()
        .HasIndex(b => new { b.UserId, b.ResearchId })
        .IsUnique();
        modelBuilder.Entity<AuditLog>()
        .HasOne<User>()
        .WithMany()
        .HasForeignKey(a => a.UserId);
        base.OnModelCreating(modelBuilder);
    }
}