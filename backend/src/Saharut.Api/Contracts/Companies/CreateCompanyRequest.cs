namespace Saharut.Api.Contracts.Companies;

public sealed record CreateCompanyRequest(
    string Name,
    string? TaxNumber,
    string? PhoneNumber,
    string? Email
);