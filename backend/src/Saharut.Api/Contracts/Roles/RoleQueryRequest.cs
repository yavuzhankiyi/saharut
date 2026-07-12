namespace Saharut.Api.Contracts.Roles;

public sealed class RoleQueryRequest
{
    public string? Search { get; init; }

    public bool? IsActive { get; init; }

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public string SortBy { get; init; } = "name";

    public string SortDirection { get; init; } = "asc";
}