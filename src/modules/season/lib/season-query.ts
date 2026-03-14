import type { SeasonListFilters } from "@/modules/season/lib/season-api";

export const seasonKeys = {
  all: ["seasons"] as const,
  lists: () => [...seasonKeys.all, "list"] as const,
  list: (filters: SeasonListFilters) =>
    [
      ...seasonKeys.lists(),
      {
        q: filters.q ?? "",
        cursor: filters.cursor ?? null,
        limit: filters.limit ?? 20,
        startDateFrom: filters.startDateFrom ?? "",
        startDateTo: filters.startDateTo ?? "",
      },
    ] as const,
};
