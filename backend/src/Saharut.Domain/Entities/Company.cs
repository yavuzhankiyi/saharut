namespace Saharut.Domain.Entities;

public sealed class Company : BaseEntity
{
    public required string Name { get; set; }

    public string? TaxNumber { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<CompanyUser> CompanyUsers { get; set; }
        = new List<CompanyUser>();

    public ICollection<Product> Products { get; set; }
        = new List<Product>();

    public ICollection<Customer> Customers { get; set; } =
    new List<Customer>();
}