import { runWithRequestContext } from "@/lib/logging/context";
import { classifyError } from "@/lib/logging/errors";
import { logger } from "@/lib/logging/logger";
import { createUuid } from "@/lib/runtime/uuid";

type ActionOptions = {
  actionName: string;
  feature: string;
  companyId?: string;
  userId?: string;
};

export function withServerActionLogging<TArgs extends unknown[], TResult>(
  options: ActionOptions,
  fn: (...args: TArgs) => Promise<TResult>
) {
  return async (...args: TArgs): Promise<TResult> => {
    const startedAt = Date.now();
    return runWithRequestContext(
      {
        requestId: createUuid(),
        traceId: createUuid(),
        route: options.actionName,
        method: "SERVER_ACTION",
        feature: options.feature,
        companyId: options.companyId,
        userId: options.userId,
      },
      async () => {
        logger.info("server_action_start", {
          eventType: "operational",
          action: options.actionName,
        });
        try {
          const result = await fn(...args);
          logger.info("server_action_complete", {
            eventType: "operational",
            action: options.actionName,
            durationMs: Date.now() - startedAt,
          });
          return result;
        } catch (error) {
          const normalized = classifyError(error);
          logger.error("server_action_failed", {
            eventType: "error",
            action: options.actionName,
            durationMs: Date.now() - startedAt,
            errorCode: normalized.code,
            errorKind: normalized.kind,
            errorMessage: normalized.message,
          });
          throw error;
        }
      }
    );
  };
}
