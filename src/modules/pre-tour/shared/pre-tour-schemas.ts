import { z } from "zod";

export const preTourResourceSchema = z.enum([
  "pre-tours",
  "pre-tour-days",
  "pre-tour-items",
  "pre-tour-item-addons",
  "pre-tour-totals",
]);

export const preTourListQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  planId: z.string().trim().min(1).optional(),
  dayId: z.string().trim().min(1).optional(),
  itemId: z.string().trim().min(1).optional(),
});

const baseCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(80),
  isActive: z.boolean().default(true),
});

const dateTimeSchema = z.string().datetime();
const optionalDateTimeSchema = z.string().datetime().optional().nullable();

export const createPreTourSchema = baseCodeSchema.extend({
  customerId: z.string().trim().min(1).optional().nullable(),
  agentId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  operatorOrgId: z.string().trim().min(1),
  marketOrgId: z.string().trim().min(1),
  referenceNo: z.string().trim().toUpperCase().min(1).max(80).optional().nullable(),
  planCode: z.string().trim().toUpperCase().min(1).max(80),
  title: z.string().trim().min(2).max(200),
  status: z
    .enum(["DRAFT", "QUOTED", "APPROVED", "BOOKED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .default("DRAFT"),
  startDate: dateTimeSchema,
  endDate: dateTimeSchema,
  totalNights: z.coerce.number().int().min(0).max(365),
  adults: z.coerce.number().int().min(1).max(999).default(1),
  children: z.coerce.number().int().min(0).max(999).default(0),
  infants: z.coerce.number().int().min(0).max(999).default(0),
  preferredLanguage: z.string().trim().max(20).optional().nullable(),
  roomPreference: z.string().trim().max(40).optional().nullable(),
  mealPreference: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  pricingPolicy: z
    .object({
      mode: z.enum(["NONE", "PERCENT", "FIXED"]).optional(),
      value: z.coerce.number().min(0).max(999999999).optional(),
      applyTo: z
        .array(
          z.enum(["ACTIVITY", "TRANSPORT", "ACCOMMODATION", "GUIDE", "MISC", "SUPPLEMENT"])
        )
        .optional(),
    })
    .optional()
    .nullable(),
  baseTotal: z.coerce.number().min(0).max(999999999).default(0),
  taxTotal: z.coerce.number().min(0).max(999999999).default(0),
  grandTotal: z.coerce.number().min(0).max(999999999).default(0),
  version: z.coerce.number().int().min(1).max(9999).default(1),
  isLocked: z.boolean().default(false),
});

export const updatePreTourSchema = createPreTourSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one pre-tour field is required.",
  }
);

export const createPreTourDaySchema = baseCodeSchema.extend({
  planId: z.string().min(1),
  dayNumber: z.coerce.number().int().min(1).max(365),
  date: dateTimeSchema,
  title: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  startLocationId: z.string().min(1).optional().nullable(),
  endLocationId: z.string().min(1).optional().nullable(),
});

export const updatePreTourDaySchema = createPreTourDaySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one day field is required.",
  }
);

const roomRowSchema = z.object({
  roomType: z.string().trim().min(1).max(120),
  count: z.coerce.number().int().min(1).max(999),
  adults: z.coerce.number().int().min(0).max(999).optional(),
  children: z.coerce.number().int().min(0).max(999).optional(),
});

export const createPreTourItemSchema = baseCodeSchema.extend({
  planId: z.string().min(1),
  dayId: z.string().min(1),
  itemType: z
    .enum(["TRANSPORT", "ACTIVITY", "ACCOMMODATION", "GUIDE", "SUPPLEMENT", "MISC"])
    .default("MISC"),
  serviceId: z.string().trim().min(1).optional().nullable(),
  startAt: optionalDateTimeSchema,
  endAt: optionalDateTimeSchema,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  pax: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  units: z.coerce.number().min(0).max(999999).optional().nullable(),
  nights: z.coerce.number().int().min(0).max(365).optional().nullable(),
  rooms: z.array(roomRowSchema).optional().nullable(),
  fromLocationId: z.string().min(1).optional().nullable(),
  toLocationId: z.string().min(1).optional().nullable(),
  locationId: z.string().min(1).optional().nullable(),
  rateId: z.string().trim().min(1).optional().nullable(),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  baseAmount: z.coerce.number().min(0).max(999999999).default(0),
  taxAmount: z.coerce.number().min(0).max(999999999).default(0),
  totalAmount: z.coerce.number().min(0).max(999999999).default(0),
  pricingSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["PLANNED", "CONFIRMED", "CANCELLED", "COMPLETED"]).default("PLANNED"),
});

export const updatePreTourItemSchema = createPreTourItemSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one item field is required.",
  }
);

export const createPreTourItemAddonSchema = baseCodeSchema.extend({
  planId: z.string().min(1),
  planItemId: z.string().min(1),
  addonType: z.enum(["SUPPLEMENT", "MISC"]).default("SUPPLEMENT"),
  addonServiceId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(2).max(200),
  qty: z.coerce.number().min(0).max(999999).default(1),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  baseAmount: z.coerce.number().min(0).max(999999999).default(0),
  taxAmount: z.coerce.number().min(0).max(999999999).default(0),
  totalAmount: z.coerce.number().min(0).max(999999999).default(0),
  snapshot: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updatePreTourItemAddonSchema = createPreTourItemAddonSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one addon field is required.",
  }
);

export const createPreTourTotalSchema = baseCodeSchema.extend({
  planId: z.string().min(1),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  totalsByType: z.record(z.string(), z.unknown()).optional().nullable(),
  baseTotal: z.coerce.number().min(0).max(999999999),
  taxTotal: z.coerce.number().min(0).max(999999999),
  grandTotal: z.coerce.number().min(0).max(999999999),
  snapshot: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updatePreTourTotalSchema = createPreTourTotalSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one total field is required.",
  }
);
