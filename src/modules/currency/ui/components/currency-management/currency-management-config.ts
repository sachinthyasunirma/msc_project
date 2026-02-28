export type CurrencyResourceKey =
  | "currencies"
  | "fx-providers"
  | "exchange-rates"
  | "money-settings";

export type CurrencyField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

export const CURRENCY_META: Record<CurrencyResourceKey, { title: string; description: string }> = {
  currencies: {
    title: "Currencies",
    description: "Maintain currency master with rounding and precision rules.",
  },
  "fx-providers": {
    title: "FX Providers",
    description: "Maintain exchange-rate providers (manual or external source).",
  },
  "exchange-rates": {
    title: "Exchange Rates",
    description: "Maintain rate pairs and validity timestamps.",
  },
  "money-settings": {
    title: "Money Settings",
    description: "Configure pricing mode and FX rate source defaults.",
  },
};

export const CURRENCY_COLUMNS: Record<CurrencyResourceKey, Array<{ key: string; label: string }>> = {
  currencies: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    { key: "minorUnit", label: "Minor Unit" },
    { key: "isActive", label: "Status" },
  ],
  "fx-providers": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Status" },
  ],
  "exchange-rates": [
    { key: "code", label: "Code" },
    { key: "providerId", label: "Provider" },
    { key: "baseCurrencyId", label: "Base" },
    { key: "quoteCurrencyId", label: "Quote" },
    { key: "rate", label: "Rate" },
    { key: "asOf", label: "Effective From" },
    { key: "effectiveTo", label: "Effective To" },
    { key: "isActive", label: "Status" },
  ],
  "money-settings": [
    { key: "code", label: "Code" },
    { key: "baseCurrencyId", label: "Base Currency" },
    { key: "priceMode", label: "Price Mode" },
    { key: "fxRateSource", label: "FX Source" },
  ],
};

