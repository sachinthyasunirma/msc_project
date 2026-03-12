import { headers } from "next/headers";
import type { CurrencyManagementInitialData } from "@/modules/currency/shared/currency-management-types";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";

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

export async function loadCurrencyManagementInitialData(
  resource: CurrencyResourceKey,
  options?: { managedCurrencyId?: string }
): Promise<CurrencyManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const recordParams = new URLSearchParams({ limit: "200" });
    if (
      options?.managedCurrencyId &&
      (resource === "exchange-rates" || resource === "money-settings")
    ) {
      recordParams.set("currencyId", options.managedCurrencyId);
    }

    const [records, currencies, providers] = await Promise.all([
      listCurrencyRecords(resource, recordParams, requestHeaders),
      listCurrencyRecords("currencies", new URLSearchParams({ limit: "200" }), requestHeaders),
      listCurrencyRecords("fx-providers", new URLSearchParams({ limit: "200" }), requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records),
      currencies: toPlainRecords(currencies),
      providers: toPlainRecords(providers),
    };
  } catch {
    return null;
  }
}
