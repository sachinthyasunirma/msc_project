import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";

export type TaxManagementInitialData = {
  resource: TaxResourceKey;
  records: Array<Record<string, unknown>>;
  taxes: Array<Record<string, unknown>>;
  jurisdictions: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
  ruleSets: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  snapshots: Array<Record<string, unknown>>;
};
