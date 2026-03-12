import { headers } from "next/headers";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";
import { listGuideRecords } from "@/modules/guides/server/guides-service";
import { listTransportRecords } from "@/modules/transport/server/transport-service";
import type { GuideResourceKey } from "@/modules/guides/ui/components/guides-management-section";

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
    const recordParams = new URLSearchParams({ limit: "200" });
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

    const [records, guides, languages, locations, currencies] = await Promise.all([
      listGuideRecords(resource, recordParams, requestHeaders),
      listGuideRecords("guides", new URLSearchParams({ limit: "200" }), requestHeaders),
      listGuideRecords("languages", new URLSearchParams({ limit: "200" }), requestHeaders),
      listTransportRecords("locations", new URLSearchParams({ limit: "200" }), requestHeaders),
      listCurrencyRecords("currencies", new URLSearchParams({ limit: "200" }), requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records),
      guides: toPlainRecords(guides),
      languages: toPlainRecords(languages),
      locations: toPlainRecords(locations),
      currencies: toPlainRecords(currencies),
    };
  } catch {
    return null;
  }
}
