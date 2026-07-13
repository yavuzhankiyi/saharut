namespace Saharut.Domain.Entities;

public sealed class Product : BaseEntity
{
    public Guid CompanyId { get; set; }

    public required string Name { get; set; }

    public required string Code { get; set; }

    public string? Barcode { get; set; }

    public string? Description { get; set; }

    public required string Unit { get; set; }

    public decimal ListPrice { get; set; }

    public decimal VatRate { get; set; }

    public decimal StockQuantity { get; set; }

    public decimal MinimumStockQuantity { get; set; }

    public bool IsActive { get; set; } = true;

    public required Company Company { get; set; }
}