using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Domain.Entities;
using Saharut.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "SUPER_ADMIN")]
public sealed class RolesController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public RolesController(SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/roles
    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var roles = await _dbContext.Roles
            .AsNoTracking()
            .Where(role => !role.IsDeleted)
            .OrderBy(role => role.Name)
            .Select(role => new
            {
                role.Id,
                role.Name,
                role.Code,
                role.Description,
                role.IsActive,
                role.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(roles);
    }

    // POST: api/v1/roles
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new
            {
                success = false,
                message = "Rol adı ve rol kodu zorunludur."
            });
        }

        var normalizedCode = request.Code
            .Trim()
            .ToUpperInvariant();

        var codeExists = await _dbContext.Roles
            .AnyAsync(
                role =>
                    role.Code == normalizedCode &&
                    !role.IsDeleted,
                cancellationToken);

        if (codeExists)
        {
            return Conflict(new
            {
                success = false,
                message = "Bu rol kodu zaten kullanılıyor."
            });
        }

        var role = new Role
        {
            Name = request.Name.Trim(),
            Code = normalizedCode,
            Description = request.Description?.Trim(),
            IsActive = true
        };

        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Rol başarıyla oluşturuldu.",
            role.Id,
            role.Name,
            role.Code,
            role.Description,
            role.IsActive
        });
    }
}

public sealed record CreateRoleRequest(
    string Name,
    string Code,
    string? Description
);