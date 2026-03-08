import { logger } from "@/lib/logging/logger";
import { sanitizeForLog, sanitizeHeaders } from "@/lib/logging/redaction";

type LoggedFetchOptions = {
  integration: string;
  operation: string;
  retries?: number;
  tenantRelevant?: boolean;
};

export async function loggedFetch(
  input: string | URL | Request,
  init: RequestInit | undefined,
  options: LoggedFetchOptions
) {
  const startedAt = Date.now();
  const method = init?.method || "GET";
  const endpoint =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  try {
    const response = await fetch(input, init);
    logger.info("integration_call_complete", {
      eventType: "operational",
      integration: options.integration,
      operation: options.operation,
      method,
      endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
      retryCount: options.retries ?? 0,
      requestHeaders: init?.headers ? sanitizeHeaders(init.headers as Record<string, string>) : {},
      tenantRelevant: options.tenantRelevant ?? false,
    });
    return response;
  } catch (error) {
    logger.error("integration_call_failed", {
      eventType: "error",
      integration: options.integration,
      operation: options.operation,
      method,
      endpoint,
      durationMs: Date.now() - startedAt,
      retryCount: options.retries ?? 0,
      requestBody: sanitizeForLog(init?.body),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      tenantRelevant: options.tenantRelevant ?? false,
    });
    throw error;
  }
}
