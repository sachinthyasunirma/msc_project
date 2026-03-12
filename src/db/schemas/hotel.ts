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
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    contractRef: text("contract_ref"),
    currencyCode: text("currency_code").notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    releaseDaysDefault: integer("release_days_default"),
    marketScope: text("market_scope"),
    remarks: text("remarks"),
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
    boardBasis: text("board_basis").notNull(), // RO | BB | HB | FB | AI
    pricingModel: text("pricing_model").notNull().default("PER_ROOM_PER_NIGHT"),
    cancellationPolicyId: text("cancellation_policy_id").references(
      () => hotelCancellationPolicy.id,
      { onDelete: "set null" }
    ),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    releaseDaysOverride: integer("release_days_override"),
    marketCode: text("market_code"),
    guestNationalityScope: text("guest_nationality_scope"),
    isRefundable: boolean("is_refundable").notNull().default(true),
    isCommissionable: boolean("is_commissionable").notNull().default(false),
    isPackageOnly: boolean("is_package_only").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_plan_contract").on(table.contractId),
    index("idx_hotel_rate_plan_validity").on(table.contractId, table.validFrom, table.validTo),
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
    minStay: integer("min_stay"),
    maxStay: integer("max_stay"),
    closedToArrival: boolean("closed_to_arrival").notNull().default(false),
    closedToDeparture: boolean("closed_to_departure").notNull().default(false),
    stopSell: boolean("stop_sell").notNull().default(false),
    releaseDays: integer("release_days"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_rate_restriction_plan").on(table.ratePlanId),
    index("idx_hotel_rate_restriction_room_type").on(table.roomTypeId),
    index("idx_hotel_rate_restriction_stay_window").on(table.ratePlanId, table.stayFrom, table.stayTo),
    unique("uq_hotel_rate_restriction_plan_code").on(table.ratePlanId, table.code),
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
    baseOccupancyAdults: integer("base_occupancy_adults").notNull(),
    maxAdults: integer("max_adults").notNull(),
    maxChildren: integer("max_children").notNull().default(0),
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
    taxMode: text("tax_mode").notNull().default("EXCLUSIVE"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_room_rate_plan").on(table.ratePlanId),
    index("idx_hotel_room_rate_hotel").on(table.hotelId),
    index("idx_hotel_room_rate_room_type").on(table.roomTypeId),
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

export const hotelFeeRule = pgTable(
  "hotel_fee_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => hotelRatePlan.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    feeType: text("fee_type").notNull(), // TAX | LEVY | GALA_DINNER | SERVICE_CHARGE | RESORT_FEE
    chargeBasis: text("charge_basis").notNull(), // PER_ROOM_PER_NIGHT | PER_PAX_PER_NIGHT | PER_STAY | FLAT
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code"),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    remarks: text("remarks"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_hotel_fee_rule_rate_plan").on(table.ratePlanId),
    index("idx_hotel_fee_rule_type").on(table.feeType),
    unique("uq_hotel_fee_rule_plan_code").on(table.ratePlanId, table.code),
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
