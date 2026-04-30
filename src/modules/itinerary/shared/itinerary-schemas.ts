import { z } from "zod";

export const itineraryCreateSchema = z.object({
  templateKey: z.string().trim().min(1).max(80),
  outputMode: z.enum(["DOCUMENT", "WEB", "BOTH"]).default("BOTH"),
  includeMedia: z.boolean().default(true),
  includeCommercials: z.boolean().default(true),
  includePolicies: z.boolean().default(true),
});

export type ItineraryCreateInput = z.infer<typeof itineraryCreateSchema>;

export const itineraryExportCreateSchema = z.object({
  format: z.enum(["PDF", "DOCX"]),
});

export type ItineraryExportCreateInput = z.infer<typeof itineraryExportCreateSchema>;

export const itineraryShareCreateSchema = z.object({
  surface: z.enum(["WEB", "DOCUMENT"]).default("WEB"),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
});

export type ItineraryShareCreateInput = z.infer<typeof itineraryShareCreateSchema>;

export const itineraryShareUpdateSchema = z.object({
  revoke: z.boolean().default(true),
});

export type ItineraryShareUpdateInput = z.infer<typeof itineraryShareUpdateSchema>;

export const itineraryDraftUpdateSchema = z.object({
  expectedVersionId: z.string().trim().min(1).optional(),
  draft: z.unknown(),
});

export type ItineraryDraftUpdateInput = z.infer<typeof itineraryDraftUpdateSchema>;
