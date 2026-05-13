using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BC = BCrypt.Net.BCrypt;
using System.Net;
using System.Net.Mail;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        if (await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email))
            return null;

        var code = GenerateCode();
        var user = new User
        {
            FirstName       = dto.FirstName,
            LastName        = dto.LastName,
            Email           = dto.Email,
            PasswordHash    = BC.HashPassword(dto.Password),
            BirthDate       = DateTime.SpecifyKind(dto.BirthDate, DateTimeKind.Utc),
            Organization    = dto.Organization,
            UserType        = dto.UserType,
            VerificationCode = code,
            CodeExpiresAt   = DateTime.UtcNow.AddMinutes(15),
            IsVerified      = false,
            CreatedAt       = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        FireAndForgetEmail(user.Email, code, "Verification Code");

        return MapToResponse(user);
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !BC.Verify(dto.Password, user.PasswordHash))
            return null;

        if (!user.IsVerified)
            throw new Exception("Account not verified. Please check your email.");

        return MapToResponse(user);
    }

    public async Task<bool> VerifyEmailAsync(VerifyEmailDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || user.VerificationCode != dto.Code || user.CodeExpiresAt < DateTime.UtcNow)
            return false;

        user.IsVerified      = true;
        user.VerificationCode = null;
        user.CodeExpiresAt   = null;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return true; // Security: generic success

        var code = GenerateCode();
        user.VerificationCode = code;
        user.CodeExpiresAt    = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();
        FireAndForgetEmail(user.Email, code, "Password Reset Code");

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || user.VerificationCode != dto.Code || user.CodeExpiresAt < DateTime.UtcNow)
            return false;

        user.PasswordHash    = BC.HashPassword(dto.NewPassword);
        user.VerificationCode = null;
        user.CodeExpiresAt   = null;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ResendVerificationCodeAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.IsVerified) return false;

        var code = GenerateCode();
        user.VerificationCode = code;
        user.CodeExpiresAt    = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();
        FireAndForgetEmail(user.Email, code, "New Verification Code");

        return true;
    }

    // ── Interest ──────────────────────────────────────────────────────────────

    public async Task<UserInterestResponseDto?> GetInterestAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Select(u => new { u.Id, u.ResearchInterest })   // fetch only what's needed
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user is null
            ? null
            : new UserInterestResponseDto(user.Id, user.ResearchInterest ?? "");
    }

    public async Task<UserInterestResponseDto?> SetInterestAsync(int userId, SetInterestDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user is null) return null;

        user.ResearchInterest = dto.ResearchInterest.Trim();
        await _context.SaveChangesAsync();

        return new UserInterestResponseDto(user.Id, user.ResearchInterest);
    }

    // ── Recommended ───────────────────────────────────────────────────────────

    public async Task<IEnumerable<ResearchResponseDto>> GetRecommendedAsync(int userId, int limit)
    {
        var interest = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.ResearchInterest)
            .FirstOrDefaultAsync();

        // Return empty if user doesn't exist
        if (interest is null) return Enumerable.Empty<ResearchResponseDto>();

        var query = _context.ResearchStudies
            .AsNoTracking()
            .Include(r => r.History)
            .Include(r => r.ValidationLog)
            .Where(r => r.Status == "Approved");

        if (!string.IsNullOrWhiteSpace(interest))
            query = query.Where(r =>
                r.Category != null &&
                r.Category.ToLower() == interest.ToLower());

        var results = await query
            .OrderByDescending(r => r.Views + r.Validations)
            .ThenByDescending(r => r.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return results.Select(ResearchService.MapToDtoPublic);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string GenerateCode() =>
        new Random().Next(100000, 999999).ToString();

    private void FireAndForgetEmail(string email, string code, string subject) =>
        _ = Task.Run(async () =>
        {
            try   { await SendEmailAsync(email, code, subject); }
            catch (Exception ex) { Console.WriteLine($"---> Email Fail: {ex.Message}"); }
        });

    private async Task SendEmailAsync(string recipientEmail, string code, string subject)
    {
        var senderEmail    = _config["EmailSettings:Email"];
        var senderPassword = _config["EmailSettings:Password"];
        var smtpHost       = _config["EmailSettings:Host"] ?? "smtp.gmail.com";
        var smtpPort       = int.Parse(_config["EmailSettings:Port"] ?? "587");

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(senderEmail, senderPassword),
            EnableSsl   = true
        };

        var mail = new MailMessage
        {
            From       = new MailAddress(senderEmail!, "Filipino Scholar Archive"),
            Subject    = subject,
            Body       = $"Your code is: {code}",
            IsBodyHtml = false
        };
        mail.To.Add(recipientEmail);

        await client.SendMailAsync(mail);
    }

    private string CreateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email,          user.Email),
            new Claim(ClaimTypes.Role,           user.UserType)
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private AuthResponseDto MapToResponse(User user)
    {
        var fullName = string.IsNullOrWhiteSpace(user.Suffix)
            ? $"{user.FirstName} {user.LastName}"
            : $"{user.FirstName} {user.LastName}, {user.Suffix}";

        return new AuthResponseDto(
            user.Id, fullName, user.Email, user.UserType,
            user.Organization, user.BirthDate, CreateToken(user)
        );
    }
}