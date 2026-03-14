import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";

type CurrencyRecordsInput = {
  resource: CurrencyResourceKey;
  q?: string;
  currencyId?: string;
  limit?: number;
};

export const currencyKeys = {
  all: ["currency-management"] as const,
  lookups: () => [...currencyKeys.all, "lookups"] as const,
  recordsRoot: () => [...currencyKeys.all, "records"] as const,
  records: (input: CurrencyRecordsInput) =>
    [
      ...currencyKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        currencyId: input.currencyId ?? null,
        limit: input.limit ?? 200,
      },
    ] as const,
};

export function buildCurrencyRecordsParams(input: CurrencyRecordsInput) {
  return {
    q: input.q,
    currencyId: input.currencyId,
    limit: input.limit ?? 200,
  };
}
