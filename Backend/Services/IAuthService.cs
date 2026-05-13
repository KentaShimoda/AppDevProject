public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
    Task<bool> VerifyEmailAsync(VerifyEmailDto dto);
    Task<bool> ResendVerificationCodeAsync(string email);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(ResetPasswordDto dto);

    // Interest
    Task<UserInterestResponseDto?> GetInterestAsync(int userId);
    Task<UserInterestResponseDto?> SetInterestAsync(int userId, SetInterestDto dto);

    // Recommended
    Task<IEnumerable<ResearchResponseDto>> GetRecommendedAsync(int userId, int limit);
}