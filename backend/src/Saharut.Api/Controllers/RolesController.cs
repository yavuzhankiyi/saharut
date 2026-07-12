using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Contracts.Roles;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/roles")]
[Authorize]
public sealed class RolesController : ControllerBase
{
    private static readonly HashSet<string> ProtectedRoleCodes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "SUPER_ADMIN",
            "OPERATIONS_MANAGER",
            "MANUFACTURER_MANAGER",
            "DISTRIBUTOR_MANAGER",
            "FIELD_SALES",
            "FINANCE_MANAGER"
        };

    private readonly SaharutDbContext _dbContext;

    public RolesController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/roles
    [HttpGet]
    [HasPermission("ROLES.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] RoleQueryRequest request,
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

        var query = _dbContext.Roles
            .AsNoTracking()
            .Where(role => !role.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(role =>
                EF.Functions.ILike(role.Name, $"%{search}%") ||
                EF.Functions.ILike(role.Code, $"%{search}%") ||
                (role.Description != null &&
                 EF.Functions.ILike(role.Description, $"%{search}%")));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(
                role => role.IsActive == request.IsActive.Value);
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy.Trim().ToLowerInvariant() switch
        {
            "code" => descending
                ? query.OrderByDescending(role => role.Code)
                : query.OrderBy(role => role.Code),

            "createdat" => descending
                ? query.OrderByDescending(role => role.CreatedAt)
                : query.OrderBy(role => role.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(role => role.IsActive)
                : query.OrderBy(role => role.IsActive),

            _ => descending
                ? query.OrderByDescending(role => role.Name)
                : query.OrderBy(role => role.Name)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var roles = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(role => new
            {
                role.Id,
                role.Name,
                role.Code,
                role.Description,
                role.IsActive,
                role.CreatedAt,
                role.UpdatedAt,
                userCount = role.UserRoles.Count(userRole =>
                    !userRole.IsDeleted &&
                    !userRole.User.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new
        {
            success = true,
            data = roles,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages
            }
        });
    }

    // GET: api/v1/roles/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("ROLES.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .AsNoTracking()
            .Where(role =>
                role.Id == id &&
                !role.IsDeleted)
            .Select(role => new
            {
                role.Id,
                role.Name,
                role.Code,
                role.Description,
                role.IsActive,
                role.CreatedAt,
                role.UpdatedAt,
                userCount = role.UserRoles.Count(userRole =>
                    !userRole.IsDeleted &&
                    !userRole.User.IsDeleted),

                users = role.UserRoles
                    .Where(userRole =>
                        !userRole.IsDeleted &&
                        !userRole.User.IsDeleted)
                    .OrderBy(userRole => userRole.User.FirstName)
                    .ThenBy(userRole => userRole.User.LastName)
                    .Select(userRole => new
                    {
                        userRole.User.Id,
                        userRole.User.FirstName,
                        userRole.User.LastName,
                        userRole.User.PhoneNumber,
                        userRole.User.IsActive
                    })
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadÄ±."
            });
        }

        return Ok(new
        {
            success = true,
            data = role
        });
    }

    // POST: api/v1/roles
    [HttpPost]
    [HasPermission("ROLES.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new
            {
                success = false,
                message = "Rol adÄ± ve rol kodu zorunludur."
            });
        }

        var normalizedCode = NormalizeCode(request.Code);

        var codeExists = await _dbContext.Roles.AnyAsync(
            role =>
                role.Code == normalizedCode &&
                !role.IsDeleted,
            cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu rol kodu zaten kullanÄ±lÄ±yor."
            });
        }

        var role = new Role
        {
            Name = request.Name.Trim(),
            Code = normalizedCode,
            Description = NormalizeOptionalText(request.Description),
            IsActive = true
        };

        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = role.Id },
            new
            {
                success = true,
                message = "Rol baÅŸarÄ±yla oluÅŸturuldu.",
                data = new
                {
                    role.Id,
                    role.Name,
                    role.Code,
                    role.Description,
                    role.IsActive
                }
            });
    }

    // PUT: api/v1/roles/{id}
    [HttpPut("{id:guid}")]
    [HasPermission("ROLES.UPDATE")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new
            {
                success = false,
                message = "Rol adÄ± ve rol kodu zorunludur."
            });
        }

        var role = await _dbContext.Roles
            .FirstOrDefaultAsync(
                role =>
                    role.Id == id &&
                    !role.IsDeleted,
                cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadÄ±."
            });
        }

        var normalizedCode = NormalizeCode(request.Code);

        if (ProtectedRoleCodes.Contains(role.Code) &&
            !string.Equals(
                role.Code,
                normalizedCode,
                StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new
            {
                success = false,
                message = "Sistem rollerinin kodu deÄŸiÅŸtirilemez."
            });
        }

        var codeExists = await _dbContext.Roles.AnyAsync(
            otherRole =>
                otherRole.Id != id &&
                otherRole.Code == normalizedCode &&
                !otherRole.IsDeleted,
            cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu rol kodu baÅŸka bir rol tarafÄ±ndan kullanÄ±lÄ±yor."
            });
        }

        if (!request.IsActive &&
            role.IsActive &&
            ProtectedRoleCodes.Contains(role.Code))
        {
            return Conflict(new
            {
                success = false,
                message = "Sistem rolleri pasif yapÄ±lamaz."
            });
        }

        role.Name = request.Name.Trim();
        role.Code = normalizedCode;
        role.Description = NormalizeOptionalText(request.Description);
        role.IsActive = request.IsActive;
        role.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Rol baÅŸarÄ±yla gÃ¼ncellendi.",
            data = new
            {
                role.Id,
                role.Name,
                role.Code,
                role.Description,
                role.IsActive,
                role.UpdatedAt
            }
        });
    }

    // PATCH: api/v1/roles/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission("ROLES.UPDATE")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetRoleStatusRequest request,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .FirstOrDefaultAsync(
                role =>
                    role.Id == id &&
                    !role.IsDeleted,
                cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadÄ±."
            });
        }

        if (!request.IsActive &&
            ProtectedRoleCodes.Contains(role.Code))
        {
            return Conflict(new
            {
                success = false,
                message = "Sistem rolleri pasif yapÄ±lamaz."
            });
        }

        if (!request.IsActive)
        {
            var hasActiveUsers = await _dbContext.UserRoles.AnyAsync(
                userRole =>
                    userRole.RoleId == id &&
                    !userRole.IsDeleted &&
                    !userRole.User.IsDeleted &&
                    userRole.User.IsActive,
                cancellationToken);

            if (hasActiveUsers)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Aktif kullanÄ±cÄ±lara atanmÄ±ÅŸ rol pasif yapÄ±lamaz."
                });
            }
        }

        role.IsActive = request.IsActive;
        role.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = request.IsActive
                ? "Rol aktif hÃ¢le getirildi."
                : "Rol pasif hÃ¢le getirildi.",
            data = new
            {
                role.Id,
                role.IsActive,
                role.UpdatedAt
            }
        });
    }

    // DELETE: api/v1/roles/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("ROLES.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .FirstOrDefaultAsync(
                role =>
                    role.Id == id &&
                    !role.IsDeleted,
                cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadÄ±."
            });
        }

        if (ProtectedRoleCodes.Contains(role.Code))
        {
            return Conflict(new
            {
                success = false,
                message = "Sistem rolleri silinemez."
            });
        }

        var hasAssignedUsers = await _dbContext.UserRoles.AnyAsync(
            userRole =>
                userRole.RoleId == id &&
                !userRole.IsDeleted &&
                !userRole.User.IsDeleted,
            cancellationToken);

        if (hasAssignedUsers)
        {
            return Conflict(new
            {
                success = false,
                message = "KullanÄ±cÄ±lara atanmÄ±ÅŸ rol silinemez."
            });
        }

        role.IsDeleted = true;
        role.IsActive = false;
        role.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Rol baÅŸarÄ±yla silindi."
        });
    }

    private static string NormalizeCode(string code)
    {
        return code
            .Trim()
            .Replace(' ', '_')
            .ToUpperInvariant();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
