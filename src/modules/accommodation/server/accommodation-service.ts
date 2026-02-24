import { and, asc, desc, eq, ilike, lt, or, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createAvailabilitySchema,
  createHotelImageSchema,
  createHotelSchema,
  createRoomRateSchema,
  createRoomTypeSchema,
  cursorSchema,
  hotelListQuerySchema,
  nestedListQuerySchema,
  updateAvailabilitySchema,
  updateHotelImageSchema,
  updateHotelSchema,
  updateRoomRateSchema,
  updateRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";

class AccommodationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toPrice(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(2);
}

function parseCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const decoded = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    );
    return {
      createdAt: new Date(decoded.createdAt),
      id: decoded.id,
    };
  } catch {
    throw new AccommodationError(400, "INVALID_CURSOR", "Invalid pagination cursor.");
  }
}

function buildCursor(row: { createdAt: Date; id: string }) {
  return Buffer.from(
    JSON.stringify({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
    "utf8"
  ).toString("base64url");
}

async function getCompanyId(requestHeaders: Headers) {
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  if (!session?.user) {
    throw new AccommodationError(401, "UNAUTHORIZED", "You are not authenticated.");
  }
  const companyId = (session.user as { companyId?: string }).companyId;
  if (!companyId) {
    throw new AccommodationError(
      403,
      "COMPANY_REQUIRED",
      "User is not linked to a company."
    );
  }
  return companyId;
}

async function ensureHotelOwned(companyId: string, hotelId: string) {
  const [hotel] = await db
    .select({ id: schema.hotel.id })
    .from(schema.hotel)
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!hotel) {
    throw new AccommodationError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
}

async function ensureRoomTypeInHotel(hotelId: string, roomTypeId: string) {
  const [roomType] = await db
    .select({ id: schema.roomType.id })
    .from(schema.roomType)
    .where(and(eq(schema.roomType.id, roomTypeId), eq(schema.roomType.hotelId, hotelId)))
    .limit(1);

  if (!roomType) {
    throw new AccommodationError(
      400,
      "ROOM_TYPE_MISMATCH",
      "Room type does not belong to this hotel."
    );
  }
}

export async function listHotels(searchParams: URLSearchParams, headers: Headers) {
  const parsed = hotelListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const query = parsed.data;
  if (
    typeof query.minStar === "number" &&
    typeof query.maxStar === "number" &&
    query.minStar > query.maxStar
  ) {
    throw new AccommodationError(
      400,
      "INVALID_RANGE",
      "Minimum star rating cannot be greater than maximum star rating."
    );
  }

  const companyId = await getCompanyId(headers);
  const cursor = parseCursor(query.cursor);
  const clauses: SQL[] = [eq(schema.hotel.companyId, companyId)];

  if (query.isActive) {
    clauses.push(eq(schema.hotel.isActive, query.isActive === "true"));
  }
  if (query.city) {
    clauses.push(ilike(schema.hotel.city, `%${query.city}%`));
  }
  if (query.country) {
    clauses.push(ilike(schema.hotel.country, `%${query.country}%`));
  }
  if (typeof query.minStar === "number") {
    clauses.push(sql`${schema.hotel.starRating} >= ${query.minStar}`);
  }
  if (typeof query.maxStar === "number") {
    clauses.push(sql`${schema.hotel.starRating} <= ${query.maxStar}`);
  }
  if (query.q) {
    const term = `%${query.q}%`;
    clauses.push(
      or(
        ilike(schema.hotel.name, term),
        ilike(schema.hotel.city, term),
        ilike(schema.hotel.country, term),
        ilike(schema.hotel.address, term)
      )!
    );
  }
  if (cursor) {
    clauses.push(
      or(
        lt(schema.hotel.createdAt, cursor.createdAt),
        and(eq(schema.hotel.createdAt, cursor.createdAt), lt(schema.hotel.id, cursor.id))
      )!
    );
  }

  const rows = await db
    .select()
    .from(schema.hotel)
    .where(and(...clauses))
    .orderBy(desc(schema.hotel.createdAt), desc(schema.hotel.id))
    .limit(query.limit + 1);

  const hasNext = rows.length > query.limit;
  const items = hasNext ? rows.slice(0, query.limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasNext && last ? buildCursor(last) : null,
    hasNext,
    limit: query.limit,
  };
}

export async function createHotel(payload: unknown, headers: Headers) {
  const parsed = createHotelSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  const [created] = await db
    .insert(schema.hotel)
    .values({
      ...parsed.data,
      companyId,
    })
    .returning();
  return created;
}

export async function updateHotel(hotelId: string, payload: unknown, headers: Headers) {
  const parsed = updateHotelSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  const [updated] = await db
    .update(schema.hotel)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .returning();

  if (!updated) {
    throw new AccommodationError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
  return updated;
}

export async function getHotelById(hotelId: string, headers: Headers) {
  const companyId = await getCompanyId(headers);
  const [hotel] = await db
    .select()
    .from(schema.hotel)
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!hotel) {
    throw new AccommodationError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
  return hotel;
}

export async function deleteHotel(hotelId: string, headers: Headers) {
  const companyId = await getCompanyId(headers);
  const [deleted] = await db
    .delete(schema.hotel)
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .returning({ id: schema.hotel.id });
  if (!deleted) {
    throw new AccommodationError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
}

export async function listRoomTypes(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const parsed = nestedListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const term = parsed.data.q ? `%${parsed.data.q}%` : null;

  return db
    .select()
    .from(schema.roomType)
    .where(
      and(
        eq(schema.roomType.hotelId, hotelId),
        term
          ? or(
              ilike(schema.roomType.name, term),
              ilike(schema.roomType.bedType, term),
              ilike(schema.roomType.description, term)
            )
          : undefined
      )
    )
    .orderBy(desc(schema.roomType.createdAt))
    .limit(parsed.data.limit);
}

export async function createRoomType(
  hotelId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = createRoomTypeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [created] = await db
    .insert(schema.roomType)
    .values({
      ...parsed.data,
      hotelId,
    })
    .returning();
  return created;
}

export async function updateRoomType(
  hotelId: string,
  roomTypeId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = updateRoomTypeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [updated] = await db
    .update(schema.roomType)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.roomType.id, roomTypeId), eq(schema.roomType.hotelId, hotelId)))
    .returning();

  if (!updated) {
    throw new AccommodationError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found.");
  }
  return updated;
}

export async function deleteRoomType(
  hotelId: string,
  roomTypeId: string,
  headers: Headers
) {
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [deleted] = await db
    .delete(schema.roomType)
    .where(and(eq(schema.roomType.id, roomTypeId), eq(schema.roomType.hotelId, hotelId)))
    .returning({ id: schema.roomType.id });
  if (!deleted) {
    throw new AccommodationError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found.");
  }
}

export async function listRoomRates(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const parsed = nestedListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const term = parsed.data.q ? `%${parsed.data.q}%` : null;

  return db
    .select({
      id: schema.roomRate.id,
      hotelId: schema.roomRate.hotelId,
      roomTypeId: schema.roomRate.roomTypeId,
      roomTypeName: schema.roomType.name,
      seasonId: schema.roomRate.seasonId,
      seasonName: schema.season.name,
      baseRatePerNight: schema.roomRate.baseRatePerNight,
      seasonMultiplier: schema.roomRate.seasonMultiplier,
      finalRatePerNight: schema.roomRate.finalRatePerNight,
      currency: schema.roomRate.currency,
      isActive: schema.roomRate.isActive,
      validFrom: schema.roomRate.validFrom,
      validTo: schema.roomRate.validTo,
      createdAt: schema.roomRate.createdAt,
      updatedAt: schema.roomRate.updatedAt,
    })
    .from(schema.roomRate)
    .innerJoin(schema.roomType, eq(schema.roomType.id, schema.roomRate.roomTypeId))
    .leftJoin(schema.season, eq(schema.season.id, schema.roomRate.seasonId))
    .where(
      and(
        eq(schema.roomRate.hotelId, hotelId),
        term
          ? or(ilike(schema.roomType.name, term), ilike(schema.season.name, term))
          : undefined
      )
    )
    .orderBy(desc(schema.roomRate.createdAt))
    .limit(parsed.data.limit);
}

export async function createRoomRate(
  hotelId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = createRoomRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  await ensureRoomTypeInHotel(hotelId, parsed.data.roomTypeId);

  if (parsed.data.seasonId) {
    const [season] = await db
      .select({ id: schema.season.id })
      .from(schema.season)
      .where(
        and(
          eq(schema.season.id, parsed.data.seasonId),
          eq(schema.season.companyId, companyId)
        )
      )
      .limit(1);
    if (!season) {
      throw new AccommodationError(400, "SEASON_NOT_FOUND", "Season not found.");
    }
  }

  const finalRate = parsed.data.baseRatePerNight * parsed.data.seasonMultiplier;
  const [created] = await db
    .insert(schema.roomRate)
    .values({
      ...parsed.data,
      hotelId,
      baseRatePerNight: toPrice(parsed.data.baseRatePerNight),
      seasonMultiplier: toPrice(parsed.data.seasonMultiplier),
      finalRatePerNight: toPrice(finalRate),
    })
    .returning();
  return created;
}

export async function updateRoomRate(
  hotelId: string,
  roomRateId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = updateRoomRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  const [current] = await db
    .select()
    .from(schema.roomRate)
    .where(and(eq(schema.roomRate.id, roomRateId), eq(schema.roomRate.hotelId, hotelId)))
    .limit(1);
  if (!current) {
    throw new AccommodationError(404, "ROOM_RATE_NOT_FOUND", "Room rate not found.");
  }

  if (parsed.data.roomTypeId) {
    await ensureRoomTypeInHotel(hotelId, parsed.data.roomTypeId);
  }
  if (parsed.data.seasonId) {
    const [season] = await db
      .select({ id: schema.season.id })
      .from(schema.season)
      .where(
        and(eq(schema.season.id, parsed.data.seasonId), eq(schema.season.companyId, companyId))
      )
      .limit(1);
    if (!season) {
      throw new AccommodationError(400, "SEASON_NOT_FOUND", "Season not found.");
    }
  }

  const baseRate = parsed.data.baseRatePerNight ?? Number(current.baseRatePerNight);
  const multiplier = parsed.data.seasonMultiplier ?? Number(current.seasonMultiplier);
  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
    finalRatePerNight: toPrice(baseRate * multiplier),
  };
  if (parsed.data.baseRatePerNight !== undefined) {
    updatePayload.baseRatePerNight = toPrice(parsed.data.baseRatePerNight);
  }
  if (parsed.data.seasonMultiplier !== undefined) {
    updatePayload.seasonMultiplier = toPrice(parsed.data.seasonMultiplier);
  }

  const [updated] = await db
    .update(schema.roomRate)
    .set(updatePayload)
    .where(and(eq(schema.roomRate.id, roomRateId), eq(schema.roomRate.hotelId, hotelId)))
    .returning();
  if (!updated) {
    throw new AccommodationError(404, "ROOM_RATE_NOT_FOUND", "Room rate not found.");
  }
  return updated;
}

