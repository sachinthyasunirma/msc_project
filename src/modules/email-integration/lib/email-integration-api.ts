import type {
  EmailIntegrationAccount,
  EmailIntegrationAccountUpsert,
  EmailIntegrationIntakeProfile,
  EmailIntegrationIntakeProfileUpsert,
  EmailIntegrationMessageSummary,
} from "@/modules/email-integration/shared/email-integration-schemas";

type ApiError = {
  message?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Email integration request failed.");
  }
  return payload;
}

export async function listEmailAccounts(options?: { aiOnly?: boolean }) {
  const search = new URLSearchParams();
  if (options?.aiOnly) search.set("scope", "pre-tour-ai");

  const response = await fetch(`/api/email-accounts${search.size ? `?${search.toString()}` : ""}`, {
    cache: "no-store",
  });
  return parseResponse<{ items: EmailIntegrationAccount[] }>(response);
}

export async function saveEmailAccount(payload: EmailIntegrationAccountUpsert) {
  const response = await fetch("/api/email-accounts", {
    method: payload.id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<EmailIntegrationAccount>(response);
}

export async function deleteEmailAccount(id: string) {
  const response = await fetch("/api/email-accounts", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return parseResponse<{ success: boolean }>(response);
}

export async function testEmailAccount(id: string) {
  const response = await fetch("/api/email-accounts/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return parseResponse<EmailIntegrationAccount>(response);
}

export async function listEmailMessages(params: {
  accountId: string;
  q?: string;
  limit?: number;
}) {
  const search = new URLSearchParams({ accountId: params.accountId });
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));

  const response = await fetch(`/api/email-accounts/messages?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<{
    account: EmailIntegrationAccount;
    intakeProfile: EmailIntegrationIntakeProfile | null;
    items: EmailIntegrationMessageSummary[];
  }>(response);
}

export async function listEmailIntakeProfiles() {
  const response = await fetch("/api/email-intake-profiles", {
    cache: "no-store",
  });
  return parseResponse<{ items: EmailIntegrationIntakeProfile[] }>(response);
}

export async function saveEmailIntakeProfile(payload: EmailIntegrationIntakeProfileUpsert) {
  const response = await fetch("/api/email-intake-profiles", {
    method: payload.id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<EmailIntegrationIntakeProfile>(response);
}

export async function deleteEmailIntakeProfile(id: string) {
  const response = await fetch("/api/email-intake-profiles", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return parseResponse<{ success: boolean }>(response);
}
