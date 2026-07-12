namespace Saharut.Api.Contracts.Permissions;

public sealed record CreatePermissionRequest(
    string Name,
    string Code,
    string Module,
    string? Description
);