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
        if (result == null) return BadRequest(new { message = "Email is already in use" });
        return Ok(result);
    }

// Path: Controllers/AuthController.cs
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        try
        {
            var result = await _service.LoginAsync(dto);
            
            // If it returns null, the credentials were truly wrong
            if (result == null) 
                return Unauthorized(new { message = "Invalid email or password" });

            return Ok(result);
        }
        catch (Exception ex)
        {
            // This catch block now receives the "Account not verified" message
            // We send it back as a 401 Unauthorized so React can handle it
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailDto dto) {
        var success = await _service.VerifyEmailAsync(dto);
        if (!success) return BadRequest(new { message = "Invalid or expired verification code." });
        return Ok(new { message = "Email verified successfully!" });
    }

    [HttpPost("resend-code")]
    public async Task<IActionResult> ResendCode([FromBody] ResendCodeDto dto) // Changed this
    {
        // Pass dto.Email instead of just email
        var success = await _service.ResendVerificationCodeAsync(dto.Email);
        
        if (!success) 
            return BadRequest(new { message = "Unable to resend code. Account may already be verified or does not exist." });
            
        return Ok(new { message = "A new verification code has been sent." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        await _service.ForgotPasswordAsync(dto.Email);
        // We return Ok even if the email doesn't exist for security reasons
        return Ok(new { message = "If an account exists with that email, a reset code has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        var result = await _service.ResetPasswordAsync(dto);
        if (!result) return BadRequest(new { message = "Invalid or expired reset code." });
        
        return Ok(new { message = "Your password has been successfully reset. You can now login." });
    }
}