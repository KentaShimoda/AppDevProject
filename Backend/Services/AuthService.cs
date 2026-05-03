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
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email)) return null;

        var code = new Random().Next(100000, 999999).ToString();

        var user = new User {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            BirthDate = DateTime.SpecifyKind(dto.BirthDate, DateTimeKind.Utc),
            Organization = dto.Organization,
            UserType = dto.UserType,
            VerificationCode = code, //
            CodeExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // CALL THE EMAIL METHOD HERE
        await SendEmailAsync(user.Email, code);

        return MapToResponse(user);
    }

    public async Task<bool> VerifyEmailAsync(VerifyEmailDto dto) {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        
        if (user == null || 
            user.VerificationCode != dto.Code || 
            user.CodeExpiresAt < DateTime.UtcNow) {
            return false;
        }

        user.IsVerified = true;
        user.VerificationCode = null; // Clear code after use
        user.CodeExpiresAt = null;

        return await _context.SaveChangesAsync() > 0;
    }

    // Change return type to a result object or use an enum
    // Simplest fix: return a specific known response
 // Path: Services/AuthService.cs
    // Replace your LoginAsync method in AuthService.cs with this:

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        // Wrong email or wrong password
        if (user == null || !BC.Verify(dto.Password, user.PasswordHash))
            return null;

        // Correct password but account not verified — throw so controller catches it
        if (!user.IsVerified)
            throw new Exception("Account not verified. Please check your email for the verification code.");

        return MapToResponse(user);
    }
    private AuthResponseDto MapToResponse(User user)
    {
        // Logic: Keep your existing FullName formatting[cite: 8]
        string fullName = string.IsNullOrWhiteSpace(user.Suffix) 
            ? $"{user.FirstName} {user.LastName}" 
            : $"{user.FirstName} {user.LastName}, {user.Suffix}";

        // Logic: Pass all database fields into the new DTO structure[cite: 8]
        return new AuthResponseDto(
            user.Id, 
            fullName, 
            user.Email, 
            user.UserType, 
            user.Organization, // Now sent to frontend
            user.BirthDate,    // Now sent to frontend
            CreateToken(user)
        );
    }

    private string CreateToken(User user)
    {
        var claims = new List<Claim> {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.UserType)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<bool> ResendVerificationCodeAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        // Only resend if the user exists and is NOT yet verified
        if (user == null || user.IsVerified) return false;

        // Generate new 6-digit code
        user.VerificationCode = new Random().Next(100000, 999999).ToString();
        user.CodeExpiresAt = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();
        
        // Log or Send Email here
        await SendEmailAsync(user.Email, user.VerificationCode!);
        return true;
    }

    private async Task SendEmailAsync(string recipientEmail, string code)
    {
        try 
        {
            // 1. Extract values from your IConfiguration object
            var senderEmail = _config["EmailSettings:Email"];
            var senderPassword = _config["EmailSettings:Password"]; 
            var smtpHost = _config["EmailSettings:Host"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["EmailSettings:Port"] ?? "587");

            // 2. Initialize the client using the config values
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword), 
                EnableSsl = true 
            };

            // 3. Set the 'From' address to your sender email
            var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail!, "Filipino Scholar Archive"),
                Subject = "Verification Code",
                Body = $"Your 6-digit code is: {code}",
                IsBodyHtml = false
            };
            
            // 4. Set the 'To' address to the recipient (the user registering)
            mailMessage.To.Add(recipientEmail);

            await client.SendMailAsync(mailMessage);
            Console.WriteLine($"---> Email successfully sent to {recipientEmail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"---> SMTP Error: {ex.Message}");
        }
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        // Safety Tip: Always return 'true' or a generic message even if the email 
        // isn't found to prevent hackers from "fishing" for valid emails.
        if (user == null) return true;

        // Generate a fresh 6-digit code
        var code = new Random().Next(100000, 999999).ToString();
        user.VerificationCode = code;
        user.CodeExpiresAt = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();

        // Reuse your existing email method
        await SendEmailAsync(user.Email, code); 
        
        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || 
            user.VerificationCode != dto.Code || 
            user.CodeExpiresAt < DateTime.UtcNow)
        {
            return false; // Code is wrong, expired, or user doesn't exist
        }

        // Hash the new password using BCrypt
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        
        // Clear the code so it can't be used again
        user.VerificationCode = null;
        user.CodeExpiresAt = null;

        return await _context.SaveChangesAsync() > 0;
    }
}