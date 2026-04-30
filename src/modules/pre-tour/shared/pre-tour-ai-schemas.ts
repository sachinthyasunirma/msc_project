import { z } from "zod";

const optionalTrimmedText = z.string().trim().max(2000).optional().nullable();
const optionalCode = z.string().trim().toUpperCase().max(120).optional().nullable();
export const preTourAIModeSchema = z.enum(["CREATE", "REVISE"]);
export const preTourAIInputSourceSchema = z.enum(["PROMPT", "EMAIL", "EMAIL_AND_PROMPT"]);
export const preTourAIReviewStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "NEEDS_WORK",
  "REJECTED",
]);

export const preTourAIEmailContextSchema = z.object({
  accountId: z.string().trim().min(1).max(120),
  accountEmail: z.string().trim().email().max(320),
  messageUid: z.coerce.number().int().min(1),
  messageId: z.string().trim().max(500).optional().nullable(),
  subject: z.string().trim().max(500).optional().nullable(),
  receivedAt: z.string().datetime().optional().nullable(),
  fromName: z.string().trim().max(320).optional().nullable(),
  fromEmail: z.string().trim().max(320).optional().nullable(),
});

export const preTourAIRequestSchema = z.object({
  mode: preTourAIModeSchema.default("CREATE"),
  sourceType: preTourAIInputSourceSchema.default("PROMPT"),
  sourcePlanId: z.string().trim().min(1).max(120).optional().nullable(),
  emailContext: preTourAIEmailContextSchema.optional().nullable(),
  prompt: z.string().trim().min(20).max(6000),
  categoryId: z.string().trim().min(1),
  operatorOrgId: z.string().trim().min(1),
  marketOrgId: z.string().trim().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  adults: z.coerce.number().int().min(1).max(999).default(1),
  children: z.coerce.number().int().min(0).max(999).default(0),
  infants: z.coerce.number().int().min(0).max(999).default(0),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  preferredLanguage: z.string().trim().max(20).optional().nullable(),
  roomPreference: z.enum(["DOUBLE", "TWIN", "MIXED"]).optional().nullable(),
  mealPreference: z.enum(["BB", "HB", "FB", "AI"]).optional().nullable(),
  priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  exchangeRateMode: z.enum(["AUTO", "MANUAL"]).default("AUTO"),
  exchangeRate: z.coerce.number().min(0).max(999999999).default(0),
  exchangeRateDate: z.string().datetime().optional().nullable(),
});

export const preTourAIEmailContextRequestSchema = z.object({
  accountId: z.string().trim().min(1).max(120),
  messageUid: z.coerce.number().int().min(1),
  sourceType: z.enum(["EMAIL", "EMAIL_AND_PROMPT"]),
  prompt: z.string().trim().max(6000).optional().default(""),
});

export const preTourAIEmailPrefillResponseSchema = z.object({
  source: preTourAIEmailContextSchema,
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

const aiWarningSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  code: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(500),
});

const aiRoomSchema = z.object({
  roomType: z.string().trim().min(1).max(120),
  count: z.coerce.number().int().min(1).max(999),
  adults: z.coerce.number().int().min(0).max(999).optional().nullable(),
  children: z.coerce.number().int().min(0).max(999).optional().nullable(),
});

const aiItemSchema = z.object({
  itemType: z.enum([
    "TRANSPORT",
    "ACTIVITY",
    "ACCOMMODATION",
    "GUIDE",
    "CEREMONY",
    "SUPPLEMENT",
    "MISC",
  ]),
  serviceCode: optionalCode,
  title: z.string().trim().min(2).max(200),
  description: optionalTrimmedText,
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  pax: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  units: z.coerce.number().min(0).max(999999).optional().nullable(),
  nights: z.coerce.number().int().min(0).max(365).optional().nullable(),
  rooms: z.array(aiRoomSchema).max(12).optional().nullable(),
  fromLocationCode: optionalCode,
  toLocationCode: optionalCode,
  locationCode: optionalCode,
  notes: optionalTrimmedText,
  rationale: z.string().trim().min(1).max(500),
});

const aiDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(365),
  date: z.string().datetime(),
  title: z.string().trim().min(2).max(200),
  notes: optionalTrimmedText,
  startLocationCode: optionalCode,
  endLocationCode: optionalCode,
  items: z.array(aiItemSchema).max(25),
});