export async function deleteRoomRate(
  hotelId: string,
  roomRateId: string,
  headers: Headers
) {
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [deleted] = await db
    .delete(schema.roomRate)
    .where(and(eq(schema.roomRate.id, roomRateId), eq(schema.roomRate.hotelId, hotelId)))
    .returning({ id: schema.roomRate.id });
  if (!deleted) {
    throw new AccommodationError(404, "ROOM_RATE_NOT_FOUND", "Room rate not found.");
  }
}

export async function listAvailability(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const parsed = nestedListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const term = parsed.data.q ? `%${parsed.data.q}%` : null;

  return db
    .select({
      id: schema.availability.id,
      hotelId: schema.availability.hotelId,
      roomTypeId: schema.availability.roomTypeId,
      roomTypeName: schema.roomType.name,
      date: schema.availability.date,
      availableRooms: schema.availability.availableRooms,
      bookedRooms: schema.availability.bookedRooms,
      isBlocked: schema.availability.isBlocked,
      blockReason: schema.availability.blockReason,
      createdAt: schema.availability.createdAt,
      updatedAt: schema.availability.updatedAt,
    })
    .from(schema.availability)
    .innerJoin(schema.roomType, eq(schema.roomType.id, schema.availability.roomTypeId))
    .where(
      and(
        eq(schema.availability.hotelId, hotelId),
        term ? ilike(schema.roomType.name, term) : undefined
      )
    )
    .orderBy(desc(schema.availability.date))
    .limit(parsed.data.limit);
}

