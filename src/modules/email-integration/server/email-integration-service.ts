import { and, desc, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createStructuredOpenAIResponse, getConfiguredOpenAIModel } from "@/lib/openai/responses";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { sanitizeCodePart } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import {
  emailIntegrationAccountDeleteSchema,
  emailIntegrationAccountListResponseSchema,
  emailIntegrationAccountSchema,
  emailIntegrationAccountTestSchema,
  emailIntegrationAccountUpsertSchema,
  emailIntegrationIntakeProfileDeleteSchema,
  emailIntegrationIntakeProfileListResponseSchema,
  emailIntegrationIntakeProfileSchema,
  emailIntegrationIntakeProfileUpsertSchema,
  emailIntegrationMessageListResponseSchema,
  emailIntegrationMessageQuerySchema,
} from "@/modules/email-integration/shared/email-integration-schemas";
import {
  preTourAIEmailContextRequestSchema,
  preTourAIEmailPrefillResponseSchema,
} from "@/modules/pre-tour/shared/pre-tour-ai-schemas";

class EmailIntegrationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type BasicImapClient = {
  connect(): Promise<void>;
  logout(): Promise<void>;
  close?: () => void;
  mailboxOpen?: (path: string) => Promise<unknown>;
  getMailboxLock?: (path: string) => Promise<{ release(): void }>;
  search: (query: unknown) => Promise<number[]>;
  fetchOne: (
    seq: number | string,
    query: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>;
};

type ResolvedEmailAccount = {
  id: string;
  code: string;
  configSource: "DATABASE" | "ENV_COMMON";
  displayName: string;
  emailAddress: string;
  username: string;
  host: string;
  port: number;
  secure: boolean;
  mailbox: string;
  isActive: boolean;
  isAvailableForPreTourAI: boolean;
  isDefaultForPreTourAI: boolean;
  passwordEncrypted: string | null;
  passwordPlain: string | null;
  lastConnectionStatus: "NEVER_TESTED" | "CONNECTED" | "FAILED";
  lastConnectionError: string | null;
  lastConnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ResolvedEmailIntakeProfile = {
  id: string;
  companyId: string;
  accountId: string;
  accountCode: string;
  accountDisplayName: string;
  accountEmailAddress: string;
  emailAddresses: string[];
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ENV_COMMON_ACCOUNT_ID = "ENV_COMMON_IMAP_ACCOUNT";
const ENV_COMMON_ACCOUNT_CODE = "ENV_COMMON_IMAP";

const emailExtractionSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  promptDraft: z.string().trim().min(20).max(6000),
  hints: z.object({
    categoryHint: z.string().trim().max(160).optional().nullable(),
    marketHint: z.string().trim().max(160).optional().nullable(),
    operatorHint: z.string().trim().max(160).optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    adults: z.coerce.number().int().min(1).max(999).optional().nullable(),
    children: z.coerce.number().int().min(0).max(999).optional().nullable(),
    infants: z.coerce.number().int().min(0).max(999).optional().nullable(),
    preferredLanguage: z.string().trim().max(20).optional().nullable(),
    roomPreference: z.enum(["DOUBLE", "TWIN", "MIXED"]).optional().nullable(),
    mealPreference: z.enum(["BB", "HB", "FB", "AI"]).optional().nullable(),
  }),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
});

function normalizeZodError(error: z.ZodError) {
  const issue = error.issues[0];
  return issue?.message || "Validation failed.";
}

function normalizeJsonSchema(schemaObject: Record<string, unknown>): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "$schema" || key === "default") continue;
      next[key] = visit(entry);
    }

    const properties =
      next.properties && typeof next.properties === "object" && !Array.isArray(next.properties)
        ? (next.properties as Record<string, unknown>)
        : null;
    if (next.type === "object" && properties) {
      next.required = Object.keys(properties);
    }

    return next;
  };
  return visit(schemaObject) as Record<string, unknown>;
}

function buildEmailExtractionSchema() {
  return normalizeJsonSchema(z.toJSONSchema(emailExtractionSchema) as Record<string, unknown>);
}

function toIsoStringOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeEmailText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function buildPreview(text: string, limit = 240) {
  const normalized = normalizeEmailText(text).replace(/\n+/g, " ");
  if (!normalized) return null;
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}...`;
}

function normalizeEmailAddressList(values: unknown) {
  const unique = new Set<string>();
  for (const raw of Array.isArray(values) ? values : []) {
    const normalized = String(raw ?? "").trim().toLowerCase();
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique);
}

function normalizeKeywordList(values: unknown) {
  const unique = new Map<string, string>();
  for (const raw of Array.isArray(values) ? values : []) {
    const normalized = String(raw ?? "").trim().replace(/\s+/g, " ");
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }
  return Array.from(unique.values());
}

function tokenizeSearchQuery(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9@._-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function scoreMessageSearchMatch(
  fields: {
    subject: string | null;
    fromName: string | null;
    fromEmail: string | null;
    preview: string | null;
    plainText: string;
  },
  normalizedQuery: string,
  queryTerms: string[]
) {
  if (!normalizedQuery) return 1;

  const subject = String(fields.subject || "").toLowerCase();
  const fromName = String(fields.fromName || "").toLowerCase();
  const fromEmail = String(fields.fromEmail || "").toLowerCase();
  const preview = String(fields.preview || "").toLowerCase();
  const plainText = fields.plainText.toLowerCase();

  let score = 0;
  if (subject.includes(normalizedQuery)) score += 120;
  if (fromName.includes(normalizedQuery)) score += 90;
  if (fromEmail.includes(normalizedQuery)) score += 90;
  if (preview.includes(normalizedQuery)) score += 60;
  if (plainText.includes(normalizedQuery)) score += 35;

  for (const term of queryTerms) {
    if (subject.startsWith(term)) score += 25;
    else if (subject.includes(term)) score += 15;

    if (fromName.startsWith(term)) score += 20;
    else if (fromName.includes(term)) score += 12;

    if (fromEmail.startsWith(term)) score += 20;
    else if (fromEmail.includes(term)) score += 12;

    if (preview.includes(term)) score += 8;
    if (plainText.includes(term)) score += 4;
  }

  return score;
}

function findMatchingKeywords(keywords: string[], fields: Array<string | null | undefined>) {
  if (keywords.length === 0) return [];
  const haystack = fields
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .toLowerCase();

  if (!haystack) return [];
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).slice(0, 50);
}

function mapIntakeProfileRow(
  row: typeof schema.companyEmailIntakeProfile.$inferSelect,
  currentAccount?: Pick<ResolvedEmailAccount, "id" | "code" | "displayName" | "emailAddress"> | null
) {
  const resolved: ResolvedEmailIntakeProfile = {
    id: String(row.id),
    companyId: String(row.companyId),
    accountId: currentAccount?.id ?? String(row.accountId),
    accountCode: currentAccount?.code ?? String(row.accountCode),
    accountDisplayName: currentAccount?.displayName ?? String(row.accountDisplayName),
    accountEmailAddress:
      currentAccount?.emailAddress ?? String(row.accountEmailAddress).toLowerCase(),
    emailAddresses: normalizeEmailAddressList(row.emailAddresses),
    keywords: normalizeKeywordList(row.keywords),
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return emailIntegrationIntakeProfileSchema.parse({
    id: resolved.id,
    accountId: resolved.accountId,
    accountCode: resolved.accountCode,
    accountDisplayName: resolved.accountDisplayName,
    accountEmailAddress: resolved.accountEmailAddress,
    emailAddresses: resolved.emailAddresses,
    keywords: resolved.keywords,
    isActive: resolved.isActive,
    createdAt: resolved.createdAt.toISOString(),
    updatedAt: resolved.updatedAt.toISOString(),
  });
}

function firstDefinedEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function resolveBooleanEnv(value: string, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function resolveNumberEnv(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toResolvedDatabaseAccount(
  row: typeof schema.companyEmailAccount.$inferSelect
): ResolvedEmailAccount {
  return {
    id: String(row.id),
    code: String(row.code),
    configSource: "DATABASE",
    displayName: String(row.displayName),
    emailAddress: String(row.emailAddress),
    username: normalizeText(row.username) || String(row.emailAddress),
    host: String(row.host),
    port: Number(row.port ?? 993),
    secure: Boolean(row.secure),
    mailbox: normalizeText(row.mailbox) || "INBOX",
    isActive: Boolean(row.isActive),
    isAvailableForPreTourAI: Boolean(row.isAvailableForPreTourAI),
    isDefaultForPreTourAI: Boolean(row.isDefaultForPreTourAI),
    passwordEncrypted: String(row.passwordEncrypted),
    passwordPlain: null,
    lastConnectionStatus:
      row.lastConnectionStatus === "CONNECTED" || row.lastConnectionStatus === "FAILED"
        ? row.lastConnectionStatus
        : "NEVER_TESTED",
    lastConnectionError: normalizeText(row.lastConnectionError) || null,
    lastConnectedAt: row.lastConnectedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getCommonEnvAccount() {
  const emailAddress = firstDefinedEnv("IMAP_COMMON_EMAIL_ADDRESS", "IMAP_SHARED_EMAIL_ADDRESS");
  const host = firstDefinedEnv("IMAP_COMMON_HOST", "IMAP_SHARED_HOST");
  const password = firstDefinedEnv("IMAP_COMMON_PASSWORD", "IMAP_SHARED_PASSWORD");

  if (!emailAddress || !host || !password) {
    return null;
  }

  const username =
    firstDefinedEnv("IMAP_COMMON_USERNAME", "IMAP_SHARED_USERNAME") || emailAddress;
  const mailbox =
    firstDefinedEnv("IMAP_COMMON_MAILBOX", "IMAP_SHARED_MAILBOX") || "INBOX";
  const displayName =
    firstDefinedEnv("IMAP_COMMON_DISPLAY_NAME", "IMAP_SHARED_DISPLAY_NAME") ||
    "Common IMAP Inbox";
  const secure = resolveBooleanEnv(
    firstDefinedEnv("IMAP_COMMON_SECURE", "IMAP_SHARED_SECURE"),
    true
  );
  const port = resolveNumberEnv(
    firstDefinedEnv("IMAP_COMMON_PORT", "IMAP_SHARED_PORT"),
    secure ? 993 : 143
  );
  const now = new Date();

  return {
    id: ENV_COMMON_ACCOUNT_ID,
    code: ENV_COMMON_ACCOUNT_CODE,
    configSource: "ENV_COMMON" as const,
    displayName,
    emailAddress: emailAddress.toLowerCase(),
    username,
    host,
    port,
    secure,
    mailbox,
    isActive: true,
    isAvailableForPreTourAI: true,
    isDefaultForPreTourAI: true,
    passwordEncrypted: null,
    passwordPlain: password,
    lastConnectionStatus: "NEVER_TESTED" as const,
    lastConnectionError: null,
    lastConnectedAt: null,
    createdAt: now,
    updatedAt: now,
  } satisfies ResolvedEmailAccount;
}

function mapAccountRow(row: ResolvedEmailAccount) {
  return emailIntegrationAccountSchema.parse({
    id: String(row.id),
    code: String(row.code),
    configSource: row.configSource,
    displayName: String(row.displayName),
    emailAddress: String(row.emailAddress),
    username: String(row.username),
    host: String(row.host),
    port: Number(row.port ?? 993),
    secure: Boolean(row.secure),
    mailbox: normalizeText(row.mailbox) || "INBOX",
    isActive: Boolean(row.isActive),
    isAvailableForPreTourAI: Boolean(row.isAvailableForPreTourAI),
    isDefaultForPreTourAI: Boolean(row.isDefaultForPreTourAI),
    hasPassword: Boolean(row.passwordEncrypted || row.passwordPlain),
    lastConnectionStatus: row.lastConnectionStatus,
    lastConnectionError: normalizeText(row.lastConnectionError) || null,
    lastConnectedAt: toIsoStringOrNull(row.lastConnectedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function buildAccountCode(emailAddress: string) {
  const local = sanitizeCodePart(emailAddress.split("@")[0] || emailAddress).slice(0, 24) || "MAIL";
  return `EMAIL_${local}_${nanoid(6).toUpperCase()}`;
}

async function ensureConfigAccess(headers: Headers) {
  try {
    const access = await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_CONFIGURATION_COMPANY",
    });
    if (!access.privileges.includes("COMPANY_SETTINGS_MANAGE")) {
      throw new EmailIntegrationError(
        403,
        "FORBIDDEN",
        "You do not have permission to manage company email accounts."
      );
    }
    return access;
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new EmailIntegrationError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensurePreTourAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, { requiredPrivilege: "SCREEN_PRE_TOURS" });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new EmailIntegrationError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function loadAccountForCompany(companyId: string, accountId: string) {
  if (accountId === ENV_COMMON_ACCOUNT_ID) {
    const commonAccount = getCommonEnvAccount();
    if (!commonAccount) {
      throw new EmailIntegrationError(
        404,
        "EMAIL_ACCOUNT_NOT_FOUND",
        "Common IMAP account is not configured in the environment."
      );
    }
    return commonAccount;
  }

  const [account] = await db
    .select()
    .from(schema.companyEmailAccount)
    .where(
      and(
        eq(schema.companyEmailAccount.companyId, companyId),
        eq(schema.companyEmailAccount.id, accountId)
      )
    )
    .limit(1);

  if (!account) {
    throw new EmailIntegrationError(404, "EMAIL_ACCOUNT_NOT_FOUND", "Email account was not found.");
  }

  return toResolvedDatabaseAccount(account);
}

async function loadAIEnabledAccount(companyId: string, accountId: string) {
  const account = await loadAccountForCompany(companyId, accountId);
  if (!account.isActive || !account.isAvailableForPreTourAI) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_ACCOUNT_NOT_AVAILABLE",
      "This email account is not active for Pre-Tour AI processing."
    );
  }
  return account;
}

async function loadIntakeProfileForAccount(
  companyId: string,
  account: Pick<ResolvedEmailAccount, "id" | "emailAddress">
) {
  const [exactProfile] = await db
    .select()
    .from(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, companyId),
        eq(schema.companyEmailIntakeProfile.accountId, String(account.id))
      )
    )
    .limit(1);

  if (exactProfile) {
    return exactProfile;
  }

  const normalizedEmailAddress = String(account.emailAddress).trim().toLowerCase();
  if (!normalizedEmailAddress) {
    return null;
  }

  const [fallbackProfile] = await db
    .select()
    .from(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, companyId),
        eq(schema.companyEmailIntakeProfile.accountEmailAddress, normalizedEmailAddress)
      )
    )
    .orderBy(
      desc(schema.companyEmailIntakeProfile.isActive),
      desc(schema.companyEmailIntakeProfile.updatedAt)
    )
    .limit(1);

  return fallbackProfile ?? null;
}

async function loadActiveIntakeProfileTargets(companyId: string) {
  const rows = await db
    .select({
      accountId: schema.companyEmailIntakeProfile.accountId,
      accountEmailAddress: schema.companyEmailIntakeProfile.accountEmailAddress,
    })
    .from(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, companyId),
        eq(schema.companyEmailIntakeProfile.isActive, true)
      )
    );

  return {
    accountIds: new Set(rows.map((row) => String(row.accountId))),
    accountEmailAddresses: new Set(
      rows.map((row) => String(row.accountEmailAddress || "").trim().toLowerCase()).filter(Boolean)
    ),
  };
}

async function loadEmailPackages() {
  try {
    const [{ ImapFlow }, { simpleParser }] = await Promise.all([
      import("imapflow"),
      import("mailparser"),
    ]);
    return { ImapFlow, simpleParser };
  } catch (error) {
    throw new EmailIntegrationError(
      500,
      "EMAIL_DEPENDENCY_MISSING",
      error instanceof Error
        ? `Email IMAP packages could not be loaded: ${error.message}`
        : "Email IMAP dependencies are not installed. Run npm install imapflow mailparser."
    );
  }
}

async function withImapClient<T>(
  account: ResolvedEmailAccount,
  fn: (client: BasicImapClient) => Promise<T>
) {
  const { ImapFlow } = await loadEmailPackages();
  const password = account.passwordPlain
    ? account.passwordPlain
    : account.passwordEncrypted
      ? decryptSecret(String(account.passwordEncrypted))
      : "";

  if (!password) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_PASSWORD_MISSING",
      "IMAP password is not configured for the selected email account."
    );
  }

  const client = new ImapFlow({
    host: String(account.host),
    port: Number(account.port ?? 993),
    secure: Boolean(account.secure),
    auth: {
      user: String(account.username),
      pass: password,
    },
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      if (typeof client.close === "function") {
        try {
          client.close();
        } catch {
          // noop
        }
      }
    }
  }
}

async function testStoredAccountConnection(
  account: ResolvedEmailAccount
) {
  await withImapClient(account, async (client) => {
    if (typeof client.mailboxOpen === "function") {
      await client.mailboxOpen(String(account.mailbox || "INBOX"));
      return;
    }
    if (typeof client.getMailboxLock === "function") {
      const lock = await client.getMailboxLock(String(account.mailbox || "INBOX"));
      lock.release();
    }
  });
}

async function updateConnectionStatus(
  companyId: string,
  accountId: string,
  payload: {
    status: "CONNECTED" | "FAILED";
    errorMessage?: string | null;
  }
) {
  const [updated] = await db
    .update(schema.companyEmailAccount)
    .set({
      lastConnectionStatus: payload.status,
      lastConnectionError: payload.errorMessage ? payload.errorMessage.slice(0, 2000) : null,
      lastConnectedAt: payload.status === "CONNECTED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.companyEmailAccount.companyId, companyId),
        eq(schema.companyEmailAccount.id, accountId)
      )
    )
    .returning();

  return updated ? mapAccountRow(toResolvedDatabaseAccount(updated)) : null;
}

async function parseMessageFromClient(client: BasicImapClient, messageUid: number) {
  const { simpleParser } = await loadEmailPackages();
  const message = await client.fetchOne(
    messageUid,
    {
      uid: true,
      envelope: true,
      internalDate: true,
      source: true,
    },
    { uid: true }
  );

  if (!message) {
    throw new EmailIntegrationError(
      404,
      "EMAIL_MESSAGE_NOT_FOUND",
      "Selected email message was not found."
    );
  }

  const sourceBuffer = Buffer.isBuffer(message.source)
    ? message.source
    : Buffer.from(String(message.source ?? ""), "utf8");
  const parsed = (sourceBuffer.length > 0 ? await simpleParser(sourceBuffer) : null) as
    | {
        text?: string | null;
        html?: string | Buffer | false | null;
        subject?: string | null;
        messageId?: string | null;
        date?: Date | null;
        from?: {
          value?: Array<{ name?: string | null; address?: string | null }>;
        } | null;
      }
    | null;
  const envelope = (message.envelope ?? null) as
    | {
        subject?: string | null;
        messageId?: string | null;
        date?: Date | string | null;
        from?: Array<{ name?: string | null; address?: string | null }> | null;
        sender?: Array<{ name?: string | null; address?: string | null }> | null;
      }
    | null;
  const envelopeFrom = Array.isArray(envelope?.from) ? envelope.from[0] : null;
  const parsedFrom =
    parsed?.from && Array.isArray(parsed.from.value) ? parsed.from.value[0] : null;
  const subject = normalizeText(parsed?.subject || envelope?.subject) || null;
  const messageId =
    normalizeText(parsed?.messageId || envelope?.messageId || message.messageId) || null;
  const internalDate =
    message.internalDate instanceof Date || typeof message.internalDate === "string"
      ? message.internalDate
      : null;
  const receivedAt =
    toIsoStringOrNull(parsed?.date || internalDate || envelope?.date) || null;
  const fromName =
    normalizeText(parsedFrom?.name || envelopeFrom?.name || envelope?.sender?.[0]?.name) ||
    null;
  const fromEmail =
    normalizeText(
      parsedFrom?.address || envelopeFrom?.address || envelope?.sender?.[0]?.address
    ) || null;
  const plainText = normalizeEmailText(
    typeof parsed?.text === "string" ? parsed.text : String(parsed?.html ?? "")
  );

  return {
    messageUid: Number(message.uid ?? messageUid),
    messageId,
    subject,
    receivedAt,
    fromName,
    fromEmail,
    plainText,
  };
}

async function fetchParsedMessage(
  account: ResolvedEmailAccount,
  messageUid: number
) {
  return withImapClient(account, async (client) => {
    const mailboxName = String(account.mailbox || "INBOX");
    const lock =
      typeof client.getMailboxLock === "function"
        ? await client.getMailboxLock(mailboxName)
        : null;

    try {
      if (!lock && typeof client.mailboxOpen === "function") {
        await client.mailboxOpen(mailboxName);
      }
      return parseMessageFromClient(client, messageUid);
    } finally {
      lock?.release();
    }
  });
}

function buildFallbackEmailPrefill(options: {
  accountId: string;
  accountEmail: string;
  messageUid: number;
  messageId: string | null;
  subject: string | null;
  receivedAt: string | null;
  fromName: string | null;
  fromEmail: string | null;
  prompt: string;
  plainText: string;
}) {
  const excerpt = options.plainText.slice(0, 2200);
  const promptSections = [
    "Create a pre-tour draft from the following customer email context.",
    options.subject ? `Email subject: ${options.subject}` : null,
    options.fromEmail ? `Requester email: ${options.fromEmail}` : null,
    excerpt ? `Email request:\n${excerpt}` : null,
    options.prompt.trim() ? `Planner instruction:\n${options.prompt.trim()}` : null,
    "Use available master data only and do not invent service codes.",
  ].filter(Boolean);

  return preTourAIEmailPrefillResponseSchema.parse({
    source: {
      accountId: options.accountId,
      accountEmail: options.accountEmail,
      messageUid: options.messageUid,
      messageId: options.messageId,
      subject: options.subject,
      receivedAt: options.receivedAt,
      fromName: options.fromName,
      fromEmail: options.fromEmail,
    },
    summary: buildPreview(options.plainText, 500) || options.subject || "Email request captured.",
    promptDraft: promptSections.join("\n\n").slice(0, 6000),
    hints: {
      categoryHint: null,
      marketHint: null,
      operatorHint: null,
      startDate: null,
      endDate: null,
      adults: null,
      children: null,
      infants: null,
      preferredLanguage: null,
      roomPreference: null,
      mealPreference: null,
    },
    warnings: ["Email header extraction fallback was used. Review the prefilled details carefully."],
  });
}

async function getCompanyEmailAccountItems(companyId: string, aiOnly = false) {
  const commonAccount = getCommonEnvAccount();
  const [rows, activeIntakeProfileTargets] = await Promise.all([
    db
      .select()
      .from(schema.companyEmailAccount)
      .where(
        and(
          eq(schema.companyEmailAccount.companyId, companyId),
          aiOnly ? eq(schema.companyEmailAccount.isActive, true) : undefined,
          aiOnly ? eq(schema.companyEmailAccount.isAvailableForPreTourAI, true) : undefined
        )
      )
      .orderBy(
        desc(schema.companyEmailAccount.isDefaultForPreTourAI),
        desc(schema.companyEmailAccount.isActive),
        desc(schema.companyEmailAccount.createdAt)
      ),
    aiOnly
      ? loadActiveIntakeProfileTargets(companyId)
      : Promise.resolve({
          accountIds: new Set<string>(),
          accountEmailAddresses: new Set<string>(),
        }),
  ]);

  const resolvedAccounts = [
    ...(commonAccount ? [commonAccount] : []),
    ...rows.map((row) => toResolvedDatabaseAccount(row)),
  ];

  const prioritizedAccounts = aiOnly
    ? [...resolvedAccounts].sort((left, right) => {
        const leftHasProfile =
          activeIntakeProfileTargets.accountIds.has(String(left.id)) ||
          activeIntakeProfileTargets.accountEmailAddresses.has(
            String(left.emailAddress).trim().toLowerCase()
          )
            ? 1
            : 0;
        const rightHasProfile =
          activeIntakeProfileTargets.accountIds.has(String(right.id)) ||
          activeIntakeProfileTargets.accountEmailAddresses.has(
            String(right.emailAddress).trim().toLowerCase()
          )
            ? 1
            : 0;
        if (rightHasProfile !== leftHasProfile) return rightHasProfile - leftHasProfile;
        if (Number(right.isDefaultForPreTourAI) !== Number(left.isDefaultForPreTourAI)) {
          return Number(right.isDefaultForPreTourAI) - Number(left.isDefaultForPreTourAI);
        }
        if (Number(right.isActive) !== Number(left.isActive)) {
          return Number(right.isActive) - Number(left.isActive);
        }
        return 0;
      })
    : resolvedAccounts;

  const preferredDefaultAccountId = aiOnly
    ? prioritizedAccounts.find(
        (account) =>
          account.isDefaultForPreTourAI &&
          (activeIntakeProfileTargets.accountIds.has(String(account.id)) ||
            activeIntakeProfileTargets.accountEmailAddresses.has(
              String(account.emailAddress).trim().toLowerCase()
            ))
      )?.id ??
      prioritizedAccounts.find(
        (account) =>
          activeIntakeProfileTargets.accountIds.has(String(account.id)) ||
          activeIntakeProfileTargets.accountEmailAddresses.has(
            String(account.emailAddress).trim().toLowerCase()
          )
      )?.id ??
      prioritizedAccounts.find((account) => account.isDefaultForPreTourAI)?.id ??
      prioritizedAccounts[0]?.id
    : prioritizedAccounts.find((account) => account.isDefaultForPreTourAI)?.id ??
      prioritizedAccounts[0]?.id;

  const items = prioritizedAccounts.map((account) =>
    mapAccountRow({
      ...account,
      isDefaultForPreTourAI: String(account.id) === String(preferredDefaultAccountId ?? ""),
    })
  );

  return items;
}

export async function listCompanyEmailAccounts(headers: Headers, aiOnly = false) {
  const access = aiOnly ? await ensurePreTourAccess(headers) : await ensureConfigAccess(headers);
  const items = await getCompanyEmailAccountItems(access.companyId, aiOnly);

  return emailIntegrationAccountListResponseSchema.parse({
    items,
  });
}

export async function listCompanyEmailIntakeProfiles(headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const [accounts, rows] = await Promise.all([
    getCompanyEmailAccountItems(access.companyId, false),
    db
      .select()
      .from(schema.companyEmailIntakeProfile)
      .where(eq(schema.companyEmailIntakeProfile.companyId, access.companyId))
      .orderBy(
        desc(schema.companyEmailIntakeProfile.isActive),
        desc(schema.companyEmailIntakeProfile.updatedAt)
      ),
  ]);

  const accountsById = new Map(
    accounts.map((account) => [
      account.id,
      {
        id: account.id,
        code: account.code,
        displayName: account.displayName,
        emailAddress: account.emailAddress,
      },
    ])
  );

  return emailIntegrationIntakeProfileListResponseSchema.parse({
    items: rows.map((row) => mapIntakeProfileRow(row, accountsById.get(String(row.accountId)) ?? null)),
  });
}

async function syncIntakeProfileAccountSnapshot(
  companyId: string,
  account: Pick<ResolvedEmailAccount, "id" | "code" | "displayName" | "emailAddress">,
  actor: { userId: string; userName: string | null | undefined },
  updatedAt: Date
) {
  await db
    .update(schema.companyEmailIntakeProfile)
    .set({
      accountCode: String(account.code),
      accountDisplayName: String(account.displayName),
      accountEmailAddress: String(account.emailAddress).toLowerCase(),
      updatedByUserId: actor.userId,
      updatedByName: actor.userName ?? null,
      updatedAt,
    })
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, companyId),
        eq(schema.companyEmailIntakeProfile.accountId, String(account.id))
      )
    );
}

export async function upsertCompanyEmailIntakeProfile(payload: unknown, headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const parsed = emailIntegrationIntakeProfileUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const account = await loadAccountForCompany(access.companyId, parsed.data.accountId);
  const emailAddresses = normalizeEmailAddressList(parsed.data.emailAddresses);
  const keywords = normalizeKeywordList(parsed.data.keywords);

  if (emailAddresses.length === 0) {
    throw new EmailIntegrationError(
      400,
      "VALIDATION_ERROR",
      "Add at least one user email address for the intake filter."
    );
  }

  if (keywords.length === 0) {
    throw new EmailIntegrationError(
      400,
      "VALIDATION_ERROR",
      "Add at least one keyword for the intake filter."
    );
  }

  const now = new Date();
  const values = {
    accountId: String(account.id),
    accountCode: String(account.code),
    accountDisplayName: String(account.displayName),
    accountEmailAddress: String(account.emailAddress).toLowerCase(),
    emailAddresses,
    keywords,
    isActive: parsed.data.isActive,
    updatedByUserId: access.userId,
    updatedByName: access.userName,
    updatedAt: now,
  };

  const [existing] = await db
    .select()
    .from(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, access.companyId),
        parsed.data.id
          ? eq(schema.companyEmailIntakeProfile.id, parsed.data.id)
          : eq(schema.companyEmailIntakeProfile.accountId, String(account.id))
      )
    )
    .limit(1);

  const [existingByAccount] = await db
    .select()
    .from(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, access.companyId),
        eq(schema.companyEmailIntakeProfile.accountId, String(account.id))
      )
    )
    .limit(1);

  if (existingByAccount && existingByAccount.id !== existing?.id) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_INTAKE_PROFILE_ALREADY_EXISTS",
      "An intake filter is already configured for the selected mailbox."
    );
  }

  let saved: typeof schema.companyEmailIntakeProfile.$inferSelect;
  if (existing) {
    const [updated] = await db
      .update(schema.companyEmailIntakeProfile)
      .set(values)
      .where(
        and(
          eq(schema.companyEmailIntakeProfile.companyId, access.companyId),
          eq(schema.companyEmailIntakeProfile.id, existing.id)
        )
      )
      .returning();

    if (!updated) {
      throw new EmailIntegrationError(
        404,
        "EMAIL_INTAKE_PROFILE_NOT_FOUND",
        "Email intake profile was not found."
      );
    }

    saved = updated;
  } else {
    const [created] = await db
      .insert(schema.companyEmailIntakeProfile)
      .values({
        companyId: access.companyId,
        createdByUserId: access.userId,
        createdByName: access.userName,
        createdAt: now,
        ...values,
      })
      .returning();

    saved = created;
  }

  return mapIntakeProfileRow(saved, account);
}

export async function deleteCompanyEmailIntakeProfile(payload: unknown, headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const parsed = emailIntegrationIntakeProfileDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const [deleted] = await db
    .delete(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, access.companyId),
        eq(schema.companyEmailIntakeProfile.id, parsed.data.id)
      )
    )
    .returning({ id: schema.companyEmailIntakeProfile.id });

  if (!deleted) {
    throw new EmailIntegrationError(
      404,
      "EMAIL_INTAKE_PROFILE_NOT_FOUND",
      "Email intake profile was not found."
    );
  }

  return { success: true };
}

export async function upsertCompanyEmailAccount(payload: unknown, headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const parsed = emailIntegrationAccountUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  if (parsed.data.id === ENV_COMMON_ACCOUNT_ID) {
    throw new EmailIntegrationError(
      400,
      "ENV_MANAGED_EMAIL_ACCOUNT",
      "The common IMAP mailbox is managed through environment variables. Update the IMAP_COMMON_* values in .env instead."
    );
  }

  const existing = parsed.data.id
    ? await loadAccountForCompany(access.companyId, parsed.data.id)
    : null;
  const now = new Date();
  const nextIsDefault =
    parsed.data.isDefaultForPreTourAI && parsed.data.isActive && parsed.data.isAvailableForPreTourAI;
  const passwordEncrypted = parsed.data.password
    ? encryptSecret(parsed.data.password)
    : existing?.passwordEncrypted || "";
  const normalizedEmailAddress = parsed.data.emailAddress.toLowerCase();
  const normalizedUsername = normalizeText(parsed.data.username) || normalizedEmailAddress;

  if (!passwordEncrypted) {
    throw new EmailIntegrationError(
      400,
      "VALIDATION_ERROR",
      "Password or app password is required for the email account."
    );
  }

  const values = {
    displayName: parsed.data.displayName,
    emailAddress: normalizedEmailAddress,
    username: normalizedUsername,
    passwordEncrypted,
    host: parsed.data.host,
    port: parsed.data.port,
    secure: parsed.data.secure,
    mailbox: parsed.data.mailbox || "INBOX",
    isActive: parsed.data.isActive,
    isAvailableForPreTourAI: parsed.data.isAvailableForPreTourAI,
    isDefaultForPreTourAI: nextIsDefault,
    updatedByUserId: access.userId,
    updatedByName: access.userName,
    updatedAt: now,
  };

  let saved: typeof schema.companyEmailAccount.$inferSelect;
  if (existing) {
    const [updated] = await db
      .update(schema.companyEmailAccount)
      .set(values)
      .where(
        and(
          eq(schema.companyEmailAccount.companyId, access.companyId),
          eq(schema.companyEmailAccount.id, existing.id)
        )
      )
      .returning();

    if (!updated) {
      throw new EmailIntegrationError(
        404,
        "EMAIL_ACCOUNT_NOT_FOUND",
        "Email account was not found."
      );
    }

    saved = updated;
  } else {
    const [created] = await db
      .insert(schema.companyEmailAccount)
      .values({
        companyId: access.companyId,
        code: buildAccountCode(parsed.data.emailAddress),
        ...values,
        createdByUserId: access.userId,
        createdByName: access.userName,
        lastConnectionStatus: "NEVER_TESTED",
        createdAt: now,
      })
      .returning();

    saved = created;
  }

  if (nextIsDefault) {
    await db
      .update(schema.companyEmailAccount)
      .set({
        isDefaultForPreTourAI: false,
        updatedByUserId: access.userId,
        updatedByName: access.userName,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.companyEmailAccount.companyId, access.companyId),
          ne(schema.companyEmailAccount.id, saved.id)
        )
      );
  }

  await syncIntakeProfileAccountSnapshot(
    access.companyId,
    {
      id: String(saved.id),
      code: String(saved.code),
      displayName: String(saved.displayName),
      emailAddress: String(saved.emailAddress),
    },
    { userId: access.userId, userName: access.userName },
    now
  );

  return mapAccountRow(toResolvedDatabaseAccount(saved));
}

export async function deleteCompanyEmailAccount(payload: unknown, headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const parsed = emailIntegrationAccountDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  if (parsed.data.id === ENV_COMMON_ACCOUNT_ID) {
    throw new EmailIntegrationError(
      400,
      "ENV_MANAGED_EMAIL_ACCOUNT",
      "The common IMAP mailbox is managed through environment variables and cannot be deleted here."
    );
  }

  const existing = await loadAccountForCompany(access.companyId, parsed.data.id);
  const [deleted] = await db
    .delete(schema.companyEmailAccount)
    .where(
      and(
        eq(schema.companyEmailAccount.companyId, access.companyId),
        eq(schema.companyEmailAccount.id, parsed.data.id)
      )
    )
    .returning({ id: schema.companyEmailAccount.id });

  if (!deleted) {
    throw new EmailIntegrationError(404, "EMAIL_ACCOUNT_NOT_FOUND", "Email account was not found.");
  }

  await db
    .delete(schema.companyEmailIntakeProfile)
    .where(
      and(
        eq(schema.companyEmailIntakeProfile.companyId, access.companyId),
        eq(schema.companyEmailIntakeProfile.accountId, existing.id)
      )
    );

  return { success: true };
}

export async function testCompanyEmailAccount(payload: unknown, headers: Headers) {
  const access = await ensureConfigAccess(headers);
  const parsed = emailIntegrationAccountTestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const account = await loadAccountForCompany(access.companyId, parsed.data.id);
  try {
    await testStoredAccountConnection(account);
    if (account.configSource === "ENV_COMMON") {
      return mapAccountRow({
        ...account,
        lastConnectionStatus: "CONNECTED",
        lastConnectionError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    const updated = await updateConnectionStatus(access.companyId, account.id, {
      status: "CONNECTED",
      errorMessage: null,
    });
    if (!updated) {
      throw new EmailIntegrationError(404, "EMAIL_ACCOUNT_NOT_FOUND", "Email account was not found.");
    }
    return updated;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to the configured mailbox.";
    if (account.configSource === "DATABASE") {
      await updateConnectionStatus(access.companyId, account.id, {
        status: "FAILED",
        errorMessage: message,
      });
    }
    throw new EmailIntegrationError(400, "EMAIL_CONNECTION_FAILED", message);
  }
}

export async function listAIEmailMessages(searchParams: URLSearchParams, headers: Headers) {
  const access = await ensurePreTourAccess(headers);
  const parsed = emailIntegrationMessageQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const account = await loadAIEnabledAccount(access.companyId, parsed.data.accountId);
  const intakeProfileRow = await loadIntakeProfileForAccount(access.companyId, account);
  const intakeProfile = intakeProfileRow ? mapIntakeProfileRow(intakeProfileRow, account) : null;

  if (!intakeProfile || !intakeProfile.isActive) {
    return emailIntegrationMessageListResponseSchema.parse({
      account: mapAccountRow(account),
      intakeProfile,
      items: [],
    });
  }

  const items = await withImapClient(account, async (client) => {
    const normalizedQuery = parsed.data.q.trim().toLowerCase();
    const queryTerms = tokenizeSearchQuery(normalizedQuery);
    const allowedEmailAddresses = normalizeEmailAddressList(intakeProfile.emailAddresses);
    const requiredKeywords = normalizeKeywordList(intakeProfile.keywords);
    const mailboxName = String(account.mailbox || "INBOX");
    const lock =
      typeof client.getMailboxLock === "function"
        ? await client.getMailboxLock(mailboxName)
        : null;

    try {
      if (!lock && typeof client.mailboxOpen === "function") {
        await client.mailboxOpen(mailboxName);
      }

      const matched: Array<{
        uid: number;
        messageId: string | null;
        subject: string | null;
        fromName: string | null;
        fromEmail: string | null;
        receivedAt: string | null;
        preview: string | null;
        matchedEmailAddress: string | null;
        matchedKeywords: string[];
        score: number;
      }> = [];
      const rawUids = await client.search({ all: true });
      const orderedUids = Array.isArray(rawUids)
        ? [...rawUids].map((value) => Number(value)).filter(Number.isFinite).sort((a, b) => b - a)
        : [];
      const candidateUids = orderedUids.slice(0, parsed.data.limit);

      for (const uid of candidateUids) {
        const parsedMessage = await parseMessageFromClient(client, uid);
        const preview = buildPreview(parsedMessage.plainText, 220);
        const normalizedFromEmail = String(parsedMessage.fromEmail || "").trim().toLowerCase();
        const matchedEmailAddress =
          allowedEmailAddresses.find((emailAddress) => emailAddress === normalizedFromEmail) ?? null;
        if (allowedEmailAddresses.length > 0 && !matchedEmailAddress) {
          continue;
        }

        const matchedKeywords = findMatchingKeywords(requiredKeywords, [
          parsedMessage.subject,
          preview,
          parsedMessage.plainText,
        ]);
        if (requiredKeywords.length > 0 && matchedKeywords.length === 0) {
          continue;
        }

        const score = scoreMessageSearchMatch(
          {
            subject: parsedMessage.subject,
            fromName: parsedMessage.fromName,
            fromEmail: parsedMessage.fromEmail,
            preview,
            plainText: parsedMessage.plainText,
          },
          normalizedQuery,
          queryTerms
        );

        if (normalizedQuery && score <= 0) {
          continue;
        }

        matched.push({
          uid: parsedMessage.messageUid,
          messageId: parsedMessage.messageId,
          subject: parsedMessage.subject,
          fromName: parsedMessage.fromName,
          fromEmail: parsedMessage.fromEmail,
          receivedAt: parsedMessage.receivedAt,
          preview,
          matchedEmailAddress,
          matchedKeywords,
          score: score + matchedKeywords.length * 6,
        });

      }

      return matched
        .sort((left, right) => {
          if (right.receivedAt && left.receivedAt) {
            return right.receivedAt.localeCompare(left.receivedAt);
          }
          return right.uid - left.uid;
        })
        .slice(0, parsed.data.limit)
        .map((item) => ({
          uid: item.uid,
          messageId: item.messageId,
          subject: item.subject,
          fromName: item.fromName,
          fromEmail: item.fromEmail,
          receivedAt: item.receivedAt,
          preview: item.preview,
          matchedEmailAddress: item.matchedEmailAddress,
          matchedKeywords: item.matchedKeywords,
        }));
    } finally {
      lock?.release();
    }
  });

  return emailIntegrationMessageListResponseSchema.parse({
    account: mapAccountRow(account),
    intakeProfile,
    items,
  });
}

export async function buildPreTourAIEmailPrefill(payload: unknown, headers: Headers) {
  const access = await ensurePreTourAccess(headers);
  const parsed = preTourAIEmailContextRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new EmailIntegrationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const account = await loadAIEnabledAccount(access.companyId, parsed.data.accountId);
  const intakeProfileRow = await loadIntakeProfileForAccount(access.companyId, account);
  const intakeProfile = intakeProfileRow ? mapIntakeProfileRow(intakeProfileRow, account) : null;
  if (!intakeProfile || !intakeProfile.isActive) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_INTAKE_PROFILE_REQUIRED",
      "Configure an active AI email intake profile before processing mailbox messages."
    );
  }

  const message = await fetchParsedMessage(account, parsed.data.messageUid);
  const preview = buildPreview(message.plainText, 220);
  const normalizedFromEmail = String(message.fromEmail || "").trim().toLowerCase();
  const matchedEmailAddress =
    normalizeEmailAddressList(intakeProfile.emailAddresses).find(
      (emailAddress) => emailAddress === normalizedFromEmail
    ) ?? null;
  const matchedKeywords = findMatchingKeywords(normalizeKeywordList(intakeProfile.keywords), [
    message.subject,
    preview,
    message.plainText,
  ]);

  if (!matchedEmailAddress || matchedKeywords.length === 0) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_MESSAGE_NOT_ALLOWED",
      "The selected email does not match the configured AI intake email and keyword filters."
    );
  }

  const sourcePayload = {
    accountId: String(account.id),
    accountEmail: String(account.emailAddress),
    messageUid: message.messageUid,
    messageId: message.messageId,
    subject: message.subject,
    receivedAt: message.receivedAt,
    fromName: message.fromName,
    fromEmail: message.fromEmail,
  };

  const normalizedText = normalizeEmailText(message.plainText).slice(0, 12000);
  if (!normalizedText && !message.subject) {
    throw new EmailIntegrationError(
      400,
      "EMAIL_MESSAGE_EMPTY",
      "The selected email does not contain enough text to build AI context."
    );
  }

  try {
    const response = await createStructuredOpenAIResponse({
      model: getConfiguredOpenAIModel(),
      schemaName: "pre_tour_ai_email_prefill",
      schema: buildEmailExtractionSchema(),
      systemPrompt: [
        "You extract pre-tour planning context from customer emails for a travel SaaS platform.",
        "Only return facts supported by the email or the explicit planner note.",
        "Never invent service codes, supplier names, or exact travel dates when they are unclear.",
        "If something is ambiguous, return null and add a warning.",
        "Produce a concise but useful promptDraft that can be passed to a pre-tour planning AI.",
      ].join("\n"),
      userPrompt: [
        `Source mode: ${parsed.data.sourceType}`,
        parsed.data.prompt.trim()
          ? `Planner note:\n${parsed.data.prompt.trim()}`
          : "Planner note: none",
        "",
        "Email metadata:",
        JSON.stringify(
          {
            subject: message.subject,
            fromName: message.fromName,
            fromEmail: message.fromEmail,
            receivedAt: message.receivedAt,
          },
          null,
          2
        ),
        "",
        "Email body:",
        normalizedText || message.subject || "",
      ].join("\n"),
      reasoningEffort: "medium",
      maxOutputTokens: 2200,
      safetyIdentifier: `${access.companyId}:${access.userId}:email-prefill`,
    });

    const extracted = emailExtractionSchema.parse(JSON.parse(response.text));
    return preTourAIEmailPrefillResponseSchema.parse({
      source: sourcePayload,
      summary: extracted.summary,
      promptDraft: extracted.promptDraft,
      hints: extracted.hints,
      warnings: extracted.warnings,
    });
  } catch {
    const fallback = buildFallbackEmailPrefill({
      accountId: String(account.id),
      accountEmail: String(account.emailAddress),
      messageUid: message.messageUid,
      messageId: message.messageId,
      subject: message.subject,
      receivedAt: message.receivedAt,
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      prompt: parsed.data.prompt,
      plainText: normalizedText || message.subject || "",
    });

    return preTourAIEmailPrefillResponseSchema.parse({
      ...fallback,
    });
  }
}

export function toEmailIntegrationErrorResponse(error: unknown) {
  if (error instanceof EmailIntegrationError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }

  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: { code: "VALIDATION_ERROR", message: normalizeZodError(error) },
    };
  }

  const candidate = error as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
    sourceError?: { code?: string; message?: string };
  } | null;
  const directCode = String(candidate?.code ?? "").toUpperCase();
  const causeCode = String(candidate?.cause?.code ?? "").toUpperCase();
  const sourceCode = String(candidate?.sourceError?.code ?? "").toUpperCase();
  const message = String(
    candidate?.message ?? candidate?.cause?.message ?? candidate?.sourceError?.message ?? ""
  ).toLowerCase();

  if (
    directCode === "42P01" ||
    causeCode === "42P01" ||
    sourceCode === "42P01" ||
    message.includes("company_email_intake_profile") && message.includes("does not exist")
  ) {
    return {
      status: 500,
      body: {
        code: "EMAIL_INTAKE_PROFILE_SCHEMA_MISSING",
        message:
          "The AI email intake profile table is missing. Run `npm run db:fix:company-email-intake-profile` or `npm run db:push` first.",
      },
    };
  }

  if (directCode === "23505" || causeCode === "23505" || sourceCode === "23505") {
    return {
      status: 400,
      body: {
        code: "DUPLICATE_RECORD",
        message: "A record with the same unique values already exists.",
      },
    };
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "Email integration request failed.",
    },
  };
}
