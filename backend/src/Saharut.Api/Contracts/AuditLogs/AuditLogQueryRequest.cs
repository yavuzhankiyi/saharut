namespace Saharut.Api.Contracts.AuditLogs;

public sealed class AuditLogQueryRequest
{
    public string? Search { get; set; }

    public string? EntityName { get; set; }

    public string? EntityId { get; set; }

    public string? Action { get; set; }

    public Guid? UserId { get; set; }

    public string? HttpMethod { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdAt";

    public string SortDirection { get; set; } = "desc";
}