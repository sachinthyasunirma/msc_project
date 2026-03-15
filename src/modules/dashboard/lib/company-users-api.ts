type CompanyUsersResponse = {
  message?: string;
  users?: Array<Record<string, unknown>>;
};

export async function listCompanyUsersLookup() {
  const response = await fetch("/api/companies/users", { cache: "no-store" });
  const payload = (await response.json()) as CompanyUsersResponse;
  if (!response.ok) {
    throw new Error(payload.message || "Failed to load company users.");
  }
  return payload.users ?? [];
}
