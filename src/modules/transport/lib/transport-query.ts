import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

type TransportRecordsInput = {
  resource: TransportResourceKey;
  q?: string;
  limit?: number;
};

export const transportKeys = {
  all: ["transports"] as const,
  catalogs: () => [...transportKeys.all, "catalogs"] as const,
  recordsRoot: () => [...transportKeys.all, "records"] as const,
  records: (input: TransportRecordsInput) =>
    [
      ...transportKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        limit: input.limit ?? 200,
      },
    ] as const,
};

export function buildTransportRecordsParams(input: TransportRecordsInput) {
  return {
    q: input.q,
    limit: input.limit ?? 200,
  };
}
