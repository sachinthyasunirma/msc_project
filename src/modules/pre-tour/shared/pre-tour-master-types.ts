import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

export type PreTourMastersData = {
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
