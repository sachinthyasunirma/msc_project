import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  decimal,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { businessOrganization } from "@/db/schemas/business-network";
import { season } from "@/db/schemas/season";
import { company } from "@/db/schemas/company";

export const hotel = pgTable(
  "hotel",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),

    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    starRating: integer("star_rating").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),

    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_name").on(table.name),
    index("idx_hotel_location").on(table.city, table.country),
    index("idx_hotel_star_rating").on(table.starRating),
    index("idx_hotel_company").on(table.companyId),
    index("idx_hotel_active").on(table.isActive),
    index("idx_hotel_created_at").on(table.createdAt),
    index("idx_hotel_search").on(
      table.name,
      table.city,
      table.country,
      table.starRating,
      table.isActive
    ),
    unique("uq_hotel_company_code").on(table.companyId, table.code),
  ]
);

export const roomType = pgTable(
  "room_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    maxOccupancy: integer("max_occupancy").notNull(),
    bedType: text("bed_type").notNull(),
    size: text("size"),
    amenities: text("amenities").array(),
    totalRooms: integer("total_rooms").notNull(),
    availableRooms: integer("available_rooms").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_room_type_hotel").on(table.hotelId),
    index("idx_room_type_active").on(table.isActive),
    index("idx_room_type_composite").on(
      table.hotelId,
      table.isActive,
      table.maxOccupancy
    ),
    unique("uq_room_type_hotel_code").on(table.hotelId, table.code),
  ]
);

/**
 * @deprecated Legacy rate header model.
 * Use hotelContract + hotelRatePlan + hotelRoomRate for new work.
 */
export const roomRateHeader = pgTable(
  "room_rate_header",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    seasonId: text("season_id").references(() => season.id, { onDelete: "set null" }),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    currency: text("currency").notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_room_rate_header_hotel").on(table.hotelId),
    index("idx_room_rate_header_hotel_period").on(table.hotelId, table.validFrom, table.validTo),
    index("idx_room_rate_header_active").on(table.isActive),
    unique("uq_room_rate_header_hotel_code").on(table.hotelId, table.code),
  ]
);

/**
 * @deprecated Legacy room-rate model.
 * Use hotelRoomRate + hotelRateChildPolicy + hotelRateAdjustment for new work.
 */
export const roomRate = pgTable(
  "room_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomType.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    roomRateHeaderId: text("room_rate_header_id").references(() => roomRateHeader.id, {
      onDelete: "cascade",
    }),
    roomCategory: text("room_category"),
    roomBasis: text("room_basis"),
    seasonId: text("season_id").references(() => season.id, {
      onDelete: "cascade",
    }),
    // Base rate without season adjustment
    baseRatePerNight: decimal("base_rate_per_night", {
      precision: 10,
      scale: 2,
    }).notNull(),
    // Season multiplier (e.g., 1.2 for 20% increase, 0.8 for 20% discount)
    seasonMultiplier: decimal("season_multiplier", {
      precision: 5,
      scale: 2,
    }).default("1.00"),
    // Final calculated rate: baseRate * seasonMultiplier
    finalRatePerNight: decimal("final_rate_per_night", {
      precision: 10,
      scale: 2,
    }).notNull(),
    currency: text("currency").notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_room_rate_dates").on(
      table.roomTypeId,
      table.validFrom,
      table.validTo
    ),
    index("idx_room_rate_active").on(table.isActive),
    index("idx_room_rate_hotel").on(table.hotelId),

    // Composite index for price lookups
    index("idx_room_rate_lookup").on(
      table.hotelId,
      table.roomTypeId,
      table.roomRateHeaderId,
      table.validFrom,
      table.validTo,
      table.isActive
    ),
    index("idx_room_rate_header").on(table.roomRateHeaderId),
    unique("uq_room_rate_hotel_code").on(table.hotelId, table.code),
  ]
);

export const availability = pgTable(
  "availability",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomType.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    date: date("date").notNull(),
    availableRooms: integer("available_rooms").notNull(),
    bookedRooms: integer("booked_rooms").notNull().default(0),
    isBlocked: boolean("is_blocked").notNull().default(false),
    blockReason: text("block_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_availability_date_room").on(table.roomTypeId, table.date),
    index("idx_availability_hotel_date").on(table.hotelId, table.date),
    index("idx_availability_available").on(
      table.availableRooms,
      table.isBlocked
    ),

    // Unique constraint to prevent duplicate entries for same room type on same date
    unique("unique_date_room").on(table.roomTypeId, table.date),
    unique("uq_availability_hotel_code").on(table.hotelId, table.code),
  ]
);

