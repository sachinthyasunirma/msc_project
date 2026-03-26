import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

type TransportRecordsInput = {
  resource: TransportResourceKey;
  q?: string;
  ids?: string[];
  page?: number;
  limit?: number;
};

type TransportCatalogsInput = {
  resource: TransportResourceKey;
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  selectionMode?: "none" | "dialog" | "batch";
  locationIds?: string[];
  vehicleCategoryIds?: string[];
  vehicleTypeIds?: string[];
};

export const transportKeys = {
  all: ["transports"] as const,
  catalogsRoot: () => [...transportKeys.all, "catalogs"] as const,
  catalogsByResource: (resource: TransportResourceKey) =>
    [...transportKeys.catalogsRoot(), resource] as const,
  catalogs: (input: TransportCatalogsInput) =>
    [
      ...transportKeys.catalogsByResource(input.resource),
      {
        transportRateBasis: input.transportRateBasis,
        selectionMode: input.selectionMode ?? "none",
        locationIds: [...(input.locationIds ?? [])].sort(),
        vehicleCategoryIds: [...(input.vehicleCategoryIds ?? [])].sort(),
        vehicleTypeIds: [...(input.vehicleTypeIds ?? [])].sort(),
      },
    ] as const,
  recordsRoot: () => [...transportKeys.all, "records"] as const,
  recordsByResource: (resource: TransportResourceKey) =>
    [...transportKeys.recordsRoot(), resource] as const,
  records: (input: TransportRecordsInput) =>
    [
      ...transportKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        ids: [...(input.ids ?? [])].sort(),
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildTransportRecordsParams(input: TransportRecordsInput) {
  return {
    q: input.q,
    ids: input.ids,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
