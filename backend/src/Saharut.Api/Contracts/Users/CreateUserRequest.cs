namespace Saharut.Api.Contracts.Users;

public sealed record CreateUserRequest(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    Guid? CompanyId,
    Guid? RoleId
);