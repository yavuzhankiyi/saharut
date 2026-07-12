using System.ComponentModel.DataAnnotations;

namespace Saharut.Api.Validation;

[AttributeUsage(
    AttributeTargets.Property |
    AttributeTargets.Field |
    AttributeTargets.Parameter)]
public sealed class NotWhiteSpaceAttribute : ValidationAttribute
{
    public NotWhiteSpaceAttribute()
    {
        ErrorMessage = "Alan boş veya yalnızca boşluklardan oluşamaz.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            return true;
        }

        return value is string text &&
               !string.IsNullOrWhiteSpace(text);
    }
}