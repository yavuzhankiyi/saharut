using System.ComponentModel.DataAnnotations;
using Saharut.Api.Validation;

namespace Saharut.Api.Contracts.Companies;

public sealed record UpdateCompanyRequest(
    [Required(ErrorMessage = "Firma adı zorunludur.")]
    [NotWhiteSpace(ErrorMessage = "Firma adı boşluklardan oluşamaz.")]
    [StringLength(
        200,
        MinimumLength = 2,
        ErrorMessage = "Firma adı 2 ile 200 karakter arasında olmalıdır.")]
    string Name,

    [StringLength(
        20,
        ErrorMessage = "Vergi numarası en fazla 20 karakter olabilir.")]
    string? TaxNumber,

    [StringLength(
        30,
        ErrorMessage = "Telefon numarası en fazla 30 karakter olabilir.")]
    string? PhoneNumber,

    [EmailAddress(
        ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    [StringLength(
        200,
        ErrorMessage = "E-posta adresi en fazla 200 karakter olabilir.")]
    string? Email,

    bool IsActive
);