using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;

namespace Saharut.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    private sealed record PermissionSeed(
        string Name,
        string Code,
        string Module,
        string Description);

    private static readonly PermissionSeed[] PermissionSeeds =
    [
        new(
            "Firma Görüntüleme",
            "COMPANIES.READ",
            "COMPANIES",
            "Firma kayıtlarını ve firma detaylarını görüntüleme yetkisi."),

        new(
            "Firma Oluşturma",
            "COMPANIES.CREATE",
            "COMPANIES",
            "Yeni firma oluşturma yetkisi."),

        new(
            "Firma Güncelleme",
            "COMPANIES.UPDATE",
            "COMPANIES",
            "Firma bilgilerini ve firma durumunu güncelleme yetkisi."),

        new(
            "Firma Silme",
            "COMPANIES.DELETE",
            "COMPANIES",
            "Firma kayıtlarını soft delete ile silme yetkisi."),

        new(
            "Kullanıcı Görüntüleme",
            "USERS.READ",
            "USERS",
            "Kullanıcı kayıtlarını ve kullanıcı detaylarını görüntüleme yetkisi."),

        new(
            "Kullanıcı Oluşturma",
            "USERS.CREATE",
            "USERS",
            "Yeni kullanıcı oluşturma yetkisi."),

        new(
            "Kullanıcı Güncelleme",
            "USERS.UPDATE",
            "USERS",
            "Kullanıcı bilgilerini, durumunu, rolünü ve firmasını güncelleme yetkisi."),

        new(
            "Kullanıcı Silme",
            "USERS.DELETE",
            "USERS",
            "Kullanıcı kayıtlarını soft delete ile silme yetkisi."),

        new(
            "Rol Görüntüleme",
            "ROLES.READ",
            "ROLES",
            "Rol kayıtlarını ve rol detaylarını görüntüleme yetkisi."),

        new(
            "Rol Oluşturma",
            "ROLES.CREATE",
            "ROLES",
            "Yeni rol oluşturma yetkisi."),

        new(
            "Rol Güncelleme",
            "ROLES.UPDATE",
            "ROLES",
            "Rol bilgilerini ve rol durumunu güncelleme yetkisi."),

        new(
            "Rol Silme",
            "ROLES.DELETE",
            "ROLES",
            "Silinmesine izin verilen rol kayıtlarını silme yetkisi."),

        new(
            "Yetki Görüntüleme",
            "PERMISSIONS.READ",
            "PERMISSIONS",
            "Permission kayıtlarını ve rol-permission bağlantılarını görüntüleme yetkisi."),

        new(
            "Yetki Oluşturma",
            "PERMISSIONS.CREATE",
            "PERMISSIONS",
            "Yeni permission kaydı oluşturma yetkisi."),

        new(
            "Yetki Güncelleme",
            "PERMISSIONS.UPDATE",
            "PERMISSIONS",
            "Permission bilgilerini ve durumunu güncelleme yetkisi."),

        new(
            "Yetki Silme",
            "PERMISSIONS.DELETE",
            "PERMISSIONS",
            "Permission kayıtlarını soft delete ile silme yetkisi."),

        new(
            "Role Yetki Atama",
            "PERMISSIONS.ASSIGN",
            "PERMISSIONS",
            "Rollere permission atama ve rol üzerinden permission kaldırma yetkisi."),

            new(
    "Audit Log Görüntüleme",
    "AUDIT_LOGS.READ",
    "AUDIT_LOGS",
    "Sistem işlem geçmişini ve kayıt değişikliklerini görüntüleme yetkisi.")
    ];

    private static readonly IReadOnlyDictionary<string, string[]>
        RolePermissionMap =
            new Dictionary<string, string[]>(
                StringComparer.OrdinalIgnoreCase)
            {
                ["SUPER_ADMIN"] =
                    PermissionSeeds
                        .Select(permission => permission.Code)
                        .ToArray(),

                ["OPERATIONS_MANAGER"] =
                [
                    "COMPANIES.READ",
                    "COMPANIES.CREATE",
                    "COMPANIES.UPDATE",

                    "USERS.READ",
                    "USERS.CREATE",
                    "USERS.UPDATE",

                    "ROLES.READ"
                ],

                ["MANUFACTURER_MANAGER"] =
                [
                    "COMPANIES.READ",
                    "USERS.READ"
                ],

                ["DISTRIBUTOR_MANAGER"] =
                [
                    "COMPANIES.READ",
                    "USERS.READ"
                ],

                ["FIELD_SALES"] =
                [
                    "COMPANIES.READ"
                ],

                ["FINANCE_MANAGER"] =
                [
                    "COMPANIES.READ"
                ]
            };

    public static async Task SeedAsync(
        SaharutDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        await SeedPermissionsAsync(
            dbContext,
            cancellationToken);

        await SeedRolePermissionsAsync(
            dbContext,
            cancellationToken);
    }

    private static async Task SeedPermissionsAsync(
        SaharutDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var permissionCodes = PermissionSeeds
            .Select(permission => permission.Code)
            .ToArray();

        var existingPermissions =
            await dbContext.Permissions
                .Where(permission =>
                    permissionCodes.Contains(permission.Code))
                .ToDictionaryAsync(
                    permission => permission.Code,
                    StringComparer.OrdinalIgnoreCase,
                    cancellationToken);

        foreach (var seed in PermissionSeeds)
        {
            if (existingPermissions.TryGetValue(
                    seed.Code,
                    out var existingPermission))
            {
                existingPermission.Name = seed.Name;
                existingPermission.Module = seed.Module;
                existingPermission.Description = seed.Description;
                existingPermission.IsActive = true;
                existingPermission.IsDeleted = false;
                existingPermission.UpdatedAt = DateTime.UtcNow;

                continue;
            }

            var permission = new Permission
            {
                Name = seed.Name,
                Code = seed.Code,
                Module = seed.Module,
                Description = seed.Description,
                IsActive = true
            };

            dbContext.Permissions.Add(permission);
            existingPermissions[seed.Code] = permission;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedRolePermissionsAsync(
        SaharutDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var roleCodes = RolePermissionMap.Keys.ToArray();
        var permissionCodes = PermissionSeeds
            .Select(permission => permission.Code)
            .ToArray();

        var roles = await dbContext.Roles
            .Where(role =>
                roleCodes.Contains(role.Code) &&
                !role.IsDeleted)
            .ToDictionaryAsync(
                role => role.Code,
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

        var permissions = await dbContext.Permissions
            .Where(permission =>
                permissionCodes.Contains(permission.Code) &&
                !permission.IsDeleted)
            .ToDictionaryAsync(
                permission => permission.Code,
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

        var roleIds = roles.Values
            .Select(role => role.Id)
            .ToArray();

        var permissionIds = permissions.Values
            .Select(permission => permission.Id)
            .ToArray();

        var existingRolePermissions =
            await dbContext.RolePermissions
                .Where(rolePermission =>
                    roleIds.Contains(rolePermission.RoleId) &&
                    permissionIds.Contains(rolePermission.PermissionId))
                .ToListAsync(cancellationToken);

        foreach (var roleMap in RolePermissionMap)
        {
            if (!roles.TryGetValue(
                    roleMap.Key,
                    out var role))
            {
                continue;
            }

            foreach (var permissionCode in roleMap.Value)
            {
                if (!permissions.TryGetValue(
                        permissionCode,
                        out var permission))
                {
                    continue;
                }

                var existingRolePermission =
                    existingRolePermissions.FirstOrDefault(
                        rolePermission =>
                            rolePermission.RoleId == role.Id &&
                            rolePermission.PermissionId ==
                            permission.Id);

                if (existingRolePermission is not null)
                {
                    existingRolePermission.IsDeleted = false;
                    existingRolePermission.UpdatedAt =
                        DateTime.UtcNow;

                    continue;
                }

                var rolePermission = new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = permission.Id,
                    Role = role,
                    Permission = permission
                };

                dbContext.RolePermissions.Add(rolePermission);
                existingRolePermissions.Add(rolePermission);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}