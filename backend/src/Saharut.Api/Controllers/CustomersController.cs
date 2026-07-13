using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
using Saharut.Api.Contracts.Customers;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
[Authorize]
public sealed class CustomersController : ControllerBase
{
    private const string SuperAdminRoleCode =
        "SUPER_ADMIN";

    private const string OperationsManagerRoleCode =
        "OPERATIONS_MANAGER";

    private readonly SaharutDbContext _dbContext;

    public CustomersController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/customers
    [HttpGet]
    [HasPermission("CUSTOMERS.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] CustomerQueryRequest request,
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

        var query = _dbContext.Customers
            .AsNoTracking()
            .Where(customer =>
                !customer.IsDeleted &&
                !customer.Company.IsDeleted);

        if (!hasGlobalCompanyAccess)
        {
            if (!currentUserId.HasValue)
            {
                return Forbid();
            }

            query = query.Where(customer =>
                customer.Company.CompanyUsers.Any(
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
            query = query.Where(customer =>
                customer.CompanyId ==
                request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(
                request.Search))
        {
            var search =
                request.Search.Trim();

            query = query.Where(customer =>
                EF.Functions.ILike(
                    customer.Name,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    customer.Code,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    customer.CustomerType,
                    $"%{search}%") ||

                (customer.ContactName != null &&
                 EF.Functions.ILike(
                     customer.ContactName,
                     $"%{search}%")) ||

                (customer.PhoneNumber != null &&
                 EF.Functions.ILike(
                     customer.PhoneNumber,
                     $"%{search}%")) ||

                (customer.TaxNumber != null &&
                 EF.Functions.ILike(
                     customer.TaxNumber,
                     $"%{search}%")) ||

                EF.Functions.ILike(
                    customer.Company.Name,
                    $"%{search}%"));
        }

        if (!string.IsNullOrWhiteSpace(
                request.CustomerType))
        {
            var customerType =
                request.CustomerType.Trim();

            query = query.Where(customer =>
                EF.Functions.ILike(
                    customer.CustomerType,
                    customerType));
        }

        if (!string.IsNullOrWhiteSpace(
                request.City))
        {
            var city =
                request.City.Trim();

            query = query.Where(customer =>
                customer.City != null &&
                EF.Functions.ILike(
                    customer.City,
                    city));
        }

        if (!string.IsNullOrWhiteSpace(
                request.District))
        {
            var district =
                request.District.Trim();

            query = query.Where(customer =>
                customer.District != null &&
                EF.Functions.ILike(
                    customer.District,
                    district));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(customer =>
                customer.IsActive ==
                request.IsActive.Value);
        }

        var descending =
            string.Equals(
                request.SortDirection,
                "desc",
                StringComparison.OrdinalIgnoreCase);

        var sortBy =
            string.IsNullOrWhiteSpace(request.SortBy)
                ? "name"
                : request.SortBy
                    .Trim()
                    .ToLowerInvariant();

        query = sortBy switch
        {
            "code" => descending
                ? query.OrderByDescending(
                    customer => customer.Code)
                : query.OrderBy(
                    customer => customer.Code),

            "company" or "companyname" => descending
                ? query.OrderByDescending(
                    customer =>
                        customer.Company.Name)
                : query.OrderBy(
                    customer =>
                        customer.Company.Name),

            "customertype" or "type" => descending
                ? query.OrderByDescending(
                    customer =>
                        customer.CustomerType)
                : query.OrderBy(
                    customer =>
                        customer.CustomerType),

            "city" => descending
                ? query.OrderByDescending(
                    customer => customer.City)
                : query.OrderBy(
                    customer => customer.City),

            "district" => descending
                ? query.OrderByDescending(
                    customer =>
                        customer.District)
                : query.OrderBy(
                    customer =>
                        customer.District),

            "createdat" => descending
                ? query.OrderByDescending(
                    customer =>
                        customer.CreatedAt)
                : query.OrderBy(
                    customer =>
                        customer.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(
                    customer =>
                        customer.IsActive)
                : query.OrderBy(
                    customer =>
                        customer.IsActive),

            _ => descending
                ? query.OrderByDescending(
                    customer => customer.Name)
                : query.OrderBy(
                    customer => customer.Name)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var customers = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
            .Take(pageSize)
            .Select(customer => new
            {
                customer.Id,
                customer.CompanyId,

                companyName =
                    customer.Company.Name,

                customer.Name,
                customer.Code,
                customer.CustomerType,
                customer.ContactName,
                customer.PhoneNumber,
                customer.Email,
                customer.TaxNumber,
                customer.City,
                customer.District,
                customer.IsActive,
                customer.CreatedAt,
                customer.UpdatedAt
            })
            .ToListAsync(
                cancellationToken);

        return Ok(
            PagedResponse.Create(
                customers,
                page,
                pageSize,
                totalCount));
    }

    // GET: api/v1/customers/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("CUSTOMERS.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Customers
            .AsNoTracking()
            .Where(customer =>
                customer.Id == id &&
                !customer.IsDeleted &&
                !customer.Company.IsDeleted);

        if (!HasGlobalCompanyAccess())
        {
            var currentUserId =
                GetCurrentUserId();

            if (!currentUserId.HasValue)
            {
                return Forbid();
            }

            query = query.Where(customer =>
                customer.Company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId.Value &&
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted &&
                        companyUser.User.IsActive));
        }

        var customer = await query
            .Select(customer => new
            {
                customer.Id,
                customer.CompanyId,

                Company = new
                {
                    customer.Company.Id,
                    customer.Company.Name,
                    customer.Company.IsActive
                },

                customer.Name,
                customer.Code,
                customer.CustomerType,
                customer.ContactName,
                customer.PhoneNumber,
                customer.Email,
                customer.TaxNumber,
                customer.City,
                customer.District,
                customer.Address,
                customer.Latitude,
                customer.Longitude,
                customer.Notes,
                customer.IsActive,
                customer.CreatedAt,
                customer.UpdatedAt
            })
            .FirstOrDefaultAsync(
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Müşteri bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                customer));
    }

    // POST: api/v1/customers
    [HttpPost]
    [HasPermission("CUSTOMERS.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                request.Name) ||
            string.IsNullOrWhiteSpace(
                request.Code) ||
            string.IsNullOrWhiteSpace(
                request.CustomerType))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Müşteri adı, müşteri kodu ve müşteri türü zorunludur."
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
            await _dbContext.Customers
                .AnyAsync(
                    customer =>
                        customer.CompanyId ==
                        request.CompanyId &&
                        customer.Code ==
                        normalizedCode &&
                        !customer.IsDeleted,
                    cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu müşteri kodu seçilen firmada zaten kullanılıyor."
            });
        }

        var customer = new Customer
        {
            CompanyId =
                company.Id,

            Company =
                company,

            Name =
                request.Name.Trim(),

            Code =
                normalizedCode,

            CustomerType =
                request.CustomerType.Trim(),

            ContactName =
                NormalizeOptionalText(
                    request.ContactName),

            PhoneNumber =
                NormalizeOptionalText(
                    request.PhoneNumber),

            Email =
                NormalizeOptionalText(
                    request.Email),

            TaxNumber =
                NormalizeOptionalText(
                    request.TaxNumber),

            City =
                NormalizeOptionalText(
                    request.City),

            District =
                NormalizeOptionalText(
                    request.District),

            Address =
                NormalizeOptionalText(
                    request.Address),

            Latitude =
                request.Latitude,

            Longitude =
                request.Longitude,

            Notes =
                NormalizeOptionalText(
                    request.Notes),

            IsActive = true
        };

        _dbContext.Customers.Add(customer);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            customer.Id,
            customer.CompanyId,

            companyName =
                company.Name,

            customer.Name,
            customer.Code,
            customer.CustomerType,
            customer.ContactName,
            customer.PhoneNumber,
            customer.Email,
            customer.TaxNumber,
            customer.City,
            customer.District,
            customer.Address,
            customer.Latitude,
            customer.Longitude,
            customer.Notes,
            customer.IsActive,
            customer.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = customer.Id
            },
            ApiResponse<object>.Created(
                responseData,
                "Müşteri başarıyla oluşturuldu."));
    }

    // PUT: api/v1/customers/{id}
    [HttpPut("{id:guid}")]
    [HasPermission("CUSTOMERS.UPDATE")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(
                request.Name) ||
            string.IsNullOrWhiteSpace(
                request.Code) ||
            string.IsNullOrWhiteSpace(
                request.CustomerType))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Müşteri adı, müşteri kodu ve müşteri türü zorunludur."
            });
        }

        var customer =
            await GetAccessibleCustomerAsync(
                id,
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Müşteri bulunamadı."
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
            await _dbContext.Customers
                .AnyAsync(
                    otherCustomer =>
                        otherCustomer.Id != id &&
                        otherCustomer.CompanyId ==
                        request.CompanyId &&
                        otherCustomer.Code ==
                        normalizedCode &&
                        !otherCustomer.IsDeleted,
                    cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu müşteri kodu seçilen firmada başka bir müşteri tarafından kullanılıyor."
            });
        }

        customer.CompanyId =
            company.Id;

        customer.Company =
            company;

        customer.Name =
            request.Name.Trim();

        customer.Code =
            normalizedCode;

        customer.CustomerType =
            request.CustomerType.Trim();

        customer.ContactName =
            NormalizeOptionalText(
                request.ContactName);

        customer.PhoneNumber =
            NormalizeOptionalText(
                request.PhoneNumber);

        customer.Email =
            NormalizeOptionalText(
                request.Email);

        customer.TaxNumber =
            NormalizeOptionalText(
                request.TaxNumber);

        customer.City =
            NormalizeOptionalText(
                request.City);

        customer.District =
            NormalizeOptionalText(
                request.District);

        customer.Address =
            NormalizeOptionalText(
                request.Address);

        customer.Latitude =
            request.Latitude;

        customer.Longitude =
            request.Longitude;

        customer.Notes =
            NormalizeOptionalText(
                request.Notes);

        customer.IsActive =
            request.IsActive;

        customer.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            customer.Id,
            customer.CompanyId,

            companyName =
                company.Name,

            customer.Name,
            customer.Code,
            customer.CustomerType,
            customer.ContactName,
            customer.PhoneNumber,
            customer.Email,
            customer.TaxNumber,
            customer.City,
            customer.District,
            customer.Address,
            customer.Latitude,
            customer.Longitude,
            customer.Notes,
            customer.IsActive,
            customer.UpdatedAt
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Müşteri başarıyla güncellendi."));
    }

    // PATCH: api/v1/customers/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission("CUSTOMERS.STATUS")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetCustomerStatusRequest request,
        CancellationToken cancellationToken)
    {
        var customer =
            await GetAccessibleCustomerAsync(
                id,
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Müşteri bulunamadı."
            });
        }

        customer.IsActive =
            request.IsActive;

        customer.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var message = request.IsActive
            ? "Müşteri aktif hâle getirildi."
            : "Müşteri pasif hâle getirildi.";

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    customer.Id,
                    customer.IsActive,
                    customer.UpdatedAt
                },
                message));
    }

    // DELETE: api/v1/customers/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("CUSTOMERS.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer =
            await GetAccessibleCustomerAsync(
                id,
                cancellationToken);

        if (customer is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Müşteri bulunamadı."
            });
        }

        customer.IsActive = false;
        customer.IsDeleted = true;
        customer.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
    ApiResponse<object>.Ok(
        new
        {
            customer.Id
        },
        "Müşteri başarıyla silindi."));
    }

    private async Task<Customer?>
        GetAccessibleCustomerAsync(
            Guid customerId,
            CancellationToken cancellationToken)
    {
        var query = _dbContext.Customers
            .Include(customer =>
                customer.Company)
            .Where(customer =>
                customer.Id == customerId &&
                !customer.IsDeleted &&
                !customer.Company.IsDeleted);

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
            .Where(customer =>
                customer.Company.CompanyUsers.Any(
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

    private Guid? GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub");

        return Guid.TryParse(
            userIdValue,
            out var userId)
                ? userId
                : null;
    }

    private bool HasGlobalCompanyAccess()
    {
        return User.IsInRole(
                   SuperAdminRoleCode) ||
               User.IsInRole(
                   OperationsManagerRoleCode);
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
