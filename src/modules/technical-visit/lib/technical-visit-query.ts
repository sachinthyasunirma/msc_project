import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

type TechnicalVisitRecordsInput = {
  resource: TechnicalVisitResourceKey;
  q?: string;
  limit?: number;
  visitId?: string;
};

export const technicalVisitKeys = {
  all: ["technical-visit-management"] as const,
  lookups: () => [...technicalVisitKeys.all, "lookups"] as const,
  recordsRoot: () => [...technicalVisitKeys.all, "records"] as const,
  records: (input: TechnicalVisitRecordsInput) =>
    [
      ...technicalVisitKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        limit: input.limit ?? 500,
        visitId: input.visitId ?? null,
      },
    ] as const,
};

export function buildTechnicalVisitRecordsParams(input: TechnicalVisitRecordsInput) {
  return {
    q: input.q,
    limit: input.limit ?? 500,
    visitId: input.visitId,
  };
}
