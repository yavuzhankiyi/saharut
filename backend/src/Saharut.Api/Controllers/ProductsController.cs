using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
using Saharut.Api.Contracts.Products;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
[Authorize]
public sealed class ProductsController : ControllerBase
{
    private const string SuperAdminRoleCode =
        "SUPER_ADMIN";

    private const string OperationsManagerRoleCode =
        "OPERATIONS_MANAGER";

    private readonly SaharutDbContext _dbContext;

    public ProductsController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/products
    [HttpGet]
    [HasPermission("PRODUCTS.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] ProductQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page =
            PaginationHelper.NormalizePage(
                request.Page);

        var pageSize =
            PaginationHelper.NormalizePageSize(
                request.PageSize);

        var currentUserId =
            GetCurrentUserId();

        var hasGlobalCompanyAccess =
            HasGlobalCompanyAccess();

        var query = _dbContext.Products
            .AsNoTracking()
            .Where(product =>
                !product.IsDeleted &&
                !product.Company.IsDeleted);

        if (!hasGlobalCompanyAccess)
        {
            if (!currentUserId.HasValue)
            {
                return Forbid();
            }

            query = query.Where(product =>
                product.Company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId.Value &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted &&
                        companyUser.User.IsActive));
        }

        if (request.CompanyId.HasValue)
        {
            query = query.Where(product =>
                product.CompanyId ==
                request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(
                request.Search))
        {
            var search =
                request.Search.Trim();

            query = query.Where(product =>
                EF.Functions.ILike(
                    product.Name,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    product.Code,
                    $"%{search}%") ||

                (product.Barcode != null &&
                 EF.Functions.ILike(
                     product.Barcode,
                     $"%{search}%")) ||

                EF.Functions.ILike(
                    product.Company.Name,
                    $"%{search}%"));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(product =>
                product.IsActive ==
                request.IsActive.Value);
        }

        if (request.IsLowStock.HasValue)
        {
            query = request.IsLowStock.Value
                ? query.Where(product =>
                    product.StockQuantity <=
                    product.MinimumStockQuantity)
                : query.Where(product =>
                    product.StockQuantity >
                    product.MinimumStockQuantity);
        }

        var descending =
            string.Equals(
                request.SortDirection,
                "desc",
                StringComparison.OrdinalIgnoreCase);

        query = request.SortBy
            .Trim()
            .ToLowerInvariant() switch
        {
            "code" => descending
                ? query.OrderByDescending(
                    product => product.Code)
                : query.OrderBy(
                    product => product.Code),

            "company" or "companyname" => descending
                ? query.OrderByDescending(
                    product => product.Company.Name)
                : query.OrderBy(
                    product => product.Company.Name),

            "listprice" or "price" => descending
                ? query.OrderByDescending(
                    product => product.ListPrice)
                : query.OrderBy(
                    product => product.ListPrice),

            "stock" or "stockquantity" => descending
                ? query.OrderByDescending(
                    product => product.StockQuantity)
                : query.OrderBy(
                    product => product.StockQuantity),

            "createdat" => descending
                ? query.OrderByDescending(
                    product => product.CreatedAt)
                : query.OrderBy(
                    product => product.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(
                    product => product.IsActive)
                : query.OrderBy(
                    product => product.IsActive),

            _ => descending
                ? query.OrderByDescending(
                    product => product.Name)
                : query.OrderBy(
                    product => product.Name)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var products = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
            .Take(pageSize)
            .Select(product => new
            {
                product.Id,
                product.CompanyId,

                companyName =
                    product.Company.Name,

                product.Name,
                product.Code,
                product.Barcode,
                product.Unit,
                product.ListPrice,
                product.VatRate,
                product.StockQuantity,
                product.MinimumStockQuantity,
                product.IsActive,

                isLowStock =
                    product.StockQuantity <=
                    product.MinimumStockQuantity,

                product.CreatedAt,
                product.UpdatedAt
            })
            .ToListAsync(
                cancellationToken);

        return Ok(
            PagedResponse.Create(
                products,
                page,
                pageSize,
                totalCount));
    }

    // GET: api/v1/products/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("PRODUCTS.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Products
            .AsNoTracking()
            .Where(product =>
                product.Id == id &&
                !product.IsDeleted &&
                !product.Company.IsDeleted);

        if (!HasGlobalCompanyAccess())
        {
            var currentUserId =
                GetCurrentUserId();

            if (!currentUserId.HasValue)
            {
                return Forbid();
            }

            query = query.Where(product =>
                product.Company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId.Value &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted &&
                        companyUser.User.IsActive));
        }

        var product = await query
            .Select(product => new
            {
                product.Id,
                product.CompanyId,

                Company = new
                {
                    product.Company.Id,
                    product.Company.Name,
                    product.Company.IsActive
                },

                product.Name,
                product.Code,
                product.Barcode,
                product.Description,
                product.Unit,
                product.ListPrice,
                product.VatRate,
                product.StockQuantity,
                product.MinimumStockQuantity,
                product.IsActive,

                isLowStock =
                    product.StockQuantity <=
                    product.MinimumStockQuantity,

                priceWithVat =
                    product.ListPrice *
                    (1 + product.VatRate / 100),

                product.CreatedAt,
                product.UpdatedAt
            })
            .FirstOrDefaultAsync(
                cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ürün bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                product));
    }

