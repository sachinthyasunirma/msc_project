import { COLUMNS } from "@/modules/pre-tour/shared/pre-tour-management-constants";
import type { Field, PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

export function toLocalDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function toIsoDateTime(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toNumericValue(value: string | number | null | undefined, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (typeof value === "string" && value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

export function parseFieldValue(field: Field, value: unknown) {
  if ((value === "" || value === null || value === undefined) && field.nullable) {
    return null;
  }

  if (field.type === "datetime") {
    return toIsoDateTime(value);
  }

  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) {
      return field.nullable ? null : 0;
    }
    return Number(value);
  }

  if (field.type === "json") {
    if (value === "" || value === null || value === undefined) {
      return field.nullable ? null : {};
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`${field.label} must be valid JSON.`);
      }
    }
    return value;
  }

  return value;
}

export function addDays(baseIso: string, count: number) {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + count);
  return next;
}

export function matchesQuery(resource: PreTourResourceKey, row: Row, query: string) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return COLUMNS[resource].some((column) =>
    String(row[column.key] ?? "")
      .toLowerCase()
      .includes(q)
  );
}

export function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function toDayCount(startDate: string, endDate: string) {
  const startDateOnly = startDate ? startDate.slice(0, 10) : "";
  const endDateOnly = endDate ? endDate.slice(0, 10) : "";
  const start = new Date(`${startDateOnly}T00:00:00`);
  const end = new Date(`${endDateOnly}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function toNightCount(startDate: string, endDate: string) {
  const totalDays = toDayCount(startDate, endDate);
  return totalDays > 0 ? totalDays - 1 : 0;
}

export function getCoordinatesFromGeo(geo: unknown): [number, number] | null {
  let geoValue: unknown = geo;
  if (typeof geoValue === "string") {
    try {
      geoValue = JSON.parse(geoValue);
    } catch {
      return null;
    }
  }
  if (!geoValue || typeof geoValue !== "object") return null;
  const coordinates = (geoValue as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

export function sanitizeCodePart(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function itemTypeAccentClass(itemType: unknown) {
  switch (String(itemType || "").toUpperCase()) {
    case "TRANSPORT":
      return "pretour-item-accent pretour-item-accent--transport";
    case "ACTIVITY":
      return "pretour-item-accent pretour-item-accent--activity";
    case "ACCOMMODATION":
      return "pretour-item-accent pretour-item-accent--accommodation";
    case "GUIDE":
      return "pretour-item-accent pretour-item-accent--guide";
    case "SUPPLEMENT":
      return "pretour-item-accent pretour-item-accent--supplement";
    default:
      return "pretour-item-accent pretour-item-accent--default";
  }
}
