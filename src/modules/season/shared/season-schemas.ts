import { z } from "zod";

export const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().min(1),
});

export const createSeasonSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(255).optional().nullable(),
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "Start date must be before or equal to end date.",
    path: ["endDate"],
  });

const seasonBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(255).optional().nullable(),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export const updateSeasonSchema = seasonBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one season field is required.",
  });

export const seasonListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDateFrom: z.string().date().optional(),
  startDateTo: z.string().date().optional(),
});
