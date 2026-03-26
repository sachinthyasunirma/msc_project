type CompanyUsersResponse = {
  message?: string;
  users?: Array<Record<string, unknown>>;
};

export async function listCompanyUsersLookup(params?: { limit?: number; q?: string }) {
  const search = new URLSearchParams({ lookup: "true" });
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.q) search.set("q", params.q);

  const response = await fetch(`/api/companies/users?${search.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as CompanyUsersResponse;
  if (!response.ok) {
    throw new Error(payload.message || "Failed to load company users.");
  }
  return payload.users ?? [];
}
