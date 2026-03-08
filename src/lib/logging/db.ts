import { logger } from "@/lib/logging/logger";

type DbLogMeta = {
  operation: string;
  entity: string;
  feature?: string;
};

export async function withDbLogging<T>(meta: DbLogMeta, fn: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    logger.debug("db_operation_complete", {
      eventType: "operational",
      operation: meta.operation,
      entity: meta.entity,
      feature: meta.feature,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logger.error("db_operation_failed", {
      eventType: "error",
      operation: meta.operation,
      entity: meta.entity,
      feature: meta.feature,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
