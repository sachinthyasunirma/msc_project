import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { loadHotelContractingBundle } from "@/modules/accommodation/server/accommodation-contracting-service";
import type { AccommodationContractingViewData } from "@/modules/accommodation/shared/accommodation-contracting-types";

export async function loadAccommodationContractingData(
  hotelId: string,
  requestHeaders: Headers
): Promise<AccommodationContractingViewData> {
  const access = await resolveAccess(requestHeaders, {
    requiredPrivilege: "SCREEN_MASTER_ACCOMMODATIONS",
  });

  const [selectedHotel, roomTypes, contracting] = await Promise.all([
    db
      .select({
        id: schema.hotel.id,
        code: schema.hotel.code,
        name: schema.hotel.name,
        city: schema.hotel.city,
        country: schema.hotel.country,
        isActive: schema.hotel.isActive,
      })
      .from(schema.hotel)
      .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, access.companyId)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: schema.roomType.id,
        code: schema.roomType.code,
        name: schema.roomType.name,
        maxOccupancy: schema.roomType.maxOccupancy,
        totalRooms: schema.roomType.totalRooms,
        isActive: schema.roomType.isActive,
      })
      .from(schema.roomType)
      .innerJoin(schema.hotel, eq(schema.hotel.id, schema.roomType.hotelId))
      .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, access.companyId))),
    loadHotelContractingBundle(hotelId, requestHeaders),
  ]);

  if (!selectedHotel) {
    throw new AccessControlError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }

  return {
    selectedHotel,
    roomTypes,
    contracting,
  };
}
