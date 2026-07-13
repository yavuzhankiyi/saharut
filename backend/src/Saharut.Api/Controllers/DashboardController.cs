using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saharut.Api.Authorization;
using Saharut.Api.Common.Responses;
using Saharut.Domain.Entities;
using Saharut.Domain.Enums;
using Saharut.Infrastructure.Persistence;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public sealed class DashboardController : ControllerBase
{
    private const string SuperAdminRoleCode =
        "SUPER_ADMIN";

    private const string OperationsManagerRoleCode =
        "OPERATIONS_MANAGER";

    private const string FieldSalesRoleCode =
        "FIELD_SALES";

    private readonly SaharutDbContext _dbContext;

    public DashboardController(
        SaharutDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/v1/dashboard/summary
    [HttpGet("summary")]
    [HasPermission("DASHBOARD.READ")]
    public async Task<IActionResult> GetSummary(
        CancellationToken cancellationToken)
    {
        var currentUserId =
            GetCurrentUserId();

        if (!currentUserId.HasValue)
        {
            return Forbid();
        }

        var utcNow =
            DateTime.UtcNow;

        var todayStart =
            utcNow.Date;

        var tomorrowStart =
            todayStart.AddDays(1);

        var customerQuery = _dbContext.Customers
            .AsNoTracking()
            .Where(customer =>
                !customer.IsDeleted &&
                customer.IsActive &&
                !customer.Company.IsDeleted &&
                customer.Company.IsActive);

        var productQuery = _dbContext.Products
            .AsNoTracking()
            .Where(product =>
                !product.IsDeleted &&
                product.IsActive &&
                !product.Company.IsDeleted &&
                product.Company.IsActive);

        var visitQuery = _dbContext.Visits
            .AsNoTracking()
            .Where(visit =>
                !visit.IsDeleted &&
                !visit.Company.IsDeleted &&
                visit.Company.IsActive &&
                !visit.Customer.IsDeleted &&
                visit.Customer.IsActive &&
                !visit.AssignedUser.IsDeleted &&
                visit.AssignedUser.IsActive);

        customerQuery =
            ApplyCompanyScope(
                customerQuery,
                currentUserId.Value);

        productQuery =
            ApplyCompanyScope(
                productQuery,
                currentUserId.Value);

        visitQuery =
            ApplyVisitScope(
                visitQuery,
                currentUserId.Value);

        var activeCustomerCount =
            await customerQuery.CountAsync(
                cancellationToken);

        var activeProductCount =
            await productQuery.CountAsync(
                cancellationToken);

        var lowStockProductCount =
            await productQuery.CountAsync(
                product =>
                    product.StockQuantity <=
                    product.MinimumStockQuantity,
                cancellationToken);

        var todayVisitQuery =
            visitQuery.Where(visit =>
                visit.PlannedStartAt >= todayStart &&
                visit.PlannedStartAt < tomorrowStart);

        var todayTotalVisitCount =
            await todayVisitQuery.CountAsync(
                cancellationToken);

        var todayPlannedVisitCount =
            await todayVisitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Planned,
                cancellationToken);

        var todayInProgressVisitCount =
            await todayVisitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.InProgress,
                cancellationToken);

        var todayCompletedVisitCount =
            await todayVisitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Completed,
                cancellationToken);

        var todayCancelledVisitCount =
            await todayVisitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Cancelled,
                cancellationToken);

        var todayMissedVisitCount =
            await todayVisitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Missed,
                cancellationToken);

        var totalPlannedVisitCount =
            await visitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Planned,
                cancellationToken);

        var totalInProgressVisitCount =
            await visitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.InProgress,
                cancellationToken);

        var totalCompletedVisitCount =
            await visitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Completed,
                cancellationToken);

        var totalCancelledVisitCount =
            await visitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Cancelled,
                cancellationToken);

        var totalMissedVisitCount =
            await visitQuery.CountAsync(
                visit =>
                    visit.Status ==
                    VisitStatus.Missed,
                cancellationToken);

        var upcomingVisits =
            await visitQuery
                .Where(visit =>
                    visit.Status ==
                    VisitStatus.Planned &&
                    visit.PlannedStartAt >= utcNow)
                .OrderBy(visit =>
                    visit.PlannedStartAt)
                .Take(5)
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
                        visit.Status.ToString()
                })
                .ToListAsync(
                    cancellationToken);

        var recentlyCompletedVisits =
            await visitQuery
                .Where(visit =>
                    visit.Status ==
                    VisitStatus.Completed)
                .OrderByDescending(visit =>
                    visit.CheckOutAt ??
                    visit.UpdatedAt ??
                    visit.PlannedEndAt)
                .Take(5)
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
                    visit.PlannedStartAt,
                    visit.PlannedEndAt,
                    visit.CheckInAt,
                    visit.CheckOutAt,
                    visit.Outcome,
                    visit.Status,

                    statusName =
                        visit.Status.ToString(),

                    completedAt =
                        visit.CheckOutAt ??
                        visit.UpdatedAt
                })
                .ToListAsync(
                    cancellationToken);

        var lowStockProducts =
            await productQuery
                .Where(product =>
                    product.StockQuantity <=
                    product.MinimumStockQuantity)
                .OrderBy(product =>
                    product.StockQuantity)
                .Take(5)
                .Select(product => new
                {
                    product.Id,
                    product.CompanyId,

                    companyName =
                        product.Company.Name,

                    product.Name,
                    product.Code,
                    product.Unit,
                    product.StockQuantity,
                    product.MinimumStockQuantity,

                    stockDifference =
                        product.StockQuantity -
                        product.MinimumStockQuantity
                })
                .ToListAsync(
                    cancellationToken);

        var responseData = new
        {
            generatedAt =
                utcNow,

            scope = new
            {
                isGlobalCompanyAccess =
                    HasGlobalCompanyAccess(),

                isFieldSales =
                    IsFieldSalesUser(),

                currentUserId =
                    currentUserId.Value
            },

            counters = new
            {
                activeCustomerCount,
                activeProductCount,
                lowStockProductCount
            },

            todayVisits = new
            {
                date =
                    todayStart,

                total =
                    todayTotalVisitCount,

                planned =
                    todayPlannedVisitCount,

                inProgress =
                    todayInProgressVisitCount,

                completed =
                    todayCompletedVisitCount,

                cancelled =
                    todayCancelledVisitCount,

                missed =
                    todayMissedVisitCount
            },

            allVisits = new
            {
                planned =
                    totalPlannedVisitCount,

                inProgress =
                    totalInProgressVisitCount,

                completed =
                    totalCompletedVisitCount,

                cancelled =
                    totalCancelledVisitCount,

                missed =
                    totalMissedVisitCount
            },

            upcomingVisits,
            recentlyCompletedVisits,
            lowStockProducts
        };

        return Ok(
            ApiResponse<object>.Ok(
                responseData));
    }

    private IQueryable<Customer> ApplyCompanyScope(
        IQueryable<Customer> query,
        Guid currentUserId)
    {
        if (HasGlobalCompanyAccess())
        {
            return query;
        }

        return query.Where(customer =>
            customer.Company.CompanyUsers.Any(
                companyUser =>
                    companyUser.UserId ==
                    currentUserId &&
                    companyUser.IsActive &&
                    !companyUser.IsDeleted &&
                    companyUser.User.IsActive &&
                    !companyUser.User.IsDeleted));
    }

    private IQueryable<Product> ApplyCompanyScope(
        IQueryable<Product> query,
        Guid currentUserId)
    {
        if (HasGlobalCompanyAccess())
        {
            return query;
        }

        return query.Where(product =>
            product.Company.CompanyUsers.Any(
                companyUser =>
                    companyUser.UserId ==
                    currentUserId &&
                    companyUser.IsActive &&
                    !companyUser.IsDeleted &&
                    companyUser.User.IsActive &&
                    !companyUser.User.IsDeleted));
    }

    private IQueryable<Visit> ApplyVisitScope(
        IQueryable<Visit> query,
        Guid currentUserId)
    {
        if (!HasGlobalCompanyAccess())
        {
            query = query.Where(visit =>
                visit.Company.CompanyUsers.Any(
                    companyUser =>
                        companyUser.UserId ==
                        currentUserId &&
                        companyUser.IsActive &&
                        !companyUser.IsDeleted &&
                        companyUser.User.IsActive &&
                        !companyUser.User.IsDeleted));
        }

        if (IsFieldSalesUser())
        {
            query = query.Where(visit =>
                visit.AssignedUserId ==
                currentUserId);
        }

        return query;
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
}
