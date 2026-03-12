import { z } from "zod";
import {
  HOTEL_BOARD_BASES,
  HOTEL_CONTRACT_STATUSES,
  HOTEL_FEE_CHARGE_BASES,
  HOTEL_FEE_TYPES,
  HOTEL_PENALTY_BASES,
  HOTEL_PENALTY_TYPES,
  HOTEL_RATE_PRICING_MODELS,
  HOTEL_TAX_MODES,
  HOTEL_TRIP_MARKET_SCOPES,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

const dateSchema = z.string().date();
const isoCurrencySchema = z.string().trim().toUpperCase().length(3);
const codeSchema = z.string().trim().toUpperCase().min(1).max(40);
const optionalDateSchema = z.string().date().optional().nullable();

export const contractingListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  isActive: z.enum(["true", "false"]).optional(),
});

export const inventoryDayListQuerySchema = z
  .object({
    roomTypeId: z.string().trim().min(1).optional(),
    dateFrom: optionalDateSchema,
    dateTo: optionalDateSchema,
  })
  .merge(contractingListQuerySchema)
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      message: "Date from must be before or equal to date to.",
      path: ["dateTo"],
    }
  );

export const hotelRateResolutionQuerySchema = z
  .object({
    hotelId: z.string().trim().min(1),
    stayDate: dateSchema,
    roomTypeId: z.string().trim().min(1).optional().nullable(),
    boardBasis: z.enum(HOTEL_BOARD_BASES).optional().nullable(),
    adults: z.coerce.number().int().min(1).max(12).default(2),
    children: z.coerce.number().int().min(0).max(12).default(0),
  })
  .refine((value) => value.adults + value.children > 0, {
    message: "At least one guest is required.",
    path: ["adults"],
  });

function requireAtLeastOneField<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  message: string
) {
  return schema.partial().refine((value) => Object.keys(value).length > 0, {
    message,
  });
}

function withDateRangeValidation<T extends z.ZodTypeAny>(
  schema: T,
  fromKey: string,
  toKey: string,
  message: string
) {
  return schema.refine(
    (value) => {
      const record = value as Record<string, unknown>;
      const from = record[fromKey];
      const to = record[toKey];
      return !from || !to || String(from) <= String(to);
    },
    {
      message,
      path: [toKey],
    }
  );
}

const hotelContractSchemaBase = z.object({
  code: codeSchema,
  supplierOrgId: z.string().min(1).optional().nullable(),
  contractRef: z.string().trim().max(120).optional().nullable(),
  currencyCode: isoCurrencySchema,
  validFrom: dateSchema,
  validTo: dateSchema,
  releaseDaysDefault: z.coerce.number().int().min(0).max(365).optional().nullable(),
  marketScope: z.enum(HOTEL_TRIP_MARKET_SCOPES).optional().nullable(),
  remarks: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("DRAFT"),
  isActive: z.boolean().default(true),
});

export const createHotelContractSchema = withDateRangeValidation(
  hotelContractSchemaBase,
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelContractSchema = withDateRangeValidation(
  requireAtLeastOneField(hotelContractSchemaBase, "At least one contract field is required."),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const createHotelCancellationPolicySchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  noShowPolicy: z.string().trim().max(500).optional().nullable(),
  afterCheckInPolicy: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateHotelCancellationPolicySchema = requireAtLeastOneField(
  createHotelCancellationPolicySchema,
  "At least one cancellation policy field is required."
);

const hotelCancellationPolicyRuleSchemaBase = z.object({
  code: codeSchema,
  fromDaysBefore: z.coerce.number().int().min(0).max(3650).optional().nullable(),
  toDaysBefore: z.coerce.number().int().min(0).max(3650).optional().nullable(),
  penaltyType: z.enum(HOTEL_PENALTY_TYPES),
  penaltyValue: z.coerce.number().min(0).max(999999999),
  basis: z.enum(HOTEL_PENALTY_BASES).optional().nullable(),
  appliesOnNoShow: z.boolean().default(false),
  appliesAfterCheckIn: z.boolean().default(false),
});

function withCancellationWindowValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (value) => {
      const record = value as Record<string, unknown>;
      const from = record.fromDaysBefore;
      const to = record.toDaysBefore;
      return (
        from === null ||
        from === undefined ||
        to === null ||
        to === undefined ||
        Number(from) >= Number(to)
      );
    },
    {
      message: "From days before should be greater than or equal to to days before.",
      path: ["toDaysBefore"],
    }
  );
}

export const createHotelCancellationPolicyRuleSchema = withCancellationWindowValidation(
  hotelCancellationPolicyRuleSchemaBase
);

export const updateHotelCancellationPolicyRuleSchema = withCancellationWindowValidation(
  requireAtLeastOneField(
    hotelCancellationPolicyRuleSchemaBase,
    "At least one cancellation rule field is required."
  )
);

