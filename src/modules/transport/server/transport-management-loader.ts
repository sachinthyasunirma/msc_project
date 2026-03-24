import { headers } from "next/headers";
import { listTransportRecords } from "@/modules/transport/server/transport-service";
import type {
  TransportManagementInitialData,
  TransportResourceKey,
} from "@/modules/transport/shared/transport-management-types";
import { loadDashboardShellData } from "@/modules/dashboard/server/dashboard-shell-service";

type TransportCatalogRefs = {
  locationIds: string[];
  vehicleCategoryIds: string[];
  vehicleTypeIds: string[];
};

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

function uniqueRecords(rows: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];

  rows.forEach((row) => {
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(row);
  });

  return merged;
}

function collectTransportCatalogRefs(
  resource: TransportResourceKey,
  rows: Array<Record<string, unknown>>
): TransportCatalogRefs {
  const locationIds = new Set<string>();
  const vehicleCategoryIds = new Set<string>();
  const vehicleTypeIds = new Set<string>();

  rows.forEach((row) => {
    const pushId = (bucket: Set<string>, value: unknown) => {
      const id = String(value ?? "").trim();
      if (id) bucket.add(id);
    };

    if (resource === "vehicle-types") {
      pushId(vehicleCategoryIds, row.categoryId);
      return;
    }

    if (
      resource === "location-rates" ||
      resource === "pax-vehicle-rates" ||
      resource === "baggage-rates"
    ) {
      pushId(locationIds, row.fromLocationId);
      pushId(locationIds, row.toLocationId);
      pushId(vehicleCategoryIds, row.vehicleCategoryId);
      pushId(vehicleTypeIds, row.vehicleTypeId);
      return;
    }

    if (resource === "location-expenses") {
      pushId(locationIds, row.locationId);
      pushId(vehicleCategoryIds, row.vehicleCategoryId);
      pushId(vehicleTypeIds, row.vehicleTypeId);
    }
  });

  return {
    locationIds: [...locationIds],
    vehicleCategoryIds: [...vehicleCategoryIds],
    vehicleTypeIds: [...vehicleTypeIds],
  };
}

async function loadTransportCatalogByIds(
  resource: "locations" | "vehicle-categories" | "vehicle-types",
  ids: string[],
  requestHeaders: Headers
) {
  if (ids.length === 0) return [];

  const payload = await listTransportRecords(
    resource,
    new URLSearchParams({
      ids: ids.join(","),
      limit: String(Math.max(ids.length, 1)),
    }),
    requestHeaders
  );

  return payload.rows;
}

export async function loadTransportManagementInitialData(
  resource: TransportResourceKey
): Promise<TransportManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const shellData = await loadDashboardShellData(requestHeaders);
    const recordsPage = await listTransportRecords(
      resource,
      new URLSearchParams({ page: "1", limit: "25" }),
      requestHeaders
    );
    const refs = collectTransportCatalogRefs(resource, recordsPage.rows);
    const [locations, vehicleCategories, vehicleTypes] = await Promise.all([
      loadTransportCatalogByIds("locations", refs.locationIds, requestHeaders),
      loadTransportCatalogByIds("vehicle-categories", refs.vehicleCategoryIds, requestHeaders),
      loadTransportCatalogByIds("vehicle-types", refs.vehicleTypeIds, requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(recordsPage.rows),
      totalRecords: recordsPage.total,
      catalogs: {
        locations: toPlainRecords(uniqueRecords(locations)),
        vehicleCategories: toPlainRecords(uniqueRecords(vehicleCategories)),
        vehicleTypes: toPlainRecords(uniqueRecords(vehicleTypes)),
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
