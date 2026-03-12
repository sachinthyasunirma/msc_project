import { runWithRequestContext } from "@/lib/logging/context";
import { classifyError } from "@/lib/logging/errors";
import { logger } from "@/lib/logging/logger";
import { sanitizeHeaders } from "@/lib/logging/redaction";
import { createUuid } from "@/lib/runtime/uuid";

type RouteContext = { params?: Promise<Record<string, string>> };

type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

type RouteOptions = {
  route?: string;
  feature: string;
  method?: string;
};

function getHeader(request: Request, name: string) {
  return request.headers.get(name)?.trim() || undefined;
}

export function withApiLogging(options: RouteOptions, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const startedAt = Date.now();
    const requestId = getHeader(request, "x-request-id") || createUuid();
    const traceId = getHeader(request, "x-trace-id") || requestId;
    const spanId = getHeader(request, "x-span-id") || undefined;
    const routeFromRequest = (() => {
      try {
        return new URL(request.url).pathname;
      } catch {
        return undefined;
      }
    })();

    return runWithRequestContext(
      {
        requestId,
        traceId,
        spanId,
        method: options.method || request.method,
        route: options.route || routeFromRequest,
        feature: options.feature,
        runtime: "server",
      },
      async () => {
        const resolvedParams = context.params ? await context.params : undefined;
        logger.info("request_start", {
          eventType: "operational",
          headers: sanitizeHeaders(request.headers),
          params: resolvedParams,
          feature: options.feature,
        });

        try {
          const response = await handler(request, {
            ...context,
            params: resolvedParams ? Promise.resolve(resolvedParams) : undefined,
          });
          const durationMs = Date.now() - startedAt;
          logger.info("request_complete", {
            eventType: "operational" as const,
            status: response.status,
            durationMs,
            feature: options.feature,
          });
          return response;
        } catch (error) {
          const normalized = classifyError(error);
          const durationMs = Date.now() - startedAt;
          const payload = {
            eventType: "error" as const,
            errorCode: normalized.code,
            errorKind: normalized.kind,
            status: normalized.status,
            durationMs,
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: normalized.message,
            errorStack: error instanceof Error ? error.stack : undefined,
            metadata: normalized.metadata,
            feature: options.feature,
          };
          if (normalized.kind === "internal" || normalized.kind === "external") {
            logger.error("request_failed", payload);
          } else {
            logger.warn("request_failed", payload);
          }
          throw error;
        }
      }
    );
  };
}
