import { z } from "zod";

export const guideResourceSchema = z.enum([
  "guides",
  "languages",
  "guide-languages",
  "guide-coverage-areas",
  "guide-licenses",
  "guide-certifications",
  "guide-documents",
  "guide-weekly-availability",
  "guide-blackout-dates",
  "guide-rates",
  "guide-assignments",
]);

export const guideListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  guideId: z.string().trim().min(1).optional(),
});

const baseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  isActive: z.boolean().default(true),
});

export const createGuideSchema = baseSchema.extend({
  guideType: z.enum(["INDIVIDUAL", "COMPANY", "INTERNAL"]).default("INDIVIDUAL"),
  fullName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().max(160).optional().nullable(),
  gender: z.string().trim().max(10).optional().nullable(),
  dob: z.string().datetime().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  countryCode: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  emergencyContact: z
    .object({
      name: z.string().trim().min(1).max(120),
      phone: z.string().trim().min(1).max(30),
      relation: z.string().trim().max(40).optional(),
    })
    .optional()
    .nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  yearsExperience: z.coerce.number().int().min(0).max(80).default(0),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  baseCurrencyId: z.string().min(1).optional().nullable(),
});
export const updateGuideSchema = createGuideSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide field is required.",
});

export const createLanguageSchema = baseSchema.extend({
  name: z.string().trim().min(2).max(80),
});
export const updateLanguageSchema = createLanguageSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one language field is required.",
});

export const createGuideLanguageSchema = baseSchema.extend({
  guideId: z.string().min(1),
  languageId: z.string().min(1),
  proficiency: z.enum(["BASIC", "INTERMEDIATE", "FLUENT", "NATIVE"]).default("BASIC"),
});
export const updateGuideLanguageSchema = createGuideLanguageSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide language field is required.",
});

export const createGuideCoverageAreaSchema = baseSchema.extend({
  guideId: z.string().min(1),
  locationId: z.string().min(1),
  coverageType: z.enum(["REGION", "CITY", "SITE", "COUNTRY"]).default("REGION"),
});
export const updateGuideCoverageAreaSchema = createGuideCoverageAreaSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide coverage field is required.",
});

export const createGuideLicenseSchema = baseSchema.extend({
  guideId: z.string().min(1),
  licenseType: z
    .enum(["NATIONAL_GUIDE", "SITE_GUIDE", "DRIVER_GUIDE", "ADVENTURE_INSTRUCTOR", "OTHER"]),
  licenseNumber: z.string().trim().min(1).max(80),
  issuedBy: z.string().trim().max(120).optional().nullable(),
  issuedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isVerified: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export const updateGuideLicenseSchema = createGuideLicenseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide license field is required.",
});

export const createGuideCertificationSchema = baseSchema.extend({
  guideId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  provider: z.string().trim().max(120).optional().nullable(),
  issuedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  certificateNo: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export const updateGuideCertificationSchema = createGuideCertificationSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide certification field is required.",
});

export const createGuideDocumentSchema = baseSchema.extend({
  guideId: z.string().min(1),
  docType: z
    .enum(["ID", "PASSPORT", "LICENSE", "CERTIFICATE", "CONTRACT", "INSURANCE", "OTHER"]),
  fileUrl: z.string().url(),
  fileName: z.string().trim().max(200).optional().nullable(),
  mimeType: z.string().trim().max(80).optional().nullable(),
});
export const updateGuideDocumentSchema = createGuideDocumentSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide document field is required.",
});

export const createGuideWeeklyAvailabilitySchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  guideId: z.string().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isAvailable: z.boolean().default(true),
});
export const updateGuideWeeklyAvailabilitySchema = createGuideWeeklyAvailabilitySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one weekly availability field is required.",
});

const guideBlackoutDateBaseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  guideId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().max(400).optional().nullable(),
});

export const createGuideBlackoutDateSchema = guideBlackoutDateBaseSchema.refine((v) => v.startAt <= v.endAt, {
  message: "Start must be before end.",
  path: ["endAt"],
});
export const updateGuideBlackoutDateSchema = guideBlackoutDateBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one blackout field is required.",
});

export const createGuideRateSchema = baseSchema.extend({
  guideId: z.string().min(1),
  locationId: z.string().min(1).optional().nullable(),
  rateName: z.string().trim().min(1).max(120),
  pricingModel: z
    .enum(["PER_DAY", "HALF_DAY", "PER_HOUR", "PER_PAX", "FIXED", "TIERED_PAX"]),
  currencyId: z.string().min(1),
  fixedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perHourRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perPaxRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  paxTiers: z
    .array(
      z.object({
        min: z.number().int().min(1),
        max: z.number().int().min(1),
        rate: z.number().min(0),
      })
    )
    .optional()
    .nullable(),
  minCharge: z.coerce.number().min(0).max(999999999).default(0),
  overtimeAfterHours: z.coerce.number().min(0).max(99).optional().nullable(),
  overtimePerHourRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  nightAllowance: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perDiem: z.coerce.number().min(0).max(999999999).optional().nullable(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export const updateGuideRateSchema = createGuideRateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one guide rate field is required.",
});

export const createGuideAssignmentSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  bookingId: z.string().trim().min(1).max(80),
  guideId: z.string().min(1),
  serviceType: z.enum(["DAY", "ACTIVITY", "TRANSPORT", "PACKAGE"]).default("DAY"),
  serviceId: z.string().trim().max(80).optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(["ASSIGNED", "CONFIRMED", "COMPLETED", "CANCELLED"]).default("ASSIGNED"),
  currencyCode: z.string().trim().toUpperCase().min(3).max(10),
  baseAmount: z.coerce.number().min(0).max(999999999),
  taxAmount: z.coerce.number().min(0).max(999999999).default(0),
  totalAmount: z.coerce.number().min(0).max(999999999),
  rateSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export const updateGuideAssignmentSchema = createGuideAssignmentSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one assignment field is required.",
});
