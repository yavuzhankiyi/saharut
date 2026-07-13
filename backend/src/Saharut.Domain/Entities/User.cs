namespace Saharut.Domain.Entities;

public sealed class User : BaseEntity
{
    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string PhoneNumber { get; set; }

    public string? Email { get; set; }

    public bool PhoneNumberConfirmed { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } =
        new List<UserRole>();

    public ICollection<CompanyUser> CompanyUsers { get; set; } =
        new List<CompanyUser>();

    public ICollection<Visit> AssignedVisits { get; set; } =
        new List<Visit>();
}
