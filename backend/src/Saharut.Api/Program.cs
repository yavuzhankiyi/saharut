using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Saharut.Api.Authorization;
using Saharut.Api.Middleware;
using Saharut.Infrastructure.Auditing;
using Saharut.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("PostgreSql")
    ?? throw new InvalidOperationException(
        "PostgreSQL bağlantı bilgisi bulunamadı.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "JWT Issuer bilgisi bulunamadı.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "JWT Audience bilgisi bulunamadı.");

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException(
        "JWT SecretKey bilgisi bulunamadı.");

// HTTP context
builder.Services.AddHttpContextAccessor();

// Audit interceptor
builder.Services.AddScoped<AuditSaveChangesInterceptor>();

// PostgreSQL ve audit interceptor
builder.Services.AddDbContext<SaharutDbContext>(
    (serviceProvider, options) =>
    {
        options.UseNpgsql(connectionString);

        options.AddInterceptors(
            serviceProvider.GetRequiredService<
                AuditSaveChangesInterceptor>());
    });

// JWT Authentication
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSecretKey)),

                ClockSkew = TimeSpan.Zero
            };
    });

// Permission authorization
builder.Services.AddAuthorization();

builder.Services.AddSingleton<
    IAuthorizationPolicyProvider,
    PermissionAuthorizationPolicyProvider>();

builder.Services.AddScoped<
    IAuthorizationHandler,
    PermissionAuthorizationHandler>();

builder.Services.AddControllers();

builder.Services.AddOpenApi();

var app = builder.Build();

// Migration ve başlangıç seed işlemleri
await using (var scope =
             app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider
        .GetRequiredService<SaharutDbContext>();

    await dbContext.Database.MigrateAsync();

    await DatabaseSeeder.SeedAsync(dbContext);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Bütün middleware'lerden önce merkezi hata yakalama
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();