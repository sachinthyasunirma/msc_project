import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

export type PreTourCategoryLookups = {
  tourCategoryTypes: Row[];
  tourCategories: Row[];
  tourCategoryRules: Row[];
};

export type PreTourMastersData = {
  locations: Row[];
  vehicleCategories: Row[];
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
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
};
