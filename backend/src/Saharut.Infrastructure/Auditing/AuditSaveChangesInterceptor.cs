using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Saharut.Domain.Entities;

namespace Saharut.Infrastructure.Auditing;

public sealed class AuditSaveChangesInterceptor
    : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditSaveChangesInterceptor(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        AddAuditLogs(eventData.Context);

        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>>
        SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
    {
        AddAuditLogs(eventData.Context);

        return base.SavingChangesAsync(
            eventData,
            result,
            cancellationToken);
    }

    private void AddAuditLogs(DbContext? dbContext)
    {
        if (dbContext is null)
        {
            return;
        }

        dbContext.ChangeTracker.DetectChanges();

        var httpContext = _httpContextAccessor.HttpContext;
        var currentUser = httpContext?.User;

        Guid? currentUserId = null;

        var userIdValue = currentUser?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (Guid.TryParse(userIdValue, out var parsedUserId))
        {
            currentUserId = parsedUserId;
        }

        var userDisplayName =
            currentUser?.FindFirstValue(ClaimTypes.Name);

        var httpMethod =
            httpContext?.Request.Method;

        var requestPath =
            httpContext?.Request.Path.Value;

        var ipAddress =
            httpContext?.Connection.RemoteIpAddress?.ToString();

        var auditLogs = new List<AuditLog>();

        var entries = dbContext.ChangeTracker
            .Entries()
            .Where(entry =>
                entry.Entity is not AuditLog &&
                entry.Entity is BaseEntity &&
                entry.State is
                    EntityState.Added or
                    EntityState.Modified or
                    EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var auditLog = CreateAuditLog(
                entry,
                currentUserId,
                userDisplayName,
                httpMethod,
                requestPath,
                ipAddress);

            if (auditLog is not null)
            {
                auditLogs.Add(auditLog);
            }
        }

        if (auditLogs.Count > 0)
        {
            dbContext.Set<AuditLog>().AddRange(auditLogs);
        }
    }

    private static AuditLog? CreateAuditLog(
        EntityEntry entry,
        Guid? userId,
        string? userDisplayName,
        string? httpMethod,
        string? requestPath,
        string? ipAddress)
    {
        var oldValues =
            new Dictionary<string, object?>();

        var newValues =
            new Dictionary<string, object?>();

        var changedColumns =
            new List<string>();

        string action;

        switch (entry.State)
        {
            case EntityState.Added:
                action = "CREATE";

                foreach (var property in entry.Properties)
                {
                    if (ShouldIgnoreProperty(property.Metadata.Name))
                    {
                        continue;
                    }

                    newValues[property.Metadata.Name] =
                        property.CurrentValue;
                }

                break;

            case EntityState.Modified:
                action = DetermineModifiedAction(entry);

                foreach (var property in entry.Properties)
                {
                    if (ShouldIgnoreProperty(property.Metadata.Name))
                    {
                        continue;
                    }

                    if (!property.IsModified)
                    {
                        continue;
                    }

                    var originalValue = property.OriginalValue;
                    var currentValue = property.CurrentValue;

                    if (Equals(originalValue, currentValue))
                    {
                        continue;
                    }

                    oldValues[property.Metadata.Name] =
                        originalValue;

                    newValues[property.Metadata.Name] =
                        currentValue;

                    changedColumns.Add(
                        property.Metadata.Name);
                }

                if (changedColumns.Count == 0)
                {
                    return null;
                }

                break;

            case EntityState.Deleted:
                action = "DELETE";

                foreach (var property in entry.Properties)
                {
                    if (ShouldIgnoreProperty(property.Metadata.Name))
                    {
                        continue;
                    }

                    oldValues[property.Metadata.Name] =
                        property.OriginalValue;
                }

                break;

            default:
                return null;
        }

        var entityId = GetEntityId(entry);

        return new AuditLog
        {
            EntityName = entry.Metadata.ClrType.Name,
            EntityId = entityId,
            Action = action,
            UserId = userId,
            UserDisplayName = userDisplayName,
            HttpMethod = httpMethod,
            RequestPath = requestPath,
            IpAddress = ipAddress,

            OldValues = oldValues.Count == 0
                ? null
                : JsonSerializer.Serialize(oldValues),

            NewValues = newValues.Count == 0
                ? null
                : JsonSerializer.Serialize(newValues),

            ChangedColumns = changedColumns.Count == 0
                ? null
                : JsonSerializer.Serialize(changedColumns)
        };
    }

    private static string DetermineModifiedAction(
        EntityEntry entry)
    {
        var isDeletedProperty = entry.Properties
            .FirstOrDefault(property =>
                property.Metadata.Name ==
                nameof(BaseEntity.IsDeleted));

        if (isDeletedProperty is not null &&
            isDeletedProperty.IsModified &&
            isDeletedProperty.CurrentValue is true)
        {
            return "DELETE";
        }

        return "UPDATE";
    }

    private static string GetEntityId(
        EntityEntry entry)
    {
        var idProperty = entry.Properties
            .FirstOrDefault(property =>
                property.Metadata.Name ==
                nameof(BaseEntity.Id));

        return idProperty?.CurrentValue?.ToString()
            ?? idProperty?.OriginalValue?.ToString()
            ?? string.Empty;
    }

    private static bool ShouldIgnoreProperty(
        string propertyName)
    {
        return propertyName is
            nameof(BaseEntity.CreatedAt) or
            nameof(BaseEntity.UpdatedAt);
    }
}