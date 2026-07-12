using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Saharut.Api.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(
        HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (OperationCanceledException)
            when (httpContext.RequestAborted.IsCancellationRequested)
        {
            _logger.LogInformation(
                "İstemci isteği iptal etti. TraceId: {TraceId}, Path: {Path}",
                httpContext.TraceIdentifier,
                httpContext.Request.Path);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(
                httpContext,
                exception);
        }
    }

    private async Task HandleExceptionAsync(
        HttpContext httpContext,
        Exception exception)
    {
        var traceId = httpContext.TraceIdentifier;

        var error = MapException(exception);

        _logger.LogError(
            exception,
            """
            İşlenmeyen API hatası oluştu.
            TraceId: {TraceId}
            Method: {Method}
            Path: {Path}
            StatusCode: {StatusCode}
            """,
            traceId,
            httpContext.Request.Method,
            httpContext.Request.Path,
            error.StatusCode);

        if (httpContext.Response.HasStarted)
        {
            _logger.LogWarning(
                "Response başladıktan sonra hata oluştu. TraceId: {TraceId}",
                traceId);

            throw exception;
        }

        httpContext.Response.Clear();
        httpContext.Response.StatusCode = error.StatusCode;
        httpContext.Response.ContentType =
            "application/json; charset=utf-8";

        var response = new
        {
            success = false,
            error = new
            {
                code = error.Code,
                message = error.Message,
                detail = _environment.IsDevelopment()
                    ? exception.Message
                    : null,
                traceId
            }
        };

        await JsonSerializer.SerializeAsync(
            httpContext.Response.Body,
            response,
            JsonOptions,
            httpContext.RequestAborted);
    }

    private static ExceptionMapping MapException(
        Exception exception)
    {
        return exception switch
        {
            BadHttpRequestException => new ExceptionMapping(
                StatusCodes.Status400BadRequest,
                "BAD_REQUEST",
                "Gönderilen istek işlenemedi."),

            UnauthorizedAccessException => new ExceptionMapping(
                StatusCodes.Status403Forbidden,
                "FORBIDDEN",
                "Bu işlem için yetkiniz bulunmuyor."),

            KeyNotFoundException => new ExceptionMapping(
                StatusCodes.Status404NotFound,
                "NOT_FOUND",
                "İstenen kayıt bulunamadı."),

            DbUpdateConcurrencyException => new ExceptionMapping(
                StatusCodes.Status409Conflict,
                "CONCURRENCY_CONFLICT",
                "Kayıt başka bir işlem tarafından değiştirilmiş olabilir."),

            DbUpdateException => new ExceptionMapping(
                StatusCodes.Status409Conflict,
                "DATABASE_CONFLICT",
                "Veritabanı işlemi tamamlanamadı."),

            InvalidOperationException => new ExceptionMapping(
                StatusCodes.Status409Conflict,
                "INVALID_OPERATION",
                "İstenen işlem mevcut durumda gerçekleştirilemiyor."),

            ArgumentException => new ExceptionMapping(
                StatusCodes.Status400BadRequest,
                "INVALID_ARGUMENT",
                "Gönderilen değerlerden biri geçersiz."),

            _ => new ExceptionMapping(
                StatusCodes.Status500InternalServerError,
                "INTERNAL_SERVER_ERROR",
                "İşlem sırasında beklenmeyen bir hata oluştu.")
        };
    }

    private sealed record ExceptionMapping(
        int StatusCode,
        string Code,
        string Message);
}