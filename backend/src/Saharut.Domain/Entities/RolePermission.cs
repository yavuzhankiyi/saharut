namespace Saharut.Domain.Entities;

public sealed class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }

    public Guid PermissionId { get; set; }

    public required Role Role { get; set; }

    public required Permission Permission { get; set; }
}