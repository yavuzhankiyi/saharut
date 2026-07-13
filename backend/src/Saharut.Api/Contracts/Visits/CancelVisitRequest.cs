using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Visits;

public sealed class CancelVisitRequest
{
    [Required]
    [StringLength(1000)]
    public string CancellationReason { get; set; } =
        string.Empty;
}