const aiGuideAllocationSchema = z.object({
  serviceCode: optionalCode,
  coverageMode: z.enum(["FULL_TOUR", "DAY_RANGE"]).default("FULL_TOUR"),
  startDayNumber: z.coerce.number().int().min(1).max(365).optional().nullable(),
  endDayNumber: z.coerce.number().int().min(1).max(365).optional().nullable(),
  language: z.string().trim().max(40).optional().nullable(),
  guideBasis: z.string().trim().max(60).optional().nullable(),
  pax: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  units: z.coerce.number().min(0).max(999999).optional().nullable(),
  title: z.string().trim().min(2).max(200),
  notes: optionalTrimmedText,
  rationale: z.string().trim().min(1).max(500),
});

const aiTechnicalVisitSchema = z.object({
  technicalVisitCode: z.string().trim().toUpperCase().min(1).max(120),
  dayNumber: z.coerce.number().int().min(1).max(365).optional().nullable(),
  notes: optionalTrimmedText,
  rationale: z.string().trim().min(1).max(500),
});

const aiAdditionalCategorySchema = z.object({
  categoryCode: z.string().trim().toUpperCase().min(1).max(120),
  reason: z.string().trim().min(1).max(300),
});

export const preTourAIDraftSchema = z.object({
  plan: z.object({
    title: z.string().trim().min(2).max(200),
    summary: z.string().trim().min(1).max(1200),
    notes: optionalTrimmedText,
    preferredLanguage: z.string().trim().max(20).optional().nullable(),
    roomPreference: z.enum(["DOUBLE", "TWIN", "MIXED"]).optional().nullable(),
    mealPreference: z.enum(["BB", "HB", "FB", "AI"]).optional().nullable(),
    priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  }),
  additionalCategories: z.array(aiAdditionalCategorySchema).max(12).default([]),
  days: z.array(aiDaySchema).min(1).max(365),
  guideAllocations: z.array(aiGuideAllocationSchema).max(20).default([]),
  technicalVisits: z.array(aiTechnicalVisitSchema).max(20).default([]),
  assumptions: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  unresolvedQuestions: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  warnings: z.array(aiWarningSchema).max(30).default([]),
});

export const preTourAIDraftValidationIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  scope: z.enum([
    "HEADER",
    "DAY",
    "ITEM",
    "CATEGORY",
    "GUIDE",
    "TECHNICAL_VISIT",
    "SEASON",
    "GENERAL",
  ]),
  path: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(500),
});

export const preTourAIDraftValidationSchema = z.object({
  canApply: z.boolean(),
  overallAccuracy: z.enum(["high", "medium", "low"]),
  masterCoveragePercent: z.coerce.number().min(0).max(100),
  resolvedReferenceCount: z.coerce.number().int().min(0),
  unresolvedReferenceCount: z.coerce.number().int().min(0),
  dayIntegrityPassed: z.boolean(),
  overlappingSeasons: z.array(z.string().trim().min(1).max(120)).default([]),
  issues: z.array(preTourAIDraftValidationIssueSchema).default([]),
});

export const preTourAIGenerateResponseSchema = z.object({
  runId: z.string().trim().min(1),
  model: z.string().trim().min(1),
  generatedAt: z.string().datetime(),
  draft: preTourAIDraftSchema,
  validation: preTourAIDraftValidationSchema,
});

export const preTourAIApplyRequestSchema = z.object({
  runId: z.string().trim().min(1).optional().nullable(),
  request: preTourAIRequestSchema,
  draft: preTourAIDraftSchema,
  generateCosting: z.boolean().default(false),
});

export const preTourAIApplyResponseSchema = z.object({
  planId: z.string().trim().min(1),
  planCode: z.string().trim().min(1),
  title: z.string().trim().min(1),
  runId: z.string().trim().min(1).optional().nullable(),
});

