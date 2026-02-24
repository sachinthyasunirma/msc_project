"use client";

type ApiError = { message?: string };

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiError;
    throw new Error(body.message || fallback);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallback);
  }
}

export type Hotel = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  starRating: number;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type RoomType = {
  id: string;
  hotelId: string;
  name: string;
  description: string | null;
  maxOccupancy: number;
  bedType: string;
  size: string | null;
  amenities: string[] | null;
  totalRooms: number;
  availableRooms: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoomRate = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  seasonId: string | null;
  seasonName: string | null;
  baseRatePerNight: string;
  seasonMultiplier: string;
  finalRatePerNight: string;
  currency: string;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  createdAt: string;
  updatedAt: string;
};

export type Availability = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  availableRooms: number;
  bookedRooms: number;
  isBlocked: boolean;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HotelImage = {
  id: string;
  hotelId: string;
  imageUrl: string;
  caption: string | null;
  isPrimary: boolean;
  order: number;
  createdAt: string;
};

export async function listHotels(params: URLSearchParams) {
  const response = await fetch(`/api/accommodation/hotels?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) await readError(response, "Failed to load hotels.");
  return response.json() as Promise<{
    items: Hotel[];
    nextCursor: string | null;
    hasNext: boolean;
    limit: number;
  }>;
}

export async function createHotel(payload: unknown) {
  const response = await fetch("/api/accommodation/hotels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create hotel.");
  return response.json() as Promise<Hotel>;
}

export async function updateHotel(hotelId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update hotel.");
  return response.json() as Promise<Hotel>;
}

export async function getHotel(hotelId: string) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}`, {
    cache: "no-store",
  });
  if (!response.ok) await readError(response, "Failed to load hotel.");
  return response.json() as Promise<Hotel>;
}

export async function deleteHotel(hotelId: string) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete hotel.");
}

async function listNested<T>(path: string, q?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", "100");
  const response = await fetch(`${path}?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) await readError(response, "Failed to load records.");
  return response.json() as Promise<T[]>;
}

export const listRoomTypes = (hotelId: string, q?: string) =>
  listNested<RoomType>(`/api/accommodation/hotels/${hotelId}/room-types`, q);

export const createRoomType = async (hotelId: string, payload: unknown) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/room-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create room type.");
  return response.json() as Promise<RoomType>;
};

export const updateRoomType = async (
  hotelId: string,
  roomTypeId: string,
  payload: unknown
) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/room-types/${roomTypeId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) await readError(response, "Failed to update room type.");
  return response.json() as Promise<RoomType>;
};

export const deleteRoomType = async (hotelId: string, roomTypeId: string) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/room-types/${roomTypeId}`,
    { method: "DELETE" }
  );
  if (!response.ok) await readError(response, "Failed to delete room type.");
};

export const listRoomRates = (hotelId: string, q?: string) =>
  listNested<RoomRate>(`/api/accommodation/hotels/${hotelId}/room-rates`, q);

export const createRoomRate = async (hotelId: string, payload: unknown) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/room-rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create room rate.");
  return response.json() as Promise<RoomRate>;
};

export const updateRoomRate = async (
  hotelId: string,
  roomRateId: string,
  payload: unknown
) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/room-rates/${roomRateId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) await readError(response, "Failed to update room rate.");
  return response.json() as Promise<RoomRate>;
};

export const deleteRoomRate = async (hotelId: string, roomRateId: string) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/room-rates/${roomRateId}`,
    { method: "DELETE" }
  );
  if (!response.ok) await readError(response, "Failed to delete room rate.");
};

export const listAvailability = (hotelId: string, q?: string) =>
  listNested<Availability>(`/api/accommodation/hotels/${hotelId}/availability`, q);

export const createAvailability = async (hotelId: string, payload: unknown) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create availability.");
  return response.json() as Promise<Availability>;
};

export const updateAvailability = async (
  hotelId: string,
  availabilityId: string,
  payload: unknown
) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/availability/${availabilityId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) await readError(response, "Failed to update availability.");
  return response.json() as Promise<Availability>;
};

export const deleteAvailability = async (hotelId: string, availabilityId: string) => {
  const response = await fetch(
    `/api/accommodation/hotels/${hotelId}/availability/${availabilityId}`,
    { method: "DELETE" }
  );
  if (!response.ok) await readError(response, "Failed to delete availability.");
};

export const listHotelImages = (hotelId: string, q?: string) =>
  listNested<HotelImage>(`/api/accommodation/hotels/${hotelId}/images`, q);

export const createHotelImage = async (hotelId: string, payload: unknown) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create hotel image.");
  return response.json() as Promise<HotelImage>;
};

export const updateHotelImage = async (
  hotelId: string,
  imageId: string,
  payload: unknown
) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/images/${imageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update hotel image.");
  return response.json() as Promise<HotelImage>;
};

export const deleteHotelImage = async (hotelId: string, imageId: string) => {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/images/${imageId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete hotel image.");
};
