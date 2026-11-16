/**
 * The message of a caught value, or "" when it has none. Anything can be
 * thrown, so a catch block can't assume it holds an Error.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}
