using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Authorization;

public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    private readonly SaharutDbContext _dbContext;

    public PermissionAuthorizationHandler(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var roleCodes = context.User
            .FindAll(ClaimTypes.Role)
            .Select(claim => claim.Value.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (roleCodes.Count == 0)
        {
            return;
        }

        // Süper yönetici tüm izinlere sahiptir.
        if (roleCodes.Contains(
                "SUPER_ADMIN",
                StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return;
        }

        var normalizedPermissionCode =
            requirement.PermissionCode.Trim().ToUpperInvariant();

        var hasPermission =
            await _dbContext.RolePermissions
                .AsNoTracking()
                .AnyAsync(rolePermission =>
                    !rolePermission.IsDeleted &&
                    !rolePermission.Role.IsDeleted &&
                    rolePermission.Role.IsActive &&
                    roleCodes.Contains(rolePermission.Role.Code) &&
                    !rolePermission.Permission.IsDeleted &&
                    rolePermission.Permission.IsActive &&
                    rolePermission.Permission.Code ==
                    normalizedPermissionCode);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}