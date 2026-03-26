import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";

type GuideRecordsInput = {
  resource: GuideResourceKey;
  q?: string;
  guideId?: string;
  page?: number;
  limit?: number;
};

type GuideLookupsInput = {
  guideId?: string;
  scoped?: boolean;
};

export const guideKeys = {
  all: ["guides-management"] as const,
  lookupsRoot: () => [...guideKeys.all, "lookups"] as const,
  lookups: (input?: GuideLookupsInput) =>
    [
      ...guideKeys.lookupsRoot(),
      {
        guideId: input?.guideId ?? null,
        scoped: input?.scoped ?? false,
      },
    ] as const,
  recordsRoot: () => [...guideKeys.all, "records"] as const,
  recordsByResource: (resource: GuideResourceKey) =>
    [...guideKeys.recordsRoot(), resource] as const,
  records: (input: GuideRecordsInput) =>
    [
      ...guideKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        guideId: input.guideId ?? null,
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildGuideRecordsParams(input: GuideRecordsInput) {
  return {
    q: input.q,
    guideId: input.guideId,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
