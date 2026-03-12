"use client";

import type {
  AccommodationContractingViewData,
  HotelCancellationPolicyRecord,
  HotelCancellationPolicyRuleRecord,
  HotelContractRecord,
  HotelFeeRuleRecord,
  HotelInventoryDayRecord,
  HotelRateRestrictionRecord,
  HotelRoomRateRecord,
  HotelRatePlanRecord,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

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

export async function getAccommodationContractingBundle(hotelId: string) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/contracting`, {
    cache: "no-store",
  });
  if (!response.ok) await readError(response, "Failed to load hotel contracting data.");
  return response.json() as Promise<AccommodationContractingViewData>;
}

export async function createAccommodationHotelContract(hotelId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create hotel contract.");
  return response.json() as Promise<HotelContractRecord>;
}

export async function updateAccommodationHotelContract(contractId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/contracts/${contractId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update hotel contract.");
  return response.json() as Promise<HotelContractRecord>;
}

export async function deleteAccommodationHotelContract(contractId: string) {
  const response = await fetch(`/api/accommodation/contracts/${contractId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete hotel contract.");
}

export async function createAccommodationRatePlan(contractId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/contracts/${contractId}/rate-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create rate plan.");
  return response.json() as Promise<HotelRatePlanRecord>;
}

export async function updateAccommodationRatePlan(ratePlanId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/rate-plans/${ratePlanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update rate plan.");
  return response.json() as Promise<HotelRatePlanRecord>;
}

export async function deleteAccommodationRatePlan(ratePlanId: string) {
  const response = await fetch(`/api/accommodation/rate-plans/${ratePlanId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete rate plan.");
}

export async function createAccommodationRoomRate(ratePlanId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/rate-plans/${ratePlanId}/room-rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create room rate.");
  return response.json() as Promise<HotelRoomRateRecord>;
}

export async function updateAccommodationRoomRate(roomRateId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/room-rates/${roomRateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update room rate.");
  return response.json() as Promise<HotelRoomRateRecord>;
}

export async function deleteAccommodationRoomRate(roomRateId: string) {
  const response = await fetch(`/api/accommodation/room-rates/${roomRateId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete room rate.");
}

export async function createAccommodationRateRestriction(ratePlanId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/rate-plans/${ratePlanId}/restrictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create restriction.");
  return response.json() as Promise<HotelRateRestrictionRecord>;
}

export async function updateAccommodationRateRestriction(restrictionId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/restrictions/${restrictionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update restriction.");
  return response.json() as Promise<HotelRateRestrictionRecord>;
}

export async function deleteAccommodationRateRestriction(restrictionId: string) {
  const response = await fetch(`/api/accommodation/restrictions/${restrictionId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete restriction.");
}

export async function createAccommodationFeeRule(ratePlanId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/rate-plans/${ratePlanId}/fee-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create fee rule.");
  return response.json() as Promise<HotelFeeRuleRecord>;
}

export async function updateAccommodationFeeRule(feeRuleId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/fee-rules/${feeRuleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update fee rule.");
  return response.json() as Promise<HotelFeeRuleRecord>;
}

export async function deleteAccommodationFeeRule(feeRuleId: string) {
  const response = await fetch(`/api/accommodation/fee-rules/${feeRuleId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete fee rule.");
}

export async function createAccommodationCancellationPolicy(hotelId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/cancellation-policies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create cancellation policy.");
  return response.json() as Promise<HotelCancellationPolicyRecord>;
}

export async function updateAccommodationCancellationPolicy(policyId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/cancellation-policies/${policyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update cancellation policy.");
  return response.json() as Promise<HotelCancellationPolicyRecord>;
}

export async function deleteAccommodationCancellationPolicy(policyId: string) {
  const response = await fetch(`/api/accommodation/cancellation-policies/${policyId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete cancellation policy.");
}

export async function createAccommodationCancellationPolicyRule(policyId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/cancellation-policies/${policyId}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create cancellation rule.");
  return response.json() as Promise<HotelCancellationPolicyRuleRecord>;
}

export async function updateAccommodationCancellationPolicyRule(ruleId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/cancellation-policy-rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update cancellation rule.");
  return response.json() as Promise<HotelCancellationPolicyRuleRecord>;
}

export async function deleteAccommodationCancellationPolicyRule(ruleId: string) {
  const response = await fetch(`/api/accommodation/cancellation-policy-rules/${ruleId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete cancellation rule.");
}

export async function createAccommodationInventoryDay(hotelId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/hotels/${hotelId}/inventory-days`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create inventory day.");
  return response.json() as Promise<HotelInventoryDayRecord>;
}

export async function updateAccommodationInventoryDay(inventoryDayId: string, payload: unknown) {
  const response = await fetch(`/api/accommodation/inventory-days/${inventoryDayId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update inventory day.");
  return response.json() as Promise<HotelInventoryDayRecord>;
}

export async function deleteAccommodationInventoryDay(inventoryDayId: string) {
  const response = await fetch(`/api/accommodation/inventory-days/${inventoryDayId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete inventory day.");
}
