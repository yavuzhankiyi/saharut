namespace Saharut.Api.Contracts.Permissions;

public sealed record UpdatePermissionRequest(
    string Name,
    string Code,
    string Module,
    string? Description,
    bool IsActive
);