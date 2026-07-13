using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Customers;

public sealed class CreateCustomerRequest
{
    [Required(ErrorMessage = "Firma seçimi zorunludur.")]
    public Guid CompanyId { get; set; }

    [Required(ErrorMessage = "Müşteri adı zorunludur.")]
    [StringLength(
        200,
        ErrorMessage = "Müşteri adı en fazla 200 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Müşteri kodu zorunludur.")]
    [StringLength(
        100,
        ErrorMessage = "Müşteri kodu en fazla 100 karakter olabilir.")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Müşteri türü zorunludur.")]
    [StringLength(
        50,
        ErrorMessage = "Müşteri türü en fazla 50 karakter olabilir.")]
    public string CustomerType { get; set; } = string.Empty;

    [StringLength(
        200,
        ErrorMessage = "Yetkili kişi adı en fazla 200 karakter olabilir.")]
    public string? ContactName { get; set; }

    [StringLength(
        30,
        ErrorMessage = "Telefon numarası en fazla 30 karakter olabilir.")]
    public string? PhoneNumber { get; set; }

    [EmailAddress(
        ErrorMessage = "Geçerli bir e-posta adresi girilmelidir.")]
    [StringLength(
        200,
        ErrorMessage = "E-posta adresi en fazla 200 karakter olabilir.")]
    public string? Email { get; set; }

    [StringLength(
        50,
        ErrorMessage = "Vergi numarası en fazla 50 karakter olabilir.")]
    public string? TaxNumber { get; set; }

    [StringLength(
        100,
        ErrorMessage = "Şehir en fazla 100 karakter olabilir.")]
    public string? City { get; set; }

    [StringLength(
        100,
        ErrorMessage = "İlçe en fazla 100 karakter olabilir.")]
    public string? District { get; set; }

    [StringLength(
        1000,
        ErrorMessage = "Adres en fazla 1000 karakter olabilir.")]
    public string? Address { get; set; }

    [Range(
        -90,
        90,
        ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")]
    public decimal? Latitude { get; set; }

    [Range(
        -180,
        180,
        ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")]
    public decimal? Longitude { get; set; }

    [StringLength(
        2000,
        ErrorMessage = "Notlar en fazla 2000 karakter olabilir.")]
    public string? Notes { get; set; }
}
