using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _service;
    public AuthController(IAuthService service) { _service = service; }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var result = await _service.RegisterAsync(dto);
        return result == null ? BadRequest(new { message = "Email already in use" }) : Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        try {
            var result = await _service.LoginAsync(dto);
            return result == null ? Unauthorized(new { message = "Invalid email or password" }) : Ok(result);
        } catch (Exception ex) {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailDto dto) =>
        await _service.VerifyEmailAsync(dto) ? Ok(new { message = "Verified!" }) : BadRequest(new { message = "Invalid code" });

    [HttpPost("resend-code")]
    public async Task<IActionResult> ResendCode([FromBody] ResendCodeDto dto) =>
        await _service.ResendVerificationCodeAsync(dto.Email) ? Ok(new { message = "Code sent" }) : BadRequest(new { message = "Failed" });

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        await _service.ForgotPasswordAsync(dto.Email);
        return Ok(new { message = "Reset code sent if account exists" });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto) =>
        await _service.ResetPasswordAsync(dto) ? Ok(new { message = "Reset successful" }) : BadRequest(new { message = "Invalid code" });
}