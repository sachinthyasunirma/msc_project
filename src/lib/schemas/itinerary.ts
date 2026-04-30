import { z } from "zod";

const itineraryStatusSchema = z.enum(["DRAFT", "PUBLISHED", "NEEDS_REVIEW"]);
const itinerarySectionTypeSchema = z.enum([
  "overview",
  "hero",
  "tripSummary",
  "destinations",
  "dayPlan",
  "stays",
  "transfers",
  "activities",
  "dining",
  "inclusionsExclusions",
  "policies",
  "gallery",
  "notes",
  "ctaFooter",
  "custom",
]);
const timelinePhaseSchema = z.enum(["morning", "afternoon", "evening"]);
const timelineItemTypeSchema = z.enum(["activity", "transfer", "meal", "check-in", "note"]);
const mediaAssetTypeSchema = z.enum(["image", "video"]);
const galleryTargetTypeSchema = z.enum(["hero", "overview", "day", "stay", "activity"]);

export const itinerarySectionSchema = z.object({
  id: z.string().min(1),
  type: itinerarySectionTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  customSectionId: z.string().optional(),
});

export const heroSectionSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  destination: z.string().min(1),
  country: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  durationLabel: z.string().min(1),
  travelerLabel: z.string().min(1),
  coverMediaId: z.string().nullable(),
  tags: z.array(z.string().min(1)).max(8),
});

export const quickFactSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
});

export const tripSummarySchema = z.object({
  intro: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(1),
  importantNotes: z.array(z.string().min(1)).min(1),
  quickFacts: z.array(quickFactSchema).min(2),
  budgetRange: z.string().min(1),
  travelStyle: z.string().min(1),
});

export const destinationStopSchema = z.object({
  id: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  nights: z.number().int().min(0),
  summary: z.string().min(1),
});

export const timelineItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  time: z.string().min(1),
  type: timelineItemTypeSchema,
  phase: timelinePhaseSchema,
  location: z.string().min(1),
  description: z.string().min(1),
});

export const dayPlanSchema = z.object({
  id: z.string().min(1),
  dayNumber: z.number().int().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  summary: z.string().min(1),
  morning: z.string().min(1),
  afternoon: z.string().min(1),
  evening: z.string().min(1),
  activities: z.array(z.string().min(1)),
  transportation: z.string().min(1),
  meals: z.array(z.string().min(1)),
  accommodation: z.string().min(1),
  notes: z.string(),
  expanded: z.boolean(),
  timeline: z.array(timelineItemSchema),
});

export const staySchema = z.object({
  id: z.string().min(1),
  propertyName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  roomType: z.string().min(1),
  confirmation: z.string().min(1),
  amenities: z.array(z.string().min(1)),
  notes: z.string(),
});

export const transferSchema = z.object({
  id: z.string().min(1),
  mode: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalTime: z.string().min(1),
  confirmation: z.string().min(1),
  driverContact: z.string().min(1),
  notes: z.string(),
});

export const activitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  startTime: z.string().min(1),
  duration: z.string().min(1),
  location: z.string().min(1),
  bookingReference: z.string().min(1),
  included: z.boolean(),
  notes: z.string(),
});

export const diningReservationSchema = z.object({
  id: z.string().min(1),
  restaurantName: z.string().min(1),
  reservationTime: z.string().min(1),
  cuisine: z.string().min(1),
  address: z.string().min(1),
  confirmation: z.string().min(1),
  notes: z.string(),
});

export const mediaAssetSchema = z.object({
  id: z.string().min(1),
  type: mediaAssetTypeSchema,
  title: z.string().min(1),
  url: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  caption: z.string(),
  altText: z.string(),
  tags: z.array(z.string().min(1)),
  uploadProgress: z.number().min(0).max(100),
  status: z.enum(["uploading", "ready"]),
  durationLabel: z.string().optional(),
});

export const galleryAssignmentSchema = z.object({
  id: z.string().min(1),
  mediaId: z.string().min(1),
  targetType: galleryTargetTypeSchema,
  targetId: z.string().min(1),
  featured: z.boolean(),
});

export const contactInfoSchema = z.object({
  conciergeName: z.string().min(1),
  supportPhone: z.string().min(1),
  emergencyPhone: z.string().min(1),
  supportEmail: z.string().email(),
  notes: z.string(),
});

export const policySectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const customSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  eyebrow: z.string().min(1),
});

export const itineraryEditorSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: itineraryStatusSchema,
  destination: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  travelerLabel: z.string().min(1),
  sections: z.array(itinerarySectionSchema).min(1),
  hero: heroSectionSchema,
  tripSummary: tripSummarySchema,
  destinations: z.array(destinationStopSchema),
  days: z.array(dayPlanSchema).min(1),
  stays: z.array(staySchema),
  transfers: z.array(transferSchema),
  activities: z.array(activitySchema),
  dining: z.array(diningReservationSchema),
  inclusions: z.array(z.string().min(1)),
  exclusions: z.array(z.string().min(1)),
  policies: z.array(policySectionSchema),
  notes: z.string(),
  footerCta: z.string().min(1),
  contact: contactInfoSchema,
  gallery: z.array(mediaAssetSchema),
  galleryAssignments: z.array(galleryAssignmentSchema),
  customSections: z.array(customSectionSchema),
});

export type ItineraryEditorInput = z.infer<typeof itineraryEditorSchema>;
