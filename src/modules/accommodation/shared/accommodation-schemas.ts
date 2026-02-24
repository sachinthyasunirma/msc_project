import { z } from "zod";

export const hotelListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  isActive: z.enum(["true", "false"]).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  minStar: z.coerce.number().int().min(1).max(5).optional(),
  maxStar: z.coerce.number().int().min(1).max(5).optional(),
});

export const nestedListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().min(1),
});

export const createHotelSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  address: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120),
  starRating: z.coerce.number().int().min(1).max(5),
  contactEmail: z.string().trim().email().optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateHotelSchema = createHotelSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one hotel field is required.",
  });

export const createRoomTypeSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  maxOccupancy: z.coerce.number().int().min(1).max(30),
  bedType: z.string().trim().min(2).max(100),
  size: z.string().trim().max(100).optional().nullable(),
  amenities: z.array(z.string().trim().min(1).max(60)).default([]),
  totalRooms: z.coerce.number().int().min(1).max(5000),
  availableRooms: z.coerce.number().int().min(0).max(5000),
  isActive: z.boolean().default(true),
});

export const updateRoomTypeSchema = createRoomTypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one room type field is required.",
  });

const roomRateBaseSchema = z.object({
  roomTypeId: z.string().min(1),
  seasonId: z.string().min(1).optional().nullable(),
  baseRatePerNight: z.coerce.number().min(0).max(9999999),
  seasonMultiplier: z.coerce.number().min(0).max(10).default(1),
  currency: z.string().trim().toUpperCase().length(3),
  isActive: z.boolean().default(true),
  validFrom: z.string().date(),
  validTo: z.string().date(),
});

export const createRoomRateSchema = roomRateBaseSchema
  .refine((value) => value.validFrom <= value.validTo, {
    message: "Valid from date must be before or equal to valid to date.",
    path: ["validTo"],
  });

export const updateRoomRateSchema = roomRateBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one room rate field is required.",
  });

export const createAvailabilitySchema = z.object({
  roomTypeId: z.string().min(1),
  date: z.string().date(),
  availableRooms: z.coerce.number().int().min(0).max(5000),
  bookedRooms: z.coerce.number().int().min(0).max(5000).default(0),
  isBlocked: z.boolean().default(false),
  blockReason: z.string().trim().max(255).optional().nullable(),
});

export const updateAvailabilitySchema = createAvailabilitySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one availability field is required.",
  });

export const createHotelImageSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().trim().max(255).optional().nullable(),
  isPrimary: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateHotelImageSchema = createHotelImageSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one image field is required.",
  });
