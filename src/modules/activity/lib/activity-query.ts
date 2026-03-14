import type { ActivityResourceKey } from "@/modules/activity/shared/activity-management-types";

type ActivityRecordsInput = {
  resource: ActivityResourceKey;
  q?: string;
  activityId?: string;
  parentActivityId?: string;
  limit?: number;
};

export const activityKeys = {
  all: ["activities"] as const,
  lookups: () => [...activityKeys.all, "lookups"] as const,
  recordsRoot: () => [...activityKeys.all, "records"] as const,
  records: (input: ActivityRecordsInput) =>
    [
      ...activityKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        activityId: input.activityId ?? null,
        parentActivityId: input.parentActivityId ?? null,
        limit: input.limit ?? 500,
      },
    ] as const,
};

export function buildActivityRecordsParams(input: ActivityRecordsInput) {
  return {
    q: input.q,
    limit: input.limit ?? 500,
    activityId: input.activityId,
    parentActivityId: input.parentActivityId,
  };
}
