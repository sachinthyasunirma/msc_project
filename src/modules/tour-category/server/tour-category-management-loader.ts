import { headers } from "next/headers";
import {
  listTourCategoryRecordPage,
  listTourCategoryRecords,
} from "@/modules/tour-category/server/tour-category-service";
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
    const params = new URLSearchParams({ page: "1", limit: "25" });

    const [records, types, categories] = await Promise.all([
      listTourCategoryRecordPage(resource, params, requestHeaders),
      listTourCategoryRecords(
        "tour-category-types",
        new URLSearchParams({ limit: "100" }),
        requestHeaders
      ),
      listTourCategoryRecords(
        "tour-categories",
        new URLSearchParams({ limit: "100" }),
        requestHeaders
      ),
    ]);

    return {
      resource,
      records: toPlainRecords(records.rows),
      totalRecords: records.total,
      types: toPlainRecords(types),
      categories: toPlainRecords(categories),
    };
  } catch {
    return null;
  }
}
