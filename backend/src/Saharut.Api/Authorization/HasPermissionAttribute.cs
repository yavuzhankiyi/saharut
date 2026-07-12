using Microsoft.AspNetCore.Authorization;

namespace Saharut.Api.Authorization;

public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "PERMISSION:";

    public HasPermissionAttribute(string permissionCode)
    {
        Policy = $"{PolicyPrefix}{permissionCode.Trim().ToUpperInvariant()}";
    }
}