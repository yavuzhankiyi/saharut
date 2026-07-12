namespace Saharut.Api.Contracts.Roles;

public sealed record UpdateRoleRequest(
    string Name,
    string Code,
    string? Description,
    bool IsActive
);