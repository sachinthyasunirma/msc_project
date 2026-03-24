import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";

type BusinessNetworkRecordsInput = {
  resource: BusinessNetworkResourceKey;
  q?: string;
  page?: number;
  limit?: number;
};

export const businessNetworkKeys = {
  all: ["business-network-management"] as const,
  lookups: () => [...businessNetworkKeys.all, "lookups"] as const,
  recordsRoot: () => [...businessNetworkKeys.all, "records"] as const,
  recordsByResource: (resource: BusinessNetworkResourceKey) =>
    [...businessNetworkKeys.recordsRoot(), resource] as const,
  records: (input: BusinessNetworkRecordsInput) =>
    [
      ...businessNetworkKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildBusinessNetworkRecordsParams(input: BusinessNetworkRecordsInput) {
  return {
    q: input.q,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
