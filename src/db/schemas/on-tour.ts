import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { businessOrganization } from "@/db/schemas/business-network";
import { company } from "@/db/schemas/company";
import { guide, guideLanguageMaster } from "@/db/schemas/guides";
import { hotel, roomType } from "@/db/schemas/hotel";
import { preTourPlan, preTourPlanDay, preTourPlanItem } from "@/db/schemas/pre-tour";
import { technicalVisit } from "@/db/schemas/technical-visit";
import { tourCategory, tourCategoryType } from "@/db/schemas/tour-category";
import {
  transportLocation,
  transportVehicleCategory,
  transportVehicleType,
} from "@/db/schemas/transport";
import { user } from "@/db/schemas/user";

/**
 * Confirmed operational file / departure.
 * This is separated from pre-tour so the accepted commercial baseline stays frozen
 * while operational execution changes continue safely.
 */
export const onTour = pgTable(
  "on_tour",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    preTourPlanId: text("pre_tour_plan_id").references(() => preTourPlan.id, {
      onDelete: "set null",
    }),
    sourcePlanVersion: integer("source_plan_version"),
    sourceOptionId: text("source_option_id"),
    sourcePaxPricingId: text("source_pax_pricing_id"),
    referenceNo: text("reference_no").notNull(),
    bookingNo: text("booking_no").notNull(),
    departureCode: text("departure_code").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("DRAFT"),
    customerId: text("customer_id"),
    agentId: text("agent_id"),
    leadId: text("lead_id"),
    operatorOrgId: text("operator_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    marketOrgId: text("market_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    confirmedStartDate: timestamp("confirmed_start_date").notNull(),
    confirmedEndDate: timestamp("confirmed_end_date").notNull(),
    totalNights: integer("total_nights").notNull(),
    adults: integer("adults").notNull().default(0),
    children: integer("children").notNull().default(0),
    infants: integer("infants").notNull().default(0),
    foc: integer("foc").notNull().default(0),
    totalPax: integer("total_pax").notNull().default(0),
    preferredLanguage: text("preferred_language"),
    currencyCode: text("currency_code").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull().default("USD"),
    exchangeRateMode: text("exchange_rate_mode").notNull().default("AUTO"),
    exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 })
      .notNull()
      .default("0"),
    exchangeRateDate: timestamp("exchange_rate_date"),
    quotedBaseTotal: decimal("quoted_base_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotedTaxTotal: decimal("quoted_tax_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotedGrandTotal: decimal("quoted_grand_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedBaseTotal: decimal("confirmed_base_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedTaxTotal: decimal("confirmed_tax_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedGrandTotal: decimal("confirmed_grand_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualBaseTotal: decimal("actual_base_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualTaxTotal: decimal("actual_tax_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualGrandTotal: decimal("actual_grand_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotationSnapshot: jsonb("quotation_snapshot").$type<Record<string, unknown> | null>(),
    conversionSnapshot: jsonb("conversion_snapshot").$type<Record<string, unknown> | null>(),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    convertedAt: timestamp("converted_at").notNull().defaultNow(),
    convertedByUserId: text("converted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    isLocked: boolean("is_locked").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedByUserId: text("deleted_by_user_id"),
    deletedByName: text("deleted_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_company_booking_no").on(table.companyId, table.bookingNo),
    unique("uq_on_tour_company_departure_code").on(table.companyId, table.departureCode),
    index("idx_on_tour_company").on(table.companyId),
    index("idx_on_tour_pre_tour_plan").on(table.preTourPlanId),
    index("idx_on_tour_status").on(table.status),
    index("idx_on_tour_dates").on(table.confirmedStartDate, table.confirmedEndDate),
    index("idx_on_tour_market_org").on(table.marketOrgId),
  ]
);

/**
 * Operational subgroup for branching and split travel programs.
 */
export const onTourGroup = pgTable(
  "on_tour_group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    groupName: text("group_name").notNull(),
    subgroupType: text("subgroup_type").notNull().default("MAIN"),
    parentGroupId: text("parent_group_id"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    preferredLanguage: text("preferred_language"),
    notes: text("notes"),
    isPrimary: boolean("is_primary").notNull().default(false),
    isOperationalSplit: boolean("is_operational_split").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_group_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_group_tour_name").on(table.onTourId, table.groupName),
    index("idx_on_tour_group_company").on(table.companyId),
    index("idx_on_tour_group_tour").on(table.onTourId),
    index("idx_on_tour_group_type").on(table.subgroupType),
  ]
);

/**
 * Confirmed tour day sequence used by operations.
 */
export const onTourDay = pgTable(
  "on_tour_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    sourcePlanDayId: text("source_plan_day_id").references(() => preTourPlanDay.id, {
      onDelete: "set null",
    }),
    dayNumber: integer("day_number").notNull(),
    dayDate: timestamp("day_date").notNull(),
    title: text("title"),
    notes: text("notes"),
    startLocationId: text("start_location_id").references(() => transportLocation.id, {
      onDelete: "set null",
    }),
    endLocationId: text("end_location_id").references(() => transportLocation.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_day_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_day_tour_day_number").on(table.onTourId, table.dayNumber),
    index("idx_on_tour_day_company").on(table.companyId),
    index("idx_on_tour_day_tour").on(table.onTourId),
    index("idx_on_tour_day_date").on(table.dayDate),
  ]
);

/**
 * Exact traveler record for the operational file.
 */
export const onTourTraveler = pgTable(
  "on_tour_traveler",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    travelerType: text("traveler_type").notNull().default("ADULT"),
    pricingCategory: text("pricing_category"),
    title: text("title"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name").notNull(),
    gender: text("gender"),
    dob: timestamp("dob"),
    nationality: text("nationality"),
    passportNo: text("passport_no"),
    passportExpiryAt: timestamp("passport_expiry_at"),
    visaDetails: text("visa_details"),
    dietaryNotes: text("dietary_notes"),
    medicalNotes: text("medical_notes"),
    mobilityNotes: text("mobility_notes"),
    roomingGender: text("rooming_gender"),
    phone: text("phone"),
    email: text("email"),
    emergencyContact: jsonb("emergency_contact").$type<
      { name: string; phone: string; relation?: string } | null
    >(),
    requiresChildSeat: boolean("requires_child_seat").notNull().default(false),
    isGroupLeader: boolean("is_group_leader").notNull().default(false),
    isTourLeader: boolean("is_tour_leader").notNull().default(false),
    isFoc: boolean("is_foc").notNull().default(false),
    notes: text("notes"),
    travelerSnapshot: jsonb("traveler_snapshot").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_traveler_company_code").on(table.companyId, table.code),
    index("idx_on_tour_traveler_company").on(table.companyId),
    index("idx_on_tour_traveler_tour").on(table.onTourId),
    index("idx_on_tour_traveler_passport").on(table.passportNo),
    index("idx_on_tour_traveler_type").on(table.travelerType),
  ]
);

/**
 * Traveler membership inside a subgroup or split.
 */
export const onTourGroupTraveler = pgTable(
  "on_tour_group_traveler",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => onTourGroup.id, { onDelete: "cascade" }),
    travelerId: text("traveler_id")
      .notNull()
      .references(() => onTourTraveler.id, { onDelete: "cascade" }),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    role: text("role").notNull().default("MEMBER"),
    notes: text("notes"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_group_traveler_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_group_traveler_group_traveler_from").on(
      table.groupId,
      table.travelerId,
      table.effectiveFrom
    ),
    index("idx_on_tour_group_traveler_company").on(table.companyId),
    index("idx_on_tour_group_traveler_tour").on(table.onTourId),
    index("idx_on_tour_group_traveler_group").on(table.groupId),
    index("idx_on_tour_group_traveler_traveler").on(table.travelerId),
  ]
);

