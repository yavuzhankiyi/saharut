using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
public sealed class UsersController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public UsersController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/users
    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(user => !user.IsDeleted)
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.Email,
                user.PhoneNumberConfirmed,
                user.IsActive,
                user.CreatedAt,

                Roles = user.UserRoles
                    .Where(userRole =>
                        !userRole.IsDeleted &&
                        !userRole.Role.IsDeleted)
                    .Select(userRole => new
                    {
                        userRole.Role.Id,
                        userRole.Role.Name,
                        userRole.Role.Code
                    }),

                Companies = user.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.Company.IsDeleted)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name
                    })
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    // GET: api/v1/users/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(user =>
                user.Id == id &&
                !user.IsDeleted)
            .Select(user => new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.Email,
                user.PhoneNumberConfirmed,
                user.IsActive,
                user.LastLoginAt,
                user.CreatedAt,
                user.UpdatedAt,

                Roles = user.UserRoles
                    .Where(userRole =>
                        !userRole.IsDeleted &&
                        !userRole.Role.IsDeleted)
                    .Select(userRole => new
                    {
                        userRole.Role.Id,
                        userRole.Role.Name,
                        userRole.Role.Code
                    }),

                Companies = user.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.Company.IsDeleted)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name
                    })
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        return Ok(user);
    }

    // POST: api/v1/users
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest(new
            {
                success = false,
                message = "Ad, soyad ve telefon numarası zorunludur."
            });
        }

        var normalizedPhoneNumber = request.PhoneNumber.Trim();

        var phoneExists = await _dbContext.Users.AnyAsync(
            user =>
                user.PhoneNumber == normalizedPhoneNumber &&
                !user.IsDeleted,
            cancellationToken);

        if (phoneExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu telefon numarası zaten kullanılıyor."
            });
        }

        Company? company = null;

        if (request.CompanyId.HasValue)
        {
            company = await _dbContext.Companies
                .FirstOrDefaultAsync(
                    company =>
                        company.Id == request.CompanyId.Value &&
                        !company.IsDeleted &&
                        company.IsActive,
                    cancellationToken);

            if (company is null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Seçilen firma bulunamadı veya aktif değil."
                });
            }
        }

        Role? role = null;

        if (request.RoleId.HasValue)
        {
            role = await _dbContext.Roles
                .FirstOrDefaultAsync(
                    role =>
                        role.Id == request.RoleId.Value &&
                        !role.IsDeleted &&
                        role.IsActive,
                    cancellationToken);

            if (role is null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Seçilen rol bulunamadı veya aktif değil."
                });
            }
        }

        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            var user = new User
            {
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                PhoneNumber = normalizedPhoneNumber,
                Email = string.IsNullOrWhiteSpace(request.Email)
                    ? null
                    : request.Email.Trim(),
                PhoneNumberConfirmed = false,
                IsActive = true
            };

            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync(cancellationToken);

            if (company is not null)
            {
                _dbContext.CompanyUsers.Add(new CompanyUser
                {
                    UserId = user.Id,
                    CompanyId = company.Id,
                    IsActive = true
                });
            }

            if (role is not null)
            {
                _dbContext.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = role.Id
                });
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = user.Id },
                new
                {
                    success = true,
                    message = "Kullanıcı başarıyla oluşturuldu.",
                    user.Id,
                    user.FirstName,
                    user.LastName,
                    user.PhoneNumber,
                    user.Email,
                    companyId = company?.Id,
                    companyName = company?.Name,
                    roleId = role?.Id,
                    roleName = role?.Name
                });
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    // PUT: api/v1/users/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest(new
            {
                success = false,
                message = "Ad, soyad ve telefon numarası zorunludur."
            });
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.Id == id &&
                    !user.IsDeleted,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        var normalizedPhoneNumber = request.PhoneNumber.Trim();

        var phoneNumberExists = await _dbContext.Users
            .AnyAsync(
                otherUser =>
                    otherUser.Id != id &&
                    otherUser.PhoneNumber == normalizedPhoneNumber &&
                    !otherUser.IsDeleted,
                cancellationToken);

        if (phoneNumberExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor."
            });
        }

        var oldPhoneNumber = user.PhoneNumber;

        var phoneNumberChanged =
            oldPhoneNumber != normalizedPhoneNumber;

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = normalizedPhoneNumber;
        user.Email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim();
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (phoneNumberChanged)
        {
            user.PhoneNumberConfirmed = false;

            var activeOtpCodes = await _dbContext.OtpCodes
                .Where(otpCode =>
                    otpCode.PhoneNumber == oldPhoneNumber &&
                    !otpCode.IsUsed &&
                    !otpCode.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var otpCode in activeOtpCodes)
            {
                otpCode.IsUsed = true;
                otpCode.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Kullanıcı başarıyla güncellendi.",
            user = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.Email,
                user.PhoneNumberConfirmed,
                user.IsActive,
                user.UpdatedAt
            }
        });
    }

    // DELETE: api/v1/users/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.Id == id &&
                    !user.IsDeleted,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            var now = DateTime.UtcNow;

            user.IsDeleted = true;
            user.IsActive = false;
            user.UpdatedAt = now;

            var userRoles = await _dbContext.UserRoles
                .Where(userRole =>
                    userRole.UserId == id &&
                    !userRole.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var userRole in userRoles)
            {
                userRole.IsDeleted = true;
                userRole.UpdatedAt = now;
            }

            var companyUsers = await _dbContext.CompanyUsers
                .Where(companyUser =>
                    companyUser.UserId == id &&
                    !companyUser.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var companyUser in companyUsers)
            {
                companyUser.IsDeleted = true;
                companyUser.IsActive = false;
                companyUser.UpdatedAt = now;
            }

            var activeOtpCodes = await _dbContext.OtpCodes
                .Where(otpCode =>
                    otpCode.PhoneNumber == user.PhoneNumber &&
                    !otpCode.IsUsed &&
                    !otpCode.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var otpCode in activeOtpCodes)
            {
                otpCode.IsUsed = true;
                otpCode.UpdatedAt = now;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                message = "Kullanıcı başarıyla silindi."
            });
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}

public sealed record CreateUserRequest(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    Guid? CompanyId,
    Guid? RoleId
);

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    bool IsActive
);