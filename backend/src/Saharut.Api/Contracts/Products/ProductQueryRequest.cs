namespace Saharut.Api.Contracts.Products;

public sealed class ProductQueryRequest
{
    public string? Search { get; set; }

    public Guid? CompanyId { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsLowStock { get; set; }

    public string SortBy { get; set; } = "name";

    public string SortDirection { get; set; } = "asc";

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;
}