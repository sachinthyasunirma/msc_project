import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  index,
  decimal,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { season } from "@/db/schemas/season";
import { company } from "@/db/schemas/company";

export const hotel = pgTable(
  "hotel",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),

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
      table.validFrom,
      table.validTo,
      table.isActive
    ),
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
  ]
);

export const hotelImage = pgTable("hotel_image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  hotelId: text("hotel_id")
    .notNull()
    .references(() => hotel.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isPrimary: boolean("is_primary").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cancellationPolicy = pgTable("cancellation_policy", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  hotelId: text("hotel_id")
    .notNull()
    .references(() => hotel.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // Cancellation window in days before check-in
  cancellationWindowDays: integer("cancellation_window_days").notNull(),
  // Percentage refund based on cancellation timing
  refundPercentage: integer("refund_percentage").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
