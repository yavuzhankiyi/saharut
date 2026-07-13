using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Visits;

public sealed class UpdateVisitRequest
{
    [Required]
    public Guid CompanyId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    public Guid AssignedUserId { get; set; }

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Purpose { get; set; }

    [Required]
    public DateTime PlannedStartAt { get; set; }

    [Required]
    public DateTime PlannedEndAt { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}