/**
 * Core operational service line.
 * All operational execution, fulfilment, and finance anchor here.
 */
export const onTourService = pgTable(
  "on_tour_service",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    dayId: text("day_id").references(() => onTourDay.id, { onDelete: "set null" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    sourcePlanItemId: text("source_plan_item_id").references(() => preTourPlanItem.id, {
      onDelete: "set null",
    }),
    serviceType: text("service_type").notNull(),
    serviceMode: text("service_mode").notNull().default("CORE"),
    chargeBasis: text("charge_basis").notNull().default("FLAT"),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    startAt: timestamp("start_at"),
    endAt: timestamp("end_at"),
    serviceDate: timestamp("service_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    adults: integer("adults").notNull().default(0),
    children: integer("children").notNull().default(0),
    infants: integer("infants").notNull().default(0),
    foc: integer("foc").notNull().default(0),
    totalPax: integer("total_pax").notNull().default(0),
    units: decimal("units", { precision: 10, scale: 2 }),
    nights: integer("nights"),
    currencyCode: text("currency_code").notNull(),
    priceMode: text("price_mode").notNull().default("EXCLUSIVE"),
    quotedBaseAmount: decimal("quoted_base_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotedTaxAmount: decimal("quoted_tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotedTotalAmount: decimal("quoted_total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedBaseAmount: decimal("confirmed_base_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedTaxAmount: decimal("confirmed_tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    confirmedTotalAmount: decimal("confirmed_total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualBaseAmount: decimal("actual_base_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualTaxAmount: decimal("actual_tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualTotalAmount: decimal("actual_total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status").notNull().default("PLANNED"),
    confirmationStatus: text("confirmation_status").notNull().default("UNREQUESTED"),
    confirmationNo: text("confirmation_no"),
    isOptional: boolean("is_optional").notNull().default(false),
    isCancelled: boolean("is_cancelled").notNull().default(false),
    quotationSnapshot: jsonb("quotation_snapshot").$type<Record<string, unknown> | null>(),
    pricingSnapshot: jsonb("pricing_snapshot").$type<Record<string, unknown> | null>(),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedByUserId: text("deleted_by_user_id"),
    deletedByName: text("deleted_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_service_company_code").on(table.companyId, table.code),
    index("idx_on_tour_service_company").on(table.companyId),
    index("idx_on_tour_service_tour").on(table.onTourId),
    index("idx_on_tour_service_day").on(table.dayId),
    index("idx_on_tour_service_group").on(table.groupId),
    index("idx_on_tour_service_type").on(table.serviceType),
    index("idx_on_tour_service_status").on(table.status),
    index("idx_on_tour_service_confirmation_status").on(table.confirmationStatus),
    index("idx_on_tour_service_supplier").on(table.supplierOrgId),
    index("idx_on_tour_service_day_order").on(table.dayId, table.sortOrder),
  ]
);

/**
 * Operational add-ons and extras attached after confirmation.
 */
export const onTourServiceAddon = pgTable(
  "on_tour_service_addon",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => onTourService.id, { onDelete: "cascade" }),
    addonType: text("addon_type").notNull(),
    title: text("title").notNull(),
    qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("PLANNED"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_service_addon_company_code").on(table.companyId, table.code),
    index("idx_on_tour_service_addon_company").on(table.companyId),
    index("idx_on_tour_service_addon_tour").on(table.onTourId),
    index("idx_on_tour_service_addon_service").on(table.serviceId),
  ]
);

/**
 * Operational category snapshot for reporting and servicing context.
 */
export const onTourCategory = pgTable(
  "on_tour_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    typeId: text("type_id")
      .notNull()
      .references(() => tourCategoryType.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => tourCategory.id, { onDelete: "restrict" }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_category_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_category_tour_type_category").on(table.onTourId, table.typeId, table.categoryId),
    index("idx_on_tour_category_company").on(table.companyId),
    index("idx_on_tour_category_tour").on(table.onTourId),
  ]
);

/**
 * Operational technical visit linkage and traceability.
 */
export const onTourTechnicalVisit = pgTable(
  "on_tour_technical_visit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    dayId: text("day_id").references(() => onTourDay.id, { onDelete: "set null" }),
    technicalVisitId: text("technical_visit_id")
      .notNull()
      .references(() => technicalVisit.id, { onDelete: "restrict" }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_technical_visit_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_technical_visit_tour_visit").on(table.onTourId, table.technicalVisitId),
    index("idx_on_tour_technical_visit_company").on(table.companyId),
    index("idx_on_tour_technical_visit_tour").on(table.onTourId),
    index("idx_on_tour_technical_visit_day").on(table.dayId),
  ]
);

/**
 * Confirmed accommodation detail with rooming and confirmation context.
 */
export const onTourAccommodationDetail = pgTable(
  "on_tour_accommodation_detail",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => onTourService.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    quotedHotelId: text("quoted_hotel_id").references(() => hotel.id, { onDelete: "set null" }),
    confirmedHotelId: text("confirmed_hotel_id").references(() => hotel.id, {
      onDelete: "set null",
    }),
    quotedRoomTypeId: text("quoted_room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    confirmedRoomTypeId: text("confirmed_room_type_id").references(() => roomType.id, {
      onDelete: "set null",
    }),
    stayStartDate: timestamp("stay_start_date").notNull(),
    stayEndDate: timestamp("stay_end_date").notNull(),
    nights: integer("nights").notNull(),
    mealPlan: text("meal_plan"),
    occupancyPlan: text("occupancy_plan"),
    roomCount: integer("room_count").notNull().default(0),
    extraBedCount: integer("extra_bed_count").notNull().default(0),
    childBedCount: integer("child_bed_count").notNull().default(0),
    singleRoomCount: integer("single_room_count").notNull().default(0),
    doubleRoomCount: integer("double_room_count").notNull().default(0),
    twinRoomCount: integer("twin_room_count").notNull().default(0),
    tripleRoomCount: integer("triple_room_count").notNull().default(0),
    confirmationStatus: text("confirmation_status").notNull().default("UNREQUESTED"),
    confirmationNo: text("confirmation_no"),
    amendmentNo: integer("amendment_no").notNull().default(0),
    supplierContactName: text("supplier_contact_name"),
    supplierContactPhone: text("supplier_contact_phone"),
    roomingSnapshot: jsonb("rooming_snapshot").$type<Record<string, unknown> | null>(),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_accommodation_detail_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_accommodation_detail_service").on(table.serviceId),
    index("idx_on_tour_accommodation_detail_company").on(table.companyId),
    index("idx_on_tour_accommodation_detail_tour").on(table.onTourId),
    index("idx_on_tour_accommodation_detail_group").on(table.groupId),
    index("idx_on_tour_accommodation_detail_hotel").on(table.confirmedHotelId),
    index("idx_on_tour_accommodation_detail_dates").on(table.stayStartDate, table.stayEndDate),
  ]
);

/**
 * Exact room allocation used for rooming lists and hotel operations.
 */
export const onTourRoomAllocation = pgTable(
  "on_tour_room_allocation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    accommodationDetailId: text("accommodation_detail_id")
      .notNull()
      .references(() => onTourAccommodationDetail.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    roomLabel: text("room_label").notNull(),
    roomTypeId: text("room_type_id").references(() => roomType.id, { onDelete: "set null" }),
    occupancyType: text("occupancy_type").notNull(),
    mealPlan: text("meal_plan"),
    roomNumber: text("room_number"),
    maxAdults: integer("max_adults").notNull().default(0),
    maxChildren: integer("max_children").notNull().default(0),
    adultCount: integer("adult_count").notNull().default(0),
    childCount: integer("child_count").notNull().default(0),
    infantCount: integer("infant_count").notNull().default(0),
    childWithBedCount: integer("child_with_bed_count").notNull().default(0),
    childWithoutBedCount: integer("child_without_bed_count").notNull().default(0),
    extraBedCount: integer("extra_bed_count").notNull().default(0),
    isSingleSupplementApplied: boolean("is_single_supplement_applied").notNull().default(false),
    status: text("status").notNull().default("PLANNED"),
    roomingSnapshot: jsonb("rooming_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_room_allocation_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_room_allocation_detail_room_label").on(
      table.accommodationDetailId,
      table.roomLabel
    ),
    index("idx_on_tour_room_allocation_company").on(table.companyId),
    index("idx_on_tour_room_allocation_tour").on(table.onTourId),
    index("idx_on_tour_room_allocation_detail").on(table.accommodationDetailId),
    index("idx_on_tour_room_allocation_group").on(table.groupId),
  ]
);

/**
 * Traveler-to-room assignment.
 */
export const onTourRoomTraveler = pgTable(
  "on_tour_room_traveler",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    roomAllocationId: text("room_allocation_id")
      .notNull()
      .references(() => onTourRoomAllocation.id, { onDelete: "cascade" }),
    travelerId: text("traveler_id")
      .notNull()
      .references(() => onTourTraveler.id, { onDelete: "cascade" }),
    occupancyRole: text("occupancy_role").notNull().default("PRIMARY"),
    bedType: text("bed_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_room_traveler_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_room_traveler_room_traveler").on(table.roomAllocationId, table.travelerId),
    index("idx_on_tour_room_traveler_company").on(table.companyId),
    index("idx_on_tour_room_traveler_room").on(table.roomAllocationId),
    index("idx_on_tour_room_traveler_traveler").on(table.travelerId),
  ]
);

/**
 * Confirmed transport detail and selected vehicle basis.
 */
export const onTourTransportDetail = pgTable(
  "on_tour_transport_detail",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => onTourService.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    transportType: text("transport_type").notNull(),
    fromLocationId: text("from_location_id").references(() => transportLocation.id, {
      onDelete: "set null",
    }),
    toLocationId: text("to_location_id").references(() => transportLocation.id, {
      onDelete: "set null",
    }),
    pickUpText: text("pick_up_text"),
    dropOffText: text("drop_off_text"),
    departureAt: timestamp("departure_at"),
    arrivalAt: timestamp("arrival_at"),
    distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
    durationMin: integer("duration_min"),
    quotedVehicleCategoryId: text("quoted_vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    suggestedVehicleCategoryId: text("suggested_vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    finalVehicleCategoryId: text("final_vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    finalVehicleTypeId: text("final_vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    luggageUnits: integer("luggage_units").notNull().default(0),
    childSeatCount: integer("child_seat_count").notNull().default(0),
    guideSeatCount: integer("guide_seat_count").notNull().default(0),
    escortSeatCount: integer("escort_seat_count").notNull().default(0),
    seatDemand: integer("seat_demand").notNull().default(0),
    driverSeatExcluded: boolean("driver_seat_excluded").notNull().default(true),
    terrainClass: text("terrain_class"),
    routeConstraints: text("route_constraints"),
    notes: text("notes"),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_transport_detail_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_transport_detail_service").on(table.serviceId),
    index("idx_on_tour_transport_detail_company").on(table.companyId),
    index("idx_on_tour_transport_detail_tour").on(table.onTourId),
    index("idx_on_tour_transport_detail_group").on(table.groupId),
    index("idx_on_tour_transport_detail_transport_type").on(table.transportType),
  ]
);

/**
 * Vehicle requirement and suggested category/type.
 */
export const onTourVehicleRequirement = pgTable(
  "on_tour_vehicle_requirement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => onTourService.id, { onDelete: "cascade" }),
    transportDetailId: text("transport_detail_id")
      .notNull()
      .references(() => onTourTransportDetail.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    passengerCount: integer("passenger_count").notNull().default(0),
    seatedInfantCount: integer("seated_infant_count").notNull().default(0),
    guideSeatCount: integer("guide_seat_count").notNull().default(0),
    escortSeatCount: integer("escort_seat_count").notNull().default(0),
    childSeatCount: integer("child_seat_count").notNull().default(0),
    luggageUnits: integer("luggage_units").notNull().default(0),
    legalSeatDemand: integer("legal_seat_demand").notNull().default(0),
    suggestedVehicleCategoryId: text("suggested_vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    suggestedVehicleTypeId: text("suggested_vehicle_type_id").references(
      () => transportVehicleType.id,
      { onDelete: "set null" }
    ),
    finalVehicleCategoryId: text("final_vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    finalVehicleTypeId: text("final_vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    suggestionReason: text("suggestion_reason"),
    requirementStatus: text("requirement_status").notNull().default("OPEN"),
    selectedByUserId: text("selected_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    selectedAt: timestamp("selected_at"),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_vehicle_requirement_company_code").on(table.companyId, table.code),
    unique("uq_on_tour_vehicle_requirement_service").on(table.serviceId),
    index("idx_on_tour_vehicle_requirement_company").on(table.companyId),
    index("idx_on_tour_vehicle_requirement_tour").on(table.onTourId),
    index("idx_on_tour_vehicle_requirement_transport_detail").on(table.transportDetailId),
    index("idx_on_tour_vehicle_requirement_group").on(table.groupId),
  ]
);

/**
 * Actual vehicle allocation and supplier-side confirmation.
 */
export const onTourVehicleAllocation = pgTable(
  "on_tour_vehicle_allocation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => onTourVehicleRequirement.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => onTourService.id, { onDelete: "cascade" }),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    vehicleCategoryId: text("vehicle_category_id").references(() => transportVehicleCategory.id, {
      onDelete: "set null",
    }),
    vehicleTypeId: text("vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    vehicleRegNo: text("vehicle_reg_no"),
    driverName: text("driver_name"),
    driverPhone: text("driver_phone"),
    allocatedFrom: timestamp("allocated_from"),
    allocatedTo: timestamp("allocated_to"),
    seatCapacity: integer("seat_capacity"),
    baggageCapacity: integer("baggage_capacity"),
    confirmationStatus: text("confirmation_status").notNull().default("UNREQUESTED"),
    confirmationNo: text("confirmation_no"),
    status: text("status").notNull().default("PLANNED"),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_vehicle_allocation_company_code").on(table.companyId, table.code),
    index("idx_on_tour_vehicle_allocation_company").on(table.companyId),
    index("idx_on_tour_vehicle_allocation_tour").on(table.onTourId),
    index("idx_on_tour_vehicle_allocation_requirement").on(table.requirementId),
    index("idx_on_tour_vehicle_allocation_supplier").on(table.supplierOrgId),
  ]
);

/**
 * Operational guide requirement.
 */
export const onTourGuideRequirement = pgTable(
  "on_tour_guide_requirement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    coverageMode: text("coverage_mode").notNull().default("FULL_TOUR"),
    startDayId: text("start_day_id").references(() => onTourDay.id, { onDelete: "set null" }),
    endDayId: text("end_day_id").references(() => onTourDay.id, { onDelete: "set null" }),
    languageId: text("language_id").references(() => guideLanguageMaster.id, {
      onDelete: "set null",
    }),
    guideBasis: text("guide_basis"),
    paxCount: integer("pax_count").notNull().default(0),
    guideSeatConsumesCapacity: boolean("guide_seat_consumes_capacity").notNull().default(true),
    status: text("status").notNull().default("OPEN"),
    notes: text("notes"),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_guide_requirement_company_code").on(table.companyId, table.code),
    index("idx_on_tour_guide_requirement_company").on(table.companyId),
    index("idx_on_tour_guide_requirement_tour").on(table.onTourId),
    index("idx_on_tour_guide_requirement_service").on(table.serviceId),
    index("idx_on_tour_guide_requirement_group").on(table.groupId),
  ]
);

/**
 * Actual guide allocation.
 */
export const onTourGuideAllocation = pgTable(
  "on_tour_guide_allocation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => onTourGuideRequirement.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    guideId: text("guide_id").references(() => guide.id, { onDelete: "set null" }),
    languageId: text("language_id").references(() => guideLanguageMaster.id, {
      onDelete: "set null",
    }),
    allocatedFrom: timestamp("allocated_from"),
    allocatedTo: timestamp("allocated_to"),
    confirmationStatus: text("confirmation_status").notNull().default("UNREQUESTED"),
    confirmationNo: text("confirmation_no"),
    status: text("status").notNull().default("PLANNED"),
    currencyCode: text("currency_code"),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_guide_allocation_company_code").on(table.companyId, table.code),
    index("idx_on_tour_guide_allocation_company").on(table.companyId),
    index("idx_on_tour_guide_allocation_tour").on(table.onTourId),
    index("idx_on_tour_guide_allocation_requirement").on(table.requirementId),
    index("idx_on_tour_guide_allocation_guide").on(table.guideId),
    index("idx_on_tour_guide_allocation_supplier").on(table.supplierOrgId),
  ]
);

