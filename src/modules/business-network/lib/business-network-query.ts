import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";

type BusinessNetworkRecordsInput = {
  resource: BusinessNetworkResourceKey;
  q?: string;
  limit?: number;
};

export const businessNetworkKeys = {
  all: ["business-network-management"] as const,
  lookups: () => [...businessNetworkKeys.all, "lookups"] as const,
  recordsRoot: () => [...businessNetworkKeys.all, "records"] as const,
  records: (input: BusinessNetworkRecordsInput) =>
    [
      ...businessNetworkKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        limit: input.limit ?? 200,
      },
    ] as const,
};

export function buildBusinessNetworkRecordsParams(input: BusinessNetworkRecordsInput) {
  return {
    q: input.q,
    limit: input.limit ?? 200,
  };
}
