import { headers } from "next/headers";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import type { TaxManagementInitialData } from "@/modules/tax/shared/tax-management-types";
import { listTaxRecordPage, listTaxRecords } from "@/modules/tax/server/tax-service";
import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";

function toPlainRecord<T extends Record<string, unknown>>(record: T): T {
  const next = { ...record };
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Date) {
      next[key as keyof T] = value.toISOString() as T[keyof T];
    }
  }
  return next;
}

function toPlainRecords(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => toPlainRecord(row));
}

export async function loadTaxManagementInitialData(
  resource: TaxResourceKey,
  options?: { managedTaxId?: string }
): Promise<TaxManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const recordParams = new URLSearchParams({ page: "1", limit: "25" });
    if (
      options?.managedTaxId &&
      (resource === "tax-rates" || resource === "tax-rule-taxes")
    ) {
      recordParams.set("taxId", options.managedTaxId);
    }

    const [records, taxes, jurisdictions, currencies, ruleSets, rules, snapshots] =
      await Promise.all([
        listTaxRecordPage(resource, recordParams, requestHeaders),
        listTaxRecords("taxes", new URLSearchParams({ limit: "100" }), requestHeaders),
        listTaxRecords(
          "tax-jurisdictions",
          new URLSearchParams({ limit: "100" }),
          requestHeaders
        ),
        listCurrencyRecords("currencies", new URLSearchParams({ limit: "100" }), requestHeaders),
        listTaxRecords("tax-rule-sets", new URLSearchParams({ limit: "100" }), requestHeaders),
        listTaxRecords("tax-rules", new URLSearchParams({ limit: "100" }), requestHeaders),
        listTaxRecords(
          "document-tax-snapshots",
          new URLSearchParams({ limit: "100" }),
          requestHeaders
        ),
      ]);

    return {
      resource,
      records: toPlainRecords(records.rows),
      totalRecords: records.total,
      taxes: toPlainRecords(taxes),
      jurisdictions: toPlainRecords(jurisdictions),
      currencies: toPlainRecords(currencies),
      ruleSets: toPlainRecords(ruleSets),
      rules: toPlainRecords(rules),
      snapshots: toPlainRecords(snapshots),
    };
  } catch {
    return null;
  }
}
