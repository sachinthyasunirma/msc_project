import type {
  AssignTravelersToGroupInput,
  ConvertPreTourToOnTourResponse,
  CreateOnTourSubgroupInput,
  CreateOnTourTravelerInput,
  OnTourDetailData,
  OnTourListFilters,
  OnTourListResponse,
} from "@/modules/on-tour/shared/on-tour-management-types";

type ApiError = { message?: string };

class MissingEndpointError extends Error {
  status: number;

  constructor(message: string, status = 404) {
    super(message);
    this.name = "MissingEndpointError";
    this.status = status;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    if (response.status === 404) {
      throw new MissingEndpointError(payload.message || "Endpoint not implemented yet.", 404);
    }
    throw new Error(payload.message || "On-tour request failed.");
  }
  return payload;
}

function buildSearchParams(filters?: OnTourListFilters) {
  const search = new URLSearchParams();
  if (filters?.q) search.set("q", filters.q);
  if (filters?.status) search.set("status", filters.status);
  search.set("page", String(filters?.page ?? 1));
  search.set("limit", String(filters?.limit ?? 20));
  return search;
}

export async function listOnTours(filters?: OnTourListFilters): Promise<OnTourListResponse> {
  const response = await fetch(`/api/on-tours?${buildSearchParams(filters).toString()}`, {
    cache: "no-store",
  });

  try {
    return await parseJson<OnTourListResponse>(response);
  } catch (error) {
    if (error instanceof MissingEndpointError) {
      return {
        rows: [],
        total: 0,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
      };
    }
    throw error;
  }
}

export async function getOnTourDetail(onTourId: string): Promise<OnTourDetailData> {
  const response = await fetch(`/api/on-tours/${onTourId}`, {
    cache: "no-store",
  });
  return parseJson<OnTourDetailData>(response);
}

export async function createOnTourSubgroup(payload: CreateOnTourSubgroupInput) {
  const response = await fetch(`/api/on-tours/${payload.onTourId}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function createOnTourTraveler(payload: CreateOnTourTravelerInput) {
  const response = await fetch(`/api/on-tours/${payload.onTourId}/travelers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function assignTravelersToGroup(payload: AssignTravelersToGroupInput) {
  const response = await fetch(`/api/on-tours/${payload.onTourId}/groups/${payload.groupId}/travelers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function convertPreTourToOnTour(preTourPlanId: string) {
  const response = await fetch("/api/on-tours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preTourPlanId }),
  });
  return parseJson<ConvertPreTourToOnTourResponse>(response);
}

export function isMissingOnTourEndpoint(error: unknown) {
  return error instanceof MissingEndpointError || (error instanceof Error && /not implemented/i.test(error.message));
}
