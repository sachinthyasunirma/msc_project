import { headers } from "next/headers";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";
import {
  listGuideRecordPage,
  listGuideRecords,
} from "@/modules/guides/server/guides-service";
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

export async function loadGuidesManagementInitialData(
  resource: GuideResourceKey,
  options?: { managedGuideId?: string }
): Promise<GuidesManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const recordParams = new URLSearchParams({ page: "1", limit: "25" });
    if (
      options?.managedGuideId &&
      [
        "guide-rates",
        "guide-languages",
        "guide-coverage-areas",
        "guide-licenses",
        "guide-certifications",
        "guide-documents",
        "guide-weekly-availability",
        "guide-blackout-dates",
        "guide-assignments",
      ].includes(resource)
    ) {
      recordParams.set("guideId", options.managedGuideId);
    }

    const guideLookupParams = new URLSearchParams({ limit: options?.managedGuideId ? "25" : "100" });
    if (options?.managedGuideId) {
      guideLookupParams.set("guideId", options.managedGuideId);
    }

    const [records, guides, languages, locations, currencies] = await Promise.all([
      listGuideRecordPage(resource, recordParams, requestHeaders),
      listGuideRecords("guides", guideLookupParams, requestHeaders),
      listGuideRecords("languages", new URLSearchParams({ limit: "100" }), requestHeaders),
      listTransportRecords("locations", new URLSearchParams({ limit: "100" }), requestHeaders),
      listCurrencyRecords("currencies", new URLSearchParams({ limit: "100" }), requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records.rows),
      totalRecords: records.total,
      guides: toPlainRecords(guides),
      languages: toPlainRecords(languages),
      locations: toPlainRecords(locations.rows),
      currencies: toPlainRecords(currencies),
    };
  } catch {
    return null;
  }
}
