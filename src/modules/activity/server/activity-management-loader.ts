import { headers } from "next/headers";
import { listActivityRecords } from "@/modules/activity/server/activity-service";
import type {
  ActivityManagementInitialData,
  ActivityResourceKey,
} from "@/modules/activity/shared/activity-management-types";
import { listTransportRecords } from "@/modules/transport/server/transport-service";

function toPlainRecord<T extends Record<string, unknown>>(record: T): T {
  const next = { ...record };
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Date) {
      next[key as keyof T] = value.toISOString() as T[keyof T];
    }
  }
  return next;
}

function toPlainRecords(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => toPlainRecord(row));
}

export async function loadActivityManagementInitialData(options?: {
  resource?: ActivityResourceKey;
  activityId?: string;
  showActivityList?: boolean;
}): Promise<ActivityManagementInitialData | null> {
  const resource = options?.resource ?? (options?.showActivityList === false ? "activity-rates" : "activities");

  try {
    const requestHeaders = await headers();
    const [activities, locations, images] = await Promise.all([
      listActivityRecords("activities", new URLSearchParams({ limit: "500" }), requestHeaders),
      listTransportRecords("locations", new URLSearchParams({ limit: "500" }), requestHeaders),
      listActivityRecords(
        "activity-images",
        new URLSearchParams({
          limit: "500",
          ...(options?.activityId ? { activityId: options.activityId } : {}),
        }),
        requestHeaders
      ),
    ]);

    const rowParams = new URLSearchParams({ limit: "500" });
    if (options?.showActivityList === false && options.activityId) {
      if (resource === "activity-supplements") rowParams.set("parentActivityId", options.activityId);
      else if (resource !== "activities") rowParams.set("activityId", options.activityId);
    }

    const rows = await listActivityRecords(resource, rowParams, requestHeaders);
    const plainImages = toPlainRecords(images);
    const coverImageMap = new Map<string, Record<string, unknown>>();
    plainImages.forEach((item) => {
      if (item.activityId && item.isCover) {
        coverImageMap.set(String(item.activityId), item);
      }
    });

    const plainRecords = toPlainRecords(rows).map((row) =>
      resource === "activities"
        ? {
            ...row,
            coverImageUrl: coverImageMap.get(String(row.id))?.url ?? null,
          }
        : row
    );

    return {
      resource,
      records: plainRecords,
      activities: toPlainRecords(activities),
      locations: toPlainRecords(locations),
      images: plainImages,
    };
  } catch {
    return null;
  }
}
