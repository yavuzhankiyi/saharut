namespace Saharut.Domain.Entities;

public sealed class OtpCode : BaseEntity
{
    public required string PhoneNumber { get; set; }

    public required string CodeHash { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public int FailedAttemptCount { get; set; }

    public bool IsUsed { get; set; }

    public string? IpAddress { get; set; }
}