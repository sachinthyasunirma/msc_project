type HotelListQueryInput = {
  q?: string;
  isActive?: string;
  city?: string;
  country?: string;
  cursor?: string | null;
  limit?: number;
};

export const accommodationKeys = {
  all: ["accommodation"] as const,
  hotels: () => [...accommodationKeys.all, "hotels"] as const,
  hotelLists: () => [...accommodationKeys.hotels(), "list"] as const,
  hotelList: (input: HotelListQueryInput) =>
    [
      ...accommodationKeys.hotelLists(),
      {
        q: input.q ?? "",
        isActive: input.isActive ?? "all",
        city: input.city ?? "",
        country: input.country ?? "",
        cursor: input.cursor ?? null,
        limit: input.limit ?? 15,
      },
    ] as const,
  hotelCodes: () => [...accommodationKeys.hotels(), "codes"] as const,
  hotelDetails: () => [...accommodationKeys.hotels(), "detail"] as const,
  hotelDetail: (hotelId: string) => [...accommodationKeys.hotelDetails(), hotelId] as const,
  hotelRoomTypes: (hotelId: string) =>
    [...accommodationKeys.hotelDetail(hotelId), "room-types"] as const,
  hotelAvailability: (hotelId: string) =>
    [...accommodationKeys.hotelDetail(hotelId), "availability"] as const,
  hotelContracting: (hotelId: string) =>
    [...accommodationKeys.hotelDetail(hotelId), "contracting"] as const,
  seasonOptions: () => [...accommodationKeys.all, "season-options"] as const,
  supplierOrganizations: () => [...accommodationKeys.all, "supplier-organizations"] as const,
};

export function buildHotelListParams(input: HotelListQueryInput) {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 15));

  if (input.q) params.set("q", input.q);
  if (input.isActive && input.isActive !== "all") params.set("isActive", input.isActive);
  if (input.city) params.set("city", input.city);
  if (input.country) params.set("country", input.country);
  if (input.cursor) params.set("cursor", input.cursor);

  return params;
}
