namespace Saharut.Api.Contracts.Companies;

public sealed record UpdateCompanyRequest(
    string Name,
    string? TaxNumber,
    string? PhoneNumber,
    string? Email,
    bool IsActive
);