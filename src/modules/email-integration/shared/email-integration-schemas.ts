import { z } from "zod";

const optionalTrimmedText = z.string().trim().max(2000).optional().nullable();
const trimmedKeywordSchema = z.string().trim().min(1).max(120);

export const emailIntegrationConnectionStatusSchema = z.enum([
  "NEVER_TESTED",
  "CONNECTED",
  "FAILED",
]);
export const emailIntegrationConfigSourceSchema = z.enum(["DATABASE", "ENV_COMMON"]);

export const emailIntegrationAccountSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1).max(120),
  configSource: emailIntegrationConfigSourceSchema,
  displayName: z.string().trim().min(1).max(160),
  emailAddress: z.string().trim().email().max(320),
  username: z.string().trim().min(1).max(320),
  host: z.string().trim().min(1).max(320),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  mailbox: z.string().trim().min(1).max(120),
  isActive: z.boolean(),
  isAvailableForPreTourAI: z.boolean(),
  isDefaultForPreTourAI: z.boolean(),
  hasPassword: z.boolean(),
  lastConnectionStatus: emailIntegrationConnectionStatusSchema,
  lastConnectionError: optionalTrimmedText,
  lastConnectedAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const emailIntegrationAccountListResponseSchema = z.object({
  items: z.array(emailIntegrationAccountSchema),
});

export const emailIntegrationAccountUpsertSchema = z.object({
  id: z.string().trim().min(1).max(120).optional().nullable(),
  displayName: z.string().trim().min(1).max(160),
  emailAddress: z.string().trim().email().max(320),
  username: z.string().trim().max(320).optional().nullable(),
  password: z.string().trim().min(1).max(500).optional().nullable(),
  host: z.string().trim().min(1).max(320),
  port: z.coerce.number().int().min(1).max(65535).default(993),
  secure: z.boolean().default(true),
  mailbox: z.string().trim().min(1).max(120).default("INBOX"),
  isActive: z.boolean().default(true),
  isAvailableForPreTourAI: z.boolean().default(true),
  isDefaultForPreTourAI: z.boolean().default(false),
});

export const emailIntegrationAccountDeleteSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const emailIntegrationAccountTestSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const emailIntegrationMessageQuerySchema = z.object({
  accountId: z.string().trim().min(1).max(120),
  q: z.string().trim().max(200).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const emailIntegrationIntakeProfileSchema = z.object({
  id: z.string().trim().min(1).max(120),
  accountId: z.string().trim().min(1).max(120),
  accountCode: z.string().trim().min(1).max(120),
  accountDisplayName: z.string().trim().min(1).max(160),
  accountEmailAddress: z.string().trim().email().max(320),
  emailAddresses: z.array(z.string().trim().email().max(320)).max(200),
  keywords: z.array(trimmedKeywordSchema).max(200),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const emailIntegrationIntakeProfileListResponseSchema = z.object({
  items: z.array(emailIntegrationIntakeProfileSchema),
});

export const emailIntegrationIntakeProfileUpsertSchema = z.object({
  id: z.string().trim().min(1).max(120).optional().nullable(),
  accountId: z.string().trim().min(1).max(120),
  emailAddresses: z.array(z.string().trim().email().max(320)).max(200).default([]),
  keywords: z.array(trimmedKeywordSchema).max(200).default([]),
  isActive: z.boolean().default(true),
});

export const emailIntegrationIntakeProfileDeleteSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const emailIntegrationMessageSummarySchema = z.object({
  uid: z.coerce.number().int().min(1),
  messageId: z.string().trim().max(500).optional().nullable(),
  subject: z.string().trim().max(500).optional().nullable(),
  fromName: z.string().trim().max(320).optional().nullable(),
  fromEmail: z.string().trim().max(320).optional().nullable(),
  receivedAt: z.string().datetime().optional().nullable(),
  preview: z.string().trim().max(1200).optional().nullable(),
  matchedEmailAddress: z.string().trim().email().max(320).optional().nullable(),
  matchedKeywords: z.array(trimmedKeywordSchema).max(50).default([]),
});

export const emailIntegrationMessageListResponseSchema = z.object({
  account: emailIntegrationAccountSchema,
  intakeProfile: emailIntegrationIntakeProfileSchema.optional().nullable(),
  items: z.array(emailIntegrationMessageSummarySchema),
});

export type EmailIntegrationAccount = z.infer<typeof emailIntegrationAccountSchema>;
export type EmailIntegrationAccountUpsert = z.infer<typeof emailIntegrationAccountUpsertSchema>;
export type EmailIntegrationIntakeProfile = z.infer<typeof emailIntegrationIntakeProfileSchema>;
export type EmailIntegrationIntakeProfileUpsert = z.infer<
  typeof emailIntegrationIntakeProfileUpsertSchema
>;
export type EmailIntegrationMessageSummary = z.infer<typeof emailIntegrationMessageSummarySchema>;
