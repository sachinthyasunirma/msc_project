import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";

type CurrencyRecordsInput = {
  resource: CurrencyResourceKey;
  q?: string;
  currencyId?: string;
  page?: number;
  limit?: number;
};

export const currencyKeys = {
  all: ["currency-management"] as const,
  lookups: () => [...currencyKeys.all, "lookups"] as const,
  recordsRoot: () => [...currencyKeys.all, "records"] as const,
  recordsByResource: (resource: CurrencyResourceKey) =>
    [...currencyKeys.recordsRoot(), resource] as const,
  records: (input: CurrencyRecordsInput) =>
    [
      ...currencyKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        currencyId: input.currencyId ?? null,
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildCurrencyRecordsParams(input: CurrencyRecordsInput) {
  return {
    q: input.q,
    currencyId: input.currencyId,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
