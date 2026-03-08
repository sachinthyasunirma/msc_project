export type PreTourResourceKey =
  | "pre-tours"
  | "pre-tour-days"
  | "pre-tour-items"
  | "pre-tour-item-addons"
  | "pre-tour-totals"
  | "pre-tour-categories"
  | "pre-tour-technical-visits"
  | "pre-tour-bins";

export type FieldType = "text" | "number" | "boolean" | "select" | "datetime" | "json" | "textarea";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

export type Row = Record<string, unknown>;

export type CompanySettingsResponse = {
  company?: { baseCurrencyCode?: string | null } | null;
};

export type AccessControlResponse = {
  privileges?: string[];
};

export type DetailSheetState = {
  open: boolean;
  title: string;
  description: string;
  row: Row | null;
  kind: "generic" | "pre-tour" | "day-item";
  dayId?: string;
};
