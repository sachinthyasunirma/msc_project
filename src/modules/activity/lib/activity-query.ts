import type { ActivityResourceKey } from "@/modules/activity/shared/activity-management-types";

type ActivityRecordsInput = {
  resource: ActivityResourceKey;
  q?: string;
  activityId?: string;
  parentActivityId?: string;
  page?: number;
  limit?: number;
};

export const activityKeys = {
  all: ["activities"] as const,
  lookups: () => [...activityKeys.all, "lookups"] as const,
  recordsRoot: () => [...activityKeys.all, "records"] as const,
  recordsByResource: (resource: ActivityResourceKey) =>
    [...activityKeys.recordsRoot(), resource] as const,
  records: (input: ActivityRecordsInput) =>
    [
      ...activityKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        activityId: input.activityId ?? null,
        parentActivityId: input.parentActivityId ?? null,
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildActivityRecordsParams(input: ActivityRecordsInput) {
  return {
    q: input.q,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
    activityId: input.activityId,
    parentActivityId: input.parentActivityId,
  };
}
