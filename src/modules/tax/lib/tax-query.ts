import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";

type TaxRecordsInput = {
  resource: TaxResourceKey;
  q?: string;
  taxId?: string;
  limit?: number;
};

export const taxKeys = {
  all: ["taxes-management"] as const,
  lookups: () => [...taxKeys.all, "lookups"] as const,
  recordsRoot: () => [...taxKeys.all, "records"] as const,
  records: (input: TaxRecordsInput) =>
    [
      ...taxKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        taxId: input.taxId ?? null,
        limit: input.limit ?? 500,
      },
    ] as const,
};

export function buildTaxRecordsParams(input: TaxRecordsInput) {
  return {
    q: input.q,
    taxId: input.taxId,
    limit: input.limit ?? 500,
  };
}
