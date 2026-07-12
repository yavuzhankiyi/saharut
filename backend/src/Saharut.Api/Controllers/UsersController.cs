using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
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

    public UsersController(
        SaharutDbContext dbContext)
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
        var page =
            PaginationHelper.NormalizePage(
                request.Page);

        var pageSize =
            PaginationHelper.NormalizePageSize(
                request.PageSize);

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(user => !user.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(user =>
                EF.Functions.ILike(
                    user.FirstName,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    user.LastName,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    user.PhoneNumber,
                    $"%{search}%") ||

                (user.Email != null &&
                 EF.Functions.ILike(
                     user.Email,
                     $"%{search}%")));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(
                user =>
                    user.IsActive ==
                    request.IsActive.Value);
        }

        if (request.CompanyId.HasValue)
        {
            query = query.Where(user =>
                user.CompanyUsers.Any(companyUser =>
                    companyUser.CompanyId ==
                    request.CompanyId.Value &&
                    !companyUser.IsDeleted &&
                    companyUser.IsActive &&
                    !companyUser.Company.IsDeleted));
        }

        if (request.RoleId.HasValue)
        {
            query = query.Where(user =>
                user.UserRoles.Any(userRole =>
                    userRole.RoleId ==
                    request.RoleId.Value &&
                    !userRole.IsDeleted &&
                    !userRole.Role.IsDeleted));
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy
            .Trim()
            .ToLowerInvariant() switch
        {
            "lastname" => descending
                ? query.OrderByDescending(
                    user => user.LastName)
                : query.OrderBy(
                    user => user.LastName),

            "phone" or "phonenumber" => descending
                ? query.OrderByDescending(
                    user => user.PhoneNumber)
                : query.OrderBy(
                    user => user.PhoneNumber),

            "email" => descending
                ? query.OrderByDescending(
                    user => user.Email)
                : query.OrderBy(
                    user => user.Email),

            "createdat" => descending
                ? query.OrderByDescending(
                    user => user.CreatedAt)
                : query.OrderBy(
                    user => user.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(
                    user => user.IsActive)
                : query.OrderBy(
                    user => user.IsActive),

            _ => descending
                ? query.OrderByDescending(
                    user => user.FirstName)
                : query.OrderBy(
                    user => user.FirstName)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var users = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
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
                    .OrderBy(userRole =>
                        userRole.Role.Name)
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
                    .OrderBy(companyUser =>
                        companyUser.Company.Name)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name
                    })
            })
            .ToListAsync(cancellationToken);

        return Ok(
            PagedResponse.Create(
                users,
                page,
                pageSize,
                totalCount));
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
                    .OrderBy(userRole =>
                        userRole.Role.Name)
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
                    .OrderBy(companyUser =>
                        companyUser.Company.Name)
                    .Select(companyUser => new
                    {
                        companyUser.Company.Id,
                        companyUser.Company.Name,
                        companyUser.Company.IsActive
                    })
            })
            .FirstOrDefaultAsync(
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                user));
    }

    // POST: api/v1/users
    [HttpPost]
    [HasPermission("USERS.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                request.FirstName) ||
            string.IsNullOrWhiteSpace(
                request.LastName) ||
            string.IsNullOrWhiteSpace(
                request.PhoneNumber))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ad, soyad ve telefon numarası zorunludur."
            });
        }

        var normalizedPhoneNumber =
            request.PhoneNumber.Trim();

        var phoneExists =
            await _dbContext.Users.AnyAsync(
                user =>
                    user.PhoneNumber ==
                    normalizedPhoneNumber &&
                    !user.IsDeleted,
                cancellationToken);

        if (phoneExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu telefon numarası zaten kullanılıyor."
            });
        }

        Company? company = null;

        if (request.CompanyId.HasValue)
        {
            company = await _dbContext.Companies
                .FirstOrDefaultAsync(
                    company =>
                        company.Id ==
                        request.CompanyId.Value &&
                        !company.IsDeleted &&
                        company.IsActive,
                    cancellationToken);

            if (company is null)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Seçilen firma bulunamadı veya aktif değil."
                });
            }
        }

        Role? role = null;

        if (request.RoleId.HasValue)
        {
            role = await _dbContext.Roles
                .FirstOrDefaultAsync(
                    role =>
                        role.Id ==
                        request.RoleId.Value &&
                        !role.IsDeleted &&
                        role.IsActive,
                    cancellationToken);

            if (role is null)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Seçilen rol bulunamadı veya aktif değil."
                });
            }
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        try
        {
            var user = new User
            {
                FirstName =
                    request.FirstName.Trim(),

                LastName =
                    request.LastName.Trim(),

                PhoneNumber =
                    normalizedPhoneNumber,

                Email =
                    NormalizeOptionalText(
                        request.Email),

                PhoneNumberConfirmed = false,
                IsActive = true
            };

            _dbContext.Users.Add(user);

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            if (company is not null)
            {
                _dbContext.CompanyUsers.Add(
                    new CompanyUser
                    {
                        UserId = user.Id,
                        CompanyId = company.Id,
                        IsActive = true
                    });
            }

            if (role is not null)
            {
                _dbContext.UserRoles.Add(
                    new UserRole
                    {
                        UserId = user.Id,
                        RoleId = role.Id
                    });
            }

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            var responseData = new
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
            };

            return CreatedAtAction(
                nameof(GetById),
                new
                {
                    id = user.Id
                },
                ApiResponse<object>.Created(
                    responseData,
                    "Kullanıcı başarıyla oluşturuldu."));
        }
        catch
        {
            await transaction.RollbackAsync(
                cancellationToken);

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
        if (string.IsNullOrWhiteSpace(
                request.FirstName) ||
            string.IsNullOrWhiteSpace(
                request.LastName) ||
            string.IsNullOrWhiteSpace(
                request.PhoneNumber))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ad, soyad ve telefon numarası zorunludur."
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

        if (!request.IsActive &&
            user.IsActive)
        {
            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN kullanıcısı pasif yapılamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
        }

        var normalizedPhoneNumber =
            request.PhoneNumber.Trim();

        var phoneNumberExists =
            await _dbContext.Users.AnyAsync(
                otherUser =>
                    otherUser.Id != id &&
                    otherUser.PhoneNumber ==
                    normalizedPhoneNumber &&
                    !otherUser.IsDeleted,
                cancellationToken);

        if (phoneNumberExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor."
            });
        }

        var oldPhoneNumber =
            user.PhoneNumber;

        var phoneNumberChanged =
            oldPhoneNumber !=
            normalizedPhoneNumber;

        user.FirstName =
            request.FirstName.Trim();

        user.LastName =
            request.LastName.Trim();

        user.PhoneNumber =
            normalizedPhoneNumber;

        user.Email =
            NormalizeOptionalText(
                request.Email);

        user.IsActive =
            request.IsActive;

        user.UpdatedAt =
            DateTime.UtcNow;

        if (phoneNumberChanged)
        {
            user.PhoneNumberConfirmed = false;

            await InvalidateOtpCodesAsync(
                oldPhoneNumber,
                user.UpdatedAt.Value,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.PhoneNumber,
            user.Email,
            user.PhoneNumberConfirmed,
            user.IsActive,
            user.UpdatedAt
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Kullanıcı başarıyla güncellendi."));
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
                message = "Kullanıcı bulunamadı."
            });
        }

        if (!request.IsActive &&
            user.IsActive)
        {
            var currentUserId =
                GetCurrentUserId();

            if (currentUserId == id)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Kendi kullanıcı hesabınızı pasif yapamazsınız."
                });
            }

            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN kullanıcısı pasif yapılamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
        }

        user.IsActive =
            request.IsActive;

        user.UpdatedAt =
            DateTime.UtcNow;

        if (!request.IsActive)
        {
            await InvalidateOtpCodesAsync(
                user.PhoneNumber,
                user.UpdatedAt.Value,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            user.Id,
            user.IsActive,
            user.UpdatedAt
        };

        var message = request.IsActive
            ? "Kullanıcı aktif hâle getirildi."
            : "Kullanıcı pasif hâle getirildi.";

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                message));
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
                message =
                    "Kullanıcı bulunamadı veya aktif değil."
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
                message =
                    "Rol bulunamadı veya aktif değil."
            });
        }

        var existingUserRole =
            await _dbContext.UserRoles
                .FirstOrDefaultAsync(
                    userRole =>
                        userRole.UserId == id &&
                        userRole.RoleId ==
                        request.RoleId,
                    cancellationToken);

        if (existingUserRole is not null)
        {
            if (!existingUserRole.IsDeleted)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Bu rol kullanıcıya zaten atanmış."
                });
            }

            existingUserRole.IsDeleted = false;
            existingUserRole.UpdatedAt =
                DateTime.UtcNow;
        }
        else
        {
            _dbContext.UserRoles.Add(
                new UserRole
                {
                    UserId = id,
                    RoleId = request.RoleId
                });
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            role.Id,
            role.Name,
            role.Code
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Rol kullanıcıya başarıyla atandı."));
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
                message = "Kullanıcı bulunamadı."
            });
        }

        var userRole = await _dbContext.UserRoles
            .Include(userRole =>
                userRole.Role)
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
                message =
                    "Kullanıcıya atanmış böyle bir rol bulunamadı."
            });
        }

        if (userRole.Role.Code ==
            SuperAdminRoleCode)
        {
            var currentUserId =
                GetCurrentUserId();

            if (currentUserId == id)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Kendi SUPER_ADMIN rolünüzü kaldıramazsınız."
                });
            }

            var protectionResult =
                await CheckSuperAdminProtectionAsync(
                    id,
                    "Son aktif SUPER_ADMIN rolü kaldırılamaz.",
                    cancellationToken);

            if (protectionResult is not null)
            {
                return protectionResult;
            }
        }

        userRole.IsDeleted = true;
        userRole.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            userRole.Role.Id,
            userRole.Role.Name,
            userRole.Role.Code
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Rol kullanıcıdan başarıyla kaldırıldı."));
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
                message =
                    "Kullanıcı bulunamadı veya aktif değil."
            });
        }

        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(
                company =>
                    company.Id ==
                    request.CompanyId &&
                    !company.IsDeleted &&
                    company.IsActive,
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message =
                    "Firma bulunamadı veya aktif değil."
            });
        }

        var existingCompanyUser =
            await _dbContext.CompanyUsers
                .FirstOrDefaultAsync(
                    companyUser =>
                        companyUser.UserId == id &&
                        companyUser.CompanyId ==
                        request.CompanyId,
                    cancellationToken);

        if (existingCompanyUser is not null)
        {
            if (!existingCompanyUser.IsDeleted &&
                existingCompanyUser.IsActive)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Bu firma kullanıcıya zaten atanmış."
                });
            }

            existingCompanyUser.IsDeleted = false;
            existingCompanyUser.IsActive = true;
            existingCompanyUser.UpdatedAt =
                DateTime.UtcNow;
        }
        else
        {
            _dbContext.CompanyUsers.Add(
                new CompanyUser
                {
                    UserId = id,
                    CompanyId =
                        request.CompanyId,
                    IsActive = true
                });
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            company.Id,
            company.Name
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Firma kullanıcıya başarıyla atandı."));
    }

    // DELETE: api/v1/users/{id}/companies/{companyId}
    [HttpDelete(
        "{id:guid}/companies/{companyId:guid}")]
    [HasPermission("USERS.UPDATE")]
    public async Task<IActionResult> RemoveCompany(
        Guid id,
        Guid companyId,
        CancellationToken cancellationToken)
    {
        var userExists =
            await _dbContext.Users.AnyAsync(
                user =>
                    user.Id == id &&
                    !user.IsDeleted,
                cancellationToken);

        if (!userExists)
        {
            return NotFound(new
            {
                success = false,
                message = "Kullanıcı bulunamadı."
            });
        }

        var companyUser =
            await _dbContext.CompanyUsers
                .Include(companyUser =>
                    companyUser.Company)
                .FirstOrDefaultAsync(
                    companyUser =>
                        companyUser.UserId == id &&
                        companyUser.CompanyId ==
                        companyId &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive,
                    cancellationToken);

        if (companyUser is null)
        {
            return NotFound(new
            {
                success = false,
                message =
                    "Kullanıcıya atanmış böyle bir firma bulunamadı."
            });
        }

        companyUser.IsDeleted = true;
        companyUser.IsActive = false;
        companyUser.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            companyUser.Company.Id,
            companyUser.Company.Name
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Firma kullanıcıdan başarıyla kaldırıldı."));
    }

    // DELETE: api/v1/users/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("USERS.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var currentUserId =
            GetCurrentUserId();

        if (currentUserId == id)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Kendi kullanıcı hesabınızı silemezsiniz."
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

        var protectionResult =
            await CheckSuperAdminProtectionAsync(
                id,
                "Son aktif SUPER_ADMIN kullanıcısı silinemez.",
                cancellationToken);

        if (protectionResult is not null)
        {
            return protectionResult;
        }

        await using var transaction =
            await _dbContext.Database
                .BeginTransactionAsync(
                    cancellationToken);

        try
        {
            var now =
                DateTime.UtcNow;

            user.IsDeleted = true;
            user.IsActive = false;
            user.UpdatedAt = now;

            var userRoles =
                await _dbContext.UserRoles
                    .Where(userRole =>
                        userRole.UserId == id &&
                        !userRole.IsDeleted)
                    .ToListAsync(
                        cancellationToken);

            foreach (var userRole in userRoles)
            {
                userRole.IsDeleted = true;
                userRole.UpdatedAt = now;
            }

            var companyUsers =
                await _dbContext.CompanyUsers
                    .Where(companyUser =>
                        companyUser.UserId == id &&
                        !companyUser.IsDeleted)
                    .ToListAsync(
                        cancellationToken);

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

            await _dbContext.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            return Ok(
                MessageResponse.Ok(
                    "Kullanıcı başarıyla silindi."));
        }
        catch
        {
            await transaction.RollbackAsync(
                cancellationToken);

            throw;
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out var userId)
            ? userId
            : null;
    }

    private async Task<IActionResult?>
        CheckSuperAdminProtectionAsync(
            Guid userId,
            string errorMessage,
            CancellationToken cancellationToken)
    {
        var isSuperAdmin =
            await _dbContext.UserRoles.AnyAsync(
                userRole =>
                    userRole.UserId == userId &&
                    !userRole.IsDeleted &&
                    !userRole.Role.IsDeleted &&
                    userRole.Role.IsActive &&
                    userRole.Role.Code ==
                    SuperAdminRoleCode,
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
                    userRole.Role.Code ==
                    SuperAdminRoleCode &&
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
        var activeOtpCodes =
            await _dbContext.OtpCodes
                .Where(otpCode =>
                    otpCode.PhoneNumber ==
                    phoneNumber &&
                    !otpCode.IsUsed &&
                    !otpCode.IsDeleted)
                .ToListAsync(
                    cancellationToken);

        foreach (var otpCode in activeOtpCodes)
        {
            otpCode.IsUsed = true;
            otpCode.UpdatedAt = now;
        }
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}