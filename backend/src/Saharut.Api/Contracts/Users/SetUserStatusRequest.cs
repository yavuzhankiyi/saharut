namespace Saharut.Api.Contracts.Users;

public sealed record SetUserStatusRequest(
    bool IsActive
);