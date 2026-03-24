import type {
  ResolveAccommodationRateResponse,
  ResolveTransportRateResponse,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";
import type { PreTourDayInitializationResult } from "@/modules/pre-tour/shared/pre-tour-day-initialization-types";

type ApiError = { message?: string };

export type PreTourCursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

type PreTourRow = Record<string, unknown>;

type ListPreTourRecordParams = {
  q?: string;
  limit?: number;
  offset?: number;
  cursor?: string | null;
  planId?: string;
  dayId?: string;
  itemId?: string;
  visitId?: string;
  itemType?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Pre-tour request failed.");
  }
  return payload;
}

export async function listPreTourRecords(
  resource: string,
  params?: ListPreTourRecordParams
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) {
    search.set("limit", String(Math.min(Math.max(params.limit, 1), 100)));
  }
  if (params?.offset) search.set("offset", String(Math.max(params.offset, 0)));
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.planId) search.set("planId", params.planId);
  if (params?.dayId) search.set("dayId", params.dayId);
  if (params?.itemId) search.set("itemId", params.itemId);
  if (params?.visitId) search.set("visitId", params.visitId);
  if (params?.itemType) search.set("itemType", params.itemType);
  const response = await fetch(`/api/pre-tours/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PreTourRow[]>(response);
}

export async function listAllPreTourRecords(
  resource: string,
  params?: Omit<ListPreTourRecordParams, "offset" | "limit"> & { limit?: number }
) {
  const pageSize = Math.min(Math.max(params?.limit ?? 100, 1), 100);
  const rows: PreTourRow[] = [];
  let offset = 0;

  while (true) {
    const nextPage = await listPreTourRecords(resource, {
      ...params,
      limit: pageSize,
      offset,
    });
    rows.push(...nextPage);
    if (nextPage.length < pageSize) {
      return rows;
    }
    offset += pageSize;
  }
}

export async function listPaginatedPreTourRecords(
  resource: "pre-tours" | "pre-tour-bins",
  params?: {
    q?: string;
    limit?: number;
    cursor?: string | null;
  }
) {
  const search = new URLSearchParams();
  search.set("paginated", "true");
  if (params?.q) search.set("q", params.q);
  if (params?.limit) {
    search.set("limit", String(Math.min(Math.max(params.limit, 1), 100)));
  }
  if (params?.cursor) search.set("cursor", params.cursor);
  const response = await fetch(`/api/pre-tours/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PreTourCursorPage<Record<string, unknown>>>(response);
}

export async function getPreTourRecord(resource: string, id: string) {
  const response = await fetch(`/api/pre-tours/${resource}/${id}`, {
    cache: "no-store",
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function createPreTourRecord(resource: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/pre-tours/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function createPreTourVersion(sourcePlanId: string) {
  const response = await fetch("/api/pre-tours/clone-version", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePlanId }),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function copyPreTourPlanChildren(payload: {
  sourcePlanId: string;
  targetPlanId: string;
  codePrefix: string;
}) {
  const response = await fetch("/api/pre-tours/copy-children", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ success: boolean }>(response);
}

export async function initializePreTourDays(planId: string) {
  const response = await fetch("/api/pre-tours/initialize-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  return parseResponse<PreTourDayInitializationResult>(response);
}

export async function generatePreTourCosting(planId: string) {
  const response = await fetch("/api/pre-tours/generate-costing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updatePreTourRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/pre-tours/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deletePreTourRecord(resource: string, id: string) {
  const response = await fetch(`/api/pre-tours/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}

export async function resolvePreTourAccommodationRates(payload: {
  hotelId: string;
  travelDate: string;
  roomTypeId?: string | null;
  roomBasis?: string | null;
}) {
  const response = await fetch("/api/pre-tours/rate-resolution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemType: "ACCOMMODATION",
      ...payload,
    }),
  });
  return parseResponse<ResolveAccommodationRateResponse>(response);
}

export async function resolvePreTourTransportRates(payload: {
  chargeMethod: string;
  fromLocationId: string;
  toLocationId: string;
  serviceDate?: string | null;
  vehicleCategoryId?: string | null;
  vehicleTypeId?: string | null;
  pax?: number | null;
}) {
  const response = await fetch("/api/pre-tours/rate-resolution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemType: "TRANSPORT",
      ...payload,
    }),
  });
  return parseResponse<ResolveTransportRateResponse>(response);
}
