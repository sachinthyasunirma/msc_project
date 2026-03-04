import { z } from "zod";

export const technicalVisitResourceSchema = z.enum([
  "technical-visits",
  "technical-visit-checklists",
  "technical-visit-media",
  "technical-visit-actions",
]);

export type TechnicalVisitResourceKey = z.infer<typeof technicalVisitResourceSchema>;

export const technicalVisitListQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  visitId: z.string().trim().min(1).optional(),
  visitType: z
    .enum(["HOTEL", "ACTIVITY", "VEHICLE", "GUIDE", "RESTAURANT"])
    .optional(),
});

const baseCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(80),
  isActive: z.boolean().default(true),
});

export const createTechnicalVisitSchema = baseCodeSchema.extend({
  visitType: z.enum(["HOTEL", "ACTIVITY", "VEHICLE", "GUIDE", "RESTAURANT"]),
  referenceId: z.string().trim().min(1),
  visitDate: z.string().datetime(),
  visitedByUserId: z.string().trim().min(1),
  overallRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  status: z.enum(["PLANNED", "COMPLETED", "FOLLOW_UP"]).default("COMPLETED"),
  summary: z.string().trim().max(2000).optional().nullable(),
  followUpRequired: z.boolean().default(false),
  nextVisitDate: z.string().datetime().optional().nullable(),
});

export const updateTechnicalVisitSchema = createTechnicalVisitSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one technical visit field is required.",
  }
);

export const createTechnicalVisitChecklistSchema = baseCodeSchema.extend({
  visitId: z.string().trim().min(1),
  category: z
    .enum(["CLEANLINESS", "SAFETY", "SERVICE", "LOCATION", "VEHICLE_CONDITION"])
    .optional()
    .nullable(),
  item: z.string().trim().min(1).max(300),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  remarks: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateTechnicalVisitChecklistSchema =
  createTechnicalVisitChecklistSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    {
      message: "At least one checklist field is required.",
    }
  );

export const createTechnicalVisitMediaSchema = baseCodeSchema.extend({
  visitId: z.string().trim().min(1),
  fileUrl: z.string().url(),
  caption: z.string().trim().max(500).optional().nullable(),
});

export const updateTechnicalVisitMediaSchema = createTechnicalVisitMediaSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one media field is required.",
  });

export const createTechnicalVisitActionSchema = baseCodeSchema.extend({
  visitId: z.string().trim().min(1),
  action: z.string().trim().min(2).max(500),
  assignedToUserId: z.string().trim().min(1).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).default("OPEN"),
});

export const updateTechnicalVisitActionSchema = createTechnicalVisitActionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one action field is required.",
  });
