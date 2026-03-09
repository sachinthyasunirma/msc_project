export type ActivityResourceKey =
  | "activities"
  | "activity-availability"
  | "activity-rates"
  | "activity-supplements";

export type ActivityField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
  placeholder?: string;
};

export type ActivityManagementInitialData = {
  resource: ActivityResourceKey;
  records: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
};
