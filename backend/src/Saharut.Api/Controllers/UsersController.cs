using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
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
                    .Where(userRole => !userRole.IsDeleted)
                    .Select(userRole => new
                    {
                        userRole.Role.Id,
                        userRole.Role.Name,
                        userRole.Role.Code
                    }),

                Companies = user.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive)
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
                    .Where(userRole => !userRole.IsDeleted)
                    .Select(userRole => new
                    {
                        userRole.Role.Id,
                        userRole.Role.Name,
                        userRole.Role.Code
                    }),

                Companies = user.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive)
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
                Email = request.Email?.Trim(),
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
}

public sealed record CreateUserRequest(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    Guid? CompanyId,
    Guid? RoleId
);