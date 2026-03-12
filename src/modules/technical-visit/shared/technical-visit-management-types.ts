import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

export type TechnicalVisitLookupHotel = {
  id: string;
  code: string;
  name: string;
};

export type TechnicalVisitManagementInitialData = {
  resource: TechnicalVisitResourceKey;
  rows: Array<Record<string, unknown>>;
  visits: Array<Record<string, unknown>>;
  guides: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  vehicleTypes: Array<Record<string, unknown>>;
  hotels: TechnicalVisitLookupHotel[];
  restaurants: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  selectedVisitId: string;
};
