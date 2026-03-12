import { headers } from "next/headers";
import { listHotels } from "@/modules/accommodation/server/accommodation-service";
import { listActivityRecords } from "@/modules/activity/server/activity-service";
import { listBusinessNetworkRecords } from "@/modules/business-network/server/business-network-service";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import { loadDashboardShellData } from "@/modules/dashboard/server/dashboard-shell-service";
import { listGuideRecords } from "@/modules/guides/server/guides-service";
import type { PreTourMastersData } from "@/modules/pre-tour/shared/pre-tour-master-types";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/server/technical-visit-service";
import { listTourCategoryRecords } from "@/modules/tour-category/server/tour-category-service";
import { listTransportRecords } from "@/modules/transport/server/transport-service";

function toPlainRow<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Date) {
      next[key as keyof T] = value.toISOString() as T[keyof T];
    }
  }
  return next;
}

function toPlainRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => toPlainRow(row));
}

export async function loadPreTourMastersData(): Promise<PreTourMastersData | null> {
  try {
    const requestHeaders = await headers();
    const transportParams = new URLSearchParams({ limit: "300" });
    const activityParams = new URLSearchParams({ limit: "300" });
    const guidesParams = new URLSearchParams({ limit: "300" });
    const currencyParams = new URLSearchParams({ limit: "200" });
    const organizationParams = new URLSearchParams({ limit: "400" });
    const contractParams = new URLSearchParams({ limit: "400" });
    const tourCategoryParams = new URLSearchParams({ limit: "500" });
    const technicalVisitParams = new URLSearchParams({ limit: "500" });
    const hotelParams = new URLSearchParams({ limit: "100" });

    const optionalMaster = async <T,>(loader: () => Promise<T>, fallback: T) => {
      try {
        return await loader();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "");
        const normalized = message.toLowerCase();
        const restricted =
          normalized.includes("plan does not include") ||
          normalized.includes("permission denied") ||
          normalized.includes("do not have access");
        if (restricted) return fallback;
        throw error;
      }
    };

    const [
      locations,
      vehicleTypes,
      activities,
      guides,
      currencies,
      organizations,
      operatorMarketContracts,
      tourCategoryTypes,
      tourCategories,
      tourCategoryRules,
      technicalVisits,
      hotels,
      shellData,
    ] = await Promise.all([
      listTransportRecords("locations", transportParams, requestHeaders),
      listTransportRecords("vehicle-types", transportParams, requestHeaders),
      listActivityRecords("activities", activityParams, requestHeaders),
      listGuideRecords("guides", guidesParams, requestHeaders),
      optionalMaster(() => listCurrencyRecords("currencies", currencyParams, requestHeaders), []),
      optionalMaster(
        () => listBusinessNetworkRecords("organizations", organizationParams, requestHeaders),
        []
      ),
      optionalMaster(
        () =>
          listBusinessNetworkRecords(
            "operator-market-contracts",
            contractParams,
            requestHeaders
          ),
        []
      ),
      listTourCategoryRecords("tour-category-types", tourCategoryParams, requestHeaders),
      listTourCategoryRecords("tour-categories", tourCategoryParams, requestHeaders),
      listTourCategoryRecords("tour-category-rules", tourCategoryParams, requestHeaders),
      listTechnicalVisitRecords("technical-visits", technicalVisitParams, requestHeaders),
      listHotels(hotelParams, requestHeaders),
      loadDashboardShellData(requestHeaders),
    ]);

    return {
      locations: toPlainRows(locations),
      vehicleTypes: toPlainRows(vehicleTypes),
      activities: toPlainRows(activities),
      guides: toPlainRows(guides),
      currencies: toPlainRows(currencies as Array<Record<string, unknown>>),
      organizations: toPlainRows(organizations as Array<Record<string, unknown>>),
      operatorMarketContracts: toPlainRows(
        operatorMarketContracts as Array<Record<string, unknown>>
      ),
      tourCategoryTypes: toPlainRows(tourCategoryTypes),
      tourCategories: toPlainRows(tourCategories),
      technicalVisits: toPlainRows(technicalVisits),
      hotels: toPlainRows(hotels.items),
      tourCategoryRules: toPlainRows(tourCategoryRules),
      companyBaseCurrencyCode: shellData.company?.baseCurrencyCode ?? "USD",
    };
  } catch {
    return null;
  }
}
