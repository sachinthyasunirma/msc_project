import { headers } from "next/headers";
import {
  listActivityRecordPage,
  listActivityRecords,
} from "@/modules/activity/server/activity-service";
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
    const [activities, locations] = await Promise.all([
      listActivityRecords("activities", new URLSearchParams({ limit: "100" }), requestHeaders),
      listTransportRecords("locations", new URLSearchParams({ limit: "100" }), requestHeaders),
    ]);

    const rowParams = new URLSearchParams({ page: "1", limit: "25" });
    if (options?.showActivityList === false && options.activityId) {
      if (resource === "activity-supplements") rowParams.set("parentActivityId", options.activityId);
      else if (resource !== "activities") rowParams.set("activityId", options.activityId);
    }

    const rows = await listActivityRecordPage(resource, rowParams, requestHeaders);

    return {
      resource,
      records: toPlainRecords(rows.rows),
      totalRecords: rows.total,
      activities: toPlainRecords(activities),
      locations: toPlainRecords(locations.rows),
    };
  } catch {
    return null;
  }
}