/**
 * Fulfilment header for requisitions, service orders, or claims.
 */
export const serviceRequisition = pgTable(
  "service_requisition",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    requisitionNo: text("requisition_no").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    requisitionType: text("requisition_type").notNull().default("REQUISITION"),
    serviceType: text("service_type"),
    status: text("status").notNull().default("DRAFT"),
    requestDate: timestamp("request_date").notNull().defaultNow(),
    requiredAt: timestamp("required_at"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    issuedByUserId: text("issued_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    supplierReferenceNo: text("supplier_reference_no"),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedByUserId: text("deleted_by_user_id"),
    deletedByName: text("deleted_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_service_requisition_company_code").on(table.companyId, table.code),
    unique("uq_service_requisition_company_no").on(table.companyId, table.requisitionNo),
    index("idx_service_requisition_company").on(table.companyId),
    index("idx_service_requisition_tour").on(table.onTourId),
    index("idx_service_requisition_supplier").on(table.supplierOrgId),
    index("idx_service_requisition_status").on(table.status),
  ]
);

/**
 * Line-level requisition to service linkage.
 */
export const serviceRequisitionLine = pgTable(
  "service_requisition_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    requisitionId: text("requisition_id")
      .notNull()
      .references(() => serviceRequisition.id, { onDelete: "cascade" }),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    serviceAddonId: text("service_addon_id").references(() => onTourServiceAddon.id, {
      onDelete: "set null",
    }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    lineNo: integer("line_no").notNull().default(1),
    description: text("description").notNull(),
    serviceDate: timestamp("service_date"),
    qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
    chargeBasis: text("charge_basis"),
    currencyCode: text("currency_code").notNull(),
    unitCost: decimal("unit_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    confirmationStatus: text("confirmation_status").notNull().default("UNREQUESTED"),
    operationalSnapshot: jsonb("operational_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_service_requisition_line_company_code").on(table.companyId, table.code),
    unique("uq_service_requisition_line_req_line_no").on(table.requisitionId, table.lineNo),
    index("idx_service_requisition_line_company").on(table.companyId),
    index("idx_service_requisition_line_requisition").on(table.requisitionId),
    index("idx_service_requisition_line_service").on(table.serviceId),
    index("idx_service_requisition_line_group").on(table.groupId),
  ]
);

/**
 * Supplier-facing voucher issued from confirmed operations.
 */
export const supplierVoucher = pgTable(
  "supplier_voucher",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    voucherNo: text("voucher_no").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    requisitionId: text("requisition_id").references(() => serviceRequisition.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    voucherDate: timestamp("voucher_date").notNull().defaultNow(),
    serviceDate: timestamp("service_date"),
    validUntil: timestamp("valid_until"),
    status: text("status").notNull().default("DRAFT"),
    issuedToName: text("issued_to_name"),
    supplierReferenceNo: text("supplier_reference_no"),
    voucherPayload: jsonb("voucher_payload").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_supplier_voucher_company_code").on(table.companyId, table.code),
    unique("uq_supplier_voucher_company_no").on(table.companyId, table.voucherNo),
    index("idx_supplier_voucher_company").on(table.companyId),
    index("idx_supplier_voucher_tour").on(table.onTourId),
    index("idx_supplier_voucher_requisition").on(table.requisitionId),
    index("idx_supplier_voucher_service").on(table.serviceId),
    index("idx_supplier_voucher_supplier").on(table.supplierOrgId),
  ]
);

/**
 * Customer invoice header for operational receivables.
 */
export const customerInvoice = pgTable(
  "customer_invoice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    invoiceNo: text("invoice_no").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    billToOrgId: text("bill_to_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    invoiceType: text("invoice_type").notNull().default("FINAL"),
    status: text("status").notNull().default("DRAFT"),
    invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
    dueDate: timestamp("due_date"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    fxSnapshot: jsonb("fx_snapshot").$type<Record<string, unknown> | null>(),
    invoiceSnapshot: jsonb("invoice_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_customer_invoice_company_code").on(table.companyId, table.code),
    unique("uq_customer_invoice_company_no").on(table.companyId, table.invoiceNo),
    index("idx_customer_invoice_company").on(table.companyId),
    index("idx_customer_invoice_tour").on(table.onTourId),
    index("idx_customer_invoice_bill_to").on(table.billToOrgId),
    index("idx_customer_invoice_status").on(table.status),
  ]
);

/**
 * Customer invoice line bound to the operational file or service.
 */
export const customerInvoiceLine = pgTable(
  "customer_invoice_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => customerInvoice.id, { onDelete: "cascade" }),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    groupId: text("group_id").references(() => onTourGroup.id, { onDelete: "set null" }),
    lineNo: integer("line_no").notNull().default(1),
    description: text("description").notNull(),
    qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice: decimal("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_customer_invoice_line_company_code").on(table.companyId, table.code),
    unique("uq_customer_invoice_line_invoice_line_no").on(table.invoiceId, table.lineNo),
    index("idx_customer_invoice_line_company").on(table.companyId),
    index("idx_customer_invoice_line_invoice").on(table.invoiceId),
    index("idx_customer_invoice_line_service").on(table.serviceId),
    index("idx_customer_invoice_line_group").on(table.groupId),
  ]
);

/**
 * Supplier bill header for actual payable capture.
 */
export const supplierBill = pgTable(
  "supplier_bill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    billNo: text("bill_no").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    supplierOrgId: text("supplier_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("DRAFT"),
    billDate: timestamp("bill_date").notNull().defaultNow(),
    dueDate: timestamp("due_date"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    supplierPayload: jsonb("supplier_payload").$type<Record<string, unknown> | null>(),
    fxSnapshot: jsonb("fx_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_supplier_bill_company_code").on(table.companyId, table.code),
    unique("uq_supplier_bill_company_no").on(table.companyId, table.billNo),
    index("idx_supplier_bill_company").on(table.companyId),
    index("idx_supplier_bill_tour").on(table.onTourId),
    index("idx_supplier_bill_supplier").on(table.supplierOrgId),
    index("idx_supplier_bill_status").on(table.status),
  ]
);

/**
 * Supplier bill line matching to services and fulfilment documents.
 */
export const supplierBillLine = pgTable(
  "supplier_bill_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    billId: text("bill_id")
      .notNull()
      .references(() => supplierBill.id, { onDelete: "cascade" }),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    requisitionLineId: text("requisition_line_id").references(() => serviceRequisitionLine.id, {
      onDelete: "set null",
    }),
    voucherId: text("voucher_id").references(() => supplierVoucher.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id").references(() => onTourService.id, { onDelete: "set null" }),
    lineNo: integer("line_no").notNull().default(1),
    description: text("description").notNull(),
    qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
    unitCost: decimal("unit_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_supplier_bill_line_company_code").on(table.companyId, table.code),
    unique("uq_supplier_bill_line_bill_line_no").on(table.billId, table.lineNo),
    index("idx_supplier_bill_line_company").on(table.companyId),
    index("idx_supplier_bill_line_bill").on(table.billId),
    index("idx_supplier_bill_line_requisition_line").on(table.requisitionLineId),
    index("idx_supplier_bill_line_voucher").on(table.voucherId),
    index("idx_supplier_bill_line_service").on(table.serviceId),
  ]
);

/**
 * Point-in-time reconciliation snapshot for margin control.
 */
export const onTourCostReconciliation = pgTable(
  "on_tour_cost_reconciliation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    onTourId: text("on_tour_id")
      .notNull()
      .references(() => onTour.id, { onDelete: "cascade" }),
    asOfAt: timestamp("as_of_at").notNull().defaultNow(),
    quotedRevenue: decimal("quoted_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
    invoicedRevenue: decimal("invoiced_revenue", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    collectedRevenue: decimal("collected_revenue", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    quotedCost: decimal("quoted_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    confirmedCost: decimal("confirmed_cost", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualCost: decimal("actual_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    billedCost: decimal("billed_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    quotedMargin: decimal("quoted_margin", { precision: 14, scale: 2 }).notNull().default("0"),
    actualMargin: decimal("actual_margin", { precision: 14, scale: 2 }).notNull().default("0"),
    fxSnapshot: jsonb("fx_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_on_tour_cost_reconciliation_company_code").on(table.companyId, table.code),
    index("idx_on_tour_cost_reconciliation_company").on(table.companyId),
    index("idx_on_tour_cost_reconciliation_tour").on(table.onTourId),
    index("idx_on_tour_cost_reconciliation_as_of").on(table.asOfAt),
  ]
);
