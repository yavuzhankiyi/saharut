using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Customers;

public sealed class CustomerQueryRequest
{
    public Guid? CompanyId { get; set; }

    [StringLength(
        200,
        ErrorMessage = "Arama metni en fazla 200 karakter olabilir.")]
    public string? Search { get; set; }

    [StringLength(
        50,
        ErrorMessage = "Müşteri türü en fazla 50 karakter olabilir.")]
    public string? CustomerType { get; set; }

    [StringLength(
        100,
        ErrorMessage = "Şehir en fazla 100 karakter olabilir.")]
    public string? City { get; set; }

    [StringLength(
        100,
        ErrorMessage = "İlçe en fazla 100 karakter olabilir.")]
    public string? District { get; set; }

    public bool? IsActive { get; set; }

    [Range(
        1,
        int.MaxValue,
        ErrorMessage = "Sayfa numarası 1 veya daha büyük olmalıdır.")]
    public int Page { get; set; } = 1;

    [Range(
        1,
        100,
        ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalıdır.")]
    public int PageSize { get; set; } = 20;

    [StringLength(
        50,
        ErrorMessage = "Sıralama alanı en fazla 50 karakter olabilir.")]
    public string SortBy { get; set; } = "name";

    [RegularExpression(
        "^(asc|desc)$",
        ErrorMessage = "Sıralama yönü asc veya desc olmalıdır.")]
    public string SortDirection { get; set; } = "asc";
}
