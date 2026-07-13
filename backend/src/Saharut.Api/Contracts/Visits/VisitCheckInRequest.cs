using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Visits;

public sealed class VisitCheckInRequest
{
    [Required]
    [Range(-90, 90)]
    public decimal Latitude { get; set; }

    [Required]
    [Range(-180, 180)]
    public decimal Longitude { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}
