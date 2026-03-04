import { z } from "zod";

export const tourCategoryResourceSchema = z.enum([
  "tour-category-types",
  "tour-categories",
  "tour-category-rules",
]);

export type TourCategoryResourceKey = z.infer<typeof tourCategoryResourceSchema>;

export const tourCategoryListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  typeId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
});

const baseCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  isActive: z.boolean().default(true),
});

export const createTourCategoryTypeSchema = baseCodeSchema.extend({
  name: z.string().trim().min(2).max(160),
  allowMultiple: z.boolean().default(true),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateTourCategoryTypeSchema = createTourCategoryTypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one tour category type field is required.",
  });

export const createTourCategorySchema = baseCodeSchema.extend({
  typeId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  parentId: z.string().trim().min(1).optional().nullable(),
  icon: z.string().trim().max(120).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateTourCategorySchema = createTourCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one tour category field is required.",
  });

export const createTourCategoryRuleSchema = baseCodeSchema.extend({
  categoryId: z.string().min(1),
  defaultMarkupPercent: z.coerce.number().min(0).max(9999).optional().nullable(),
  restrictHotelStarMin: z.coerce.number().int().min(1).max(7).optional().nullable(),
  restrictHotelStarMax: z.coerce.number().int().min(1).max(7).optional().nullable(),
  requireCertifiedGuide: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTourCategoryRuleSchema = createTourCategoryRuleSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one tour category rule field is required.",
  });