export const hotelImage = pgTable("hotel_image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  hotelId: text("hotel_id")
    .notNull()
    .references(() => hotel.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isPrimary: boolean("is_primary").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("uq_hotel_image_hotel_code").on(table.hotelId, table.code),
]);

export const cancellationPolicy = pgTable("cancellation_policy", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  hotelId: text("hotel_id")
    .notNull()
    .references(() => hotel.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // Cancellation window in days before check-in
  cancellationWindowDays: integer("cancellation_window_days").notNull(),
  // Percentage refund based on cancellation timing
  refundPercentage: integer("refund_percentage").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("uq_cancellation_policy_hotel_code").on(table.hotelId, table.code),
]);

// Legacy rate/inventory tables above are kept for backward compatibility with the
// current accommodation module. The contract-driven entities below are the
// production-grade model for real hotel contracting, allocation, and costing.

export const hotelContract = pgTable(
  "hotel_contract",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name"),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    contractRef: text("contract_ref"),
    contractType: text("contract_type").notNull().default("FIT"),
    currencyCode: text("currency_code").notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    releaseDaysDefault: integer("release_days_default"),
    marketScope: text("market_scope"),
    guestNationalityScope: text("guest_nationality_scope"),
    remarks: text("remarks"),
    revisionNo: integer("revision_no").notNull().default(1),
    status: text("status").notNull().default("DRAFT"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_contract_company").on(table.companyId),
    index("idx_hotel_contract_hotel").on(table.hotelId),
    index("idx_hotel_contract_supplier").on(table.supplierOrgId),
    index("idx_hotel_contract_validity").on(table.hotelId, table.validFrom, table.validTo),
    index("idx_hotel_contract_booking_window").on(
      table.hotelId,
      table.bookingFrom,
      table.bookingTo
    ),
    index("idx_hotel_contract_status").on(table.status, table.isActive),
    unique("uq_hotel_contract_company_code").on(table.companyId, table.code),
    unique("uq_hotel_contract_hotel_code").on(table.hotelId, table.code),
  ]
);

export const hotelCancellationPolicy = pgTable(
  "hotel_cancellation_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    noShowPolicy: text("no_show_policy"),
    afterCheckInPolicy: text("after_check_in_policy"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_cancellation_policy_hotel").on(table.hotelId),
    index("idx_hotel_cancellation_policy_default").on(table.hotelId, table.isDefault),
    unique("uq_hotel_cancellation_policy_hotel_code").on(table.hotelId, table.code),
  ]
);

export const hotelCancellationPolicyRule = pgTable(
  "hotel_cancellation_policy_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    policyId: text("policy_id")
      .notNull()
      .references(() => hotelCancellationPolicy.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    fromDaysBefore: integer("from_days_before"),
    toDaysBefore: integer("to_days_before"),
    penaltyType: text("penalty_type").notNull(), // PERCENT | NIGHT | FIXED | FULL_STAY
    penaltyValue: decimal("penalty_value", { precision: 10, scale: 2 }).notNull(),
    basis: text("basis"), // ROOM_ONLY | TOTAL_STAY | FIRST_NIGHT
    appliesOnNoShow: boolean("applies_on_no_show").notNull().default(false),
    appliesAfterCheckIn: boolean("applies_after_check_in").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_cancellation_policy_rule_policy").on(table.policyId),
    index("idx_hotel_cancellation_policy_rule_window").on(
      table.policyId,
      table.fromDaysBefore,
      table.toDaysBefore
    ),
    unique("uq_hotel_cancellation_policy_rule_code").on(table.policyId, table.code),
  ]
);

