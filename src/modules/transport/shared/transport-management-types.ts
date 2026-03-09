export type TransportResourceKey =
  | "locations"
  | "vehicle-categories"
  | "vehicle-types"
  | "location-rates"
  | "location-expenses"
  | "pax-vehicle-rates"
  | "baggage-rates";

export type TransportFormField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

export type CompanySettingsResponse = {
  company?: {
    transportRateBasis?: "VEHICLE_CATEGORY" | "VEHICLE_TYPE" | null;
  } | null;
};

export type TransportManagementInitialData = {
  resource: TransportResourceKey;
  records: Array<Record<string, unknown>>;
  catalogs: {
    locations: Array<Record<string, unknown>>;
    vehicleCategories: Array<Record<string, unknown>>;
    vehicleTypes: Array<Record<string, unknown>>;
  };
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
};
