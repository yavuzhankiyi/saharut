namespace Saharut.Api.Contracts.Users;

public sealed class UserQueryRequest
{
    public string? Search { get; init; }

    public bool? IsActive { get; init; }

    public Guid? CompanyId { get; init; }

    public Guid? RoleId { get; init; }

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public string SortBy { get; init; } = "firstName";

    public string SortDirection { get; init; } = "asc";
}