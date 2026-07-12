using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Saharut.Api.Authorization;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/authorization-test")]
[Authorize]
public sealed class AuthorizationTestController : ControllerBase
{
    [HttpGet("authenticated")]
    public IActionResult Authenticated()
    {
        return Ok(new
        {
            success = true,
            message = "Kimlik doğrulama başarılı."
        });
    }

    [HttpGet("companies-read")]
    [HasPermission("COMPANIES.READ")]
    public IActionResult CompaniesRead()
    {
        return Ok(new
        {
            success = true,
            permission = "COMPANIES.READ",
            message = "Firma görüntüleme yetkisi doğrulandı."
        });
    }

    [HttpGet("companies-delete")]
    [HasPermission("COMPANIES.DELETE")]
    public IActionResult CompaniesDelete()
    {
        return Ok(new
        {
            success = true,
            permission = "COMPANIES.DELETE",
            message = "Firma silme yetkisi doğrulandı."
        });
    }
}