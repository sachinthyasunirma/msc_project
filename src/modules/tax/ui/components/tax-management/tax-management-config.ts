export type TaxResourceKey =
  | "tax-jurisdictions"
  | "taxes"
  | "tax-rates"
  | "tax-rule-sets"
  | "tax-rules"
  | "tax-rule-taxes"
  | "document-fx-snapshots"
  | "document-tax-snapshots"
  | "document-tax-lines";

export type TaxField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

export const TAX_META: Record<TaxResourceKey, { title: string; description: string }> = {
  "tax-jurisdictions": {
    title: "Tax Jurisdictions",
    description: "Country/region/city level jurisdiction master data.",
  },
  taxes: {
    title: "Taxes",
    description: "Tax definitions such as VAT, levy and withholding.",
  },
  "tax-rates": {
    title: "Tax Rates",
    description: "Tax rates per jurisdiction with effective dates.",
  },
  "tax-rule-sets": {
    title: "Tax Rule Sets",
    description: "Versioned collections of tax rules.",
  },
  "tax-rules": {
    title: "Tax Rules",
    description: "Matching rules by service type, customer and residency.",
  },
  "tax-rule-taxes": {
    title: "Tax Rule Taxes",
    description: "Tax application order and inclusion behavior per rule.",
  },
  "document-fx-snapshots": {
    title: "Document FX Snapshots",
    description: "FX rates frozen against quote/booking/invoice documents.",
  },
  "document-tax-snapshots": {
    title: "Document Tax Snapshots",
    description: "Tax totals frozen on commercial documents.",
  },
  "document-tax-lines": {
    title: "Document Tax Lines",
    description: "Detailed line-level taxes linked to tax snapshots.",
  },
};

export const TAX_COLUMNS: Record<TaxResourceKey, Array<{ key: string; label: string }>> = {
  "tax-jurisdictions": [
    { key: "code", label: "Code" },
    { key: "countryCode", label: "Country" },
    { key: "name", label: "Name" },
    { key: "region", label: "Region" },
    { key: "isActive", label: "Status" },
  ],
  taxes: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "taxType", label: "Type" },
    { key: "scope", label: "Scope" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rates": [
    { key: "code", label: "Code" },
    { key: "taxId", label: "Tax" },
    { key: "jurisdictionId", label: "Jurisdiction" },
    { key: "rateType", label: "Rate Type" },
    { key: "ratePercent", label: "Rate %" },
    { key: "rateAmount", label: "Rate Amount" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rule-sets": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rules": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "serviceType", label: "Service" },
    { key: "customerType", label: "Customer" },
    { key: "taxInclusion", label: "Tax Inclusion" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rule-taxes": [
    { key: "code", label: "Code" },
    { key: "ruleId", label: "Rule" },
    { key: "taxId", label: "Tax" },
    { key: "applyOn", label: "Apply On" },
    { key: "priority", label: "Priority" },
    { key: "isActive", label: "Status" },
  ],
  "document-fx-snapshots": [
    { key: "code", label: "Code" },
    { key: "documentType", label: "Document" },
    { key: "documentId", label: "Document ID" },
    { key: "baseCurrencyId", label: "Base Currency" },
    { key: "quoteCurrencyId", label: "Quote Currency" },
    { key: "rate", label: "Rate" },
  ],
  "document-tax-snapshots": [
    { key: "code", label: "Code" },
    { key: "documentType", label: "Document" },
    { key: "documentId", label: "Document ID" },
    { key: "jurisdictionCode", label: "Jurisdiction Code" },
    { key: "taxAmount", label: "Tax Amount" },
    { key: "totalAmount", label: "Total Amount" },
  ],
  "document-tax-lines": [
    { key: "code", label: "Code" },
    { key: "snapshotId", label: "Snapshot" },
    { key: "taxCode", label: "Tax Code" },
    { key: "taxName", label: "Tax Name" },
    { key: "rateType", label: "Rate Type" },
    { key: "taxAmount", label: "Tax Amount" },
  ],
};

