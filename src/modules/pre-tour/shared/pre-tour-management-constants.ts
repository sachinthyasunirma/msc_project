import type { PreTourResourceKey } from "@/modules/pre-tour/shared/pre-tour-management-types";

export const META: Record<PreTourResourceKey, { title: string; description: string }> = {
  "pre-tours": {
    title: "Pre-Tour Plans",
    description: "Create itinerary plans before operational on-tour execution.",
  },
  "pre-tour-days": {
    title: "Day Plan",
    description: "Define day-by-day structure and travel flow.",
  },
  "pre-tour-items": {
    title: "Plan Items",
    description: "Service lines for selected day.",
  },
  "pre-tour-guide-allocations": {
    title: "Guide Allocations",
    description: "Tour-level guide costing and assignment across the itinerary.",
  },
  "pre-tour-item-addons": {
    title: "Item Addons",
    description: "Supplements and misc charges for selected service item.",
  },
  "pre-tour-totals": {
    title: "Plan Totals",
    description: "Aggregated totals and snapshot for the full pre-tour.",
  },
  "pre-tour-categories": {
    title: "Tour Categories",
    description: "Assign category type and category mapping for this pre-tour.",
  },
  "pre-tour-technical-visits": {
    title: "Field Visits",
    description: "Attach technical/field visits into pre-tour planning context.",
  },
  "pre-tour-bins": {
    title: "Recycle Bin",
    description: "Soft deleted pre-tour records. Admin can permanently delete.",
  },
};

export const COLUMNS: Record<PreTourResourceKey, Array<{ key: string; label: string }>> = {
  "pre-tours": [
    { key: "planCode", label: "Plan Code" },
    { key: "referenceNo", label: "Reference No" },
    { key: "version", label: "Version" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "currencyCode", label: "Currency" },
    { key: "updatedByName", label: "Updated By" },
    { key: "updatedAt", label: "Updated At" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-days": [
    { key: "code", label: "Code" },
    { key: "dayNumber", label: "Day" },
    { key: "date", label: "Date" },
    { key: "title", label: "Title" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-items": [
    { key: "code", label: "Code" },
    { key: "dayId", label: "Day" },
    { key: "itemType", label: "Type" },
    { key: "title", label: "Title" },
    { key: "currencyCode", label: "Currency" },
    { key: "totalAmount", label: "Total" },
    { key: "status", label: "Status" },
  ],
  "pre-tour-guide-allocations": [
    { key: "code", label: "Code" },
    { key: "coverageMode", label: "Coverage" },
    { key: "serviceId", label: "Guide" },
    { key: "language", label: "Language" },
    { key: "guideBasis", label: "Basis" },
    { key: "currencyCode", label: "Currency" },
    { key: "totalAmount", label: "Total" },
    { key: "status", label: "Status" },
  ],
  "pre-tour-item-addons": [
    { key: "code", label: "Code" },
    { key: "planItemId", label: "Plan Item" },
    { key: "addonType", label: "Type" },
    { key: "title", label: "Title" },
    { key: "currencyCode", label: "Currency" },
    { key: "totalAmount", label: "Total" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-totals": [
    { key: "code", label: "Code" },
    { key: "currencyCode", label: "Currency" },
    { key: "baseTotal", label: "Base" },
    { key: "taxTotal", label: "Tax" },
    { key: "grandTotal", label: "Grand" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-categories": [
    { key: "code", label: "Code" },
    { key: "typeId", label: "Category Type" },
    { key: "categoryId", label: "Category" },
    { key: "notes", label: "Notes" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-technical-visits": [
    { key: "code", label: "Code" },
    { key: "dayId", label: "Day" },
    { key: "technicalVisitId", label: "Field Visit" },
    { key: "notes", label: "Notes" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-bins": [
    { key: "programCode", label: "Program" },
    { key: "code", label: "Code" },
    { key: "referenceNo", label: "Reference" },
    { key: "planCode", label: "Plan Code" },
    { key: "deletedByName", label: "Deleted By" },
    { key: "deletedAt", label: "Deleted At" },
  ],
};

export const PRE_TOUR_FORM_GROUPS: Array<{
  title: string;
  description: string;
  keys: string[];
}> = [
  {
    title: "Identity & Partners",
    description: "Primary identifiers and commercial partners for this pre-tour.",
    keys: ["planCode", "title", "categoryId", "status", "marketOrgId", "operatorOrgId"],
  },
  {
    title: "Travel Window & Pax",
    description: "Travel dates and passenger profile.",
    keys: [
      "startDate",
      "endDate",
      "totalNights",
      "adults",
      "children",
      "infants",
      "preferredLanguage",
    ],
  },
  {
    title: "Accommodation Preferences",
    description: "Optional customer room and meal preferences used for accommodation planning.",
    keys: ["roomPreference", "mealPreference"],
  },
  {
    title: "Currency & Pricing",
    description: "Currency context, FX, and pricing totals.",
    keys: [
      "currencyCode",
      "exchangeRateMode",
      "exchangeRate",
      "priceMode",
      "pricingPolicy",
      "baseTotal",
      "taxTotal",
      "grandTotal",
    ],
  },
  {
    title: "Control & Notes",
    description: "Lifecycle controls and internal notes.",
    keys: ["version", "isLocked", "notes", "isActive"],
  },
];

export const PRE_TOUR_DAY_FORM_GROUPS: Array<{
  title: string;
  description: string;
  keys: string[];
}> = [
  {
    title: "Schedule",
    description: "Core day identity and calendar context.",
    keys: ["code", "dayNumber", "date", "title"],
  },
  {
    title: "Route",
    description: "Define start and end locations for this day flow.",
    keys: ["startLocationId", "endLocationId"],
  },
  {
    title: "Control & Notes",
    description: "Operational status and internal planning notes.",
    keys: ["isActive", "notes"],
  },
];
