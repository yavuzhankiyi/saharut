namespace Saharut.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public Guid CompanyId { get; set; }

    public required string Name { get; set; }

    public required string Code { get; set; }

    public required string CustomerType { get; set; }

    public string? ContactName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public string? TaxNumber { get; set; }

    public string? City { get; set; }

    public string? District { get; set; }

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public required Company Company { get; set; }
}