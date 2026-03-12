import { sanitizeCodePart } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type AutoCodeFieldKey = "code" | "planCode";

const AUTO_CODE_RESOURCE_FIELDS: Partial<Record<PreTourResourceKey, AutoCodeFieldKey>> = {
  "pre-tours": "planCode",
  "pre-tour-days": "code",
  "pre-tour-item-addons": "code",
  "pre-tour-totals": "code",
  "pre-tour-categories": "code",
  "pre-tour-technical-visits": "code",
};

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function compactDate(value: unknown) {
  const source = toText(value);
  if (!source) return "";
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => sanitizeCodePart(String(part ?? "")))
    .filter(Boolean)
    .join("_")
    .slice(0, 80);
}

function buildPlanCode(form: Row) {
  return joinParts([
    toText(form.title) || "PRE_TOUR",
    compactDate(form.startDate),
  ]);
}

function buildDayCode(form: Row) {
  const dayNumber = Number(form.dayNumber ?? 1);
  return joinParts([
    "DAY",
    Number.isFinite(dayNumber) && dayNumber > 0 ? String(dayNumber).padStart(2, "0") : "01",
    toText(form.title),
  ]);
}

function buildAddonCode(form: Row) {
  return joinParts([
    toText(form.addonType) || "ADDON",
    toText(form.title) || "ITEM",
  ]);
}

function buildTotalCode(form: Row) {
  return joinParts([
    "TOTAL",
    toText(form.currencyCode),
  ]);
}

function buildCategoryCode(form: Row) {
  return joinParts([
    "CATEGORY",
    toText(form.typeId),
  ]);
}

function buildTechnicalVisitCode(form: Row) {
  return joinParts([
    "TV",
    compactDate(form.visitDate) || compactDate(form.date),
  ]);
}

export function getAutoCodeFieldKey(resource: PreTourResourceKey) {
  return AUTO_CODE_RESOURCE_FIELDS[resource] ?? null;
}

export function getAutoCodeHint(resource: PreTourResourceKey) {
  switch (resource) {
    case "pre-tours":
      return "Generated from title and start date. Switch off to enter a custom plan code.";
    case "pre-tour-days":
      return "Generated from day number and title. Switch off to enter a custom day code.";
    case "pre-tour-item-addons":
      return "Generated from addon type and title. Switch off to enter a custom code.";
    case "pre-tour-totals":
      return "Generated from total context and currency. Switch off to enter a custom code.";
    case "pre-tour-categories":
      return "Generated from category type. Switch off to enter a custom code.";
    case "pre-tour-technical-visits":
      return "Generated from visit context. Switch off to enter a custom code.";
    default:
      return "Generated automatically. Switch off to enter a custom code.";
  }
}

export function buildAutoCode(resource: PreTourResourceKey, form: Row) {
  switch (resource) {
    case "pre-tours":
      return buildPlanCode(form);
    case "pre-tour-days":
      return buildDayCode(form);
    case "pre-tour-item-addons":
      return buildAddonCode(form);
    case "pre-tour-totals":
      return buildTotalCode(form);
    case "pre-tour-categories":
      return buildCategoryCode(form);
    case "pre-tour-technical-visits":
      return buildTechnicalVisitCode(form);
    default:
      return "";
  }
}
