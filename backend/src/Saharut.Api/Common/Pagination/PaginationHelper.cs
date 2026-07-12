namespace Saharut.Api.Common.Pagination;

public static class PaginationHelper
{
    public const int DefaultPage = 1;

    public const int DefaultPageSize = 20;

    public const int MaximumPageSize = 100;

    public static int NormalizePage(
        int page)
    {
        return page < 1
            ? DefaultPage
            : page;
    }

    public static int NormalizePageSize(
        int pageSize)
    {
        return pageSize switch
        {
            < 1 => DefaultPageSize,
            > MaximumPageSize => MaximumPageSize,
            _ => pageSize
        };
    }

    public static int CalculateSkip(
        int page,
        int pageSize)
    {
        var normalizedPage =
            NormalizePage(page);

        var normalizedPageSize =
            NormalizePageSize(pageSize);

        return (normalizedPage - 1) *
               normalizedPageSize;
    }
}