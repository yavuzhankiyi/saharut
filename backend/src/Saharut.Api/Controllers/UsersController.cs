using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Contracts.Users;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private const string SuperAdminRoleCode = "SUPER_ADMIN";

    private readonly SaharutDbContext _dbContext;

    public UsersController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/users
    [HttpGet]
    [HasPermission("USERS.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] UserQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page = request.Page < 1
            ? 1
            : request.Page;

        var pageSize = request.PageSize switch
        {
            < 1 => 20,
            > 100 => 100,
            _ => request.PageSize
        };

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(user => !user.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(user =>
                EF.Functions.ILike(user.FirstName, $"%{search}%") ||
                EF.Functions.ILike(user.LastName, $"%{search}%") ||
                EF.Functions.ILike(user.PhoneNumber, $"%{search}%") ||
                (user.Email != null &&
                 EF.Functions.ILike(user.Email, $"%{search}%")));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(
                user => user.IsActive == request.IsActive.Value);
        }

        if (request.CompanyId.HasValue)
        {
            query = query.Where(user =>
                user.CompanyUsers.Any(companyUser =>
                    companyUser.CompanyId == request.CompanyId.Value &&
                    !companyUser.IsDeleted &&
                    companyUser.IsActive &&
                    !companyUser.Company.IsDeleted));
        }

        if (request.RoleId.HasValue)
        {
            query = query.Where(user =>
                user.UserRoles.Any(userRole =>
                    userRole.RoleId == request.RoleId.Value &&
                    !userRole.IsDeleted &&
                    !userRole.Role.IsDeleted));
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy.Trim().ToLowerInvariant() switch
        {
            "lastname" => descending
                ? query.OrderByDescending(user => user.LastName)
                : query.OrderBy(user => user.LastName),

            "phone" or "phonenumber" => descending
                ? query.OrderByDescending(user => user.PhoneNumber)
                : query.OrderBy(user => user.PhoneNumber),

            "email" => descending
                ? query.OrderByDescending(user => user.Email)
                : query.OrderBy(user => user.Email),

            "createdat" => descending
                ? query.OrderByDescending(user => user.CreatedAt)
                : query.OrderBy(user => user.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(user => user.IsActive)
                : query.OrderBy(user => user.IsActive),

            _ => descending
                ? query.OrderByDescending(user => user.FirstName)
                : query.OrderBy(user => user.FirstName)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
                        !userRole.Role.IsDeleted &&
                        userRole.Role.IsActive)
                    .OrderBy(userRole => userRole.Role.Name)
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
                        !companyUser.Company.IsDeleted &&
                        companyUser.Company.IsActive)
                    .OrderBy(companyUser => companyUser.Company.Name)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name
                    })
            })
            .ToListAsync(cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new
        {
            success = true,
            data = users,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages
            }
        });
    }

    // GET: api/v1/users/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("USERS.READ")]
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
                    .OrderBy(userRole => userRole.Role.Name)
                    .Select(userRole => new
                    {
                        userRole.Role.Id,
                        userRole.Role.Name,
                        userRole.Role.Code,
                        userRole.Role.IsActive
                    }),

                Companies = user.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.Company.IsDeleted)
                    .OrderBy(companyUser => companyUser.Company.Name)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name,
                        companyUser.Company.IsActive
                    })
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        return Ok(new
        {
            success = true,
            data = user
        });
    }

    // POST: api/v1/users
    [HttpPost]
    [HasPermission("USERS.CREATE")]
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
                message = "Ad, soyad ve telefon numarasÄ± zorunludur."
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
                message = "Bu telefon numarasÄ± zaten kullanÄ±lÄ±yor."
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
                    message = "SeÃ§ilen firma bulunamadÄ± veya aktif deÄŸil."
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
                    message = "SeÃ§ilen rol bulunamadÄ± veya aktif deÄŸil."
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
                Email = NormalizeOptionalText(request.Email),
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
                    message = "KullanÄ±cÄ± baÅŸarÄ±yla oluÅŸturuldu.",
                    data = new
                    {
                        user.Id,
                        user.FirstName,
                        user.LastName,
                        user.PhoneNumber,
                        user.Email,
                        user.IsActive,
                        companyId = company?.Id,
                        companyName = company?.Name,
                        roleId = role?.Id,
                        roleName = role?.Name
                    }
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
    [HasPermission("USERS.UPDATE")]
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
                message = "Ad, soyad ve telefon numarasÄ± zorunludur."
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
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        if (!request.IsActive && user.IsActive)
        {
            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN kullanÄ±cÄ±sÄ± pasif yapÄ±lamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
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
                message = "Bu telefon numarasÄ± baÅŸka bir kullanÄ±cÄ± tarafÄ±ndan kullanÄ±lÄ±yor."
            });
        }

        var oldPhoneNumber = user.PhoneNumber;
        var phoneNumberChanged =
            oldPhoneNumber != normalizedPhoneNumber;

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = normalizedPhoneNumber;
        user.Email = NormalizeOptionalText(request.Email);
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (phoneNumberChanged)
        {
            user.PhoneNumberConfirmed = false;

            await InvalidateOtpCodesAsync(
                oldPhoneNumber,
                user.UpdatedAt.Value,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "KullanÄ±cÄ± baÅŸarÄ±yla gÃ¼ncellendi.",
            data = new
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

    // PATCH: api/v1/users/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetUserStatusRequest request,
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
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        if (!request.IsActive && user.IsActive)
        {
            var currentUserId = GetCurrentUserId();

            if (currentUserId == id)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Kendi kullanÄ±cÄ± hesabÄ±nÄ±zÄ± pasif yapamazsÄ±nÄ±z."
                });
            }

            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN kullanÄ±cÄ±sÄ± pasif yapÄ±lamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
        }

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!request.IsActive)
        {
            await InvalidateOtpCodesAsync(
                user.PhoneNumber,
                user.UpdatedAt.Value,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = request.IsActive
                ? "KullanÄ±cÄ± aktif hÃ¢le getirildi."
                : "KullanÄ±cÄ± pasif hÃ¢le getirildi.",
            data = new
            {
                user.Id,
                user.IsActive,
                user.UpdatedAt
            }
        });
    }

    // POST: api/v1/users/{id}/roles
    [HttpPost("{id:guid}/roles")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> AssignRole(
        Guid id,
        [FromBody] AssignRoleRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.Id == id &&
                    !user.IsDeleted &&
                    user.IsActive,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ± bulunamadÄ± veya aktif deÄŸil."
            });
        }

        var role = await _dbContext.Roles
            .FirstOrDefaultAsync(
                role =>
                    role.Id == request.RoleId &&
                    !role.IsDeleted &&
                    role.IsActive,
                cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadÄ± veya aktif deÄŸil."
            });
        }

        var existingUserRole = await _dbContext.UserRoles
            .FirstOrDefaultAsync(
                userRole =>
                    userRole.UserId == id &&
                    userRole.RoleId == request.RoleId,
                cancellationToken);

        if (existingUserRole is not null)
        {
            if (!existingUserRole.IsDeleted)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Bu rol kullanÄ±cÄ±ya zaten atanmÄ±ÅŸ."
                });
            }

            existingUserRole.IsDeleted = false;
            existingUserRole.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _dbContext.UserRoles.Add(new UserRole
            {
                UserId = id,
                RoleId = request.RoleId
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Rol kullanÄ±cÄ±ya baÅŸarÄ±yla atandÄ±.",
            data = new
            {
                role.Id,
                role.Name,
                role.Code
            }
        });
    }

    // DELETE: api/v1/users/{id}/roles/{roleId}
    [HttpDelete("{id:guid}/roles/{roleId:guid}")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> RemoveRole(
        Guid id,
        Guid roleId,
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
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        var userRole = await _dbContext.UserRoles
            .Include(userRole => userRole.Role)
            .FirstOrDefaultAsync(
                userRole =>
                    userRole.UserId == id &&
                    userRole.RoleId == roleId &&
                    !userRole.IsDeleted,
                cancellationToken);

        if (userRole is null)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ±ya atanmÄ±ÅŸ bÃ¶yle bir rol bulunamadÄ±."
            });
        }

        if (userRole.Role.Code == SuperAdminRoleCode)
        {
            var currentUserId = GetCurrentUserId();

            if (currentUserId == id)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Kendi SUPER_ADMIN rolÃ¼nÃ¼zÃ¼ kaldÄ±ramazsÄ±nÄ±z."
                });
            }

            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN rolÃ¼ kaldÄ±rÄ±lamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
        }

        userRole.IsDeleted = true;
        userRole.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Rol kullanÄ±cÄ±dan baÅŸarÄ±yla kaldÄ±rÄ±ldÄ±.",
            data = new
            {
                userRole.Role.Id,
                userRole.Role.Name,
                userRole.Role.Code
            }
        });
    }

    // POST: api/v1/users/{id}/companies
    [HttpPost("{id:guid}/companies")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> AssignCompany(
        Guid id,
        [FromBody] AssignCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.Id == id &&
                    !user.IsDeleted &&
                    user.IsActive,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ± bulunamadÄ± veya aktif deÄŸil."
            });
        }

        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(
                company =>
                    company.Id == request.CompanyId &&
                    !company.IsDeleted &&
                    company.IsActive,
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadÄ± veya aktif deÄŸil."
            });
        }

        var existingCompanyUser =
            await _dbContext.CompanyUsers.FirstOrDefaultAsync(
                companyUser =>
                    companyUser.UserId == id &&
                    companyUser.CompanyId == request.CompanyId,
                cancellationToken);

        if (existingCompanyUser is not null)
        {
            if (!existingCompanyUser.IsDeleted &&
                existingCompanyUser.IsActive)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Bu firma kullanÄ±cÄ±ya zaten atanmÄ±ÅŸ."
                });
            }

            existingCompanyUser.IsDeleted = false;
            existingCompanyUser.IsActive = true;
            existingCompanyUser.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _dbContext.CompanyUsers.Add(new CompanyUser
            {
                UserId = id,
                CompanyId = request.CompanyId,
                IsActive = true
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Firma kullanÄ±cÄ±ya baÅŸarÄ±yla atandÄ±.",
            data = new
            {
                company.Id,
                company.Name
            }
        });
    }

    // DELETE: api/v1/users/{id}/companies/{companyId}
    [HttpDelete("{id:guid}/companies/{companyId:guid}")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> RemoveCompany(
        Guid id,
        Guid companyId,
        CancellationToken cancellationToken)
    {
        var userExists = await _dbContext.Users.AnyAsync(
            user =>
                user.Id == id &&
                !user.IsDeleted,
            cancellationToken);

        if (!userExists)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        var companyUser = await _dbContext.CompanyUsers
            .Include(companyUser => companyUser.Company)
            .FirstOrDefaultAsync(
                companyUser =>
                    companyUser.UserId == id &&
                    companyUser.CompanyId == companyId &&
                    !companyUser.IsDeleted &&
                    companyUser.IsActive,
                cancellationToken);

        if (companyUser is null)
        {
            return NotFound(new
            {
                success = false,
                message = "KullanÄ±cÄ±ya atanmÄ±ÅŸ bÃ¶yle bir firma bulunamadÄ±."
            });
        }

        companyUser.IsDeleted = true;
        companyUser.IsActive = false;
        companyUser.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Firma kullanÄ±cÄ±dan baÅŸarÄ±yla kaldÄ±rÄ±ldÄ±.",
            data = new
            {
                companyUser.Company.Id,
                companyUser.Company.Name
            }
        });
    }

    // DELETE: api/v1/users/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("USERS.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();

        if (currentUserId == id)
        {
            return Conflict(new
            {
                success = false,
                message = "Kendi kullanÄ±cÄ± hesabÄ±nÄ±zÄ± silemezsiniz."
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
                message = "KullanÄ±cÄ± bulunamadÄ±."
            });
        }

        var protectionResult =
            await CheckSuperAdminProtectionAsync(
                id,
                "Son aktif SUPER_ADMIN kullanÄ±cÄ±sÄ± silinemez.",
                cancellationToken);

        if (protectionResult is not null)
        {
            return protectionResult;
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

            await InvalidateOtpCodesAsync(
                user.PhoneNumber,
                now,
                cancellationToken);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                message = "KullanÄ±cÄ± baÅŸarÄ±yla silindi."
            });
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        return Guid.TryParse(userIdValue, out var userId)
            ? userId
            : null;
    }

    private async Task<IActionResult?> CheckSuperAdminProtectionAsync(
        Guid userId,
        string errorMessage,
        CancellationToken cancellationToken)
    {
        var isSuperAdmin = await _dbContext.UserRoles.AnyAsync(
            userRole =>
                userRole.UserId == userId &&
                !userRole.IsDeleted &&
                !userRole.Role.IsDeleted &&
                userRole.Role.IsActive &&
                userRole.Role.Code == SuperAdminRoleCode,
            cancellationToken);

        if (!isSuperAdmin)
        {
            return null;
        }

        var activeSuperAdminCount =
            await _dbContext.UserRoles.CountAsync(
                userRole =>
                    !userRole.IsDeleted &&
                    !userRole.Role.IsDeleted &&
                    userRole.Role.IsActive &&
                    userRole.Role.Code == SuperAdminRoleCode &&
                    !userRole.User.IsDeleted &&
                    userRole.User.IsActive,
                cancellationToken);

        if (activeSuperAdminCount > 1)
        {
            return null;
        }

        return Conflict(new
        {
            success = false,
            message = errorMessage
        });
    }

    private async Task InvalidateOtpCodesAsync(
        string phoneNumber,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var activeOtpCodes = await _dbContext.OtpCodes
            .Where(otpCode =>
                otpCode.PhoneNumber == phoneNumber &&
                !otpCode.IsUsed &&
                !otpCode.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var otpCode in activeOtpCodes)
        {
            otpCode.IsUsed = true;
            otpCode.UpdatedAt = now;
        }
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
