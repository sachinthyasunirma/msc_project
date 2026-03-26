import { loggingConfig } from "@/lib/logging/config";
import { logger } from "@/lib/logging/logger";

type ProfileServerOperationOptions<T> = {
  feature: string;
  operation: string;
  warnThresholdMs?: number;
  metadata?: Record<string, unknown>;
  getMetadata?: (result: T) => Record<string, unknown> | undefined;
};

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function roundMs(durationMs: number) {
  return Number(durationMs.toFixed(1));
}

export async function profileServerOperation<T>(
  options: ProfileServerOperationOptions<T>,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = nowMs();
  const thresholdMs = options.warnThresholdMs ?? loggingConfig.slowOperationThresholdMs;

  try {
    const result = await operation();
    const durationMs = roundMs(nowMs() - startedAt);

    if (loggingConfig.profileOperations || durationMs >= thresholdMs) {
      logger.info("server_operation_timing", {
        eventType: "operational",
        feature: options.feature,
        operation: options.operation,
        durationMs,
        thresholdMs,
        ...(options.metadata ?? {}),
        ...(options.getMetadata?.(result) ?? {}),
      });
    }

    return result;
  } catch (error) {
    const durationMs = roundMs(nowMs() - startedAt);

    if (loggingConfig.profileOperations || durationMs >= thresholdMs) {
      logger.warn("server_operation_timing_failed", {
        eventType: "error",
        feature: options.feature,
        operation: options.operation,
        durationMs,
        thresholdMs,
        errorMessage: error instanceof Error ? error.message : "Operation failed.",
        ...(options.metadata ?? {}),
      });
    }

    throw error;
  }
}