export const preTourAIRunListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  mode: z.enum(["ALL", "CREATE", "REVISE"]).default("ALL"),
  accuracy: z.enum(["ALL", "high", "medium", "low"]).default("ALL"),
  canApply: z.enum(["ALL", "yes", "no"]).default("ALL"),
  applied: z.enum(["ALL", "yes", "no"]).default("ALL"),
  reviewStatus: z
    .enum(["ALL", "PENDING", "APPROVED", "NEEDS_WORK", "REJECTED"])
    .default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const preTourAIRunSummarySchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1),
  mode: preTourAIModeSchema,
  model: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(6000),
  travelStartDate: z.string().datetime(),
  travelEndDate: z.string().datetime(),
  sourcePlanId: z.string().trim().min(1).optional().nullable(),
  sourcePlanCode: z.string().trim().min(1).max(120).optional().nullable(),
  sourcePlanTitle: z.string().trim().min(1).max(200).optional().nullable(),
  resultingPlanId: z.string().trim().min(1).optional().nullable(),
  resultingPlanCode: z.string().trim().min(1).max(120).optional().nullable(),
  resultingPlanTitle: z.string().trim().min(1).max(200).optional().nullable(),
  draftTitle: z.string().trim().min(1).max(200),
  draftDayCount: z.coerce.number().int().min(0),
  canApply: z.boolean(),
  overallAccuracy: z.enum(["high", "medium", "low"]),
  masterCoveragePercent: z.coerce.number().min(0).max(100),
  resolvedReferenceCount: z.coerce.number().int().min(0),
  unresolvedReferenceCount: z.coerce.number().int().min(0),
  blockingIssueCount: z.coerce.number().int().min(0),
  mediumIssueCount: z.coerce.number().int().min(0),
  lowIssueCount: z.coerce.number().int().min(0),
  reviewStatus: preTourAIReviewStatusSchema,
  reviewScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  reviewNotes: optionalTrimmedText,
  createdAt: z.string().datetime(),
  createdByName: z.string().trim().max(160).optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable(),
  appliedByName: z.string().trim().max(160).optional().nullable(),
  reviewedAt: z.string().datetime().optional().nullable(),
  reviewedByName: z.string().trim().max(160).optional().nullable(),
});

export const preTourAIRunListSummarySchema = z.object({
  totalRuns: z.coerce.number().int().min(0),
  applicableRuns: z.coerce.number().int().min(0),
  appliedRuns: z.coerce.number().int().min(0),
  revisedRuns: z.coerce.number().int().min(0),
  avgCoveragePercent: z.coerce.number().min(0).max(100),
  avgReviewScore: z.coerce.number().min(0).max(5),
});

export const preTourAIRunListResponseSchema = z.object({
  items: z.array(preTourAIRunSummarySchema),
  total: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1),
  offset: z.coerce.number().int().min(0),
  summary: preTourAIRunListSummarySchema,
});

export const preTourAIRunDetailSchema = preTourAIRunSummarySchema.extend({
  requestSnapshot: preTourAIRequestSchema,
  draftSnapshot: preTourAIDraftSchema,
  validationSnapshot: preTourAIDraftValidationSchema,
});

export const preTourAIRunReviewRequestSchema = z.object({
  reviewStatus: preTourAIReviewStatusSchema,
  reviewScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  reviewNotes: optionalTrimmedText,
});

export type PreTourAIRequest = z.infer<typeof preTourAIRequestSchema>;
export type PreTourAIDraft = z.infer<typeof preTourAIDraftSchema>;
export type PreTourAIDraftValidation = z.infer<typeof preTourAIDraftValidationSchema>;
export type PreTourAIGenerateResponse = z.infer<typeof preTourAIGenerateResponseSchema>;
export type PreTourAIApplyRequest = z.infer<typeof preTourAIApplyRequestSchema>;
export type PreTourAIApplyResponse = z.infer<typeof preTourAIApplyResponseSchema>;
export type PreTourAIMode = z.infer<typeof preTourAIModeSchema>;
export type PreTourAIInputSource = z.infer<typeof preTourAIInputSourceSchema>;
export type PreTourAIEmailContext = z.infer<typeof preTourAIEmailContextSchema>;
export type PreTourAIEmailContextRequest = z.infer<typeof preTourAIEmailContextRequestSchema>;
export type PreTourAIEmailPrefillResponse = z.infer<typeof preTourAIEmailPrefillResponseSchema>;
export type PreTourAIReviewStatus = z.infer<typeof preTourAIReviewStatusSchema>;
export type PreTourAIRunListQuery = z.infer<typeof preTourAIRunListQuerySchema>;
export type PreTourAIRunSummary = z.infer<typeof preTourAIRunSummarySchema>;
export type PreTourAIRunListResponse = z.infer<typeof preTourAIRunListResponseSchema>;
export type PreTourAIRunDetail = z.infer<typeof preTourAIRunDetailSchema>;
export type PreTourAIRunReviewRequest = z.infer<typeof preTourAIRunReviewRequestSchema>;
