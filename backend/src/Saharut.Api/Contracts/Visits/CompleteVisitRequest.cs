using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Visits;

public sealed class CompleteVisitRequest
{
    [Required]
    [StringLength(2000)]
    public string Outcome { get; set; } =
        string.Empty;

    [StringLength(2000)]
    public string? Notes { get; set; }
}
