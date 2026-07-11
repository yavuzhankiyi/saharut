using Microsoft.AspNetCore.Mvc;

namespace Saharut.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            success = true,
            message = "Saharut API çalışıyor.",
            environment = Environment.GetEnvironmentVariable(
                "ASPNETCORE_ENVIRONMENT"
            ),
            timestamp = DateTime.UtcNow
        });
    }
}