namespace Saharut.Api.Contracts.Permissions;

public sealed record SetPermissionStatusRequest(
    bool IsActive
);