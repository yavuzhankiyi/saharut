namespace Saharut.Domain.Entities;

public sealed class AuditLog : BaseEntity
{
    public string EntityName { get; set; } = string.Empty;

    public string EntityId { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public Guid? UserId { get; set; }

    public string? UserDisplayName { get; set; }

    public string? HttpMethod { get; set; }

    public string? RequestPath { get; set; }

    public string? IpAddress { get; set; }

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public string? ChangedColumns { get; set; }
}