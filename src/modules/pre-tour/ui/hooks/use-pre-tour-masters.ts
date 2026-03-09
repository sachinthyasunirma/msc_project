"use client";

import { useCallback, useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listHotels } from "@/modules/accommodation/lib/accommodation-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import type { CompanySettingsResponse, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/lib/technical-visit-api";
import { listTourCategoryRecords } from "@/modules/tour-category/lib/tour-category-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";

type PreTourMastersState = {
  locations: Row[];
  vehicleTypes: Row[];
  activities: Row[];
  guides: Row[];
  currencies: Row[];
  organizations: Row[];
  operatorMarketContracts: Row[];
  tourCategoryTypes: Row[];
  tourCategories: Row[];
  technicalVisits: Row[];
  hotels: Row[];
  tourCategoryRules: Row[];
  companyBaseCurrencyCode: string;
};

const INITIAL_STATE: PreTourMastersState = {
  locations: [],
  vehicleTypes: [],
  activities: [],
  guides: [],
  currencies: [],
  organizations: [],
  operatorMarketContracts: [],
  tourCategoryTypes: [],
  tourCategories: [],
  technicalVisits: [],
  hotels: [],
  tourCategoryRules: [],
  companyBaseCurrencyCode: "USD",
};

export function usePreTourMasters() {
  const [state, setState] = useState<PreTourMastersState>(INITIAL_STATE);

  const loadMasters = useCallback(async () => {
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
      hotelResponse,
      companyResponse,
    ] = await Promise.all([
      listTransportRecords("locations", { limit: 300 }),
      listTransportRecords("vehicle-types", { limit: 300 }),
      listActivityRecords("activities", { limit: 300 }),
      listGuideRecords("guides", { limit: 300 }),
      optionalMaster(() => listCurrencyRecords("currencies", { limit: 200 }), [] as Row[]),
      optionalMaster(() => listBusinessNetworkRecords("organizations", { limit: 400 }), [] as Row[]),
      optionalMaster(
        () => listBusinessNetworkRecords("operator-market-contracts", { limit: 400 }),
        [] as Row[]
      ),
      listTourCategoryRecords("tour-category-types", { limit: 500 }),
      listTourCategoryRecords("tour-categories", { limit: 500 }),
      listTourCategoryRecords("tour-category-rules", { limit: 500 }),
      listTechnicalVisitRecords("technical-visits", { limit: 500 }),
      listHotels(new URLSearchParams({ limit: "100" })),
      fetch("/api/companies/me", { cache: "no-store" }),
    ]);

    let companyBaseCurrencyCode = "USD";
    if (companyResponse.ok) {
      const body = (await companyResponse.json()) as CompanySettingsResponse;
      const base = body.company?.baseCurrencyCode?.trim().toUpperCase();
      if (base) companyBaseCurrencyCode = base;
    }

    setState({
      locations,
      vehicleTypes,
      activities,
      guides,
      currencies,
      organizations,
      operatorMarketContracts,
      tourCategoryTypes,
      tourCategories,
      technicalVisits,
      hotels: hotelResponse.items ?? [],
      tourCategoryRules,
      companyBaseCurrencyCode,
    });
  }, []);

  useEffect(() => {
    void loadMasters().catch((error) => {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadMasters]);

  return { ...state, reloadMasters: loadMasters };
}
