using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Contracts.Products;

public sealed class UpdateProductRequest
{
    [Required(ErrorMessage = "Firma seçimi zorunludur.")]
    public Guid CompanyId { get; set; }

    [Required(ErrorMessage = "Ürün adı zorunludur.")]
    [StringLength(
        200,
        ErrorMessage = "Ürün adı en fazla 200 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Ürün kodu zorunludur.")]
    [StringLength(
        100,
        ErrorMessage = "Ürün kodu en fazla 100 karakter olabilir.")]
    public string Code { get; set; } = string.Empty;

    [StringLength(
        100,
        ErrorMessage = "Barkod en fazla 100 karakter olabilir.")]
    public string? Barcode { get; set; }

    [StringLength(
        1000,
        ErrorMessage = "Açıklama en fazla 1000 karakter olabilir.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Birim bilgisi zorunludur.")]
    [StringLength(
        50,
        ErrorMessage = "Birim en fazla 50 karakter olabilir.")]
    public string Unit { get; set; } = string.Empty;

    [Range(
        0,
        9999999999999999.99,
        ErrorMessage = "Liste fiyatı sıfırdan küçük olamaz.")]
    public decimal ListPrice { get; set; }

    [Range(
        0,
        100,
        ErrorMessage = "KDV oranı 0 ile 100 arasında olmalıdır.")]
    public decimal VatRate { get; set; }

    [Range(
        0,
        999999999999999.999,
        ErrorMessage = "Stok miktarı sıfırdan küçük olamaz.")]
    public decimal StockQuantity { get; set; }

    [Range(
        0,
        999999999999999.999,
        ErrorMessage = "Minimum stok miktarı sıfırdan küçük olamaz.")]
    public decimal MinimumStockQuantity { get; set; }

    public bool IsActive { get; set; }
}