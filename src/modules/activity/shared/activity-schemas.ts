import { z } from "zod";

export const activityResourceSchema = z.enum([
  "activities",
  "activity-images",
  "activity-availability",
  "activity-rates",
  "activity-supplements",
]);

export const activityListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  activityId: z.string().trim().min(1).optional(),
  parentActivityId: z.string().trim().min(1).optional(),
});

const baseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
});

export const createActivitySchema = baseSchema.extend({
  type: z.enum(["ACTIVITY", "SUPPLEMENT", "MISCELLANEOUS", "OTHER"]),
  locationId: z.string().min(1),
  locationRole: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .default("ACTIVITY_LOCATION"),
  name: z.string().trim().min(2).max(200),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  durationMin: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  minPax: z.coerce.number().int().min(1).max(500).default(1),
  maxPax: z.coerce.number().int().min(1).max(500).optional().nullable(),
  minAge: z.coerce.number().int().min(0).max(120).optional().nullable(),
  maxAge: z.coerce.number().int().min(0).max(120).optional().nullable(),
  inclusions: z.array(z.string().trim().min(1).max(120)).optional().nullable(),
  exclusions: z.array(z.string().trim().min(1).max(120)).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateActivitySchema = createActivitySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one activity field is required.",
  });

export const createActivityImageSchema = baseSchema.extend({
  activityId: z.string().min(1),
  url: z.string().url(),
  altText: z.string().trim().max(255).optional().nullable(),
  isCover: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateActivityImageSchema = createActivityImageSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one activity image field is required.",
  });

export const createActivityAvailabilitySchema = baseSchema.extend({
  activityId: z.string().min(1),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional().nullable(),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateActivityAvailabilitySchema = createActivityAvailabilitySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one availability field is required.",
  });

export const createActivityRateSchema = baseSchema.extend({
  activityId: z.string().min(1),
  label: z.string().trim().max(120).optional().nullable(),
  currency: z.string().trim().toUpperCase().min(3).max(10).default("LKR"),
  pricingModel: z
    .enum(["FIXED", "PER_PAX", "TIERED_PAX", "PER_HOUR", "PER_UNIT"])
    .default("FIXED"),
  fixedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perPaxRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perHourRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perUnitRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
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
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateActivityRateSchema = createActivityRateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one activity rate field is required.",
  });

export const createActivitySupplementSchema = baseSchema.extend({
  parentActivityId: z.string().min(1),
  supplementActivityId: z.string().min(1),
  isRequired: z.boolean().default(false),
  minQty: z.coerce.number().int().min(0).max(9999).default(0),
  maxQty: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const updateActivitySupplementSchema = createActivitySupplementSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one activity supplement field is required.",
  });
