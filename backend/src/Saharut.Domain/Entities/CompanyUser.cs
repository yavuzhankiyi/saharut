namespace Saharut.Domain.Entities;

public sealed class CompanyUser : BaseEntity
{
    public Guid CompanyId { get; set; }

    public Guid UserId { get; set; }

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;

    public User User { get; set; } = null!;
}