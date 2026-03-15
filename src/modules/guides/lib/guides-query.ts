import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";

type GuideRecordsInput = {
  resource: GuideResourceKey;
  q?: string;
  guideId?: string;
  limit?: number;
};

export const guideKeys = {
  all: ["guides-management"] as const,
  lookups: () => [...guideKeys.all, "lookups"] as const,
  recordsRoot: () => [...guideKeys.all, "records"] as const,
  records: (input: GuideRecordsInput) =>
    [
      ...guideKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        guideId: input.guideId ?? null,
        limit: input.limit ?? 200,
      },
    ] as const,
};

export function buildGuideRecordsParams(input: GuideRecordsInput) {
  return {
    q: input.q,
    guideId: input.guideId,
    limit: input.limit ?? 200,
  };
}
