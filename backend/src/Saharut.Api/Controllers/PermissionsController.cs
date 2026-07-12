using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Contracts.Permissions;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/permissions")]
[Authorize(Roles = "SUPER_ADMIN")]
public sealed class PermissionsController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public PermissionsController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/permissions
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] PermissionQueryRequest request,
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

        var query = _dbContext.Permissions
            .AsNoTracking()
            .Where(permission => !permission.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(permission =>
                EF.Functions.ILike(permission.Name, $"%{search}%") ||
                EF.Functions.ILike(permission.Code, $"%{search}%") ||
                EF.Functions.ILike(permission.Module, $"%{search}%") ||
                (permission.Description != null &&
                 EF.Functions.ILike(permission.Description, $"%{search}%")));
        }

        if (!string.IsNullOrWhiteSpace(request.Module))
        {
            var module = NormalizeModule(request.Module);

            query = query.Where(
                permission => permission.Module == module);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(
                permission =>
                    permission.IsActive == request.IsActive.Value);
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy.Trim().ToLowerInvariant() switch
        {
            "code" => descending
                ? query.OrderByDescending(permission => permission.Code)
                : query.OrderBy(permission => permission.Code),

            "module" => descending
                ? query.OrderByDescending(permission => permission.Module)
                : query.OrderBy(permission => permission.Module),

            "createdat" => descending
                ? query.OrderByDescending(permission => permission.CreatedAt)
                : query.OrderBy(permission => permission.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(permission => permission.IsActive)
                : query.OrderBy(permission => permission.IsActive),

            _ => descending
                ? query.OrderByDescending(permission => permission.Name)
                : query.OrderBy(permission => permission.Name)
        };

        var totalCount =
            await query.CountAsync(cancellationToken);

        var permissions = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(permission => new
            {
                permission.Id,
                permission.Name,
                permission.Code,
                permission.Module,
                permission.Description,
                permission.IsActive,
                permission.CreatedAt,
                permission.UpdatedAt,

                roleCount = permission.RolePermissions.Count(
                    rolePermission =>
                        !rolePermission.IsDeleted &&
                        !rolePermission.Role.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(
                totalCount / (double)pageSize);

        return Ok(new
        {
            success = true,
            data = permissions,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages
            }
        });
    }

    // GET: api/v1/permissions/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var permission = await _dbContext.Permissions
            .AsNoTracking()
            .Where(permission =>
                permission.Id == id &&
                !permission.IsDeleted)
            .Select(permission => new
            {
                permission.Id,
                permission.Name,
                permission.Code,
                permission.Module,
                permission.Description,
                permission.IsActive,
                permission.CreatedAt,
                permission.UpdatedAt,

                roles = permission.RolePermissions
                    .Where(rolePermission =>
                        !rolePermission.IsDeleted &&
                        !rolePermission.Role.IsDeleted)
                    .OrderBy(rolePermission =>
                        rolePermission.Role.Name)
                    .Select(rolePermission => new
                    {
                        rolePermission.Role.Id,
                        rolePermission.Role.Name,
                        rolePermission.Role.Code,
                        rolePermission.Role.IsActive
                    })
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (permission is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Yetki bulunamadı."
            });
        }

        return Ok(new
        {
            success = true,
            data = permission
        });
    }

    // POST: api/v1/permissions
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreatePermissionRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Module))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Yetki adı, kodu ve modülü zorunludur."
            });
        }

        var normalizedCode =
            NormalizeCode(request.Code);

        var codeExists =
            await _dbContext.Permissions.AnyAsync(
                permission =>
                    permission.Code == normalizedCode &&
                    !permission.IsDeleted,
                cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu yetki kodu zaten kullanılıyor."
            });
        }

        var permission = new Permission
        {
            Name = request.Name.Trim(),
            Code = normalizedCode,
            Module = NormalizeModule(request.Module),
            Description =
                NormalizeOptionalText(request.Description),
            IsActive = true
        };

        _dbContext.Permissions.Add(permission);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = permission.Id },
            new
            {
                success = true,
                message = "Yetki başarıyla oluşturuldu.",
                data = new
                {
                    permission.Id,
                    permission.Name,
                    permission.Code,
                    permission.Module,
                    permission.Description,
                    permission.IsActive
                }
            });
    }

    // PUT: api/v1/permissions/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdatePermissionRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Module))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Yetki adı, kodu ve modülü zorunludur."
            });
        }

        var permission =
            await _dbContext.Permissions
                .FirstOrDefaultAsync(
                    permission =>
                        permission.Id == id &&
                        !permission.IsDeleted,
                    cancellationToken);

        if (permission is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Yetki bulunamadı."
            });
        }

        var normalizedCode =
            NormalizeCode(request.Code);

        var codeExists =
            await _dbContext.Permissions.AnyAsync(
                otherPermission =>
                    otherPermission.Id != id &&
                    otherPermission.Code == normalizedCode &&
                    !otherPermission.IsDeleted,
                cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu yetki kodu başka bir yetki tarafından kullanılıyor."
            });
        }

        if (!request.IsActive &&
            permission.IsActive)
        {
            var assignedToActiveRole =
                await _dbContext.RolePermissions.AnyAsync(
                    rolePermission =>
                        rolePermission.PermissionId == id &&
                        !rolePermission.IsDeleted &&
                        !rolePermission.Role.IsDeleted &&
                        rolePermission.Role.IsActive,
                    cancellationToken);

            if (assignedToActiveRole)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Aktif rollere atanmış yetki pasif yapılamaz."
                });
            }
        }

        permission.Name = request.Name.Trim();
        permission.Code = normalizedCode;
        permission.Module =
            NormalizeModule(request.Module);
        permission.Description =
            NormalizeOptionalText(request.Description);
        permission.IsActive = request.IsActive;
        permission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Yetki başarıyla güncellendi.",
            data = new
            {
                permission.Id,
                permission.Name,
                permission.Code,
                permission.Module,
                permission.Description,
                permission.IsActive,
                permission.UpdatedAt
            }
        });
    }

    // PATCH: api/v1/permissions/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetPermissionStatusRequest request,
        CancellationToken cancellationToken)
    {
        var permission =
            await _dbContext.Permissions
                .FirstOrDefaultAsync(
                    permission =>
                        permission.Id == id &&
                        !permission.IsDeleted,
                    cancellationToken);

        if (permission is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Yetki bulunamadı."
            });
        }

        if (!request.IsActive)
        {
            var assignedToActiveRole =
                await _dbContext.RolePermissions.AnyAsync(
                    rolePermission =>
                        rolePermission.PermissionId == id &&
                        !rolePermission.IsDeleted &&
                        !rolePermission.Role.IsDeleted &&
                        rolePermission.Role.IsActive,
                    cancellationToken);

            if (assignedToActiveRole)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Aktif rollere atanmış yetki pasif yapılamaz."
                });
            }
        }

        permission.IsActive = request.IsActive;
        permission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = request.IsActive
                ? "Yetki aktif hâle getirildi."
                : "Yetki pasif hâle getirildi.",
            data = new
            {
                permission.Id,
                permission.IsActive,
                permission.UpdatedAt
            }
        });
    }

    // DELETE: api/v1/permissions/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var permission =
            await _dbContext.Permissions
                .FirstOrDefaultAsync(
                    permission =>
                        permission.Id == id &&
                        !permission.IsDeleted,
                    cancellationToken);

        if (permission is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Yetki bulunamadı."
            });
        }

        var hasAssignedRoles =
            await _dbContext.RolePermissions.AnyAsync(
                rolePermission =>
                    rolePermission.PermissionId == id &&
                    !rolePermission.IsDeleted &&
                    !rolePermission.Role.IsDeleted,
                cancellationToken);

        if (hasAssignedRoles)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Rollere atanmış yetki silinemez."
            });
        }

        permission.IsDeleted = true;
        permission.IsActive = false;
        permission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Yetki başarıyla silindi."
        });
    }

    // GET: api/v1/roles/{roleId}/permissions
    [HttpGet("~/api/v1/roles/{roleId:guid}/permissions")]
    public async Task<IActionResult> GetRolePermissions(
        Guid roleId,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .AsNoTracking()
            .Where(role =>
                role.Id == roleId &&
                !role.IsDeleted)
            .Select(role => new
            {
                role.Id,
                role.Name,
                role.Code,
                role.IsActive,

                permissions = role.RolePermissions
                    .Where(rolePermission =>
                        !rolePermission.IsDeleted &&
                        !rolePermission.Permission.IsDeleted)
                    .OrderBy(rolePermission =>
                        rolePermission.Permission.Module)
                    .ThenBy(rolePermission =>
                        rolePermission.Permission.Name)
                    .Select(rolePermission => new
                    {
                        rolePermission.Permission.Id,
                        rolePermission.Permission.Name,
                        rolePermission.Permission.Code,
                        rolePermission.Permission.Module,
                        rolePermission.Permission.IsActive
                    })
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadı."
            });
        }

        return Ok(new
        {
            success = true,
            data = role
        });
    }

    // POST: api/v1/roles/{roleId}/permissions/{permissionId}
    [HttpPost(
        "~/api/v1/roles/{roleId:guid}/permissions/{permissionId:guid}")]
    public async Task<IActionResult> AssignToRole(
        Guid roleId,
        Guid permissionId,
        CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .FirstOrDefaultAsync(
                role =>
                    role.Id == roleId &&
                    !role.IsDeleted,
                cancellationToken);

        if (role is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Rol bulunamadı."
            });
        }

        if (!role.IsActive)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Pasif role yetki atanamaz."
            });
        }

        var permission =
            await _dbContext.Permissions
                .FirstOrDefaultAsync(
                    permission =>
                        permission.Id == permissionId &&
                        !permission.IsDeleted,
                    cancellationToken);

        if (permission is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Yetki bulunamadı."
            });
        }

        if (!permission.IsActive)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Pasif yetki role atanamaz."
            });
        }

        var rolePermission =
            await _dbContext.RolePermissions
                .FirstOrDefaultAsync(
                    rolePermission =>
                        rolePermission.RoleId == roleId &&
                        rolePermission.PermissionId == permissionId,
                    cancellationToken);

        if (rolePermission is not null &&
            !rolePermission.IsDeleted)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu yetki role zaten atanmış."
            });
        }

        if (rolePermission is null)
        {
            rolePermission = new RolePermission
            {
                RoleId = roleId,
                PermissionId = permissionId,
                Role = role,
                Permission = permission
            };

            _dbContext.RolePermissions.Add(
                rolePermission);
        }
        else
        {
            rolePermission.IsDeleted = false;
            rolePermission.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Yetki role başarıyla atandı.",
            data = new
{
    roleId = role.Id,
    roleName = role.Name,
    roleCode = role.Code,

    permissionId = permission.Id,
    permissionName = permission.Name,
    permissionCode = permission.Code,
    permissionModule = permission.Module
}
        });
    }

    // DELETE: api/v1/roles/{roleId}/permissions/{permissionId}
    [HttpDelete(
        "~/api/v1/roles/{roleId:guid}/permissions/{permissionId:guid}")]
    public async Task<IActionResult> RemoveFromRole(
        Guid roleId,
        Guid permissionId,
        CancellationToken cancellationToken)
    {
        var rolePermission =
            await _dbContext.RolePermissions
                .Include(rolePermission =>
                    rolePermission.Role)
                .Include(rolePermission =>
                    rolePermission.Permission)
                .FirstOrDefaultAsync(
                    rolePermission =>
                        rolePermission.RoleId == roleId &&
                        rolePermission.PermissionId == permissionId &&
                        !rolePermission.IsDeleted &&
                        !rolePermission.Role.IsDeleted &&
                        !rolePermission.Permission.IsDeleted,
                    cancellationToken);

        if (rolePermission is null)
        {
            return NotFound(new
            {
                success = false,
                message =
                    "Rol ve yetki bağlantısı bulunamadı."
            });
        }

        rolePermission.IsDeleted = true;
        rolePermission.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message =
                "Yetki rol üzerinden başarıyla kaldırıldı."
        });
    }

    private static string NormalizeCode(string value)
    {
        return value
            .Trim()
            .Replace(' ', '_')
            .ToUpperInvariant();
    }

    private static string NormalizeModule(string value)
    {
        return value
            .Trim()
            .Replace(' ', '_')
            .ToUpperInvariant();
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}