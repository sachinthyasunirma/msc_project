import { headers } from "next/headers";
import { listTransportRecords } from "@/modules/transport/server/transport-service";
import type {
  TransportManagementInitialData,
  TransportResourceKey,
} from "@/modules/transport/shared/transport-management-types";
import { resolveDashboardShellData } from "@/modules/dashboard/server/dashboard-shell-service";

function toPlainRecord<T extends Record<string, unknown>>(record: T): T {
  const next = { ...record };
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Date) {
      next[key as keyof T] = value.toISOString() as T[keyof T];
    }
  }
  return next;
}

function toPlainRecords(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => toPlainRecord(row));
}

export async function loadTransportManagementInitialData(
  resource: TransportResourceKey
): Promise<TransportManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const shellData = await resolveDashboardShellData(requestHeaders);
    const [records, locations, vehicleCategories, vehicleTypes] = await Promise.all([
      listTransportRecords(resource, new URLSearchParams({ limit: "200" }), requestHeaders),
      listTransportRecords("locations", new URLSearchParams({ limit: "200" }), requestHeaders),
      listTransportRecords(
        "vehicle-categories",
        new URLSearchParams({ limit: "200" }),
        requestHeaders
      ),
      listTransportRecords("vehicle-types", new URLSearchParams({ limit: "200" }), requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records),
      catalogs: {
        locations: toPlainRecords(locations),
        vehicleCategories: toPlainRecords(vehicleCategories),
        vehicleTypes: toPlainRecords(vehicleTypes),
      },
      transportRateBasis:
        shellData.company?.transportRateBasis === "VEHICLE_CATEGORY"
          ? "VEHICLE_CATEGORY"
          : "VEHICLE_TYPE",
    };
  } catch {
    return null;
  }
}