const hotelRatePlanSchemaBase = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  boardBasis: z.enum(HOTEL_BOARD_BASES),
  pricingModel: z.enum(HOTEL_RATE_PRICING_MODELS).default("PER_ROOM_PER_NIGHT"),
  cancellationPolicyId: z.string().min(1).optional().nullable(),
  validFrom: dateSchema,
  validTo: dateSchema,
  releaseDaysOverride: z.coerce.number().int().min(0).max(365).optional().nullable(),
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  isRefundable: z.boolean().default(true),
  isCommissionable: z.boolean().default(false),
  isPackageOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createHotelRatePlanSchema = withDateRangeValidation(
  hotelRatePlanSchemaBase,
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelRatePlanSchema = withDateRangeValidation(
  requireAtLeastOneField(hotelRatePlanSchemaBase, "At least one rate plan field is required."),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

const hotelRoomRateSchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1),
  validFrom: dateSchema,
  validTo: dateSchema,
  baseOccupancyAdults: z.coerce.number().int().min(1).max(12),
  maxAdults: z.coerce.number().int().min(1).max(12),
  maxChildren: z.coerce.number().int().min(0).max(12).default(0),
  singleUseRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  doubleRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  tripleRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  quadRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  extraAdultRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  childWithBedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  childNoBedRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  infantRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  singleSupplementRate: z.coerce.number().min(0).max(999999999).optional().nullable(),
  currencyCode: isoCurrencySchema,
  taxMode: z.enum(HOTEL_TAX_MODES).default("EXCLUSIVE"),
  isActive: z.boolean().default(true),
});

function withRoomRateValidation<T extends z.ZodTypeAny>(schema: T) {
  return withDateRangeValidation(schema, "validFrom", "validTo", "Valid from date must be before or equal to valid to date.")
    .refine((value) => {
      const record = value as Record<string, unknown>;
      const base = record.baseOccupancyAdults;
      const max = record.maxAdults;
      return !base || !max || Number(base) <= Number(max);
    }, {
      message: "Base occupancy adults cannot exceed max adults.",
      path: ["baseOccupancyAdults"],
    });
}

export const createHotelRoomRateSchema = withRoomRateValidation(hotelRoomRateSchemaBase);

export const updateHotelRoomRateSchema = withRoomRateValidation(
  requireAtLeastOneField(hotelRoomRateSchemaBase, "At least one room rate field is required.")
);

const hotelRateRestrictionSchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1).optional().nullable(),
  stayFrom: dateSchema,
  stayTo: dateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  minStay: z.coerce.number().int().min(1).max(365).optional().nullable(),
  maxStay: z.coerce.number().int().min(1).max(365).optional().nullable(),
  closedToArrival: z.boolean().default(false),
  closedToDeparture: z.boolean().default(false),
  stopSell: z.boolean().default(false),
  releaseDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function withRestrictionValidation<T extends z.ZodTypeAny>(schema: T) {
  return withDateRangeValidation(
    withDateRangeValidation(schema, "bookingFrom", "bookingTo", "Booking from date must be before or equal to booking to date."),
    "stayFrom",
    "stayTo",
    "Stay from date must be before or equal to stay to date."
  ).refine((value) => {
    const record = value as Record<string, unknown>;
    const min = record.minStay;
    const max = record.maxStay;
    return min === null || min === undefined || max === null || max === undefined || Number(min) <= Number(max);
  }, {
    message: "Minimum stay cannot exceed maximum stay.",
    path: ["maxStay"],
  });
}

export const createHotelRateRestrictionSchema = withRestrictionValidation(hotelRateRestrictionSchemaBase);

export const updateHotelRateRestrictionSchema = withRestrictionValidation(
  requireAtLeastOneField(hotelRateRestrictionSchemaBase, "At least one restriction field is required.")
);

const hotelFeeRuleSchemaBase = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  feeType: z.enum(HOTEL_FEE_TYPES),
  chargeBasis: z.enum(HOTEL_FEE_CHARGE_BASES),
  amount: z.coerce.number().min(0).max(999999999),
  currencyCode: isoCurrencySchema.optional().nullable(),
  isMandatory: z.boolean().default(true),
  validFrom: optionalDateSchema,
  validTo: optionalDateSchema,
  remarks: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const createHotelFeeRuleSchema = withDateRangeValidation(
  hotelFeeRuleSchemaBase,
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelFeeRuleSchema = withDateRangeValidation(
  requireAtLeastOneField(hotelFeeRuleSchemaBase, "At least one fee rule field is required."),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

const hotelInventoryDaySchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1),
  date: dateSchema,
  physicalInventory: z.coerce.number().int().min(0).max(5000),
  contractedAllotment: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  soldRooms: z.coerce.number().int().min(0).max(5000).default(0),
  blockedRooms: z.coerce.number().int().min(0).max(5000).default(0),
  freeSale: z.boolean().default(false),
  stopSell: z.boolean().default(false),
  releaseDaysOverride: z.coerce.number().int().min(0).max(365).optional().nullable(),
  isClosed: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function withInventoryValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (value) => {
      const record = value as Record<string, unknown>;
      const physicalInventory = Number(record.physicalInventory ?? 0);
      const contractedAllotment = record.contractedAllotment ?? null;
      const soldRooms = Number(record.soldRooms ?? 0);
      const blockedRooms = Number(record.blockedRooms ?? 0);
      const allotment = contractedAllotment === null || contractedAllotment === undefined
        ? physicalInventory
        : Number(contractedAllotment);
      return soldRooms + blockedRooms <= Math.max(allotment, physicalInventory);
    },
    {
      message: "Sold and blocked rooms cannot exceed available inventory/allotment.",
      path: ["blockedRooms"],
    }
  );
}

export const createHotelInventoryDaySchema = withInventoryValidation(hotelInventoryDaySchemaBase);

export const updateHotelInventoryDaySchema = withInventoryValidation(
  requireAtLeastOneField(hotelInventoryDaySchemaBase, "At least one inventory field is required.")
);
