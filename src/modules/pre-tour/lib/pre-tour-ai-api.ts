import type {
  PreTourAIApplyRequest,
  PreTourAIApplyResponse,
  PreTourAIEmailContextRequest,
  PreTourAIEmailPrefillResponse,
  PreTourAIGenerateResponse,
  PreTourAIRunDetail,
  PreTourAIRunListResponse,
  PreTourAIRunReviewRequest,
  PreTourAIRequest,
} from "@/modules/pre-tour/shared/pre-tour-ai-schemas";

type ApiError = {
  message?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "AI pre-tour request failed.");
  }
  return payload;
}

export async function generateAIPreTourDraft(payload: PreTourAIRequest) {
  const response = await fetch("/api/pre-tours/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<PreTourAIGenerateResponse>(response);
}

export async function applyAIPreTourDraft(payload: PreTourAIApplyRequest) {
  const response = await fetch("/api/pre-tours/ai/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<PreTourAIApplyResponse>(response);
}

export async function buildAIPreTourEmailContext(payload: PreTourAIEmailContextRequest) {
  const response = await fetch("/api/pre-tours/ai/email-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<PreTourAIEmailPrefillResponse>(response);
}

export async function listPreTourAIEvaluations(params?: {
  q?: string;
  mode?: "ALL" | "CREATE" | "REVISE";
  accuracy?: "ALL" | "high" | "medium" | "low";
  canApply?: "ALL" | "yes" | "no";
  applied?: "ALL" | "yes" | "no";
  reviewStatus?: "ALL" | "PENDING" | "APPROVED" | "NEEDS_WORK" | "REJECTED";
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.mode) search.set("mode", params.mode);
  if (params?.accuracy) search.set("accuracy", params.accuracy);
  if (params?.canApply) search.set("canApply", params.canApply);
  if (params?.applied) search.set("applied", params.applied);
  if (params?.reviewStatus) search.set("reviewStatus", params.reviewStatus);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset !== undefined) search.set("offset", String(params.offset));

  const response = await fetch(`/api/pre-tours/ai/evaluations?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PreTourAIRunListResponse>(response);
}

export async function getPreTourAIEvaluation(runId: string) {
  const response = await fetch(`/api/pre-tours/ai/evaluations/${runId}`, {
    cache: "no-store",
  });
  return parseResponse<PreTourAIRunDetail>(response);
}

export async function reviewPreTourAIEvaluation(
  runId: string,
  payload: PreTourAIRunReviewRequest
) {
  const response = await fetch(`/api/pre-tours/ai/evaluations/${runId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<PreTourAIRunDetail>(response);
}
