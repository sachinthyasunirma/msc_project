import { z } from "zod";

export const transportResourceSchema = z.enum([
  "locations",
  "vehicle-categories",
  "vehicle-types",
  "location-rates",
  "location-expenses",
  "pax-vehicle-rates",
  "baggage-rates",
]);

export const transportListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const pointGeoSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});

export const pricingModelSchema = z.enum(["FIXED", "PER_KM", "SLAB"]);
export const expenseTypeSchema = z.enum([
  "FIXED",
  "PER_DAY",
  "PER_HOUR",
  "PER_PAX",
  "PER_VEHICLE",
]);
export const paxPricingModelSchema = z.enum(["PER_PAX", "TIERED"]);
export const baggageUnitSchema = z.enum(["BAG", "KG"]);
export const baggagePricingModelSchema = z.enum(["PER_UNIT", "TIERED", "FIXED"]);

const baseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  isActive: z.boolean().default(true),
});

export const createTransportLocationSchema = baseSchema.extend({
  name: z.string().trim().min(2).max(160),
  country: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  geo: pointGeoSchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportLocationSchema = createTransportLocationSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one location field is required.",
  });

export const createTransportVehicleCategorySchema = baseSchema.extend({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateTransportVehicleCategorySchema = createTransportVehicleCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one vehicle category field is required.",
  });

export const createTransportVehicleTypeSchema = baseSchema.extend({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  paxCapacity: z.coerce.number().int().min(1).max(200),
  baggageCapacity: z.coerce.number().int().min(0).max(500),
  features: z.array(z.string().trim().min(1).max(80)).optional().nullable(),
});

export const updateTransportVehicleTypeSchema = createTransportVehicleTypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one vehicle type field is required.",
  });

const locationRateSlabSchema = z.object({
  fromKm: z.number().min(0),
  toKm: z.number().min(0),
  rate: z.number().min(0),
});

export const createTransportLocationRateSchema = baseSchema.extend({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  vehicleCategoryId: z.string().min(1).optional().nullable(),
  vehicleTypeId: z.string().min(1).optional().nullable(),
  distanceKm: z.coerce.number().min(0).max(999999).optional().nullable(),
  durationMin: z.coerce.number().int().min(0).max(999999).optional().nullable(),
  currency: z.string().trim().toUpperCase().min(3).max(10).default("LKR"),
  pricingModel: pricingModelSchema.default("FIXED"),
  fixedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  perKmRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  slabs: z.array(locationRateSlabSchema).optional().nullable(),
  minCharge: z.coerce.number().min(0).max(999999999).default(0),
  nightSurcharge: z.coerce.number().min(0).max(999999999).default(0),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportLocationRateSchema = createTransportLocationRateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one location rate field is required.",
  });

export const createTransportLocationExpenseSchema = baseSchema.extend({
  locationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  expenseType: expenseTypeSchema.default("FIXED"),
  amount: z.coerce.number().min(0).max(999999999),
  currency: z.string().trim().toUpperCase().min(3).max(10).default("LKR"),
  vehicleCategoryId: z.string().min(1).optional().nullable(),
  vehicleTypeId: z.string().min(1).optional().nullable(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportLocationExpenseSchema = createTransportLocationExpenseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one location expense field is required.",
  });

const paxTierSchema = z.object({
  minPax: z.number().int().min(1),
  maxPax: z.number().int().min(1),
  rate: z.number().min(0),
});

export const createTransportPaxVehicleRateSchema = baseSchema.extend({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  vehicleCategoryId: z.string().min(1).optional().nullable(),
  vehicleTypeId: z.string().min(1).optional().nullable(),
  currency: z.string().trim().toUpperCase().min(3).max(10).default("LKR"),
  pricingModel: paxPricingModelSchema.default("PER_PAX"),
  perPaxRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  tiers: z.array(paxTierSchema).optional().nullable(),
  minCharge: z.coerce.number().min(0).max(999999999).default(0),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportPaxVehicleRateSchema = createTransportPaxVehicleRateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one pax vehicle rate field is required.",
  });

const baggageTierSchema = z.object({
  minQty: z.number().min(0),
  maxQty: z.number().min(0),
  rate: z.number().min(0),
});

export const createTransportBaggageRateSchema = baseSchema.extend({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  vehicleCategoryId: z.string().min(1).optional().nullable(),
  vehicleTypeId: z.string().min(1).optional().nullable(),
  currency: z.string().trim().toUpperCase().min(3).max(10).default("LKR"),
  unit: baggageUnitSchema.default("BAG"),
  pricingModel: baggagePricingModelSchema.default("PER_UNIT"),
  perUnitRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  fixedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  tiers: z.array(baggageTierSchema).optional().nullable(),
  minCharge: z.coerce.number().min(0).max(999999999).default(0),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportBaggageRateSchema = createTransportBaggageRateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one baggage rate field is required.",
  });

