using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Pagination;
using Saharut.Api.Common.Responses;
using Saharut.Api.Contracts.Visits;
using Saharut.Domain.Entities;
using Saharut.Domain.Enums;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/visits")]
[Authorize]
public sealed class VisitsController : ControllerBase
{
    private const string SuperAdminRoleCode =
        "SUPER_ADMIN";

    private const string OperationsManagerRoleCode =
        "OPERATIONS_MANAGER";

    private const string FieldSalesRoleCode =
        "FIELD_SALES";

    private readonly SaharutDbContext _dbContext;

    public VisitsController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/visits
    [HttpGet]
    [HasPermission("VISITS.READ")]
    public async Task<IActionResult> GetAll(
        [FromQuery] VisitQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page =
            PaginationHelper.NormalizePage(
                request.Page);

        var pageSize =
            PaginationHelper.NormalizePageSize(
                request.PageSize);

        var query = _dbContext.Visits
            .AsNoTracking()
            .Where(visit =>
                !visit.IsDeleted &&
                !visit.Company.IsDeleted &&
                !visit.Customer.IsDeleted &&
                !visit.AssignedUser.IsDeleted);

        query = ApplyAccessScope(query);

        if (request.CompanyId.HasValue)
        {
            query = query.Where(visit =>
                visit.CompanyId ==
                request.CompanyId.Value);
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(visit =>
                visit.CustomerId ==
                request.CustomerId.Value);
        }

        if (request.AssignedUserId.HasValue)
        {
            query = query.Where(visit =>
                visit.AssignedUserId ==
                request.AssignedUserId.Value);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(visit =>
                visit.Status ==
                request.Status.Value);
        }

        if (request.PlannedFrom.HasValue)
        {
            query = query.Where(visit =>
                visit.PlannedStartAt >=
                request.PlannedFrom.Value);
        }

        if (request.PlannedTo.HasValue)
        {
            query = query.Where(visit =>
                visit.PlannedStartAt <=
                request.PlannedTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(
                request.Search))
        {
            var search =
                request.Search.Trim();

            query = query.Where(visit =>
                EF.Functions.ILike(
                    visit.Title,
                    $"%{search}%") ||

                (visit.Purpose != null &&
                 EF.Functions.ILike(
                     visit.Purpose,
                     $"%{search}%")) ||

                EF.Functions.ILike(
                    visit.Customer.Name,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    visit.Customer.Code,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    visit.Company.Name,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    visit.AssignedUser.FirstName,
                    $"%{search}%") ||

                EF.Functions.ILike(
                    visit.AssignedUser.LastName,
                    $"%{search}%"));
        }

        var descending =
            string.Equals(
                request.SortDirection,
                "desc",
                StringComparison.OrdinalIgnoreCase);

        var sortBy =
            string.IsNullOrWhiteSpace(request.SortBy)
                ? "plannedstartat"
                : request.SortBy
                    .Trim()
                    .ToLowerInvariant();

        query = sortBy switch
        {
            "title" => descending
                ? query.OrderByDescending(
                    visit => visit.Title)
                : query.OrderBy(
                    visit => visit.Title),

            "status" => descending
                ? query.OrderByDescending(
                    visit => visit.Status)
                : query.OrderBy(
                    visit => visit.Status),

            "customer" or "customername" => descending
                ? query.OrderByDescending(
                    visit => visit.Customer.Name)
                : query.OrderBy(
                    visit => visit.Customer.Name),

            "assigneduser" or "assignedusername" =>
                descending
                    ? query.OrderByDescending(
                        visit =>
                            visit.AssignedUser.FirstName)
                    : query.OrderBy(
                        visit =>
                            visit.AssignedUser.FirstName),

            "createdat" => descending
                ? query.OrderByDescending(
                    visit => visit.CreatedAt)
                : query.OrderBy(
                    visit => visit.CreatedAt),

            "plannedendat" => descending
                ? query.OrderByDescending(
                    visit => visit.PlannedEndAt)
                : query.OrderBy(
                    visit => visit.PlannedEndAt),

            _ => descending
                ? query.OrderByDescending(
                    visit => visit.PlannedStartAt)
                : query.OrderBy(
                    visit => visit.PlannedStartAt)
        };

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var visits = await query
            .Skip(
                PaginationHelper.CalculateSkip(
                    page,
                    pageSize))
            .Take(pageSize)
            .Select(visit => new
            {
                visit.Id,
                visit.CompanyId,

                companyName =
                    visit.Company.Name,

                visit.CustomerId,

                customerName =
                    visit.Customer.Name,

                customerCode =
                    visit.Customer.Code,

                visit.AssignedUserId,

                assignedUserName =
                    visit.AssignedUser.FirstName +
                    " " +
                    visit.AssignedUser.LastName,

                visit.Title,
                visit.Purpose,
                visit.PlannedStartAt,
                visit.PlannedEndAt,
                visit.Status,
                statusName =
                    visit.Status.ToString(),
                visit.CheckInAt,
                visit.CheckOutAt,
                visit.CreatedAt,
                visit.UpdatedAt
            })
            .ToListAsync(
                cancellationToken);

        return Ok(
            PagedResponse.Create(
                visits,
                page,
                pageSize,
                totalCount));
    }

    // GET: api/v1/visits/{id}
    [HttpGet("{id:guid}")]
    [HasPermission("VISITS.READ")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Visits
            .AsNoTracking()
            .Where(visit =>
                visit.Id == id &&
                !visit.IsDeleted &&
                !visit.Company.IsDeleted &&
                !visit.Customer.IsDeleted &&
                !visit.AssignedUser.IsDeleted);

        query = ApplyAccessScope(query);

        var visit = await query
            .Select(visit => new
            {
                visit.Id,
                visit.CompanyId,

                Company = new
                {
                    visit.Company.Id,
                    visit.Company.Name,
                    visit.Company.IsActive
                },

                visit.CustomerId,

                Customer = new
                {
                    visit.Customer.Id,
                    visit.Customer.Name,
                    visit.Customer.Code,
                    visit.Customer.CustomerType,
                    visit.Customer.City,
                    visit.Customer.District,
                    visit.Customer.Address,
                    visit.Customer.Latitude,
                    visit.Customer.Longitude
                },

                visit.AssignedUserId,

                AssignedUser = new
                {
                    visit.AssignedUser.Id,
                    visit.AssignedUser.FirstName,
                    visit.AssignedUser.LastName,
                    visit.AssignedUser.PhoneNumber,
                    visit.AssignedUser.Email
                },

                visit.Title,
                visit.Purpose,
                visit.PlannedStartAt,
                visit.PlannedEndAt,
                visit.Status,
                statusName =
                    visit.Status.ToString(),
                visit.CheckInAt,
                visit.CheckOutAt,
                visit.CheckInLatitude,
                visit.CheckInLongitude,
                visit.CheckOutLatitude,
                visit.CheckOutLongitude,
                visit.Outcome,
                visit.Notes,
                visit.CancellationReason,
                visit.CreatedAt,
                visit.UpdatedAt
            })
            .FirstOrDefaultAsync(
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        return Ok(
            ApiResponse<object>.Ok(
                visit));
    }

    // POST: api/v1/visits
    [HttpPost]
    [HasPermission("VISITS.CREATE")]
    public async Task<IActionResult> Create(
        [FromBody] CreateVisitRequest request,
        CancellationToken cancellationToken)
    {
        var validationResult =
            ValidateVisitPlan(
                request.Title,
                request.PlannedStartAt,
                request.PlannedEndAt);

        if (validationResult is not null)
        {
            return validationResult;
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
                    "Firma bulunamadı, aktif değil veya firmaya erişim yetkiniz yok."
            });
        }

        var customer =
            await _dbContext.Customers
                .FirstOrDefaultAsync(
                    customer =>
                        customer.Id ==
                        request.CustomerId &&
                        customer.CompanyId ==
                        company.Id &&
                        customer.IsActive &&
                        !customer.IsDeleted,
                    cancellationToken);

        if (customer is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Müşteri bulunamadı, aktif değil veya seçilen firmaya ait değil."
            });
        }

        var assignedUser =
            await GetAssignableUserAsync(
                request.AssignedUserId,
                company.Id,
                cancellationToken);

        if (assignedUser is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Atanacak kullanıcı bulunamadı, aktif değil veya seçilen firmaya bağlı değil."
            });
        }

        if (IsFieldSalesUser())
        {
            var currentUserId =
                GetCurrentUserId();

            if (!currentUserId.HasValue ||
                request.AssignedUserId !=
                currentUserId.Value)
            {
                return Forbid();
            }
        }

        var visit = new Visit
        {
            CompanyId =
                company.Id,

            Company =
                company,

            CustomerId =
                customer.Id,

            Customer =
                customer,

            AssignedUserId =
                assignedUser.Id,

            AssignedUser =
                assignedUser,

            Title =
                request.Title.Trim(),

            Purpose =
                NormalizeOptionalText(
                    request.Purpose),

            PlannedStartAt =
                request.PlannedStartAt,

            PlannedEndAt =
                request.PlannedEndAt,

            Status =
                VisitStatus.Planned,

            Notes =
                NormalizeOptionalText(
                    request.Notes)
        };

        _dbContext.Visits.Add(visit);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = visit.Id
            },
            ApiResponse<object>.Created(
                CreateVisitResponse(
                    visit),
                "Ziyaret başarıyla planlandı."));
    }

    // PUT: api/v1/visits/{id}
    [HttpPut("{id:guid}")]
    [HasPermission("VISITS.UPDATE")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateVisitRequest request,
        CancellationToken cancellationToken)
    {
        var validationResult =
            ValidateVisitPlan(
                request.Title,
                request.PlannedStartAt,
                request.PlannedEndAt);

        if (validationResult is not null)
        {
            return validationResult;
        }

        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status !=
            VisitStatus.Planned)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Yalnızca planlanmış ziyaretler güncellenebilir."
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
                    "Firma bulunamadı, aktif değil veya firmaya erişim yetkiniz yok."
            });
        }

        var customer =
            await _dbContext.Customers
                .FirstOrDefaultAsync(
                    customer =>
                        customer.Id ==
                        request.CustomerId &&
                        customer.CompanyId ==
                        company.Id &&
                        customer.IsActive &&
                        !customer.IsDeleted,
                    cancellationToken);

        if (customer is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Müşteri bulunamadı, aktif değil veya seçilen firmaya ait değil."
            });
        }

        var assignedUser =
            await GetAssignableUserAsync(
                request.AssignedUserId,
                company.Id,
                cancellationToken);

        if (assignedUser is null)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Atanacak kullanıcı bulunamadı, aktif değil veya seçilen firmaya bağlı değil."
            });
        }

        if (IsFieldSalesUser())
        {
            var currentUserId =
                GetCurrentUserId();

            if (!currentUserId.HasValue ||
                request.AssignedUserId !=
                currentUserId.Value)
            {
                return Forbid();
            }
        }

        visit.CompanyId =
            company.Id;

        visit.Company =
            company;

        visit.CustomerId =
            customer.Id;

        visit.Customer =
            customer;

        visit.AssignedUserId =
            assignedUser.Id;

        visit.AssignedUser =
            assignedUser;

        visit.Title =
            request.Title.Trim();

        visit.Purpose =
            NormalizeOptionalText(
                request.Purpose);

        visit.PlannedStartAt =
            request.PlannedStartAt;

        visit.PlannedEndAt =
            request.PlannedEndAt;

        visit.Notes =
            NormalizeOptionalText(
                request.Notes);

        visit.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                CreateVisitResponse(
                    visit),
                "Ziyaret başarıyla güncellendi."));
    }

    // PATCH: api/v1/visits/{id}/check-in
    [HttpPatch("{id:guid}/check-in")]
    [HasPermission("VISITS.CHECK_IN")]
    public async Task<IActionResult> CheckIn(
        Guid id,
        [FromBody] VisitCheckInRequest request,
        CancellationToken cancellationToken)
    {
        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status !=
            VisitStatus.Planned)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Yalnızca planlanmış ziyarete check-in yapılabilir."
            });
        }

        visit.Status =
            VisitStatus.InProgress;

        visit.CheckInAt =
            DateTime.UtcNow;

        visit.CheckInLatitude =
            request.Latitude;

        visit.CheckInLongitude =
            request.Longitude;

        if (!string.IsNullOrWhiteSpace(
                request.Notes))
        {
            visit.Notes =
                MergeNotes(
                    visit.Notes,
                    request.Notes);
        }

        visit.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    visit.Id,
                    visit.Status,
                    statusName =
                        visit.Status.ToString(),
                    visit.CheckInAt,
                    visit.CheckInLatitude,
                    visit.CheckInLongitude,
                    visit.UpdatedAt
                },
                "Ziyaret check-in işlemi başarıyla tamamlandı."));
    }

    // PATCH: api/v1/visits/{id}/check-out
    [HttpPatch("{id:guid}/check-out")]
    [HasPermission("VISITS.CHECK_OUT")]
    public async Task<IActionResult> CheckOut(
        Guid id,
        [FromBody] VisitCheckOutRequest request,
        CancellationToken cancellationToken)
    {
        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status !=
                VisitStatus.InProgress ||
            !visit.CheckInAt.HasValue)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Check-out için ziyaretin başlamış olması gerekir."
            });
        }

        if (visit.CheckOutAt.HasValue)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Bu ziyaret için daha önce check-out yapılmış."
            });
        }

        visit.CheckOutAt =
            DateTime.UtcNow;

        visit.CheckOutLatitude =
            request.Latitude;

        visit.CheckOutLongitude =
            request.Longitude;

        if (!string.IsNullOrWhiteSpace(
                request.Notes))
        {
            visit.Notes =
                MergeNotes(
                    visit.Notes,
                    request.Notes);
        }

        visit.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    visit.Id,
                    visit.Status,
                    statusName =
                        visit.Status.ToString(),
                    visit.CheckOutAt,
                    visit.CheckOutLatitude,
                    visit.CheckOutLongitude,
                    visit.UpdatedAt
                },
                "Ziyaret check-out işlemi başarıyla tamamlandı."));
    }

    // PATCH: api/v1/visits/{id}/complete
    [HttpPatch("{id:guid}/complete")]
    [HasPermission("VISITS.COMPLETE")]
    public async Task<IActionResult> Complete(
        Guid id,
        [FromBody] CompleteVisitRequest request,
        CancellationToken cancellationToken)
    {
        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status !=
                VisitStatus.InProgress ||
            !visit.CheckInAt.HasValue)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Yalnızca başlamış ziyaret tamamlanabilir."
            });
        }

        if (!visit.CheckOutAt.HasValue)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Ziyareti tamamlamadan önce check-out yapılmalıdır."
            });
        }

        if (string.IsNullOrWhiteSpace(
                request.Outcome))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ziyaret sonucu zorunludur."
            });
        }

        visit.Status =
            VisitStatus.Completed;

        visit.Outcome =
            request.Outcome.Trim();

        if (!string.IsNullOrWhiteSpace(
                request.Notes))
        {
            visit.Notes =
                MergeNotes(
                    visit.Notes,
                    request.Notes);
        }

        visit.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    visit.Id,
                    visit.Status,
                    statusName =
                        visit.Status.ToString(),
                    visit.Outcome,
                    visit.CheckInAt,
                    visit.CheckOutAt,
                    visit.UpdatedAt
                },
                "Ziyaret başarıyla tamamlandı."));
    }

    // PATCH: api/v1/visits/{id}/cancel
    [HttpPatch("{id:guid}/cancel")]
    [HasPermission("VISITS.CANCEL")]
    public async Task<IActionResult> Cancel(
        Guid id,
        [FromBody] CancelVisitRequest request,
        CancellationToken cancellationToken)
    {
        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status is
            VisitStatus.Completed or
            VisitStatus.Cancelled or
            VisitStatus.Missed)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Tamamlanmış, iptal edilmiş veya kaçırılmış ziyaret iptal edilemez."
            });
        }

        if (string.IsNullOrWhiteSpace(
                request.CancellationReason))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "İptal nedeni zorunludur."
            });
        }

        visit.Status =
            VisitStatus.Cancelled;

        visit.CancellationReason =
            request.CancellationReason.Trim();

        visit.UpdatedAt =
            DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    visit.Id,
                    visit.Status,
                    statusName =
                        visit.Status.ToString(),
                    visit.CancellationReason,
                    visit.UpdatedAt
                },
                "Ziyaret başarıyla iptal edildi."));
    }

    // DELETE: api/v1/visits/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission("VISITS.DELETE")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var visit =
            await GetAccessibleVisitAsync(
                id,
                cancellationToken);

        if (visit is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Ziyaret bulunamadı."
            });
        }

        if (visit.Status ==
            VisitStatus.InProgress)
        {
            return Conflict(new
            {
                success = false,
                message =
                    "Devam eden ziyaret silinemez."
            });
        }

        visit.IsDeleted = true;
        visit.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    visit.Id
                },
                "Ziyaret başarıyla silindi."));
    }

    private IQueryable<Visit> ApplyAccessScope(
        IQueryable<Visit> query)
    {
        if (HasGlobalCompanyAccess())
        {
            return query;
        }

        var currentUserId =
            GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return query.Where(_ => false);
        }

        query = query.Where(visit =>
            visit.Company.CompanyUsers.Any(
                companyUser =>
                    companyUser.UserId ==
                    currentUserId.Value &&
                    companyUser.IsActive &&
                    !companyUser.IsDeleted &&
                    companyUser.User.IsActive &&
                    !companyUser.User.IsDeleted));

        if (IsFieldSalesUser())
        {
            query = query.Where(visit =>
                visit.AssignedUserId ==
                currentUserId.Value);
        }

        return query;
    }

    private async Task<Visit?>
        GetAccessibleVisitAsync(
            Guid visitId,
            CancellationToken cancellationToken)
    {
        var query = _dbContext.Visits
            .Include(visit =>
                visit.Company)
            .Include(visit =>
                visit.Customer)
            .Include(visit =>
                visit.AssignedUser)
            .Where(visit =>
                visit.Id == visitId &&
                !visit.IsDeleted &&
                !visit.Company.IsDeleted &&
                !visit.Customer.IsDeleted &&
                !visit.AssignedUser.IsDeleted);

        query = ApplyAccessScope(query);

        return await query
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
                        companyUser.IsActive &&
                        !companyUser.IsDeleted &&
                        companyUser.User.IsActive &&
                        !companyUser.User.IsDeleted))
            .FirstOrDefaultAsync(
                cancellationToken);
    }

    private async Task<User?>
        GetAssignableUserAsync(
            Guid userId,
            Guid companyId,
            CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(
                user =>
                    user.Id == userId &&
                    user.IsActive &&
                    !user.IsDeleted &&
                    user.CompanyUsers.Any(
                        companyUser =>
                            companyUser.CompanyId ==
                            companyId &&
                            companyUser.IsActive &&
                            !companyUser.IsDeleted),
                cancellationToken);
    }

    private BadRequestObjectResult?
        ValidateVisitPlan(
            string? title,
            DateTime plannedStartAt,
            DateTime plannedEndAt)
    {
        if (string.IsNullOrWhiteSpace(
                title))
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Ziyaret başlığı zorunludur."
            });
        }

        if (plannedEndAt <=
            plannedStartAt)
        {
            return BadRequest(new
            {
                success = false,
                message =
                    "Planlanan bitiş zamanı başlangıç zamanından sonra olmalıdır."
            });
        }

        return null;
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

    private bool IsFieldSalesUser()
    {
        return User.IsInRole(
            FieldSalesRoleCode);
    }

    private static object CreateVisitResponse(
        Visit visit)
    {
        return new
        {
            visit.Id,
            visit.CompanyId,

            companyName =
                visit.Company.Name,

            visit.CustomerId,

            customerName =
                visit.Customer.Name,

            customerCode =
                visit.Customer.Code,

            visit.AssignedUserId,

            assignedUserName =
                visit.AssignedUser.FirstName +
                " " +
                visit.AssignedUser.LastName,

            visit.Title,
            visit.Purpose,
            visit.PlannedStartAt,
            visit.PlannedEndAt,
            visit.Status,
            statusName =
                visit.Status.ToString(),
            visit.Notes,
            visit.CreatedAt,
            visit.UpdatedAt
        };
    }

    private static string? NormalizeOptionalText(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static string MergeNotes(
        string? existingNotes,
        string newNotes)
    {
        var normalizedNewNotes =
            newNotes.Trim();

        return string.IsNullOrWhiteSpace(
                existingNotes)
            ? normalizedNewNotes
            : existingNotes.Trim() +
              Environment.NewLine +
              normalizedNewNotes;
    }
}