export const hotelRatePlan = pgTable(
  "hotel_rate_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    contractId: text("contract_id")
      .notNull()
      .references(() => hotelContract.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    rateType: text("rate_type").notNull().default("CONTRACTED_BUY"),
    boardBasis: text("board_basis").notNull(), // RO | BB | HB | FB | AI
    pricingModel: text("pricing_model").notNull().default("PER_ROOM_PER_NIGHT"), // PER_ROOM_PER_NIGHT | PER_PERSON_PER_NIGHT
    cancellationPolicyId: text("cancellation_policy_id").references(
      () => hotelCancellationPolicy.id,
      { onDelete: "set null" }
    ),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    releaseDaysOverride: integer("release_days_override"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    isRefundable: boolean("is_refundable").notNull().default(true),
    isCommissionable: boolean("is_commissionable").notNull().default(false),
    isPackageOnly: boolean("is_package_only").notNull().default(false),
    priority: integer("priority").notNull().default(0),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_plan_contract").on(table.contractId),
    index("idx_hotel_rate_plan_type_status").on(table.rateType, table.status, table.isActive),
    index("idx_hotel_rate_plan_validity").on(table.contractId, table.validFrom, table.validTo),
    index("idx_hotel_rate_plan_booking_window").on(
      table.contractId,
      table.bookingFrom,
      table.bookingTo
    ),
    index("idx_hotel_rate_plan_board_basis").on(table.boardBasis),
    unique("uq_hotel_rate_plan_contract_code").on(table.contractId, table.code),
  ]
);

export const hotelRateRestriction = pgTable(
  "hotel_rate_restriction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id").references(() => roomType.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    stayFrom: date("stay_from").notNull(),
    stayTo: date("stay_to").notNull(),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    dayOfWeekMask: text("day_of_week_mask"),
    minStay: integer("min_stay"),
    maxStay: integer("max_stay"),
    closedToArrival: boolean("closed_to_arrival").notNull().default(false),
    closedToDeparture: boolean("closed_to_departure").notNull().default(false),
    stopSell: boolean("stop_sell").notNull().default(false),
    releaseDays: integer("release_days"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    notes: text("notes"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_restriction_plan").on(table.ratePlanId),
    index("idx_hotel_rate_restriction_room_type").on(table.roomTypeId),
    index("idx_hotel_rate_restriction_stay_window").on(table.ratePlanId, table.stayFrom, table.stayTo),
    index("idx_hotel_rate_restriction_booking_window").on(
      table.ratePlanId,
      table.bookingFrom,
      table.bookingTo
    ),
    unique("uq_hotel_rate_restriction_plan_code").on(table.ratePlanId, table.code),
  ]
);

export const hotelRateBlackout = pgTable(
  "hotel_rate_blackout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    stayFrom: date("stay_from").notNull(),
    stayTo: date("stay_to").notNull(),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    reason: text("reason"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_blackout_plan").on(table.ratePlanId),
    index("idx_hotel_rate_blackout_room_type").on(table.roomTypeId),
    index("idx_hotel_rate_blackout_stay_window").on(
      table.ratePlanId,
      table.stayFrom,
      table.stayTo
    ),
    index("idx_hotel_rate_blackout_booking_window").on(
      table.ratePlanId,
      table.bookingFrom,
      table.bookingTo
    ),
    unique("uq_hotel_rate_blackout_plan_code").on(table.ratePlanId, table.code),
  ]
);

export const hotelRoomRate = pgTable(
  "hotel_room_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomType.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    baseOccupancyAdults: integer("base_occupancy_adults").notNull(),
    baseOccupancyChildren: integer("base_occupancy_children").notNull().default(0),
    maxAdults: integer("max_adults").notNull(),
    maxChildren: integer("max_children").notNull().default(0),
    maxOccupancy: integer("max_occupancy"),
    singleUseRate: decimal("single_use_rate", { precision: 12, scale: 2 }),
    doubleRate: decimal("double_rate", { precision: 12, scale: 2 }),
    tripleRate: decimal("triple_rate", { precision: 12, scale: 2 }),
    quadRate: decimal("quad_rate", { precision: 12, scale: 2 }),
    extraAdultRate: decimal("extra_adult_rate", { precision: 12, scale: 2 }),
    childWithBedRate: decimal("child_with_bed_rate", { precision: 12, scale: 2 }),
    childNoBedRate: decimal("child_no_bed_rate", { precision: 12, scale: 2 }),
    infantRate: decimal("infant_rate", { precision: 12, scale: 2 }),
    singleSupplementRate: decimal("single_supplement_rate", { precision: 12, scale: 2 }),
    currencyCode: text("currency_code").notNull(),
    taxMode: text("tax_mode").notNull().default("EXCLUSIVE"), // INCLUSIVE | EXCLUSIVE | EXEMPT | UNKNOWN
    remarks: text("remarks"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_room_rate_plan").on(table.ratePlanId),
    index("idx_hotel_room_rate_hotel").on(table.hotelId),
    index("idx_hotel_room_rate_room_type").on(table.roomTypeId),
    index("idx_hotel_room_rate_validity").on(table.roomTypeId, table.validFrom, table.validTo),
    index("idx_hotel_room_rate_booking_window").on(
      table.roomTypeId,
      table.bookingFrom,
      table.bookingTo
    ),
    index("idx_hotel_room_rate_status").on(table.status, table.isActive),
    index("idx_hotel_room_rate_lookup").on(
      table.ratePlanId,
      table.roomTypeId,
      table.validFrom,
      table.validTo,
      table.isActive
    ),
    unique("uq_hotel_room_rate_hotel_code").on(table.hotelId, table.code),
  ]
);

export const hotelRateChildPolicy = pgTable(
  "hotel_rate_child_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    roomRateId: text("room_rate_id")
      .notNull()
      .references(() => hotelRoomRate.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    guestType: text("guest_type").notNull(), // CHILD_WITH_BED | CHILD_NO_BED | INFANT
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    chargeType: text("charge_type").notNull().default("FIXED"), // FIXED | PERCENT | FREE
    chargeBasis: text("charge_basis").notNull().default("PER_CHILD_PER_NIGHT"), // PER_CHILD_PER_NIGHT | PER_CHILD_PER_STAY | INCLUDED
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    currencyCode: text("currency_code"),
    withBed: boolean("with_bed").notNull().default(false),
    countsTowardOccupancy: boolean("counts_toward_occupancy").notNull().default(true),
    freeChildrenPerRoom: integer("free_children_per_room").notNull().default(0),
    maxChargeableChildren: integer("max_chargeable_children"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_child_policy_room_rate").on(table.roomRateId),
    index("idx_hotel_rate_child_policy_age").on(table.roomRateId, table.minAge, table.maxAge),
    unique("uq_hotel_rate_child_policy_room_rate_code").on(table.roomRateId, table.code),
  ]
);

export const hotelRateAdjustment = pgTable(
  "hotel_rate_adjustment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    roomRateId: text("room_rate_id").references(() => hotelRoomRate.id, {
      onDelete: "set null",
    }),
    roomTypeId: text("room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    adjustmentType: text("adjustment_type").notNull(), // SINGLE_SUPPLEMENT | MEAL_SUPPLEMENT | GALA_DINNER | REDUCTION | DISCOUNT | MARKUP | EXTRA_ADULT
    guestType: text("guest_type"), // ADULT | CHILD_WITH_BED | CHILD_NO_BED | INFANT | ROOM | BOOKING
    chargeBasis: text("charge_basis").notNull(), // PER_ROOM_PER_NIGHT | PER_PAX_PER_NIGHT | PER_STAY | PERCENT
    amountType: text("amount_type").notNull().default("FIXED"), // FIXED | PERCENT
    calculationBase: text("calculation_base"), // ROOM_RATE | SUBTOTAL | DOUBLE_RATE | OCCUPANCY_RATE
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code"),
    occupancyFrom: integer("occupancy_from"),
    occupancyTo: integer("occupancy_to"),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    boardBasisScope: text("board_basis_scope"),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    isCombinable: boolean("is_combinable").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_adjustment_plan").on(table.ratePlanId),
    index("idx_hotel_rate_adjustment_room_rate").on(table.roomRateId),
    index("idx_hotel_rate_adjustment_room_type").on(table.roomTypeId),
    index("idx_hotel_rate_adjustment_validity").on(table.ratePlanId, table.validFrom, table.validTo),
    index("idx_hotel_rate_adjustment_booking").on(table.ratePlanId, table.bookingFrom, table.bookingTo),
    index("idx_hotel_rate_adjustment_type").on(table.adjustmentType, table.status, table.isActive),
    unique("uq_hotel_rate_adjustment_plan_code").on(table.ratePlanId, table.code),
  ]
);

export const hotelFeeRule = pgTable(
  "hotel_fee_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    feeType: text("fee_type").notNull(), // TAX | LEVY | GALA_DINNER | SERVICE_CHARGE | RESORT_FEE | CITY_TAX
    guestType: text("guest_type"), // ADULT | CHILD | INFANT | ROOM | BOOKING
    chargeBasis: text("charge_basis").notNull(), // PER_ROOM_PER_NIGHT | PER_PAX_PER_NIGHT | PER_STAY | FLAT | PERCENT
    amountType: text("amount_type").notNull().default("FIXED"), // FIXED | PERCENT
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code"),
    taxMode: text("tax_mode").notNull().default("UNKNOWN"), // INCLUSIVE | EXCLUSIVE | EXEMPT | UNKNOWN
    isMandatory: boolean("is_mandatory").notNull().default(true),
    isIncludedInRate: boolean("is_included_in_rate").notNull().default(false),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    remarks: text("remarks"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_fee_rule_plan").on(table.ratePlanId),
    index("idx_hotel_fee_rule_room_type").on(table.roomTypeId),
    index("idx_hotel_fee_rule_validity").on(table.ratePlanId, table.validFrom, table.validTo),
    index("idx_hotel_fee_rule_type").on(table.feeType, table.status, table.isActive),
    unique("uq_hotel_fee_rule_plan_code").on(table.ratePlanId, table.code),
  ]
);

export const hotelSellRateRule = pgTable(
  "hotel_sell_rate_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    sellRatePlanId: text("sell_rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    sourceRatePlanId: text("source_rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    calculationMode: text("calculation_mode").notNull(), // PERCENT_MARKUP | FIXED_MARKUP | FLAT_OVERRIDE
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code"),
    roundingMode: text("rounding_mode").notNull().default("NONE"), // NONE | UP | DOWN | NEAREST
    roundingTo: decimal("rounding_to", { precision: 12, scale: 2 }),
    minSellAmount: decimal("min_sell_amount", { precision: 12, scale: 2 }),
    maxSellAmount: decimal("max_sell_amount", { precision: 12, scale: 2 }),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    bookingFrom: date("booking_from"),
    bookingTo: date("booking_to"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    status: text("status").notNull().default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_sell_rate_rule_sell_plan").on(table.sellRatePlanId),
    index("idx_hotel_sell_rate_rule_source_plan").on(table.sourceRatePlanId),
    index("idx_hotel_sell_rate_rule_room_type").on(table.roomTypeId),
    index("idx_hotel_sell_rate_rule_validity").on(table.sellRatePlanId, table.validFrom, table.validTo),
    unique("uq_hotel_sell_rate_rule_sell_plan_code").on(table.sellRatePlanId, table.code),
  ]
);

export const hotelInventoryDay = pgTable(
  "hotel_inventory_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomType.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    date: date("date").notNull(),
    physicalInventory: integer("physical_inventory").notNull(),
    contractedAllotment: integer("contracted_allotment"),
    soldRooms: integer("sold_rooms").notNull().default(0),
    blockedRooms: integer("blocked_rooms").notNull().default(0),
    freeSale: boolean("free_sale").notNull().default(false),
    stopSell: boolean("stop_sell").notNull().default(false),
    releaseDaysOverride: integer("release_days_override"),
    isClosed: boolean("is_closed").notNull().default(false),
    status: text("status").notNull().default("ACTIVE"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_inventory_day_hotel").on(table.hotelId),
    index("idx_hotel_inventory_day_room_date").on(table.roomTypeId, table.date),
    index("idx_hotel_inventory_day_hotel_date").on(table.hotelId, table.date),
    index("idx_hotel_inventory_day_stop_sell").on(table.stopSell, table.isClosed),
    unique("uq_hotel_inventory_day_room_date").on(table.roomTypeId, table.date),
    unique("uq_hotel_inventory_day_hotel_code").on(table.hotelId, table.code),
  ]
);

export const hotelContractInventoryDay = pgTable(
  "hotel_contract_inventory_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    contractId: text("contract_id")
      .notNull()
      .references(() => hotelContract.id, { onDelete: "cascade" }),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotel.id, { onDelete: "cascade" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomType.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    date: date("date").notNull(),
    allottedRooms: integer("allotted_rooms").notNull(),
    soldRooms: integer("sold_rooms").notNull().default(0),
    blockedRooms: integer("blocked_rooms").notNull().default(0),
    freeSale: boolean("free_sale").notNull().default(false),
    stopSell: boolean("stop_sell").notNull().default(false),
    releaseDaysOverride: integer("release_days_override"),
    isClosed: boolean("is_closed").notNull().default(false),
    status: text("status").notNull().default("ACTIVE"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_contract_inventory_day_contract").on(table.contractId),
    index("idx_hotel_contract_inventory_day_room_date").on(table.roomTypeId, table.date),
    index("idx_hotel_contract_inventory_day_hotel_date").on(table.hotelId, table.date),
    unique("uq_hotel_contract_inventory_day_contract_room_date").on(
      table.contractId,
      table.roomTypeId,
      table.date
    ),
    unique("uq_hotel_contract_inventory_day_contract_code").on(table.contractId, table.code),
  ]
);
