import { runWithRequestContext } from "@/lib/logging/context";
import { classifyError } from "@/lib/logging/errors";
import { logger } from "@/lib/logging/logger";
import { sanitizeHeaders } from "@/lib/logging/redaction";
import { createUuid } from "@/lib/runtime/uuid";

type RouteParams = Record<string, string | string[] | undefined>;
export type ApiRouteContext<TParams extends RouteParams = RouteParams> = {
  params: Promise<TParams>;
};
type DynamicRouteContext = ApiRouteContext<RouteParams>;
type StaticRouteHandler = (request: Request) => Promise<Response>;
type DynamicRouteHandler<TContext extends ApiRouteContext = ApiRouteContext> = (
  request: Request,
  context: TContext
) => Promise<Response>;

type RouteOptions = {
  route?: string;
  feature: string;
  method?: string;
};

function getHeader(request: Request, name: string) {
  return request.headers.get(name)?.trim() || undefined;
}

function buildServerTimingValue(durationMs: number) {
  return `app;dur=${durationMs.toFixed(1)};desc="total request"`;
}

async function resolveRouteParams(context?: DynamicRouteContext): Promise<RouteParams | undefined> {
  if (!context) return undefined;
  return context.params;
}

function attachResponseTelemetry(
  response: Response,
  telemetry: {
    requestId: string;
    traceId: string;
    durationMs: number;
  }
) {
  const applyHeaders = (headers: Headers) => {
    headers.set("x-request-id", telemetry.requestId);
    headers.set("x-trace-id", telemetry.traceId);
    headers.append("server-timing", buildServerTimingValue(telemetry.durationMs));
  };

  try {
    applyHeaders(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    applyHeaders(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export function withApiLogging(options: RouteOptions, handler: StaticRouteHandler): StaticRouteHandler;
export function withApiLogging<TContext extends ApiRouteContext>(
  options: RouteOptions,
  handler: DynamicRouteHandler<TContext>
): DynamicRouteHandler<TContext>;
export function withApiLogging<TContext extends ApiRouteContext>(
  options: RouteOptions,
  handler: StaticRouteHandler | DynamicRouteHandler<TContext>
) {
  return async (request: Request, context?: TContext) => {
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
        const resolvedParams = await resolveRouteParams(context);
        logger.info("request_start", {
          eventType: "operational",
          headers: sanitizeHeaders(request.headers),
          params: resolvedParams,
          feature: options.feature,
        });

        try {
          const response = context
            ? await (handler as DynamicRouteHandler<TContext>)(request, context)
            : await (handler as StaticRouteHandler)(request);
          const durationMs = Date.now() - startedAt;
          const responseWithTelemetry = attachResponseTelemetry(response, {
            requestId,
            traceId,
            durationMs,
          });
          logger.info("request_complete", {
            eventType: "operational" as const,
            status: responseWithTelemetry.status,
            durationMs,
            feature: options.feature,
          });
          return responseWithTelemetry;
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
