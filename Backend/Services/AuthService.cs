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

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        // 🚀 Speed: Check email existence without tracking the object
        if (await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email)) 
            return null;

        var code = new Random().Next(100000, 999999).ToString();
        var user = new User {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PasswordHash = BC.HashPassword(dto.Password),
            BirthDate = DateTime.SpecifyKind(dto.BirthDate, DateTimeKind.Utc),
            Organization = dto.Organization,
            UserType = dto.UserType,
            VerificationCode = code,
            CodeExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 🚀 Background Task: Send email without blocking the response
        FireAndForgetEmail(user.Email, code, "Verification Code");

        return MapToResponse(user);
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        // 🚀 Speed: Fetch user for validation only (no tracking needed)
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

        user.IsVerified = true;
        user.VerificationCode = null;
        user.CodeExpiresAt = null;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return true; // Security: Generic success

        var code = new Random().Next(100000, 999999).ToString();
        user.VerificationCode = code;
        user.CodeExpiresAt = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();
        FireAndForgetEmail(user.Email, code, "Password Reset Code");
        
        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || user.VerificationCode != dto.Code || user.CodeExpiresAt < DateTime.UtcNow)
            return false;

        user.PasswordHash = BC.HashPassword(dto.NewPassword);
        user.VerificationCode = null;
        user.CodeExpiresAt = null;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ResendVerificationCodeAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.IsVerified) return false;

        var code = new Random().Next(100000, 999999).ToString();
        user.VerificationCode = code;
        user.CodeExpiresAt = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();
        FireAndForgetEmail(user.Email, code, "New Verification Code");
        return true;
    }

    private void FireAndForgetEmail(string email, string code, string subject)
    {
        _ = Task.Run(async () => {
            try { await SendEmailAsync(email, code, subject); }
            catch (Exception ex) { Console.WriteLine($"---> Email Fail: {ex.Message}"); }
        });
    }

    private async Task SendEmailAsync(string recipientEmail, string code, string subject)
    {
        var senderEmail = _config["EmailSettings:Email"];
        var senderPassword = _config["EmailSettings:Password"];
        var smtpHost = _config["EmailSettings:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["EmailSettings:Port"] ?? "587");

        using var client = new SmtpClient(smtpHost, smtpPort) {
            Credentials = new NetworkCredential(senderEmail, senderPassword),
            EnableSsl = true
        };

        var mailMessage = new MailMessage {
            From = new MailAddress(senderEmail!, "Filipino Scholar Archive"),
            Subject = subject,
            Body = $"Your code is: {code}",
            IsBodyHtml = false
        };
        mailMessage.To.Add(recipientEmail);
        await client.SendMailAsync(mailMessage);
    }

    private string CreateToken(User user)
    {
        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.UserType)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private AuthResponseDto MapToResponse(User user)
    {
        string fullName = string.IsNullOrWhiteSpace(user.Suffix) 
            ? $"{user.FirstName} {user.LastName}" 
            : $"{user.FirstName} {user.LastName}, {user.Suffix}";

        return new AuthResponseDto(
            user.Id, fullName, user.Email, user.UserType, 
            user.Organization, user.BirthDate, CreateToken(user)
        );
    }
}