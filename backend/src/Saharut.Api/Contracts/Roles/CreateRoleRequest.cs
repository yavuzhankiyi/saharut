namespace Saharut.Api.Contracts.Roles;

public sealed record CreateRoleRequest(
    string Name,
    string Code,
    string? Description
);