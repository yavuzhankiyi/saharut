namespace Saharut.Domain.Entities;

public sealed class Permission : BaseEntity
{
    public required string Name { get; set; }

    public required string Code { get; set; }

    public required string Module { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<RolePermission> RolePermissions { get; set; }
        = new List<RolePermission>();
}