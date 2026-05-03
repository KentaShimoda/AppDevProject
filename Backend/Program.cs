using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. SERVICES REGISTRATION
builder.Services.AddOpenApi(); 
builder.Services.AddControllers(); 

// Feature Services[cite: 6]
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IResearchService, ResearchService>();
builder.Services.AddScoped<IBookmarkService, BookmarkService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// Database: Using Npgsql for PostgreSQL[cite: 6]
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication: JWT Configuration[cite: 6]
var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

// CORS: Updated for Deployment (Dynamically reads frontend URL)
var frontendUrl = builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173";
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReact", policy => 
        policy.WithOrigins(frontendUrl) // Matches your live Vercel/Netlify URL
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// 2. MIDDLEWARE PIPELINE
if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
    app.MapScalarApiReference(options => {
        options.WithTitle("Filipino Scholar Archive API").WithTheme(ScalarTheme.Moon);
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowReact"); // Apply CORS[cite: 6]
app.UseAuthentication(); 
app.UseAuthorization();
app.MapControllers(); 

app.Run();