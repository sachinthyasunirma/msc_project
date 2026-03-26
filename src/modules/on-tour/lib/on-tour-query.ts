import type { OnTourListFilters } from "@/modules/on-tour/shared/on-tour-management-types";

export const onTourKeys = {
  all: ["on-tours"] as const,
  listsRoot: () => [...onTourKeys.all, "lists"] as const,
  list: (filters: OnTourListFilters) =>
    [
      ...onTourKeys.listsRoot(),
      {
        q: filters.q ?? "",
        status: filters.status ?? "",
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      },
    ] as const,
  detailRoot: () => [...onTourKeys.all, "detail"] as const,
  detail: (onTourId: string) => [...onTourKeys.detailRoot(), onTourId] as const,
  dashboard: (onTourId: string) => [...onTourKeys.detail(onTourId), "dashboard"] as const,
  travelers: (onTourId: string) => [...onTourKeys.detail(onTourId), "travelers"] as const,
  groups: (onTourId: string) => [...onTourKeys.detail(onTourId), "groups"] as const,
  rooming: (onTourId: string) => [...onTourKeys.detail(onTourId), "rooming"] as const,
  services: (onTourId: string) => [...onTourKeys.detail(onTourId), "services"] as const,
  requisitions: (onTourId: string) => [...onTourKeys.detail(onTourId), "requisitions"] as const,
  vouchers: (onTourId: string) => [...onTourKeys.detail(onTourId), "vouchers"] as const,
  operations: (onTourId: string) => [...onTourKeys.detail(onTourId), "operations"] as const,
  finance: (onTourId: string) => [...onTourKeys.detail(onTourId), "finance"] as const,
  audit: (onTourId: string) => [...onTourKeys.detail(onTourId), "audit"] as const,
};
