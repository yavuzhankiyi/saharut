using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
using Saharut.Api.Contracts.AuditLogs;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize]
public sealed class AuditLogsController : ControllerBase
{
    private readonly SaharutDbContext _dbContext;

    public AuditLogsController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/audit-logs
    [HttpGet]
    [HasPermission("AUDIT_LOGS.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] AuditLogQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page =
            PaginationHelper.NormalizePage(
                request.Page);

        var pageSize =
            PaginationHelper.NormalizePageSize(
                request.PageSize);

        var query = _dbContext.AuditLogs
            .AsNoTracking()
            .Where(auditLog =>
                !auditLog.IsDeleted);

        if (!string.IsNullOrWhiteSpace(
                request.Search))
        {
            var search =
                request.Search.Trim();

            query = query.Where(auditLog =>
                EF.Functions.ILike(
                    auditLog.EntityName,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    auditLog.EntityId,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    auditLog.Action,
                    $"%{search}%") ||

                (auditLog.UserDisplayName != null &&
                 EF.Functions.ILike(
                     auditLog.UserDisplayName,
                     $"%{search}%")) ||

                (auditLog.RequestPath != null &&
                 EF.Functions.ILike(
                     auditLog.RequestPath,
                     $"%{search}%")));
        }

        if (!string.IsNullOrWhiteSpace(
                request.EntityName))
        {
            var entityName =
                request.EntityName.Trim();

            query = query.Where(auditLog =>
                auditLog.EntityName ==
                entityName);
        }

        if (!string.IsNullOrWhiteSpace(
                request.EntityId))
        {
            var entityId =
                request.EntityId.Trim();

            query = query.Where(auditLog =>
                auditLog.EntityId ==
                entityId);
        }

        if (!string.IsNullOrWhiteSpace(
                request.Action))
        {
            var action = request.Action
                .Trim()
                .ToUpperInvariant();

            query = query.Where(auditLog =>
                auditLog.Action ==
                action);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(auditLog =>
                auditLog.UserId ==
                request.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(
                request.HttpMethod))
        {
            var httpMethod = request.HttpMethod
                .Trim()
                .ToUpperInvariant();

            query = query.Where(auditLog =>
                auditLog.HttpMethod ==
                httpMethod);
        }

        if (request.StartDate.HasValue)
        {
            var startDate =
                request.StartDate.Value
                    .ToUniversalTime();

            query = query.Where(auditLog =>
                auditLog.CreatedAt >=
                startDate);
        }

        if (request.EndDate.HasValue)
        {
            var endDate =
                request.EndDate.Value
                    .ToUniversalTime();

            query = query.Where(auditLog =>
                auditLog.CreatedAt <=
                endDate);
        }

        var descending = string.Equals(
            request.SortDirection,
            "desc",
            StringComparison.OrdinalIgnoreCase);

        query = request.SortBy
            .Trim()
            .ToLowerInvariant() switch
        {
            "entityname" => descending
                ? query.OrderByDescending(
                    auditLog =>
                        auditLog.EntityName)
                : query.OrderBy(
                    auditLog =>
                        auditLog.EntityName),

            "action" => descending
                ? query.OrderByDescending(
                    auditLog =>
                        auditLog.Action)
                : query.OrderBy(
                    auditLog =>
                        auditLog.Action),

            "userid" => descending
                ? query.OrderByDescending(
                    auditLog =>
                        auditLog.UserId)
                : query.OrderBy(
                    auditLog =>
                        auditLog.UserId),

            "httpmethod" => descending
                ? query.OrderByDescending(
                    auditLog =>
                        auditLog.HttpMethod)
                : query.OrderBy(
                    auditLog =>
                        auditLog.HttpMethod),

            _ => descending
                ? query.OrderByDescending(
                    auditLog =>
                        auditLog.CreatedAt)
                : query.OrderBy(
                    auditLog =>
                        auditLog.CreatedAt)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var auditLogs = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
            .Take(pageSize)
            .Select(auditLog => new
            {
                auditLog.Id,
                auditLog.EntityName,
                auditLog.EntityId,
                auditLog.Action,
                auditLog.UserId,
                auditLog.UserDisplayName,
                auditLog.HttpMethod,
                auditLog.RequestPath,
                auditLog.IpAddress,
                auditLog.ChangedColumns,
                auditLog.CreatedAt
            })
            .ToListAsync(
                cancellationToken);

        return Ok(
            PagedResponse.Create(
                auditLogs,
                page,
                pageSize,
                totalCount));
    }

    // GET: api/v1/audit-logs/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("AUDIT_LOGS.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var auditLog =
            await _dbContext.AuditLogs
                .AsNoTracking()
                .Where(auditLog =>
                    auditLog.Id == id &&
                    !auditLog.IsDeleted)
                .Select(auditLog => new
                {
                    auditLog.Id,
                    auditLog.EntityName,
                    auditLog.EntityId,
                    auditLog.Action,
                    auditLog.UserId,
                    auditLog.UserDisplayName,
                    auditLog.HttpMethod,
                    auditLog.RequestPath,
                    auditLog.IpAddress,
                    auditLog.OldValues,
                    auditLog.NewValues,
                    auditLog.ChangedColumns,
                    auditLog.CreatedAt
                })
                .FirstOrDefaultAsync(
                    cancellationToken);

        if (auditLog is null)
        {
            return NotFound(new
            {
                success = false,
                message =
                    "Audit log kaydı bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                auditLog));
    }

    // GET: api/v1/audit-logs/entity/{entityName}/{entityId}
    [HttpGet(
        "entity/{entityName}/{entityId}")]
    [HasPermission("AUDIT_LOGS.READ")]
    public async Task<IActionResult> GetEntityHistory(
        string entityName,
        string entityId,
        CancellationToken cancellationToken)
    {
        var normalizedEntityName =
            entityName.Trim();

        var normalizedEntityId =
            entityId.Trim();

        var auditLogs =
            await _dbContext.AuditLogs
                .AsNoTracking()
                .Where(auditLog =>
                    !auditLog.IsDeleted &&
                    auditLog.EntityName ==
                    normalizedEntityName &&
                    auditLog.EntityId ==
                    normalizedEntityId)
                .OrderByDescending(auditLog =>
                    auditLog.CreatedAt)
                .Select(auditLog => new
                {
                    auditLog.Id,
                    auditLog.Action,
                    auditLog.UserId,
                    auditLog.UserDisplayName,
                    auditLog.HttpMethod,
                    auditLog.RequestPath,
                    auditLog.OldValues,
                    auditLog.NewValues,
                    auditLog.ChangedColumns,
                    auditLog.CreatedAt
                })
                .ToListAsync(
                    cancellationToken);

        var responseData = new
        {
            entityName =
                normalizedEntityName,

            entityId =
                normalizedEntityId,

            items =
                auditLogs,

            totalCount =
                auditLogs.Count
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData));
    }
}