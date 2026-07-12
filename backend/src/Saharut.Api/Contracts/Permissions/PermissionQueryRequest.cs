namespace Saharut.Api.Contracts.Permissions;

public sealed class PermissionQueryRequest
{
    public string? Search { get; init; }

    public string? Module { get; init; }

    public bool? IsActive { get; init; }

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public string SortBy { get; init; } = "name";

    public string SortDirection { get; init; } = "asc";
}