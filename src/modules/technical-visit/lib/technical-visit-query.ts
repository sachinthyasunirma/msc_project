import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

type TechnicalVisitRecordsInput = {
  resource: TechnicalVisitResourceKey;
  q?: string;
  page?: number;
  limit?: number;
  visitId?: string;
};

export const technicalVisitKeys = {
  all: ["technical-visit-management"] as const,
  lookups: () => [...technicalVisitKeys.all, "lookups"] as const,
  recordsRoot: () => [...technicalVisitKeys.all, "records"] as const,
  recordsByResource: (resource: TechnicalVisitResourceKey) =>
    [...technicalVisitKeys.recordsRoot(), resource] as const,
  records: (input: TechnicalVisitRecordsInput) =>
    [
      ...technicalVisitKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        page: input.page ?? 1,
        limit: input.limit ?? 25,
        visitId: input.visitId ?? null,
      },
    ] as const,
};

export function buildTechnicalVisitRecordsParams(input: TechnicalVisitRecordsInput) {
  return {
    q: input.q,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
    visitId: input.visitId,
  };
}
