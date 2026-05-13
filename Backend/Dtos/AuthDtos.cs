public record RegisterDto(
    string FirstName, 
    string LastName, 
    string? Suffix,
    string Email, 
    string Password, 
    DateTime BirthDate, 
    string Organization, 
    string UserType,
    string? ResearchInterest  
);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(
    long Id, 
    string FullName, 
    string Email, 
    string UserType, 
    string Organization,
    DateTime BirthDate,
    string Token
);

public record UserResponseDto(
    long Id,
    string FullName,
    string Email,
    string UserType,
    string Organization,
    DateTime BirthDate,
    string? Token = null
);

public class UpdateRoleDto
{
    public string NewRole { get; set; } = string.Empty;
}

public record SetInterestDto(string ResearchInterest);
 
public record UserInterestResponseDto(long Id, string ResearchInterest);
public record ResendCodeDto(string Email);
public record VerifyEmailDto(string Email, string Code);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string Email, string Code, string NewPassword);