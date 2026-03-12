import { initializePreTourDays } from "@/modules/pre-tour/server/pre-tour-service";

export async function initializePreTourPlanDays(
  payload: unknown,
  headers: Headers
) {
  return initializePreTourDays(payload, headers);
}
