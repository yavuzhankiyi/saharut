using System.ComponentModel.DataAnnotations;
using Saharut.Api.Validation;

namespace Saharut.Api.Contracts.Companies;

public sealed record UpdateCompanyRequest(
    [property: Required(
        ErrorMessage = "Firma adı zorunludur.")]
    [property: NotWhiteSpace(
        ErrorMessage = "Firma adı boş bırakılamaz.")]
    [property: StringLength(
        200,
        MinimumLength = 2,
        ErrorMessage =
            "Firma adı 2 ile 200 karakter arasında olmalıdır.")]
    string Name,

    [property: StringLength(
        20,
        ErrorMessage =
            "Vergi numarası en fazla 20 karakter olabilir.")]
    string? TaxNumber,

    [property: StringLength(
        30,
        ErrorMessage =
            "Telefon numarası en fazla 30 karakter olabilir.")]
    string? PhoneNumber,

    [property: EmailAddress(
        ErrorMessage =
            "Geçerli bir e-posta adresi girilmelidir.")]
    [property: StringLength(
        200,
        ErrorMessage =
            "E-posta adresi en fazla 200 karakter olabilir.")]
    string? Email,

    bool IsActive
);