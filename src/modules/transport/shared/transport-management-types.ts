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