    // POST: api/v1/products
    [HttpPost]
    [HasPermission("PRODUCTS.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                request.Name) ||
            string.IsNullOrWhiteSpace(
                request.Code) ||
            string.IsNullOrWhiteSpace(
                request.Unit))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ürün adı, ürün kodu ve birim zorunludur."
            });
        }

        var company =
            await GetAccessibleCompanyAsync(
                request.CompanyId,
                requireActive: true,
                cancellationToken);

        if (company is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Firma bulunamadı, aktif değil veya bu firmaya erişim yetkiniz yok."
            });
        }

        var normalizedCode =
            request.Code.Trim();

        var codeExists =
            await _dbContext.Products
                .AnyAsync(
                    product =>
                        product.CompanyId ==
                        request.CompanyId &&
                        product.Code ==
                        normalizedCode &&
                        !product.IsDeleted,
                    cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu ürün kodu seçilen firmada zaten kullanılıyor."
            });
        }

        var product = new Product
        {
            CompanyId =
                company.Id,

            Company =
                company,

            Name =
                request.Name.Trim(),

            Code =
                normalizedCode,

            Barcode =
                NormalizeOptionalText(
                    request.Barcode),

            Description =
                NormalizeOptionalText(
                    request.Description),

            Unit =
                request.Unit.Trim(),

            ListPrice =
                request.ListPrice,

            VatRate =
                request.VatRate,

            StockQuantity =
                request.StockQuantity,

            MinimumStockQuantity =
                request.MinimumStockQuantity,

            IsActive = true
        };

        _dbContext.Products.Add(product);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            product.Id,
            product.CompanyId,

            companyName =
                company.Name,

            product.Name,
            product.Code,
            product.Barcode,
            product.Description,
            product.Unit,
            product.ListPrice,
            product.VatRate,
            product.StockQuantity,
            product.MinimumStockQuantity,
            product.IsActive,
            product.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = product.Id
            },
            ApiResponse<object>.Created(
                responseData,
                "Ürün başarıyla oluşturuldu."));
    }

    // PUT: api/v1/products/{id}
    [HttpPut("{id:guid}")]
    [HasPermission("PRODUCTS.UPDATE")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                request.Name) ||
            string.IsNullOrWhiteSpace(
                request.Code) ||
            string.IsNullOrWhiteSpace(
                request.Unit))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ürün adı, ürün kodu ve birim zorunludur."
            });
        }

        var product =
            await GetAccessibleProductAsync(
                id,
                cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ürün bulunamadı."
            });
        }

        var company =
            await GetAccessibleCompanyAsync(
                request.CompanyId,
                requireActive: true,
                cancellationToken);

        if (company is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Firma bulunamadı, aktif değil veya bu firmaya erişim yetkiniz yok."
            });
        }

        var normalizedCode =
            request.Code.Trim();

        var codeExists =
            await _dbContext.Products
                .AnyAsync(
                    otherProduct =>
                        otherProduct.Id != id &&
                        otherProduct.CompanyId ==
                        request.CompanyId &&
                        otherProduct.Code ==
                        normalizedCode &&
                        !otherProduct.IsDeleted,
                    cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu ürün kodu seçilen firmada başka bir ürün tarafından kullanılıyor."
            });
        }

        product.CompanyId =
            company.Id;

        product.Company =
            company;

        product.Name =
            request.Name.Trim();

        product.Code =
            normalizedCode;

        product.Barcode =
            NormalizeOptionalText(
                request.Barcode);

        product.Description =
            NormalizeOptionalText(
                request.Description);

        product.Unit =
            request.Unit.Trim();

        product.ListPrice =
            request.ListPrice;

        product.VatRate =
            request.VatRate;

        product.StockQuantity =
            request.StockQuantity;

        product.MinimumStockQuantity =
            request.MinimumStockQuantity;

        product.IsActive =
            request.IsActive;

        product.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            product.Id,
            product.CompanyId,

            companyName =
                company.Name,

            product.Name,
            product.Code,
            product.Barcode,
            product.Description,
            product.Unit,
            product.ListPrice,
            product.VatRate,
            product.StockQuantity,
            product.MinimumStockQuantity,
            product.IsActive,
            product.UpdatedAt
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Ürün başarıyla güncellendi."));
    }

    // PATCH: api/v1/products/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission("PRODUCTS.STATUS")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetProductStatusRequest request,
        CancellationToken cancellationToken)
    {
        var product =
            await GetAccessibleProductAsync(
                id,
                cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ürün bulunamadı."
            });
        }

        if (request.IsActive &&
            (!product.Company.IsActive ||
             product.Company.IsDeleted))
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Pasif veya silinmiş firmaya ait ürün aktif yapılamaz."
            });
        }

        product.IsActive =
            request.IsActive;

        product.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            product.Id,
            product.IsActive,
            product.UpdatedAt
        };

        var message =
            request.IsActive
                ? "Ürün aktif hâle getirildi."
                : "Ürün pasif hâle getirildi.";

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                message));
    }

    // DELETE: api/v1/products/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("PRODUCTS.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var product =
            await GetAccessibleProductAsync(
                id,
                cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ürün bulunamadı."
            });
        }

        product.IsDeleted = true;
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            MessageResponse.Ok(
                "Ürün başarıyla silindi."));
    }

    private async Task<Product?>
        GetAccessibleProductAsync(
            Guid productId,
            CancellationToken cancellationToken)
    {
        var query = _dbContext.Products
            .Include(product =>
                product.Company)
            .Where(product =>
                product.Id == productId &&
                !product.IsDeleted &&
                !product.Company.IsDeleted);

        if (HasGlobalCompanyAccess())
        {
            return await query
                .FirstOrDefaultAsync(
                    cancellationToken);
        }

        var currentUserId =
            GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return null;
        }

        return await query
            .Where(product =>
                product.Company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId.Value &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted &&
                        companyUser.User.IsActive))
            .FirstOrDefaultAsync(
                cancellationToken);
    }

    private async Task<Company?>
        GetAccessibleCompanyAsync(
            Guid companyId,
            bool requireActive,
            CancellationToken cancellationToken)
    {
        var query = _dbContext.Companies
            .Where(company =>
                company.Id == companyId &&
                !company.IsDeleted);

        if (requireActive)
        {
            query = query.Where(company =>
                company.IsActive);
        }

        if (HasGlobalCompanyAccess())
        {
            return await query
                .FirstOrDefaultAsync(
                    cancellationToken);
        }

        var currentUserId =
            GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return null;
        }

        return await query
            .Where(company =>
                company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId.Value &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted &&
                        companyUser.User.IsActive))
            .FirstOrDefaultAsync(
                cancellationToken);
    }

    private bool HasGlobalCompanyAccess()
    {
        return User.IsInRole(
                   SuperAdminRoleCode) ||
               User.IsInRole(
                   OperationsManagerRoleCode);
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            userIdValue,
            out var userId)
            ? userId
            : null;
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}