using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        SaharutDbContext dbContext,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _environment = environment;
    }

    // GET: api/v1/auth/me
[Authorize]
[HttpGet("me")]
public IActionResult GetCurrentUser()
{
    var userId = User.FindFirstValue(
        ClaimTypes.NameIdentifier);

    var fullName = User.FindFirstValue(
        ClaimTypes.Name);

    var phoneNumber = User.FindFirstValue(
        ClaimTypes.MobilePhone);

    var email = User.FindFirstValue(
        ClaimTypes.Email);

    var roles = User.FindAll(ClaimTypes.Role)
        .Select(claim => claim.Value)
        .ToList();

    return Ok(new
    {
        success = true,
        user = new
        {
            id = userId,
            fullName,
            phoneNumber,
            email,
            roles
        }
    });
}

    // POST: api/v1/auth/send-otp
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp(
        [FromBody] SendOtpRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest(new
            {
                success = false,
                message = "Telefon numarası zorunludur."
            });
        }

        var phoneNumber = NormalizePhoneNumber(request.PhoneNumber);

        var userExists = await _dbContext.Users.AnyAsync(
            user =>
                user.PhoneNumber == phoneNumber &&
                !user.IsDeleted &&
                user.IsActive,
            cancellationToken);

        if (!userExists)
        {
            return NotFound(new
            {
                success = false,
                message = "Bu telefon numarasına ait aktif kullanıcı bulunamadı."
            });
        }

        var lastOtp = await _dbContext.OtpCodes
            .Where(otp =>
                otp.PhoneNumber == phoneNumber &&
                !otp.IsDeleted)
            .OrderByDescending(otp => otp.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (lastOtp is not null &&
            lastOtp.CreatedAt.AddSeconds(60) > DateTime.UtcNow)
        {
            var remainingSeconds = (int)Math.Ceiling(
                (lastOtp.CreatedAt.AddSeconds(60) - DateTime.UtcNow)
                .TotalSeconds);

            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new
                {
                    success = false,
                    message =
                        $"Yeni kod istemek için {remainingSeconds} saniye bekleyin."
                });
        }

        var activeCodes = await _dbContext.OtpCodes
            .Where(otp =>
                otp.PhoneNumber == phoneNumber &&
                !otp.IsUsed &&
                otp.ExpiresAt > DateTime.UtcNow &&
                !otp.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var activeCode in activeCodes)
        {
            activeCode.IsUsed = true;
            activeCode.UpdatedAt = DateTime.UtcNow;
        }

        var otpCode = RandomNumberGenerator
            .GetInt32(100000, 1000000)
            .ToString();

        var otpEntity = new OtpCode
        {
            PhoneNumber = phoneNumber,
            CodeHash = HashOtpCode(phoneNumber, otpCode),
            ExpiresAt = DateTime.UtcNow.AddMinutes(3),
            FailedAttemptCount = 0,
            IsUsed = false,
            IpAddress =
                HttpContext.Connection.RemoteIpAddress?.ToString()
        };

        _dbContext.OtpCodes.Add(otpEntity);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Doğrulama kodu oluşturuldu.",
            expiresInSeconds = 180,

            // Gerçek SMS entegrasyonunda kaldırılacak.
            developmentCode = _environment.IsDevelopment()
                ? otpCode
                : null
        });
    }

    // POST: api/v1/auth/verify-otp
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(
        [FromBody] VerifyOtpRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Telefon numarası ve doğrulama kodu zorunludur."
            });
        }

        var phoneNumber = NormalizePhoneNumber(request.PhoneNumber);

        var otp = await _dbContext.OtpCodes
            .Where(otp =>
                otp.PhoneNumber == phoneNumber &&
                !otp.IsUsed &&
                !otp.IsDeleted)
            .OrderByDescending(otp => otp.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (otp is null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Aktif doğrulama kodu bulunamadı."
            });
        }

        if (otp.ExpiresAt <= DateTime.UtcNow)
        {
            otp.IsUsed = true;
            otp.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return BadRequest(new
            {
                success = false,
                message = "Doğrulama kodunun süresi dolmuş."
            });
        }

        if (otp.FailedAttemptCount >= 5)
        {
            otp.IsUsed = true;
            otp.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new
                {
                    success = false,
                    message =
                        "Çok fazla hatalı deneme yapıldı. Yeni kod isteyin."
                });
        }

        var submittedHash = HashOtpCode(
            phoneNumber,
            request.Code.Trim());

        var isValid = CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(otp.CodeHash),
            Convert.FromHexString(submittedHash));

        if (!isValid)
        {
            otp.FailedAttemptCount++;
            otp.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return BadRequest(new
            {
                success = false,
                message = "Doğrulama kodu hatalı.",
                remainingAttempts = Math.Max(
                    0,
                    5 - otp.FailedAttemptCount)
            });
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.PhoneNumber == phoneNumber &&
                    !user.IsDeleted &&
                    user.IsActive,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        otp.IsUsed = true;
        otp.VerifiedAt = DateTime.UtcNow;
        otp.UpdatedAt = DateTime.UtcNow;

        user.PhoneNumberConfirmed = true;
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var roleCodes = await _dbContext.UserRoles
            .AsNoTracking()
            .Where(userRole =>
                userRole.UserId == user.Id &&
                !userRole.IsDeleted &&
                !userRole.Role.IsDeleted &&
                userRole.Role.IsActive)
            .Select(userRole => userRole.Role.Code)
            .ToListAsync(cancellationToken);

        var tokenResult = CreateAccessToken(
            user,
            roleCodes);

        return Ok(new
        {
            success = true,
            message = "Telefon numarası başarıyla doğrulandı.",
            accessToken = tokenResult.Token,
            expiresAt = tokenResult.ExpiresAt,
            tokenType = "Bearer",
            user = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.Email,
                user.PhoneNumberConfirmed,
                roles = roleCodes
            }
        });
    }

    private TokenResult CreateAccessToken(
        User user,
        IReadOnlyCollection<string> roleCodes)
    {
        var issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "JWT Issuer bilgisi bulunamadı.");

        var audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "JWT Audience bilgisi bulunamadı.");

        var secretKey = _configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException(
                "JWT SecretKey bilgisi bulunamadı.");

        var accessTokenMinutes =
            _configuration.GetValue<int?>(
                "Jwt:AccessTokenMinutes")
            ?? 60;

        var expiresAt = DateTime.UtcNow
            .AddMinutes(accessTokenMinutes);

        var claims = new List<Claim>
        {
            new(
                JwtRegisteredClaimNames.Sub,
                user.Id.ToString()),

            new(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString()),

            new(
                ClaimTypes.NameIdentifier,
                user.Id.ToString()),

            new(
                ClaimTypes.Name,
                $"{user.FirstName} {user.LastName}"),

            new(
                ClaimTypes.MobilePhone,
                user.PhoneNumber)
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim(
                ClaimTypes.Email,
                user.Email));
        }

        foreach (var roleCode in roleCodes)
        {
            claims.Add(new Claim(
                ClaimTypes.Role,
                roleCode));
        }

        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(secretKey));

        var credentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenValue = new JwtSecurityTokenHandler()
            .WriteToken(token);

        return new TokenResult(
            tokenValue,
            expiresAt);
    }

    private string HashOtpCode(
        string phoneNumber,
        string otpCode)
    {
        var secret = _configuration["Otp:HashSecret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException(
                "OTP hash anahtarı yapılandırılmamış.");
        }

        using var hmac = new HMACSHA256(
            Encoding.UTF8.GetBytes(secret));

        var value = $"{phoneNumber}:{otpCode}";

        var hash = hmac.ComputeHash(
            Encoding.UTF8.GetBytes(value));

        return Convert.ToHexString(hash);
    }

    private static string NormalizePhoneNumber(
        string phoneNumber)
    {
        return phoneNumber
            .Trim()
            .Replace(" ", "")
            .Replace("-", "")
            .Replace("(", "")
            .Replace(")", "");
    }
}

public sealed record SendOtpRequest(
    string PhoneNumber
);

public sealed record VerifyOtpRequest(
    string PhoneNumber,
    string Code
);

public sealed record TokenResult(
    string Token,
    DateTime ExpiresAt
);