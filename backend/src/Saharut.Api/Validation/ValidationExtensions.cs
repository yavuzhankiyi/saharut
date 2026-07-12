using Microsoft.AspNetCore.Mvc;

namespace Saharut.Api.Validation;

public static class ValidationExtensions
{
    public static IServiceCollection AddApiValidation(
        this IServiceCollection services)
    {
        services
            .AddControllers()
            .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory =
                    actionContext =>
                    {
                        var errors = actionContext.ModelState
                            .Where(modelState =>
                                modelState.Value?.Errors.Count > 0)
                            .ToDictionary(
                                modelState =>
                                    NormalizeFieldName(
                                        modelState.Key),
                                modelState =>
                                    modelState.Value!.Errors
                                        .Select(error =>
                                            GetErrorMessage(error))
                                        .Distinct()
                                        .ToArray());

                        var response = new
                        {
                            success = false,
                            error = new
                            {
                                code = "VALIDATION_ERROR",
                                message =
                                    "Gönderilen bilgiler doğrulanamadı.",
                                errors,
                                traceId = actionContext
                                    .HttpContext
                                    .TraceIdentifier
                            }
                        };

                        return new BadRequestObjectResult(response);
                    };
            });

        return services;
    }

    private static string GetErrorMessage(
        Microsoft.AspNetCore.Mvc.ModelBinding.ModelError error)
    {
        if (!string.IsNullOrWhiteSpace(error.ErrorMessage))
        {
            return error.ErrorMessage;
        }

        return "Gönderilen değer geçersiz.";
    }

    private static string NormalizeFieldName(
        string fieldName)
    {
        if (string.IsNullOrWhiteSpace(fieldName))
        {
            return "request";
        }

        var lastPart = fieldName
            .Split('.')
            .Last();

        if (string.IsNullOrWhiteSpace(lastPart))
        {
            return "request";
        }

        return char.ToLowerInvariant(lastPart[0]) +
               lastPart[1..];
    }
}