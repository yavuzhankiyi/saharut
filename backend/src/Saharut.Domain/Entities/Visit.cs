using Saharut.Domain.Enums;

namespace Saharut.Domain.Entities;

public sealed class Visit : BaseEntity
{
    public Guid CompanyId { get; set; }

    public Guid CustomerId { get; set; }

    public Guid AssignedUserId { get; set; }

    public required string Title { get; set; }

    public string? Purpose { get; set; }

    public DateTime PlannedStartAt { get; set; }

    public DateTime PlannedEndAt { get; set; }

    public VisitStatus Status { get; set; } =
        VisitStatus.Planned;

    public DateTime? CheckInAt { get; set; }

    public DateTime? CheckOutAt { get; set; }

    public decimal? CheckInLatitude { get; set; }

    public decimal? CheckInLongitude { get; set; }

    public decimal? CheckOutLatitude { get; set; }

    public decimal? CheckOutLongitude { get; set; }

    public string? Outcome { get; set; }

    public string? Notes { get; set; }

    public string? CancellationReason { get; set; }

    public required Company Company { get; set; }

    public required Customer Customer { get; set; }

    public required User AssignedUser { get; set; }
}
