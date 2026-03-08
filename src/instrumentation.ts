import { logger } from "@/lib/logging/logger";

export async function register() {
  logger.info("instrumentation_register", {
    eventType: "operational",
    feature: "observability",
    note: "OpenTelemetry instrumentation hook ready. Add SDK bootstrap here when provider is configured.",
  });
}
