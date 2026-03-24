import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";

type TaxRecordsInput = {
  resource: TaxResourceKey;
  q?: string;
  taxId?: string;
  page?: number;
  limit?: number;
};

export const taxKeys = {
  all: ["taxes-management"] as const,
  lookups: () => [...taxKeys.all, "lookups"] as const,
  recordsRoot: () => [...taxKeys.all, "records"] as const,
  recordsByResource: (resource: TaxResourceKey) =>
    [...taxKeys.recordsRoot(), resource] as const,
  records: (input: TaxRecordsInput) =>
    [
      ...taxKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        taxId: input.taxId ?? null,
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildTaxRecordsParams(input: TaxRecordsInput) {
  return {
    q: input.q,
    taxId: input.taxId,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
