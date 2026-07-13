using System.ComponentModel.DataAnnotations;
using Saharut.Domain.Enums;

namespace Saharut.Api.Contracts.Visits;

public sealed class VisitQueryRequest
{
    public Guid? CompanyId { get; set; }

    public Guid? CustomerId { get; set; }

    public Guid? AssignedUserId { get; set; }

    public VisitStatus? Status { get; set; }

    public DateTime? PlannedFrom { get; set; }

    public DateTime? PlannedTo { get; set; }

    [StringLength(200)]
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    [StringLength(50)]
    public string SortBy { get; set; } =
        "plannedStartAt";

    [RegularExpression(
        "^(asc|desc)$",
        ErrorMessage = "SortDirection asc veya desc olmalıdır.")]
    public string SortDirection { get; set; } =
        "asc";
}
