"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listHotels } from "@/modules/accommodation/lib/accommodation-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import type { CompanySettingsResponse, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import type { PreTourMastersData } from "@/modules/pre-tour/shared/pre-tour-master-types";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/lib/technical-visit-api";
import { listTourCategoryRecords } from "@/modules/tour-category/lib/tour-category-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";

const INITIAL_STATE: PreTourMastersData = {
  locations: [],
  vehicleCategories: [],
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
  transportRateBasis: "VEHICLE_TYPE",
};
let preTourMastersInflight: Promise<PreTourMastersData> | null = null;

type UsePreTourMastersOptions = {
  initialData?: PreTourMastersData | null;
};

export function usePreTourMasters({ initialData = null }: UsePreTourMastersOptions = {}) {
  const skipInitialLoadRef = useRef(Boolean(initialData));
  const [state, setState] = useState<PreTourMastersData>(() => initialData ?? INITIAL_STATE);

  const loadMasters = useCallback(async (options: { force?: boolean } = {}) => {
    const { force = false } = options;
    if (!force && preTourMastersInflight) {
      const nextState = await preTourMastersInflight;
      setState(nextState);
      return nextState;
    }

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

    const request = (async () => {
      const [
        locations,
        vehicleCategories,
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
        listTransportRecords("locations", { limit: 100 }),
        listTransportRecords("vehicle-categories", { limit: 100 }),
        listTransportRecords("vehicle-types", { limit: 100 }),
        listActivityRecords("activities", { limit: 100 }),
        listGuideRecords("guides", { limit: 100 }),
        optionalMaster(() => listCurrencyRecords("currencies", { limit: 100 }), [] as Row[]),
        optionalMaster(() => listBusinessNetworkRecords("organizations", { limit: 100 }), [] as Row[]),
        optionalMaster(
          () => listBusinessNetworkRecords("operator-market-contracts", { limit: 100 }),
          [] as Row[]
        ),
        listTourCategoryRecords("tour-category-types", { limit: 100 }),
        listTourCategoryRecords("tour-categories", { limit: 100 }),
        listTourCategoryRecords("tour-category-rules", { limit: 100 }),
        listTechnicalVisitRecords("technical-visits", { limit: 100 }),
        listHotels(new URLSearchParams({ limit: "100" })),
        fetch("/api/companies/me", { cache: "no-store" }),
      ]);

      let companyBaseCurrencyCode = "USD";
      let transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE" = "VEHICLE_TYPE";
      if (companyResponse.ok) {
        const body = (await companyResponse.json()) as CompanySettingsResponse;
        const base = body.company?.baseCurrencyCode?.trim().toUpperCase();
        if (base) companyBaseCurrencyCode = base;
        transportRateBasis =
          body.company?.transportRateBasis === "VEHICLE_CATEGORY"
            ? "VEHICLE_CATEGORY"
            : "VEHICLE_TYPE";
      }

      return {
        locations: locations.rows ?? [],
        vehicleCategories: vehicleCategories.rows ?? [],
        vehicleTypes: vehicleTypes.rows ?? [],
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
        transportRateBasis,
      } satisfies PreTourMastersData;
    })();

    preTourMastersInflight = request;

    try {
      const nextState = await request;
      setState(nextState);
      return nextState;
    } finally {
      if (preTourMastersInflight === request) {
        preTourMastersInflight = null;
      }
    }
  }, []);

  useEffect(() => {
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }
    void loadMasters().catch((error) => {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadMasters]);

  return { ...state, reloadMasters: () => loadMasters({ force: true }) };
}
