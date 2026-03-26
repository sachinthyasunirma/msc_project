import { headers } from "next/headers";
import {
  listBusinessNetworkRecordPage,
  listBusinessNetworkRecords,
} from "@/modules/business-network/server/business-network-service";
import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import { listCompanyUsersLookup } from "@/modules/dashboard/server/company-users-lookup-service";

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

export async function loadBusinessNetworkManagementInitialData(
  resource: BusinessNetworkResourceKey
): Promise<BusinessNetworkManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const [records, organizations, users, currencies] = await Promise.all([
      listBusinessNetworkRecordPage(
        resource,
        new URLSearchParams({ page: "1", limit: "25" }),
        requestHeaders
      ),
      listBusinessNetworkRecords(
        "organizations",
        new URLSearchParams({ limit: "100" }),
        requestHeaders
      ),
      listCompanyUsersLookup(requestHeaders, { limit: 100 }),
      listCurrencyRecords("currencies", new URLSearchParams({ limit: "100" }), requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records.rows),
      totalRecords: records.total,
      organizations: toPlainRecords(organizations),
      users: toPlainRecords(users),
      currencies: toPlainRecords(currencies),
    };
  } catch {
    return null;
  }
}
