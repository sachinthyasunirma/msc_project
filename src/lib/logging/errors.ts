export type ErrorKind =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "rate_limit"
  | "business"
  | "external"
  | "internal";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly kind: ErrorKind,
    public readonly status: number,
    message: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function classifyError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error && typeof error === "object") {
    const maybe = error as { status?: number; code?: string; message?: string };
    if (maybe.status === 401) {
      return new AppError(maybe.code || "UNAUTHORIZED", "authentication", 401, maybe.message || "Unauthorized");
    }
    if (maybe.status === 403) {
      return new AppError(maybe.code || "FORBIDDEN", "authorization", 403, maybe.message || "Forbidden");
    }
    if (maybe.status === 404) {
      return new AppError(maybe.code || "NOT_FOUND", "not_found", 404, maybe.message || "Not found");
    }
    if (maybe.status === 429) {
      return new AppError(maybe.code || "RATE_LIMITED", "rate_limit", 429, maybe.message || "Rate limited");
    }
  }
  if (error instanceof Error) {
    return new AppError("INTERNAL_ERROR", "internal", 500, error.message, {
      name: error.name,
      stack: error.stack,
    });
  }
  return new AppError("INTERNAL_ERROR", "internal", 500, "Unknown error");
}
