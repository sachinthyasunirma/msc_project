import { createHash } from "node:crypto";

type StructuredResponseOptions = {
  model?: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  reasoningEffort?: "low" | "medium" | "high";
  maxOutputTokens?: number;
  safetyIdentifier?: string;
};

function getOpenAIBaseUrl() {
  return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
}

export function getConfiguredOpenAIModel() {
  return process.env.OPENAI_PRE_TOUR_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
}

function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for the AI Pre-Tour planner.");
  }
  return apiKey;
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown; json?: unknown }> }>;
  };

  const jsonChunks: string[] = [];
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.json && typeof contentItem.json === "object") {
        jsonChunks.push(JSON.stringify(contentItem.json));
        continue;
      }
      if (typeof contentItem.text === "string" && contentItem.text.trim().length > 0) {
        chunks.push(contentItem.text.trim());
        continue;
      }
    }
  }

  if (jsonChunks.length > 0) {
    return jsonChunks.join("").trim();
  }

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  return chunks.join("").trim();
}

function normalizeStructuredJsonText(text: string) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function extractIncompleteReason(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as {
    status?: unknown;
    incomplete_details?: { reason?: unknown } | null;
  };
  if (response.status !== "incomplete") return null;
  const reason =
    response.incomplete_details &&
    typeof response.incomplete_details === "object" &&
    typeof response.incomplete_details.reason === "string"
      ? response.incomplete_details.reason
      : "unknown_reason";
  return reason;
}

function normalizeSafetyIdentifier(value?: string) {
  if (!value?.trim()) return undefined;
  return createHash("sha256").update(value.trim()).digest("hex");
}

export async function createStructuredOpenAIResponse({
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  reasoningEffort = "medium",
  maxOutputTokens = 6000,
  safetyIdentifier,
}: StructuredResponseOptions): Promise<{ model: string; text: string; raw: unknown }> {
  const selectedModel = model?.trim() || getConfiguredOpenAIModel();
  const response = await fetch(`${getOpenAIBaseUrl()}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIApiKey()}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
      safety_identifier: normalizeSafetyIdentifier(safetyIdentifier),
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: { message?: unknown } }).error?.message || "OpenAI request failed.")
        : "OpenAI request failed.";
    throw new Error(message);
  }

  const incompleteReason = extractIncompleteReason(payload);
  if (incompleteReason) {
    throw new Error(`OpenAI returned an incomplete structured response (${incompleteReason}).`);
  }

  const text = normalizeStructuredJsonText(extractOutputText(payload));
  if (!text) {
    throw new Error("OpenAI returned an empty structured response.");
  }

  return {
    model: selectedModel,
    text,
    raw: payload,
  };
}
