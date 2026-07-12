using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
using Saharut.Api.Contracts.Companies;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/companies")]
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
public sealed class CompaniesController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public CompaniesController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/companies
    [HttpGet]
    [HasPermission("COMPANIES.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] CompanyQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page =
            PaginationHelper.NormalizePage(
                request.Page);

        var pageSize =
            PaginationHelper.NormalizePageSize(
                request.PageSize);

        var query = _dbContext.Companies
            .AsNoTracking()
            .Where(company => !company.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(company =>
                EF.Functions.ILike(
                    company.Name,
                    $"%{search}%") ||

                (company.TaxNumber != null &&
                 EF.Functions.ILike(
                     company.TaxNumber,
                     $"%{search}%")) ||

                (company.PhoneNumber != null &&
                 EF.Functions.ILike(
                     company.PhoneNumber,
                     $"%{search}%")) ||

                (company.Email != null &&
                 EF.Functions.ILike(
                     company.Email,
                     $"%{search}%")));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(company =>
                company.IsActive ==
                request.IsActive.Value);
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy
            .Trim()
            .ToLowerInvariant() switch
        {
            "taxnumber" => descending
                ? query.OrderByDescending(
                    company => company.TaxNumber)
                : query.OrderBy(
                    company => company.TaxNumber),

            "createdat" => descending
                ? query.OrderByDescending(
                    company => company.CreatedAt)
                : query.OrderBy(
                    company => company.CreatedAt),

            "isactive" => descending
                ? query.OrderByDescending(
                    company => company.IsActive)
                : query.OrderBy(
                    company => company.IsActive),

            _ => descending
                ? query.OrderByDescending(
                    company => company.Name)
                : query.OrderBy(
                    company => company.Name)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var companies = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
            .Take(pageSize)
            .Select(company => new
            {
                company.Id,
                company.Name,
                company.TaxNumber,
                company.PhoneNumber,
                company.Email,
                company.IsActive,
                company.CreatedAt,
                company.UpdatedAt,

                activeUserCount =
                    company.CompanyUsers.Count(
                        companyUser =>
                            !companyUser.IsDeleted &&
                            companyUser.IsActive &&
                            !companyUser.User.IsDeleted &&
                            companyUser.User.IsActive),

                totalUserCount =
                    company.CompanyUsers.Count(
                        companyUser =>
                            !companyUser.IsDeleted &&
                            !companyUser.User.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        return Ok(
            PagedResponse.Create(
                companies,
                page,
                pageSize,
                totalCount));
    }

    // GET: api/v1/companies/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("COMPANIES.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var company = await _dbContext.Companies
            .AsNoTracking()
            .Where(company =>
                company.Id == id &&
                !company.IsDeleted)
            .Select(company => new
            {
                company.Id,
                company.Name,
                company.TaxNumber,
                company.PhoneNumber,
                company.Email,
                company.IsActive,
                company.CreatedAt,
                company.UpdatedAt,

                activeUserCount =
                    company.CompanyUsers.Count(
                        companyUser =>
                            !companyUser.IsDeleted &&
                            companyUser.IsActive &&
                            !companyUser.User.IsDeleted &&
                            companyUser.User.IsActive),

                users = company.CompanyUsers
                    .Where(companyUser =>
                        !companyUser.IsDeleted &&
                        companyUser.IsActive &&
                        !companyUser.User.IsDeleted)
                    .OrderBy(companyUser =>
                        companyUser.User.FirstName)
                    .ThenBy(companyUser =>
                        companyUser.User.LastName)
                    .Select(companyUser => new
                    {
                        companyUser.User.Id,
                        companyUser.User.FirstName,
                        companyUser.User.LastName,
                        companyUser.User.PhoneNumber,
                        companyUser.User.Email,
                        companyUser.User.IsActive
                    })
            })
            .FirstOrDefaultAsync(
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                company));
    }

    // POST: api/v1/companies
    [HttpPost]
    [HasPermission("COMPANIES.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedTaxNumber =
            NormalizeOptionalText(
                request.TaxNumber);

        if (normalizedTaxNumber is not null)
        {
            var taxNumberExists =
                await _dbContext.Companies
                    .AnyAsync(
                        company =>
                            company.TaxNumber ==
                            normalizedTaxNumber &&
                            !company.IsDeleted,
                        cancellationToken);

            if (taxNumberExists)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Bu vergi numarası başka bir firma tarafından kullanılıyor."
                });
            }
        }

        var company = new Company
        {
            Name = request.Name.Trim(),
            TaxNumber = normalizedTaxNumber,
            PhoneNumber =
                NormalizeOptionalText(
                    request.PhoneNumber),
            Email =
                NormalizeOptionalText(
                    request.Email),
            IsActive = true
        };

        _dbContext.Companies.Add(company);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            company.Id,
            company.Name,
            company.TaxNumber,
            company.PhoneNumber,
            company.Email,
            company.IsActive,
            company.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = company.Id
            },
            ApiResponse<object>.Created(
                responseData,
                "Firma başarıyla oluşturuldu."));
    }

    // PUT: api/v1/companies/{id}
    [HttpPut("{id:guid}")]
    [HasPermission("COMPANIES.UPDATE")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(
                company =>
                    company.Id == id &&
                    !company.IsDeleted,
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadı."
            });
        }

        if (!request.IsActive &&
            company.IsActive)
        {
            var hasActiveUsers =
                await HasActiveUsersAsync(
                    id,
                    cancellationToken);

            if (hasActiveUsers)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Aktif kullanıcılara sahip firma pasif yapılamaz."
                });
            }
        }

        var normalizedTaxNumber =
            NormalizeOptionalText(
                request.TaxNumber);

        if (normalizedTaxNumber is not null)
        {
            var taxNumberExists =
                await _dbContext.Companies
                    .AnyAsync(
                        otherCompany =>
                            otherCompany.Id != id &&
                            otherCompany.TaxNumber ==
                            normalizedTaxNumber &&
                            !otherCompany.IsDeleted,
                        cancellationToken);

            if (taxNumberExists)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Bu vergi numarası başka bir firma tarafından kullanılıyor."
                });
            }
        }

        company.Name =
            request.Name.Trim();

        company.TaxNumber =
            normalizedTaxNumber;

        company.PhoneNumber =
            NormalizeOptionalText(
                request.PhoneNumber);

        company.Email =
            NormalizeOptionalText(
                request.Email);

        company.IsActive =
            request.IsActive;

        company.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            company.Id,
            company.Name,
            company.TaxNumber,
            company.PhoneNumber,
            company.Email,
            company.IsActive,
            company.UpdatedAt
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                "Firma başarıyla güncellendi."));
    }

    // PATCH: api/v1/companies/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission("COMPANIES.UPDATE")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] SetCompanyStatusRequest request,
        CancellationToken cancellationToken)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(
                company =>
                    company.Id == id &&
                    !company.IsDeleted,
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadı."
            });
        }

        if (!request.IsActive &&
            company.IsActive)
        {
            var hasActiveUsers =
                await HasActiveUsersAsync(
                    id,
                    cancellationToken);

            if (hasActiveUsers)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "Aktif kullanıcılara sahip firma pasif yapılamaz."
                });
            }
        }

        company.IsActive =
            request.IsActive;

        company.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        var responseData = new
        {
            company.Id,
            company.IsActive,
            company.UpdatedAt
        };

        var message = request.IsActive
            ? "Firma aktif hâle getirildi."
            : "Firma pasif hâle getirildi.";

        return Ok(
            ApiResponse<object>.Ok(
                responseData,
                message));
    }

    // DELETE: api/v1/companies/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("COMPANIES.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(
                company =>
                    company.Id == id &&
                    !company.IsDeleted,
                cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadı."
            });
        }

        var hasAssignedUsers =
            await _dbContext.CompanyUsers
                .AnyAsync(
                    companyUser =>
                        companyUser.CompanyId == id &&
                        !companyUser.IsDeleted &&
                        !companyUser.User.IsDeleted,
                    cancellationToken);

        if (hasAssignedUsers)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Kullanıcılara atanmış firma silinemez."
            });
        }

        company.IsDeleted = true;
        company.IsActive = false;
        company.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            MessageResponse.Ok(
                "Firma başarıyla silindi."));
    }

    private async Task<bool> HasActiveUsersAsync(
        Guid companyId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.CompanyUsers
            .AnyAsync(
                companyUser =>
                    companyUser.CompanyId ==
                    companyId &&
                    !companyUser.IsDeleted &&
                    companyUser.IsActive &&
                    !companyUser.User.IsDeleted &&
                    companyUser.User.IsActive,
                cancellationToken);
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}