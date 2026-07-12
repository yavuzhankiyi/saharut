namespace Saharut.Api.Common.Responses;

public sealed record PagedResponse<T>(
    bool Success,
    IReadOnlyCollection<T> Data,
    PaginationMetadata Pagination,
    string? Message = null)
{
    public static PagedResponse<T> Create(
        IReadOnlyCollection<T> data,
        int page,
        int pageSize,
        int totalCount,
        string? message = null)
    {
        return new PagedResponse<T>(
            true,
            data,
            PaginationMetadata.Create(
                page,
                pageSize,
                totalCount),
            message);
    }
}

public static class PagedResponse
{
    public static PagedResponse<T> Create<T>(
        IReadOnlyCollection<T> data,
        int page,
        int pageSize,
        int totalCount,
        string? message = null)
    {
        return PagedResponse<T>.Create(
            data,
            page,
            pageSize,
            totalCount,
            message);
    }
}