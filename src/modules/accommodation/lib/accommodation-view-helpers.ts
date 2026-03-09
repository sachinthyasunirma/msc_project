"use client";

import type {
  Availability,
  Hotel,
  HotelImage,
  RoomRate,
  RoomRateHeader,
  RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import type { SeasonOption } from "@/modules/season/lib/season-api";

export type DialogMode = "create" | "edit";

export type HotelFormState = {
  code: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  starRating: number;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

export type RoomTypeFormState = {
  code: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  size: string;
  amenitiesRaw: string;
  totalRooms: number;
  availableRooms: number;
  isActive: boolean;
};

export type RoomRateFormState = {
  code: string;
  roomRateHeaderId: string;
  roomTypeId: string;
  roomCategory: string;
  roomBasis: string;
  baseRatePerNight: number;
  isActive: boolean;
};

export type RoomRateHeaderFormState = {
  code: string;
  name: string;
  seasonId: string;
  currency: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
};

export type AvailabilityFormState = {
  code: string;
  roomTypeId: string;
  date: string;
  availableRooms: number;
  bookedRooms: number;
  isBlocked: boolean;
  blockReason: string;
};

export type ImageFormState = {
  code: string;
  imageUrl: string;
  caption: string;
  isPrimary: boolean;
  order: number;
};

export type SeasonFormState = {
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

export function getInitialHotelForm(row: Hotel | null = null): HotelFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    address: row?.address ?? "",
    city: row?.city ?? "",
    country: row?.country ?? "",
    starRating: row?.starRating ?? 3,
    contactEmail: row?.contactEmail ?? "",
    contactPhone: row?.contactPhone ?? "",
    isActive: row?.isActive ?? true,
  };
}

export function getInitialRoomTypeForm(row: RoomType | null = null): RoomTypeFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    maxOccupancy: row?.maxOccupancy ?? 2,
    bedType: row?.bedType ?? "",
    size: row?.size ?? "",
    amenitiesRaw: row?.amenities?.join(", ") ?? "",
    totalRooms: row?.totalRooms ?? 10,
    availableRooms: row?.availableRooms ?? 10,
    isActive: row?.isActive ?? true,
  };
}

export function getInitialRoomRateForm(
  row: RoomRate | null = null,
  activeRoomRateHeaderId: string | null = null,
  defaultRoomTypeId = ""
): RoomRateFormState {
  return {
    code: row?.code ?? "",
    roomRateHeaderId: row?.roomRateHeaderId ?? activeRoomRateHeaderId ?? "",
    roomTypeId: row?.roomTypeId ?? defaultRoomTypeId,
    roomCategory: row?.roomCategory ?? "Standard",
    roomBasis: row?.roomBasis ?? "HB",
    baseRatePerNight: row ? Number(row.baseRatePerNight) : 0,
    isActive: row?.isActive ?? true,
  };
}

export function getInitialRoomRateHeaderForm(
  row: RoomRateHeader | null = null
): RoomRateHeaderFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    seasonId: row?.seasonId ?? "",
    currency: row?.currency ?? "USD",
    validFrom: row?.validFrom ?? "",
    validTo: row?.validTo ?? "",
    isActive: row?.isActive ?? true,
  };
}

export function getInitialAvailabilityForm(
  row: Availability | null = null,
  defaultRoomTypeId = ""
): AvailabilityFormState {
  return {
    code: row?.code ?? "",
    roomTypeId: row?.roomTypeId ?? defaultRoomTypeId,
    date: row?.date ?? "",
    availableRooms: row?.availableRooms ?? 0,
    bookedRooms: row?.bookedRooms ?? 0,
    isBlocked: row?.isBlocked ?? false,
    blockReason: row?.blockReason ?? "",
  };
}

export function getInitialImageForm(row: HotelImage | null = null): ImageFormState {
  return {
    code: row?.code ?? "",
    imageUrl: row?.imageUrl ?? "",
    caption: row?.caption ?? "",
    isPrimary: row?.isPrimary ?? false,
    order: row?.order ?? 0,
  };
}

export function getInitialSeasonForm(row: SeasonOption | null = null): SeasonFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    startDate: row?.startDate ?? "",
    endDate: row?.endDate ?? "",
  };
}
