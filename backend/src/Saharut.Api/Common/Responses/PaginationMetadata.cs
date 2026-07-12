namespace Saharut.Api.Common.Responses;

public sealed record PaginationMetadata
{
    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalCount { get; init; }

    public int TotalPages { get; init; }

    public bool HasPreviousPage =>
        Page > 1;

    public bool HasNextPage =>
        Page < TotalPages;

    public static PaginationMetadata Create(
        int page,
        int pageSize,
        int totalCount)
    {
        var normalizedPage =
            page < 1 ? 1 : page;

        var normalizedPageSize =
            pageSize < 1 ? 20 : pageSize;

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(
                totalCount /
                (double)normalizedPageSize);

        return new PaginationMetadata
        {
            Page = normalizedPage,
            PageSize = normalizedPageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}