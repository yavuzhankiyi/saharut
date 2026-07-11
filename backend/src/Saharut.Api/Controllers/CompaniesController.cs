using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/companies")]
[Authorize(Roles = "SUPER_ADMIN,OPERATIONS_MANAGER")]
public sealed class CompaniesController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public CompaniesController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/companies
    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var companies = await _dbContext.Companies
            .AsNoTracking()
            .Where(company => !company.IsDeleted)
            .OrderBy(company => company.Name)
            .Select(company => new
            {
                company.Id,
                company.Name,
                company.TaxNumber,
                company.PhoneNumber,
                company.Email,
                company.IsActive,
                company.CreatedAt,
                company.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(companies);
    }

    // GET: api/v1/companies/{id}
    [HttpGet("{id:guid}")]
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
                company.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (company is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Firma bulunamadı."
            });
        }

        return Ok(company);
    }

    // POST: api/v1/companies
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                success = false,
                message = "Firma adı zorunludur."
            });
        }

        var company = new Company
        {
            Name = request.Name.Trim(),
            TaxNumber = request.TaxNumber?.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Email = request.Email?.Trim(),
            IsActive = true
        };

        _dbContext.Companies.Add(company);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = company.Id },
            new
            {
                success = true,
                message = "Firma başarıyla oluşturuldu.",
                company.Id,
                company.Name,
                company.TaxNumber,
                company.PhoneNumber,
                company.Email,
                company.IsActive,
                company.CreatedAt
            });
    }

    // PUT: api/v1/companies/{id}
    [HttpPut("{id:guid}")]
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

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                success = false,
                message = "Firma adı zorunludur."
            });
        }

        company.Name = request.Name.Trim();
        company.TaxNumber = request.TaxNumber?.Trim();
        company.PhoneNumber = request.PhoneNumber?.Trim();
        company.Email = request.Email?.Trim();
        company.IsActive = request.IsActive;
        company.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Firma başarıyla güncellendi.",
            company.Id,
            company.Name,
            company.TaxNumber,
            company.PhoneNumber,
            company.Email,
            company.IsActive,
            company.UpdatedAt
        });
    }

    // DELETE: api/v1/companies/{id}
    [HttpDelete("{id:guid}")]
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

        company.IsDeleted = true;
        company.IsActive = false;
        company.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Firma başarıyla silindi."
        });
    }
}

public sealed record CreateCompanyRequest(
    string Name,
    string? TaxNumber,
    string? PhoneNumber,
    string? Email
);

public sealed record UpdateCompanyRequest(
    string Name,
    string? TaxNumber,
    string? PhoneNumber,
    string? Email,
    bool IsActive
);