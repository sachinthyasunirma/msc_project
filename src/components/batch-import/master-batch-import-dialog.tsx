"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DropdownOption = { value: string; label: string };

type FieldType = "text" | "number" | "boolean" | "dropdown";

export type ImportFieldConfig = {
  key: string;
  label: string;
  required?: boolean;
  type: FieldType;
  options?: DropdownOption[];
};

type ValidateContext = {
  locationByCode: Map<string, string>;
  locationDetailsByCode?: Map<string, { city: string; country: string; address?: string }>;
  supplierByCode?: Map<string, string>;
  roomTypeByCode?: Map<string, string>;
  cancellationPolicyByCode?: Map<string, string>;
  currencyByCode: Map<string, string>;
  activityByCode?: Map<string, string>;
  vehicleCategoryByCode: Map<string, string>;
  vehicleTypeByCode: Map<string, string>;
  vehicleTypeCategoryCodeByCode: Map<string, string>;
  transportRateBasis?: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  defaultActivityId?: string | null;
};

export type ImportEntityConfig = {
  key:
    | "locations"
    | "hotels"
    | "hotel-room-types"
    | "hotel-contracts"
    | "hotel-rate-plans"
    | "hotel-room-rates"
    | "hotel-cancellation-policies"
    | "hotel-cancellation-policy-rules"
    | "hotel-rate-restrictions"
    | "activities"
    | "activity-rates"
    | "guides"
    | "vehicle-categories"
    | "vehicle-types"
    | "location-rates"
    | "location-expenses"
    | "pax-vehicle-rates"
    | "baggage-rates";
  title: string;
  description: string;
  fields: ImportFieldConfig[];
  sampleRow: Record<string, string>;
  lookupHints?: Array<{ label: string; values: string[] }>;
};

type ImportRowStatus = "ready" | "error" | "duplicate" | "uploaded" | "failed";

type ImportRow = {
  index: number;
  values: Record<string, string>;
  status: ImportRowStatus;
  errors: string[];
  duplicateKey: string;
  payload: Record<string, unknown> | null;
};

type ImportSummary = {
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
  uploaded: number;
  failed: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ImportEntityConfig;
  readOnly?: boolean;
  context: ValidateContext;
  existingCodes: Set<string>;
  onRefreshExistingCodes: () => Promise<Set<string>>;
  onUploadRow: (payload: Record<string, unknown>) => Promise<void>;
  onCompleted?: () => Promise<void> | void;
};

const RETRY_DELAY_MS = 800;
const CHUNK_SIZE = 25;
const VALIDATION_CHUNK_SIZE = 250;
const PREVIEW_ROW_LIMIT = 200;

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function parseBoolean(input: string): boolean | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "1", "yes", "y", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(normalized)) return false;
  return null;
}

function csvEscape(value: string) {
  if (/[\n",]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function toUpperTrim(value: string) {
  return value.trim().toUpperCase();
}

function toDateTimeOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }
  return rows;
}

function buildCsvTemplate(config: ImportEntityConfig) {
  const headers = config.fields.map((field) => field.key);
  const sample = headers.map((header) => config.sampleRow[header] ?? "");
  return `${headers.map(csvEscape).join(",")}\n${sample.map(csvEscape).join(",")}\n`;
}

function withRetry<T>(task: () => Promise<T>, retries = 1): Promise<T> {
  return task().catch(async (error) => {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return withRetry(task, retries - 1);
  });
}

