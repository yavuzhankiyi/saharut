namespace Saharut.Api.Common.Responses;

public sealed record MessageResponse(
    bool Success,
    string Message)
{
    public static MessageResponse Ok(
        string message)
    {
        return new MessageResponse(
            true,
            message);
    }
}