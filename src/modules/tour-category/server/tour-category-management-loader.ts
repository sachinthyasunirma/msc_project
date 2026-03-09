import { headers } from "next/headers";
import { listTourCategoryRecords } from "@/modules/tour-category/server/tour-category-service";
import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

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

export async function loadTourCategoryManagementInitialData(
  resource: TourCategoryResourceKey
): Promise<TourCategoryManagementInitialData | null> {
  try {
    const requestHeaders = await headers();
    const params = new URLSearchParams({ limit: "500" });

    const [records, types, categories] = await Promise.all([
      listTourCategoryRecords(resource, params, requestHeaders),
      listTourCategoryRecords("tour-category-types", params, requestHeaders),
      listTourCategoryRecords("tour-categories", params, requestHeaders),
    ]);

    return {
      resource,
      records: toPlainRecords(records),
      types: toPlainRecords(types),
      categories: toPlainRecords(categories),
    };
  } catch {
    return null;
  }
}