function validateRow(
  config: ImportEntityConfig,
  inputValues: Record<string, string>,
  context: ValidateContext,
  existingCodes: Set<string>,
  fileCodes: Set<string>
): { errors: string[]; payload: Record<string, unknown> | null; duplicateKey: string } {
  const errors: string[] = [];
  const values = Object.fromEntries(
    Object.entries(inputValues).map(([key, value]) => [key, value.trim()])
  );
  const code = toUpperTrim(values.code ?? "");
  if (!code) {
    errors.push("Code is required.");
  } else {
    if (existingCodes.has(code)) {
      errors.push("Code already exists in the system.");
    }
    if (fileCodes.has(code)) {
      errors.push("Duplicate code in uploaded file.");
    }
  }

  config.fields.forEach((field) => {
    const raw = values[field.key] ?? "";
    if (field.required && !raw) {
      errors.push(`${field.label} is required.`);
      return;
    }
    if (!raw) return;
    if (field.type === "number" && Number.isNaN(Number(raw))) {
      errors.push(`${field.label} must be a valid number.`);
    }
    if (field.type === "boolean" && parseBoolean(raw) === null) {
      errors.push(`${field.label} must be true/false, yes/no, 1/0.`);
    }
    if (field.type === "dropdown" && field.options) {
      const matched = field.options.some((option) => option.value === raw);
      if (!matched) {
        errors.push(`${field.label} contains an invalid value.`);
      }
    }
  });

  let payload: Record<string, unknown> | null = null;
  if (errors.length === 0) {
    if (config.key === "locations") {
      payload = {
        code,
        name: values.name,
        country: values.country || null,
        region: values.region || null,
        address: values.address || null,
        notes: values.notes || null,
        isActive: parseBoolean(values.isActive) ?? true,
      };
    } else if (config.key === "hotels") {
      const starRating = Number(values.starRating);
      const locationCode = toUpperTrim(values.locationCode);
      const locationId = locationCode ? context.locationByCode.get(locationCode) ?? null : null;
      const location = locationCode ? context.locationDetailsByCode?.get(locationCode) ?? null : null;
      if (!locationCode) {
        errors.push("Location Code is required.");
      } else if (!locationId || !location) {
        errors.push("Location code not found in system locations.");
      }
      if (starRating < 1 || starRating > 5) {
        errors.push("Star Rating must be between 1 and 5.");
      } else if (locationId && location) {
        const resolvedAddress = values.address || location.address || "";
        if (!resolvedAddress.trim()) {
          errors.push("Address is required either in the upload row or in the selected master location.");
          return { errors, payload: null, duplicateKey: code };
        }
        payload = {
          code,
          name: values.name,
          description: values.description || null,
          locationId,
          address: resolvedAddress,
          city: location.city,
          country: location.country,
          starRating,
          contactEmail: values.contactEmail || null,
          contactPhone: values.contactPhone || null,
          isActive: parseBoolean(values.isActive) ?? true,
        };
      }
    } else if (config.key === "hotel-room-types") {
      payload = {
        code,
        name: values.name,
        description: values.description || null,
        maxOccupancy: Number(values.maxOccupancy),
        bedType: values.bedType,
        size: values.size || null,
        amenities: values.amenitiesCsv
          ? values.amenitiesCsv
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        totalRooms: Number(values.totalRooms),
        availableRooms: values.availableRooms ? Number(values.availableRooms) : Number(values.totalRooms),
        isActive: parseBoolean(values.isActive) ?? true,
      };
    } else if (config.key === "hotel-contracts") {
      const supplierCode = toUpperTrim(values.supplierCode);
      const supplierOrgId = supplierCode
        ? context.supplierByCode?.get(supplierCode) ?? null
        : null;
      if (supplierCode && !supplierOrgId) {
        errors.push("Supplier code not found.");
      }
      if (errors.length === 0) {
        payload = {
          code,
          name: values.name || null,
          supplierOrgId,
          contractRef: values.contractRef || null,
          contractType: values.contractType || "FIT",
          currencyCode: values.currencyCode || "USD",
          validFrom: values.validFrom,
          validTo: values.validTo,
          bookingFrom: values.bookingFrom || null,
          bookingTo: values.bookingTo || null,
          releaseDaysDefault: values.releaseDaysDefault ? Number(values.releaseDaysDefault) : null,
          marketScope: values.marketScope || null,
          guestNationalityScope: values.guestNationalityScope || null,
          remarks: values.remarks || null,
          status: values.status || "DRAFT",
          isActive: parseBoolean(values.isActive) ?? true,
        };
      }
    } else if (config.key === "hotel-rate-plans") {
      const cancellationPolicyCode = toUpperTrim(values.cancellationPolicyCode);
      const cancellationPolicyId = cancellationPolicyCode
        ? context.cancellationPolicyByCode?.get(cancellationPolicyCode) ?? null
        : null;
      if (cancellationPolicyCode && !cancellationPolicyId) {
        errors.push("Cancellation policy code not found.");
      }
      if (errors.length === 0) {
        payload = {
          code,
          name: values.name,
          description: values.description || null,
          rateType: values.rateType || "CONTRACTED_BUY",
          boardBasis: values.boardBasis,
          pricingModel: values.pricingModel || "PER_ROOM_PER_NIGHT",
          cancellationPolicyId,
          validFrom: values.validFrom,
          validTo: values.validTo,
          bookingFrom: values.bookingFrom || null,
          bookingTo: values.bookingTo || null,
          releaseDaysOverride: values.releaseDaysOverride ? Number(values.releaseDaysOverride) : null,
          marketCode: values.marketCode || null,
          guestNationalityScope: values.guestNationalityScope || null,
          isRefundable: parseBoolean(values.isRefundable) ?? true,
          isCommissionable: parseBoolean(values.isCommissionable) ?? false,
          isPackageOnly: parseBoolean(values.isPackageOnly) ?? false,
          priority: values.priority ? Number(values.priority) : 0,
          status: values.status || "ACTIVE",
          isActive: parseBoolean(values.isActive) ?? true,
        };
      }
    } else if (config.key === "hotel-room-rates") {
      const roomTypeCode = toUpperTrim(values.roomTypeCode);
      const roomTypeId = roomTypeCode ? context.roomTypeByCode?.get(roomTypeCode) ?? null : null;
      if (!roomTypeCode) {
        errors.push("Room type code is required.");
      } else if (!roomTypeId) {
        errors.push("Room type code not found.");
      }
      if (errors.length === 0 && roomTypeId) {
        payload = {
          code,
          roomTypeId,
          validFrom: values.validFrom,
          validTo: values.validTo,
          bookingFrom: values.bookingFrom || null,
          bookingTo: values.bookingTo || null,
          marketCode: values.marketCode || null,
          guestNationalityScope: values.guestNationalityScope || null,
          baseOccupancyAdults: Number(values.baseOccupancyAdults),
          baseOccupancyChildren: values.baseOccupancyChildren ? Number(values.baseOccupancyChildren) : 0,
          maxAdults: Number(values.maxAdults),
          maxChildren: values.maxChildren ? Number(values.maxChildren) : 0,
          maxOccupancy: values.maxOccupancy ? Number(values.maxOccupancy) : null,
          singleUseRate: values.singleUseRate ? Number(values.singleUseRate) : null,
          doubleRate: values.doubleRate ? Number(values.doubleRate) : null,
          tripleRate: values.tripleRate ? Number(values.tripleRate) : null,
          quadRate: values.quadRate ? Number(values.quadRate) : null,
          extraAdultRate: values.extraAdultRate ? Number(values.extraAdultRate) : null,
          childWithBedRate: values.childWithBedRate ? Number(values.childWithBedRate) : null,
          childNoBedRate: values.childNoBedRate ? Number(values.childNoBedRate) : null,
          infantRate: values.infantRate ? Number(values.infantRate) : null,
          singleSupplementRate: values.singleSupplementRate ? Number(values.singleSupplementRate) : null,
          currencyCode: values.currencyCode || "USD",
          taxMode: values.taxMode || "EXCLUSIVE",
          remarks: values.remarks || null,
          status: values.status || "ACTIVE",
          isActive: parseBoolean(values.isActive) ?? true,
        };
      }
    } else if (config.key === "hotel-cancellation-policies") {
      payload = {
        code,
        name: values.name,
        description: values.description || null,
        noShowPolicy: values.noShowPolicy || null,
        afterCheckInPolicy: values.afterCheckInPolicy || null,
        isDefault: parseBoolean(values.isDefault) ?? false,
        isActive: parseBoolean(values.isActive) ?? true,
      };
    } else if (config.key === "hotel-cancellation-policy-rules") {
      payload = {
        code,
        fromDaysBefore: values.fromDaysBefore ? Number(values.fromDaysBefore) : null,
        toDaysBefore: values.toDaysBefore ? Number(values.toDaysBefore) : null,
        penaltyType: values.penaltyType,
        penaltyValue: Number(values.penaltyValue),
        basis: values.basis || null,
        appliesOnNoShow: parseBoolean(values.appliesOnNoShow) ?? false,
        appliesAfterCheckIn: parseBoolean(values.appliesAfterCheckIn) ?? false,
      };
    } else if (config.key === "hotel-rate-restrictions") {
      const roomTypeCode = toUpperTrim(values.roomTypeCode);
      const roomTypeId = roomTypeCode ? context.roomTypeByCode?.get(roomTypeCode) ?? null : null;
      if (roomTypeCode && !roomTypeId) {
        errors.push("Room type code not found.");
      }
      if (errors.length === 0) {
        payload = {
          code,
          roomTypeId,
          stayFrom: values.stayFrom,
          stayTo: values.stayTo,
          bookingFrom: values.bookingFrom || null,
          bookingTo: values.bookingTo || null,
          minStay: values.minStay ? Number(values.minStay) : null,
          maxStay: values.maxStay ? Number(values.maxStay) : null,
          closedToArrival: parseBoolean(values.closedToArrival) ?? false,
          closedToDeparture: parseBoolean(values.closedToDeparture) ?? false,
          stopSell: parseBoolean(values.stopSell) ?? false,
          releaseDays: values.releaseDays ? Number(values.releaseDays) : null,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "activities") {
      const locationId = context.locationByCode.get(toUpperTrim(values.locationCode));
      if (!locationId) {
        errors.push("Location code not found in master data.");
      } else {
        payload = {
          code,
          type: values.type,
          locationId,
          locationRole: values.locationRole || "ACTIVITY_LOCATION",
          name: values.name,
          shortDescription: values.shortDescription || null,
          description: values.description || null,
          durationMin: values.durationMin ? Number(values.durationMin) : null,
          minPax: values.minPax ? Number(values.minPax) : 1,
          maxPax: values.maxPax ? Number(values.maxPax) : null,
          minAge: values.minAge ? Number(values.minAge) : null,
          maxAge: values.maxAge ? Number(values.maxAge) : null,
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "activity-rates") {
      const defaultActivityId = context.defaultActivityId ?? null;
      const activityId = values.activityCode
        ? context.activityByCode?.get(toUpperTrim(values.activityCode)) ?? null
        : defaultActivityId;
      if (values.activityCode && !activityId) {
        errors.push("Activity code not found in activity master.");
      }
      if (!activityId) {
        errors.push("Activity is required. Provide activityCode in sheet.");
      }
      let paxTiers: Array<{ min: number; max: number; rate: number }> | null = null;
      if (values.paxTiersJson) {
        try {
          const parsed = JSON.parse(values.paxTiersJson);
          if (Array.isArray(parsed)) {
            paxTiers = parsed as Array<{ min: number; max: number; rate: number }>;
          } else {
            errors.push("Pax Tiers JSON must be an array.");
          }
        } catch {
          errors.push("Pax Tiers JSON is invalid.");
        }
      }
      if (errors.length === 0) {
        payload = {
          code,
          activityId,
          label: values.label || null,
          currency: values.currency || "LKR",
          pricingModel: values.pricingModel || "FIXED",
          fixedRate: values.fixedRate ? Number(values.fixedRate) : null,
          perPaxRate: values.perPaxRate ? Number(values.perPaxRate) : null,
          perHourRate: values.perHourRate ? Number(values.perHourRate) : null,
          perUnitRate: values.perUnitRate ? Number(values.perUnitRate) : null,
          paxTiers,
          minCharge: values.minCharge ? Number(values.minCharge) : 0,
          effectiveFrom: toDateTimeOrNull(values.effectiveFrom),
          effectiveTo: toDateTimeOrNull(values.effectiveTo),
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "guides") {
      const rating = values.rating ? Number(values.rating) : null;
      if (rating !== null && (rating < 0 || rating > 5)) {
        errors.push("Rating must be between 0 and 5.");
      }
      const baseCurrencyCode = toUpperTrim(values.baseCurrencyCode);
      const currencyId = baseCurrencyCode ? context.currencyByCode.get(baseCurrencyCode) : null;
      if (baseCurrencyCode && !currencyId) {
        errors.push("Base currency code not found in currency master.");
      }
      if (errors.length === 0) {
        payload = {
          code,
          guideType: values.guideType || "INDIVIDUAL",
          fullName: values.fullName,
          displayName: values.displayName || null,
          gender: values.gender || null,
          phone: values.phone || null,
          email: values.email || null,
          address: values.address || null,
          countryCode: values.countryCode || null,
          city: values.city || null,
          bio: values.bio || null,
          yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : 0,
          rating,
          baseCurrencyId: currencyId ?? null,
          isActive: parseBoolean(values.isActive) ?? true,
        };
      }
    } else if (config.key === "vehicle-categories") {
      payload = {
        code,
        name: values.name,
        description: values.description || null,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
        isActive: parseBoolean(values.isActive) ?? true,
      };
    } else if (config.key === "vehicle-types") {
      const categoryId = context.vehicleCategoryByCode.get(toUpperTrim(values.categoryCode));
      if (!categoryId) {
        errors.push("Category code not found in vehicle categories.");
      } else {
        let features: string[] | null = null;
        if (values.featuresJson) {
          try {
            const parsed = JSON.parse(values.featuresJson);
            if (Array.isArray(parsed)) {
              features = parsed.map((item) => String(item));
            } else {
              errors.push("Features JSON must be an array.");
            }
          } catch {
            errors.push("Features JSON is invalid.");
          }
        }
        if (errors.length === 0) {
          payload = {
            code,
            categoryId,
            name: values.name,
            paxCapacity: Number(values.paxCapacity),
            baggageCapacity: values.baggageCapacity ? Number(values.baggageCapacity) : 0,
            features,
            isActive: parseBoolean(values.isActive) ?? true,
          };
        }
      }
    } else if (config.key === "location-rates") {
      const rateBasis = context.transportRateBasis ?? "VEHICLE_TYPE";
      const fromLocationId = context.locationByCode.get(toUpperTrim(values.fromLocationCode));
      const toLocationId = context.locationByCode.get(toUpperTrim(values.toLocationCode));
      const vehicleCategoryId = values.vehicleCategoryCode
        ? context.vehicleCategoryByCode.get(toUpperTrim(values.vehicleCategoryCode)) ?? null
        : null;
      const vehicleTypeId = values.vehicleTypeCode
        ? context.vehicleTypeByCode.get(toUpperTrim(values.vehicleTypeCode)) ?? null
        : null;
      if (!fromLocationId) errors.push("From location code not found.");
      if (!toLocationId) errors.push("To location code not found.");
      if (values.vehicleCategoryCode && !vehicleCategoryId) errors.push("Vehicle category code not found.");
      if (values.vehicleTypeCode && !vehicleTypeId) errors.push("Vehicle type code not found.");
      if (rateBasis === "VEHICLE_CATEGORY") {
        if (!values.vehicleCategoryCode) {
          errors.push("Vehicle category code is required by company transport rate basis.");
        }
        if (values.vehicleTypeCode) {
          errors.push("Vehicle type code is not allowed for category-based transport rate basis.");
        }
      } else {
        if (!values.vehicleTypeCode) {
          errors.push("Vehicle type code is required by company transport rate basis.");
        }
        if (values.vehicleCategoryCode) {
          errors.push("Vehicle category code is not allowed for type-based transport rate basis.");
        }
      }
      let slabs: Array<{ fromKm: number; toKm: number; rate: number }> | null = null;
      if (values.slabsJson) {
        try {
          const parsed = JSON.parse(values.slabsJson);
          if (Array.isArray(parsed)) {
            slabs = parsed as Array<{ fromKm: number; toKm: number; rate: number }>;
          } else {
            errors.push("Slabs JSON must be an array.");
          }
        } catch {
          errors.push("Slabs JSON is invalid.");
        }
      }
      if (errors.length === 0) {
        payload = {
          code,
          fromLocationId,
          toLocationId,
          vehicleCategoryId,
          vehicleTypeId,
          distanceKm: values.distanceKm ? Number(values.distanceKm) : null,
          durationMin: values.durationMin ? Number(values.durationMin) : null,
          currency: values.currency || "LKR",
          pricingModel: values.pricingModel || "FIXED",
          fixedRate: values.fixedRate ? Number(values.fixedRate) : null,
          perKmRate: values.perKmRate ? Number(values.perKmRate) : null,
          slabs,
          minCharge: values.minCharge ? Number(values.minCharge) : 0,
          nightSurcharge: values.nightSurcharge ? Number(values.nightSurcharge) : 0,
          effectiveFrom: toDateTimeOrNull(values.effectiveFrom),
          effectiveTo: toDateTimeOrNull(values.effectiveTo),
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "location-expenses") {
      const locationId = context.locationByCode.get(toUpperTrim(values.locationCode));
      const vehicleCategoryId = values.vehicleCategoryCode
        ? context.vehicleCategoryByCode.get(toUpperTrim(values.vehicleCategoryCode)) ?? null
        : null;
      const vehicleTypeId = values.vehicleTypeCode
        ? context.vehicleTypeByCode.get(toUpperTrim(values.vehicleTypeCode)) ?? null
        : null;
      if (!locationId) errors.push("Location code not found.");
      if (values.vehicleCategoryCode && !vehicleCategoryId) errors.push("Vehicle category code not found.");
      if (values.vehicleTypeCode && !vehicleTypeId) errors.push("Vehicle type code not found.");
      if (errors.length === 0) {
        payload = {
          code,
          locationId,
          name: values.name,
          expenseType: values.expenseType || "FIXED",
          amount: Number(values.amount),
          currency: values.currency || "LKR",
          vehicleCategoryId,
          vehicleTypeId,
          effectiveFrom: toDateTimeOrNull(values.effectiveFrom),
          effectiveTo: toDateTimeOrNull(values.effectiveTo),
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "pax-vehicle-rates") {
      const fromLocationId = context.locationByCode.get(toUpperTrim(values.fromLocationCode));
      const toLocationId = context.locationByCode.get(toUpperTrim(values.toLocationCode));
      const vehicleCategoryId = values.vehicleCategoryCode
        ? context.vehicleCategoryByCode.get(toUpperTrim(values.vehicleCategoryCode)) ?? null
        : null;
      const vehicleTypeId = values.vehicleTypeCode
        ? context.vehicleTypeByCode.get(toUpperTrim(values.vehicleTypeCode)) ?? null
        : null;
      if (!fromLocationId) errors.push("From location code not found.");
      if (!toLocationId) errors.push("To location code not found.");
      if (values.vehicleCategoryCode && !vehicleCategoryId) errors.push("Vehicle category code not found.");
      if (values.vehicleTypeCode && !vehicleTypeId) errors.push("Vehicle type code not found.");
      let tiers: Array<{ minPax: number; maxPax: number; rate: number }> | null = null;
      if (values.tiersJson) {
        try {
          const parsed = JSON.parse(values.tiersJson);
          if (Array.isArray(parsed)) {
            tiers = parsed as Array<{ minPax: number; maxPax: number; rate: number }>;
          } else {
            errors.push("Tiers JSON must be an array.");
          }
        } catch {
          errors.push("Tiers JSON is invalid.");
        }
      }
      if (errors.length === 0) {
        payload = {
          code,
          fromLocationId,
          toLocationId,
          vehicleCategoryId,
          vehicleTypeId,
          currency: values.currency || "LKR",
          pricingModel: values.pricingModel || "PER_PAX",
          perPaxRate: values.perPaxRate ? Number(values.perPaxRate) : null,
          tiers,
          minCharge: values.minCharge ? Number(values.minCharge) : 0,
          effectiveFrom: toDateTimeOrNull(values.effectiveFrom),
          effectiveTo: toDateTimeOrNull(values.effectiveTo),
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    } else if (config.key === "baggage-rates") {
      const fromLocationId = context.locationByCode.get(toUpperTrim(values.fromLocationCode));
      const toLocationId = context.locationByCode.get(toUpperTrim(values.toLocationCode));
      const vehicleCategoryId = values.vehicleCategoryCode
        ? context.vehicleCategoryByCode.get(toUpperTrim(values.vehicleCategoryCode)) ?? null
        : null;
      const vehicleTypeId = values.vehicleTypeCode
        ? context.vehicleTypeByCode.get(toUpperTrim(values.vehicleTypeCode)) ?? null
        : null;
      if (!fromLocationId) errors.push("From location code not found.");
      if (!toLocationId) errors.push("To location code not found.");
      if (values.vehicleCategoryCode && !vehicleCategoryId) errors.push("Vehicle category code not found.");
      if (values.vehicleTypeCode && !vehicleTypeId) errors.push("Vehicle type code not found.");
      let tiers: Array<{ minQty: number; maxQty: number; rate: number }> | null = null;
      if (values.tiersJson) {
        try {
          const parsed = JSON.parse(values.tiersJson);
          if (Array.isArray(parsed)) {
            tiers = parsed as Array<{ minQty: number; maxQty: number; rate: number }>;
          } else {
            errors.push("Tiers JSON must be an array.");
          }
        } catch {
          errors.push("Tiers JSON is invalid.");
        }
      }
      if (errors.length === 0) {
        payload = {
          code,
          fromLocationId,
          toLocationId,
          vehicleCategoryId,
          vehicleTypeId,
          currency: values.currency || "LKR",
          unit: values.unit || "BAG",
          pricingModel: values.pricingModel || "PER_UNIT",
          perUnitRate: values.perUnitRate ? Number(values.perUnitRate) : null,
          fixedRate: values.fixedRate ? Number(values.fixedRate) : null,
          tiers,
          minCharge: values.minCharge ? Number(values.minCharge) : 0,
          effectiveFrom: toDateTimeOrNull(values.effectiveFrom),
          effectiveTo: toDateTimeOrNull(values.effectiveTo),
          isActive: parseBoolean(values.isActive) ?? true,
          notes: values.notes || null,
        };
      }
    }
  }

  return { errors, payload, duplicateKey: code };
}

export function MasterBatchImportDialog({
  open,
  onOpenChange,
  config,
  readOnly = false,
  context,
  existingCodes,
  onRefreshExistingCodes,
  onUploadRow,
  onCompleted,
}: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isRefreshingCodes, setIsRefreshingCodes] = useState(false);
  const [localExistingCodes, setLocalExistingCodes] = useState<Set<string>>(existingCodes);

  const summary = useMemo<ImportSummary>(() => {
    const total = rows.length;
    const valid = rows.filter((row) => row.status === "ready").length;
    const duplicate = rows.filter((row) => row.status === "duplicate").length;
    const invalid = rows.filter((row) => row.status === "error").length;
    const uploaded = rows.filter((row) => row.status === "uploaded").length;
    const failed = rows.filter((row) => row.status === "failed").length;
    return { total, valid, duplicate, invalid, uploaded, failed };
  }, [rows]);

  const previewRows = useMemo(
    () => rows.slice(0, PREVIEW_ROW_LIMIT),
    [rows]
  );

  const hiddenPreviewCount = Math.max(0, rows.length - previewRows.length);

  const getFilteredOptions = (field: ImportFieldConfig, rowValues: Record<string, string>) => {
    const options = field.options ?? [];
    if (field.key !== "vehicleTypeCode") return options;
    const selectedCategory = toUpperTrim(rowValues.vehicleCategoryCode ?? "");
    if (!selectedCategory) return options;
    return options.filter((option) => {
      const category = context.vehicleTypeCategoryCodeByCode.get(toUpperTrim(option.value));
      return category === selectedCategory;
    });
  };

  const resetState = () => {
    setRows([]);
    setIsUploading(false);
    setIsProcessingFile(false);
    setFileName("");
    setLocalExistingCodes(existingCodes);
  };

  useEffect(() => {
    setLocalExistingCodes(existingCodes);
  }, [existingCodes]);

  useEffect(() => {
    if (!open) return;
    // Prevent stale preview rows when switching tabs/resources while dialog stays mounted.
    setRows([]);
    setFileName("");
    setIsUploading(false);
    setIsProcessingFile(false);
    setLocalExistingCodes(existingCodes);
  }, [config.key, open, existingCodes]);

  const downloadTemplate = () => {
    const csv = buildCsvTemplate(config);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${config.key}-import-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const revalidateRows = async (rawRows: Array<{ index: number; values: Record<string, string> }>) => {
    const fileCodes = new Set<string>();
    const updated: ImportRow[] = [];
    for (let start = 0; start < rawRows.length; start += VALIDATION_CHUNK_SIZE) {
      const chunk = rawRows.slice(start, start + VALIDATION_CHUNK_SIZE);
      chunk.forEach((raw) => {
        const validation = validateRow(config, raw.values, context, localExistingCodes, fileCodes);
        if (validation.duplicateKey) {
          fileCodes.add(validation.duplicateKey);
        }
        const isDuplicate = validation.errors.some((error) =>
          error.toLowerCase().includes("duplicate code")
        );
        updated.push({
          index: raw.index,
          values: raw.values,
          errors: validation.errors,
          payload: validation.payload,
          duplicateKey: validation.duplicateKey,
          status: validation.errors.length === 0 ? "ready" : isDuplicate ? "duplicate" : "error",
        });
      });
      if (rawRows.length > VALIDATION_CHUNK_SIZE) {
        await yieldToBrowser();
      }
    }
    setRows(updated);
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv")) {
      notify.error("Upload a CSV file. Save your Excel sheet as CSV and upload.");
      return;
    }
    try {
      setIsProcessingFile(true);
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        notify.error("Template header and at least one data row are required.");
        return;
      }

      const headerRow = parsed[0].map((header) => header.trim());
      const requiredHeaders = config.fields.map((field) => field.key);
      const missingHeaders = requiredHeaders.filter((header) => !headerRow.includes(header));
      if (missingHeaders.length > 0) {
        notify.error(`Missing columns: ${missingHeaders.join(", ")}`);
        return;
      }

      const records = parsed.slice(1).map((cells, idx) => {
        const values: Record<string, string> = {};
        headerRow.forEach((header, colIndex) => {
          values[header] = (cells[colIndex] ?? "").trim();
        });
        return { index: idx + 1, values };
      });

      setFileName(file.name);
      await revalidateRows(records);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const refreshExistingCodes = async () => {
    try {
      setIsRefreshingCodes(true);
      const refreshed = await onRefreshExistingCodes();
      setLocalExistingCodes(refreshed);
      const rawRows = rows.map((row) => ({ index: row.index, values: row.values }));
      await revalidateRows(rawRows);
      notify.success("Existing codes refreshed.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to refresh codes.");
    } finally {
      setIsRefreshingCodes(false);
    }
  };

  const updateCell = async (rowIndex: number, fieldKey: string, value: string) => {
    const rawRows = rows.map((row) => ({
      index: row.index,
      values: row.index === rowIndex ? { ...row.values, [fieldKey]: value } : row.values,
    }));
    await revalidateRows(rawRows);
  };

  const uploadRows = async () => {
    if (readOnly) {
      notify.warning("View only mode: batch upload is disabled.");
      return;
    }
    const uploadCandidates = rows.filter((row) => row.status === "ready" && row.payload);
    if (uploadCandidates.length === 0) {
      notify.warning("No valid rows to upload.");
      return;
    }
    setIsUploading(true);
    const updatedRows = [...rows];

    try {
      for (let start = 0; start < uploadCandidates.length; start += CHUNK_SIZE) {
        const chunk = uploadCandidates.slice(start, start + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (candidate) => {
            const rowIdx = updatedRows.findIndex((row) => row.index === candidate.index);
            const payload = candidate.payload;
            if (rowIdx < 0 || !payload) return;
            try {
              await withRetry(() => onUploadRow(payload), 1);
              updatedRows[rowIdx] = { ...updatedRows[rowIdx], status: "uploaded", errors: [] };
              if (candidate.duplicateKey) {
                localExistingCodes.add(candidate.duplicateKey);
              }
            } catch (error) {
              updatedRows[rowIdx] = {
                ...updatedRows[rowIdx],
                status: "failed",
                errors: [error instanceof Error ? error.message : "Upload failed."],
              };
            }
          })
        );
        setRows([...updatedRows]);
      }
      const failedCount = updatedRows.filter((row) => row.status === "failed").length;
      if (failedCount > 0) {
        notify.warning(`Upload completed with ${failedCount} failed row(s). You can fix and re-upload.`);
      } else {
        notify.success("Batch upload completed.");
      }
      if (onCompleted) {
        await onCompleted();
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[92vw] max-w-[92vw] flex-col lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>{config.title} - Batch Upload</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(340px,1fr)_auto_auto_auto]">
          <div className="min-w-0 space-y-1">
            <Label>Upload CSV (Excel-compatible)</Label>
            <Input
              className="w-full max-w-sm cursor-pointer file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1 file:text-xs"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void onFileSelected(event.target.files?.[0])}
            />
            {fileName ? <p className="text-xs text-muted-foreground">Selected: {fileName}</p> : null}
            {isProcessingFile ? (
              <p className="text-xs text-muted-foreground">Validating rows, please wait...</p>
            ) : null}
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="self-end">
            <Download className="mr-2 size-4" />
            Download Sample Sheet
          </Button>
          <Button variant="outline" onClick={() => void refreshExistingCodes()} disabled={isRefreshingCodes || isProcessingFile} className="self-end">
            <RefreshCw className="mr-2 size-4" />
            {isRefreshingCodes ? "Refreshing..." : "Refresh Duplicates"}
          </Button>
          <Button onClick={() => void uploadRows()} disabled={isUploading || isProcessingFile || readOnly} className="self-end master-add-btn">
            <Upload className="mr-2 size-4" />
            {isUploading ? "Uploading..." : "Upload Valid Rows"}
          </Button>
        </div>

        {config.lookupHints?.length ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            {config.lookupHints.map((hint) => (
              <p key={hint.label}>
                <strong>{hint.label}:</strong> {hint.values.join(", ")}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Total: {summary.total}</Badge>
          <Badge>Valid: {summary.valid}</Badge>
          <Badge variant="outline">Duplicates: {summary.duplicate}</Badge>
          <Badge variant="outline">Invalid: {summary.invalid}</Badge>
          <Badge variant="default">Uploaded: {summary.uploaded}</Badge>
          <Badge variant={summary.failed > 0 ? "destructive" : "secondary"}>Failed: {summary.failed}</Badge>
          {hiddenPreviewCount > 0 ? (
            <Badge variant="outline">Previewing first {PREVIEW_ROW_LIMIT} rows</Badge>
          ) : null}
        </div>

        <div className="max-h-[48vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Row</TableHead>
                {config.fields.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
                <TableHead className="w-[220px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={config.fields.length + 2} className="text-center text-muted-foreground">
                    Upload a CSV file to preview rows before saving.
                  </TableCell>
                </TableRow>
              ) : (
                previewRows.map((row) => (
                  <TableRow key={row.index}>
                    <TableCell>{row.index}</TableCell>
                    {config.fields.map((field) => (
                      <TableCell key={`${row.index}-${field.key}`} className="min-w-[180px]">
                        {field.type === "dropdown" ? (
                              <Select
                                value={row.values[field.key] ?? ""}
                                onValueChange={(value) => void updateCell(row.index, field.key, value)}
                              >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredOptions(field, row.values).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-8"
                            value={row.values[field.key] ?? ""}
                            onChange={(event) => void updateCell(row.index, field.key, event.target.value)}
                          />
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {row.status === "uploaded" ? (
                        <Badge>Uploaded</Badge>
                      ) : row.status === "ready" ? (
                        <Badge variant="secondary">Ready</Badge>
                      ) : row.status === "duplicate" ? (
                        <Badge variant="outline">Duplicate</Badge>
                      ) : row.status === "failed" ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="destructive">Invalid</Badge>
                      )}
                      {row.errors.length > 0 ? (
                        <ul className="mt-1 list-disc pl-4 text-xs text-destructive">
                          {row.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {hiddenPreviewCount > 0 ? (
                <TableRow>
                  <TableCell colSpan={config.fields.length + 2} className="text-center text-muted-foreground">
                    {hiddenPreviewCount} more row(s) are loaded and will still upload, but hidden from preview to keep the screen responsive.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