export async function createAvailability(
  hotelId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = createAvailabilitySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  await ensureRoomTypeInHotel(hotelId, parsed.data.roomTypeId);

  const [created] = await db
    .insert(schema.availability)
    .values({
      ...parsed.data,
      hotelId,
    })
    .returning();
  return created;
}

export async function updateAvailability(
  hotelId: string,
  availabilityId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = updateAvailabilitySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  if (parsed.data.roomTypeId) {
    await ensureRoomTypeInHotel(hotelId, parsed.data.roomTypeId);
  }

  const [updated] = await db
    .update(schema.availability)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.availability.id, availabilityId),
        eq(schema.availability.hotelId, hotelId)
      )
    )
    .returning();
  if (!updated) {
    throw new AccommodationError(
      404,
      "AVAILABILITY_NOT_FOUND",
      "Availability record not found."
    );
  }
  return updated;
}

export async function deleteAvailability(
  hotelId: string,
  availabilityId: string,
  headers: Headers
) {
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [deleted] = await db
    .delete(schema.availability)
    .where(
      and(
        eq(schema.availability.id, availabilityId),
        eq(schema.availability.hotelId, hotelId)
      )
    )
    .returning({ id: schema.availability.id });
  if (!deleted) {
    throw new AccommodationError(
      404,
      "AVAILABILITY_NOT_FOUND",
      "Availability record not found."
    );
  }
}

