import { z } from "zod";
import {
  HOTEL_ADJUSTMENT_AMOUNT_TYPES,
  HOTEL_ADJUSTMENT_CALCULATION_BASES,
  HOTEL_ADJUSTMENT_TYPES,
  HOTEL_BOARD_BASES,
  HOTEL_CHILD_POLICY_CHARGE_BASES,
  HOTEL_CHILD_POLICY_CHARGE_TYPES,
  HOTEL_CHILD_POLICY_GUEST_TYPES,
  HOTEL_CONTRACT_TYPES,
  HOTEL_CONTRACT_STATUSES,
  HOTEL_FEE_CHARGE_BASES,
  HOTEL_FEE_TYPES,
  HOTEL_GUEST_TYPES,
  HOTEL_PENALTY_BASES,
  HOTEL_PENALTY_TYPES,
  HOTEL_RATE_TYPES,
  HOTEL_RATE_PRICING_MODELS,
  HOTEL_ROUNDING_MODES,
  HOTEL_SELL_RATE_CALCULATION_MODES,
  HOTEL_TAX_MODES,
  HOTEL_TRIP_MARKET_SCOPES,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

const dateSchema = z.string().date();
const isoCurrencySchema = z.string().trim().toUpperCase().length(3);
const codeSchema = z.string().trim().toUpperCase().min(1).max(40);
const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
};
const optionalDateSchema = z.preprocess(
  emptyStringToNull,
  z.string().date().optional().nullable()
);
const optionalTextSchema = (max: number) =>
  z.preprocess(emptyStringToNull, z.string().trim().max(max).optional().nullable());
const optionalMinOneTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().min(1).optional().nullable()
);

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
  name: z.preprocess(emptyStringToNull, z.string().trim().min(2).max(160).optional().nullable()),
  supplierOrgId: optionalMinOneTextSchema,
  contractRef: optionalTextSchema(120),
  contractType: z.enum(HOTEL_CONTRACT_TYPES).default("FIT"),
  currencyCode: isoCurrencySchema,
  validFrom: dateSchema,
  validTo: dateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  releaseDaysDefault: z.coerce.number().int().min(0).max(365).optional().nullable(),
  marketScope: z.preprocess(
    emptyStringToNull,
    z.enum(HOTEL_TRIP_MARKET_SCOPES).optional().nullable()
  ),
  guestNationalityScope: optionalTextSchema(120),
  remarks: optionalTextSchema(2000),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("DRAFT"),
  isActive: z.boolean().default(true),
});

