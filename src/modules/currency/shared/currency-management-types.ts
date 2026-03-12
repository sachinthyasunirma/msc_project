import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";

export type CurrencyManagementInitialData = {
  resource: CurrencyResourceKey;
  records: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
  providers: Array<Record<string, unknown>>;
};