export async function listHotelImages(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const parsed = nestedListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const term = parsed.data.q ? `%${parsed.data.q}%` : null;

  return db
    .select()
    .from(schema.hotelImage)
    .where(
      and(
        eq(schema.hotelImage.hotelId, hotelId),
        term ? ilike(schema.hotelImage.caption, term) : undefined
      )
    )
    .orderBy(desc(schema.hotelImage.isPrimary), asc(schema.hotelImage.order))
    .limit(parsed.data.limit);
}

export async function createHotelImage(
  hotelId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = createHotelImageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  if (parsed.data.isPrimary) {
    await db
      .update(schema.hotelImage)
      .set({ isPrimary: false })
      .where(eq(schema.hotelImage.hotelId, hotelId));
  }

  const [created] = await db
    .insert(schema.hotelImage)
    .values({
      ...parsed.data,
      hotelId,
    })
    .returning();
  return created;
}

export async function updateHotelImage(
  hotelId: string,
  imageId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = updateHotelImageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  if (parsed.data.isPrimary) {
    await db
      .update(schema.hotelImage)
      .set({ isPrimary: false })
      .where(eq(schema.hotelImage.hotelId, hotelId));
  }

  const [updated] = await db
    .update(schema.hotelImage)
    .set(parsed.data)
    .where(and(eq(schema.hotelImage.id, imageId), eq(schema.hotelImage.hotelId, hotelId)))
    .returning();

  if (!updated) {
    throw new AccommodationError(404, "IMAGE_NOT_FOUND", "Image record not found.");
  }
  return updated;
}

export async function deleteHotelImage(
  hotelId: string,
  imageId: string,
  headers: Headers
) {
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);
  const [deleted] = await db
    .delete(schema.hotelImage)
    .where(and(eq(schema.hotelImage.id, imageId), eq(schema.hotelImage.hotelId, hotelId)))
    .returning({ id: schema.hotelImage.id });
  if (!deleted) {
    throw new AccommodationError(404, "IMAGE_NOT_FOUND", "Image record not found.");
  }
}

export function toAccommodationErrorResponse(error: unknown) {
  if (error instanceof AccommodationError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate key")) {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "Record already exists for given unique fields.",
        },
      };
    }
    if (message.includes("violates foreign key")) {
      return {
        status: 400,
        body: {
          code: "FOREIGN_KEY_ERROR",
          message: "Invalid relation provided.",
        },
      };
    }
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}