export const createHotelContractSchema = withDateRangeValidation(
  withDateRangeValidation(
    hotelContractSchemaBase,
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelContractSchema = withDateRangeValidation(
  withDateRangeValidation(
    requireAtLeastOneField(
      hotelContractSchemaBase,
      "At least one contract field is required."
    ),
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
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
      message:
        "From days before must be greater than or equal to To days before. Example: 30 to 15.",
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
  description: z.string().trim().max(1000).optional().nullable(),
  rateType: z.enum(HOTEL_RATE_TYPES).default("CONTRACTED_BUY"),
  boardBasis: z.enum(HOTEL_BOARD_BASES),
  pricingModel: z.enum(HOTEL_RATE_PRICING_MODELS).default("PER_ROOM_PER_NIGHT"),
  cancellationPolicyId: z.string().min(1).optional().nullable(),
  validFrom: dateSchema,
  validTo: dateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  releaseDaysOverride: z.coerce.number().int().min(0).max(365).optional().nullable(),
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  isRefundable: z.boolean().default(true),
  isCommissionable: z.boolean().default(false),
  isPackageOnly: z.boolean().default(false),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

export const createHotelRatePlanSchema = withDateRangeValidation(
  withDateRangeValidation(
    hotelRatePlanSchemaBase,
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelRatePlanSchema = withDateRangeValidation(
  withDateRangeValidation(
    requireAtLeastOneField(
      hotelRatePlanSchemaBase,
      "At least one rate plan field is required."
    ),
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

const hotelRoomRateSchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1),
  validFrom: dateSchema,
  validTo: dateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  baseOccupancyAdults: z.coerce.number().int().min(1).max(12),
  baseOccupancyChildren: z.coerce.number().int().min(0).max(12).default(0),
  maxAdults: z.coerce.number().int().min(1).max(12),
  maxChildren: z.coerce.number().int().min(0).max(12).default(0),
  maxOccupancy: z.coerce.number().int().min(1).max(20).optional().nullable(),
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
  remarks: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

function withRoomRateValidation<T extends z.ZodTypeAny>(schema: T) {
  return withDateRangeValidation(
    withDateRangeValidation(
      schema,
      "bookingFrom",
      "bookingTo",
      "Booking from date must be before or equal to booking to date."
    ),
    "validFrom",
    "validTo",
    "Valid from date must be before or equal to valid to date."
  )
    .refine((value) => {
      const record = value as Record<string, unknown>;
      const base = record.baseOccupancyAdults;
      const max = record.maxAdults;
      return !base || !max || Number(base) <= Number(max);
    }, {
      message: "Base occupancy adults cannot exceed max adults.",
      path: ["baseOccupancyAdults"],
    })
    .refine((value) => {
      const record = value as Record<string, unknown>;
      const baseAdults = Number(record.baseOccupancyAdults ?? 0);
      const baseChildren = Number(record.baseOccupancyChildren ?? 0);
      const maxAdults = Number(record.maxAdults ?? 0);
      const maxChildren = Number(record.maxChildren ?? 0);
      const maxOccupancy = record.maxOccupancy;
      const totalBase = baseAdults + baseChildren;
      const totalMax = maxAdults + maxChildren;

      if (maxOccupancy === null || maxOccupancy === undefined) {
        return totalBase <= totalMax;
      }

      return totalBase <= Number(maxOccupancy) && totalMax <= Number(maxOccupancy);
    }, {
      message: "Occupancy values exceed the defined maximum occupancy.",
      path: ["maxOccupancy"],
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
  dayOfWeekMask: z.string().trim().max(60).optional().nullable(),
  minStay: z.coerce.number().int().min(1).max(365).optional().nullable(),
  maxStay: z.coerce.number().int().min(1).max(365).optional().nullable(),
  closedToArrival: z.boolean().default(false),
  closedToDeparture: z.boolean().default(false),
  stopSell: z.boolean().default(false),
  releaseDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
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

const hotelRateBlackoutSchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1).optional().nullable(),
  stayFrom: dateSchema,
  stayTo: dateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

export const createHotelRateBlackoutSchema = withDateRangeValidation(
  withDateRangeValidation(
    hotelRateBlackoutSchemaBase,
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "stayFrom",
  "stayTo",
  "Stay from date must be before or equal to stay to date."
);

export const updateHotelRateBlackoutSchema = withDateRangeValidation(
  withDateRangeValidation(
    requireAtLeastOneField(
      hotelRateBlackoutSchemaBase,
      "At least one blackout field is required."
    ),
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "stayFrom",
  "stayTo",
  "Stay from date must be before or equal to stay to date."
);

const hotelRateChildPolicySchemaBase = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  guestType: z.enum(HOTEL_CHILD_POLICY_GUEST_TYPES),
  minAge: z.coerce.number().int().min(0).max(17),
  maxAge: z.coerce.number().int().min(0).max(17),
  chargeType: z.enum(HOTEL_CHILD_POLICY_CHARGE_TYPES).default("FIXED"),
  chargeBasis: z.enum(HOTEL_CHILD_POLICY_CHARGE_BASES).default("PER_CHILD_PER_NIGHT"),
  amount: z.coerce.number().min(0).max(999999999).default(0),
  currencyCode: isoCurrencySchema.optional().nullable(),
  withBed: z.boolean().default(false),
  countsTowardOccupancy: z.boolean().default(true),
  freeChildrenPerRoom: z.coerce.number().int().min(0).max(10).default(0),
  maxChargeableChildren: z.coerce.number().int().min(0).max(10).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

function withChildPolicyValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine((value) => {
      const record = value as Record<string, unknown>;
      return Number(record.minAge ?? 0) <= Number(record.maxAge ?? 0);
    }, {
      message: "Minimum age cannot exceed maximum age.",
      path: ["maxAge"],
    })
    .refine((value) => {
      const record = value as Record<string, unknown>;
      const freeChildrenPerRoom = Number(record.freeChildrenPerRoom ?? 0);
      const maxChargeableChildren = record.maxChargeableChildren;
      return (
        maxChargeableChildren === null ||
        maxChargeableChildren === undefined ||
        freeChildrenPerRoom <= Number(maxChargeableChildren)
      );
    }, {
      message: "Free children per room cannot exceed max chargeable children.",
      path: ["maxChargeableChildren"],
    });
}

export const createHotelRateChildPolicySchema = withChildPolicyValidation(
  hotelRateChildPolicySchemaBase
);

export const updateHotelRateChildPolicySchema = withChildPolicyValidation(
  requireAtLeastOneField(
    hotelRateChildPolicySchemaBase,
    "At least one child policy field is required."
  )
);

const hotelRateAdjustmentSchemaBase = z.object({
  code: codeSchema,
  roomRateId: z.string().min(1).optional().nullable(),
  roomTypeId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  adjustmentType: z.enum(HOTEL_ADJUSTMENT_TYPES),
  guestType: z.enum(HOTEL_GUEST_TYPES).optional().nullable(),
  chargeBasis: z.enum(HOTEL_FEE_CHARGE_BASES),
  amountType: z.enum(HOTEL_ADJUSTMENT_AMOUNT_TYPES).default("FIXED"),
  calculationBase: z.enum(HOTEL_ADJUSTMENT_CALCULATION_BASES).optional().nullable(),
  amount: z.coerce.number().min(0).max(999999999),
  currencyCode: isoCurrencySchema.optional().nullable(),
  occupancyFrom: z.coerce.number().int().min(1).max(20).optional().nullable(),
  occupancyTo: z.coerce.number().int().min(1).max(20).optional().nullable(),
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  validFrom: optionalDateSchema,
  validTo: optionalDateSchema,
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  boardBasisScope: z.enum(HOTEL_BOARD_BASES).optional().nullable(),
  isMandatory: z.boolean().default(false),
  isCombinable: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

function withAdjustmentValidation<T extends z.ZodTypeAny>(schema: T) {
  return withDateRangeValidation(
    withDateRangeValidation(
      schema,
      "bookingFrom",
      "bookingTo",
      "Booking from date must be before or equal to booking to date."
    ),
    "validFrom",
    "validTo",
    "Valid from date must be before or equal to valid to date."
  ).refine((value) => {
    const record = value as Record<string, unknown>;
    const occupancyFrom = record.occupancyFrom;
    const occupancyTo = record.occupancyTo;
    return (
      occupancyFrom === null ||
      occupancyFrom === undefined ||
      occupancyTo === null ||
      occupancyTo === undefined ||
      Number(occupancyFrom) <= Number(occupancyTo)
    );
  }, {
    message: "Occupancy from cannot exceed occupancy to.",
    path: ["occupancyTo"],
  });
}

export const createHotelRateAdjustmentSchema = withAdjustmentValidation(
  hotelRateAdjustmentSchemaBase
);

export const updateHotelRateAdjustmentSchema = withAdjustmentValidation(
  requireAtLeastOneField(
    hotelRateAdjustmentSchemaBase,
    "At least one adjustment field is required."
  )
);

const hotelSellRateRuleSchemaBase = z.object({
  code: codeSchema,
  sourceRatePlanId: z.string().min(1),
  roomTypeId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  calculationMode: z.enum(HOTEL_SELL_RATE_CALCULATION_MODES),
  amount: z.coerce.number().min(0).max(999999999),
  currencyCode: isoCurrencySchema.optional().nullable(),
  roundingMode: z.enum(HOTEL_ROUNDING_MODES).default("NONE"),
  roundingTo: z.coerce.number().min(0).max(999999999).optional().nullable(),
  minSellAmount: z.coerce.number().min(0).max(999999999).optional().nullable(),
  maxSellAmount: z.coerce.number().min(0).max(999999999).optional().nullable(),
  validFrom: optionalDateSchema,
  validTo: optionalDateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

function withSellRateRuleValidation<T extends z.ZodTypeAny>(schema: T) {
  return withDateRangeValidation(
    withDateRangeValidation(
      schema,
      "bookingFrom",
      "bookingTo",
      "Booking from date must be before or equal to booking to date."
    ),
    "validFrom",
    "validTo",
    "Valid from date must be before or equal to valid to date."
  ).refine((value) => {
    const record = value as Record<string, unknown>;
    const minSellAmount = record.minSellAmount;
    const maxSellAmount = record.maxSellAmount;
    return (
      minSellAmount === null ||
      minSellAmount === undefined ||
      maxSellAmount === null ||
      maxSellAmount === undefined ||
      Number(minSellAmount) <= Number(maxSellAmount)
    );
  }, {
    message: "Minimum sell amount cannot exceed maximum sell amount.",
    path: ["maxSellAmount"],
  });
}

export const createHotelSellRateRuleSchema = withSellRateRuleValidation(
  hotelSellRateRuleSchemaBase
);

export const updateHotelSellRateRuleSchema = withSellRateRuleValidation(
  requireAtLeastOneField(
    hotelSellRateRuleSchemaBase,
    "At least one sell rate rule field is required."
  )
);

const hotelFeeRuleSchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  feeType: z.enum(HOTEL_FEE_TYPES),
  guestType: z.enum(HOTEL_GUEST_TYPES).optional().nullable(),
  chargeBasis: z.enum(HOTEL_FEE_CHARGE_BASES),
  amountType: z.enum(["FIXED", "PERCENT"]).default("FIXED"),
  amount: z.coerce.number().min(0).max(999999999),
  currencyCode: isoCurrencySchema.optional().nullable(),
  taxMode: z.enum(HOTEL_TAX_MODES).default("UNKNOWN"),
  isMandatory: z.boolean().default(true),
  isIncludedInRate: z.boolean().default(false),
  validFrom: optionalDateSchema,
  validTo: optionalDateSchema,
  bookingFrom: optionalDateSchema,
  bookingTo: optionalDateSchema,
  marketCode: z.string().trim().max(40).optional().nullable(),
  guestNationalityScope: z.string().trim().max(120).optional().nullable(),
  remarks: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(HOTEL_CONTRACT_STATUSES).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

export const createHotelFeeRuleSchema = withDateRangeValidation(
  withDateRangeValidation(
    hotelFeeRuleSchemaBase,
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
  "validFrom",
  "validTo",
  "Valid from date must be before or equal to valid to date."
);

export const updateHotelFeeRuleSchema = withDateRangeValidation(
  withDateRangeValidation(
    requireAtLeastOneField(
      hotelFeeRuleSchemaBase,
      "At least one fee rule field is required."
    ),
    "bookingFrom",
    "bookingTo",
    "Booking from date must be before or equal to booking to date."
  ),
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
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
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

const hotelContractInventoryDaySchemaBase = z.object({
  code: codeSchema,
  roomTypeId: z.string().min(1),
  date: dateSchema,
  allottedRooms: z.coerce.number().int().min(0).max(5000),
  soldRooms: z.coerce.number().int().min(0).max(5000).default(0),
  blockedRooms: z.coerce.number().int().min(0).max(5000).default(0),
  freeSale: z.boolean().default(false),
  stopSell: z.boolean().default(false),
  releaseDaysOverride: z.coerce.number().int().min(0).max(365).optional().nullable(),
  isClosed: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function withContractInventoryValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (value) => {
      const record = value as Record<string, unknown>;
      const allottedRooms = Number(record.allottedRooms ?? 0);
      const soldRooms = Number(record.soldRooms ?? 0);
      const blockedRooms = Number(record.blockedRooms ?? 0);
      return soldRooms + blockedRooms <= allottedRooms;
    },
    {
      message: "Sold and blocked rooms cannot exceed allotted rooms.",
      path: ["blockedRooms"],
    }
  );
}

export const createHotelContractInventoryDaySchema = withContractInventoryValidation(
  hotelContractInventoryDaySchemaBase
);

export const updateHotelContractInventoryDaySchema = withContractInventoryValidation(
  requireAtLeastOneField(
    hotelContractInventoryDaySchemaBase,
    "At least one contract inventory field is required."
  )
);
