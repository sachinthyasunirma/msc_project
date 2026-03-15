import { headers } from "next/headers";
import { listHotels } from "@/modules/accommodation/server/accommodation-service";
import { listActivityRecords } from "@/modules/activity/server/activity-service";
import { listBusinessNetworkRecords } from "@/modules/business-network/server/business-network-service";
import { listCompanyUsersLookup } from "@/modules/dashboard/server/company-users-lookup-service";
import { listGuideRecords } from "@/modules/guides/server/guides-service";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/server/technical-visit-service";
import type { TechnicalVisitManagementInitialData } from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
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

export async function loadTechnicalVisitManagementInitialData(
  resource: TechnicalVisitResourceKey
): Promise<TechnicalVisitManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const visits = await listTechnicalVisitRecords(
      "technical-visits",
      new URLSearchParams({ limit: "500" }),
      requestHeaders
    );
    const selectedVisitId = resource === "technical-visits" ? "" : String(visits[0]?.id ?? "");
    const rowParams = new URLSearchParams({ limit: "500" });
    if (resource !== "technical-visits" && selectedVisitId) {
      rowParams.set("visitId", selectedVisitId);
    }

    const [rows, guides, activities, vehicleTypes, hotelsResponse, organizations, users] =
      await Promise.all([
        listTechnicalVisitRecords(resource, rowParams, requestHeaders),
        listGuideRecords("guides", new URLSearchParams({ limit: "300" }), requestHeaders),
        listActivityRecords("activities", new URLSearchParams({ limit: "300" }), requestHeaders),
        listTransportRecords("vehicle-types", new URLSearchParams({ limit: "300" }), requestHeaders),
        listHotels(new URLSearchParams({ limit: "200" }), requestHeaders),
        listBusinessNetworkRecords(
          "organizations",
          new URLSearchParams({ limit: "400" }),
          requestHeaders
        ),
        listCompanyUsersLookup(requestHeaders),
      ]);

    return {
      resource,
      rows: toPlainRecords(rows),
      visits: toPlainRecords(visits),
      guides: toPlainRecords(guides),
      activities: toPlainRecords(activities),
      vehicleTypes: toPlainRecords(vehicleTypes),
      hotels: hotelsResponse.items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
      })),
      restaurants: toPlainRecords(
        organizations.filter((row) => {
          const type = String((row as Record<string, unknown>).type ?? "");
          return type === "SUPPLIER" || type === "RESTAURANT";
        })
      ),
      users: toPlainRecords(users),
      selectedVisitId,
    };
  } catch {
    return null;
  }
}
