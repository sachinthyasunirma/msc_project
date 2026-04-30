import { headers } from "next/headers";
import { listHotels } from "@/modules/accommodation/server/accommodation-service";
import { listActivityRecords } from "@/modules/activity/server/activity-service";
import { listBusinessNetworkRecords } from "@/modules/business-network/server/business-network-service";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import { loadDashboardShellData } from "@/modules/dashboard/server/dashboard-shell-service";
import { listGuideRecords } from "@/modules/guides/server/guides-service";
import { listPreTourCategoryLookups } from "@/modules/pre-tour/server/pre-tour-category-lookup-service";
import type { PreTourMastersData } from "@/modules/pre-tour/shared/pre-tour-master-types";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/server/technical-visit-service";
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
    const transportParams = new URLSearchParams({ limit: "100" });
    const activityParams = new URLSearchParams({ limit: "100" });
    const guidesParams = new URLSearchParams({ limit: "100" });
    const currencyParams = new URLSearchParams({ limit: "100" });
    const organizationParams = new URLSearchParams({ limit: "100" });
    const contractParams = new URLSearchParams({ limit: "100" });
    const technicalVisitParams = new URLSearchParams({ limit: "100" });
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
      vehicleCategories,
      vehicleTypes,
      activities,
      guides,
      currencies,
      organizations,
      operatorMarketContracts,
      categoryLookups,
      technicalVisits,
      hotels,
      shellData,
    ] = await Promise.all([
      listTransportRecords("locations", transportParams, requestHeaders),
      listTransportRecords("vehicle-categories", transportParams, requestHeaders),
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
      listPreTourCategoryLookups({ limit: 500 }, requestHeaders),
      listTechnicalVisitRecords("technical-visits", technicalVisitParams, requestHeaders),
      listHotels(hotelParams, requestHeaders),
      loadDashboardShellData(requestHeaders),
    ]);

    return {
      locations: toPlainRows(locations.rows),
      vehicleCategories: toPlainRows(vehicleCategories.rows),
      vehicleTypes: toPlainRows(vehicleTypes.rows),
      activities: toPlainRows(activities),
      guides: toPlainRows(guides),
      currencies: toPlainRows(currencies as Array<Record<string, unknown>>),
      organizations: toPlainRows(organizations as Array<Record<string, unknown>>),
      operatorMarketContracts: toPlainRows(
        operatorMarketContracts as Array<Record<string, unknown>>
      ),
      tourCategoryTypes: toPlainRows(categoryLookups.tourCategoryTypes),
      tourCategories: toPlainRows(categoryLookups.tourCategories),
      technicalVisits: toPlainRows(technicalVisits),
      hotels: toPlainRows(hotels.items),
      tourCategoryRules: toPlainRows(categoryLookups.tourCategoryRules),
      companyBaseCurrencyCode: shellData.company?.baseCurrencyCode ?? "USD",
      transportRateBasis:
        shellData.company?.transportRateBasis === "VEHICLE_CATEGORY"
          ? "VEHICLE_CATEGORY"
          : "VEHICLE_TYPE",
    };
  } catch {
    return null;
  }
}
