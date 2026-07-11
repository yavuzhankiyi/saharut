namespace Saharut.Domain.Entities;

public sealed class Role : BaseEntity
{
    public required string Name { get; set; }

    public required string Code { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<UserRole> UserRoles { get; set; }
    = new List<UserRole>();
}