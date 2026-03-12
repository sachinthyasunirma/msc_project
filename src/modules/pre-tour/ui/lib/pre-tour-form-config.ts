"use client";

import type { Field, PreTourResourceKey } from "@/modules/pre-tour/shared/pre-tour-management-types";

export type DayTransportForm = {
  enabled: boolean;
  serviceId: string;
  startAt: string;
  endAt: string;
  pax: string;
  baseAmount: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  notes: string;
};

export const EMPTY_DAY_TRANSPORT_FORM: DayTransportForm = {
  enabled: false,
  serviceId: "",
  startAt: "",
  endAt: "",
  pax: "",
  baseAmount: "0",
  taxAmount: "0",
  totalAmount: "0",
  status: "PLANNED",
  notes: "",
};

type FieldOptions = {
  planOptions: Array<{ value: string; label: string }>;
  dayOptions: Array<{ value: string; label: string }>;
  filteredItemOptions: Array<{ value: string; label: string }>;
  locationOptions: Array<{ value: string; label: string }>;
  serviceOptions: Array<{ value: string; label: string }>;
  accommodationServiceOptions: Array<{ value: string; label: string }>;
  currencyOptions: Array<{ value: string; label: string }>;
  preTourOperatorOptions: Array<{ value: string; label: string }>;
  marketOrganizationOptions: Array<{ value: string; label: string }>;
  tourCategoryTypeOptions: Array<{ value: string; label: string }>;
  tourCategoryOptions: Array<{ value: string; label: string }>;
  allTourCategoryOptions: Array<{ value: string; label: string }>;
  technicalVisitOptions: Array<{ value: string; label: string }>;
  companyBaseCurrencyCode: string;
  selectedPreTourItemType: string;
};

export function getPreTourFields(
  resource: PreTourResourceKey,
  options: FieldOptions
): Field[] {
  const {
    planOptions,
    dayOptions,
    filteredItemOptions,
    locationOptions,
    serviceOptions,
    accommodationServiceOptions,
    currencyOptions,
    preTourOperatorOptions,
    marketOrganizationOptions,
    tourCategoryTypeOptions,
    tourCategoryOptions,
    allTourCategoryOptions,
    technicalVisitOptions,
    companyBaseCurrencyCode,
    selectedPreTourItemType,
  } = options;

  switch (resource) {
    case "pre-tours":
      return [
        { key: "planCode", label: "Plan Code", type: "text", required: true },
        { key: "title", label: "Title", type: "text", required: true },
        { key: "categoryId", label: "Tour Category", type: "select", required: true, options: allTourCategoryOptions },
        { key: "marketOrgId", label: "Market", type: "select", required: true, options: marketOrganizationOptions },
        { key: "operatorOrgId", label: "Operator", type: "select", required: true, options: preTourOperatorOptions },
        {
          key: "status",
          label: "Status",
          type: "select",
          defaultValue: "DRAFT",
          options: [
            { label: "DRAFT", value: "DRAFT" },
            { label: "QUOTED", value: "QUOTED" },
            { label: "APPROVED", value: "APPROVED" },
            { label: "BOOKED", value: "BOOKED" },
            { label: "IN_PROGRESS", value: "IN_PROGRESS" },
            { label: "COMPLETED", value: "COMPLETED" },
            { label: "CANCELLED", value: "CANCELLED" },
          ],
        },
        { key: "startDate", label: "Start Date", type: "datetime", required: true },
        { key: "endDate", label: "End Date", type: "datetime", required: true },
        { key: "totalNights", label: "Total Nights", type: "number", defaultValue: 0 },
        { key: "adults", label: "Adults", type: "number", defaultValue: 1 },
        { key: "children", label: "Children", type: "number", defaultValue: 0 },
        { key: "infants", label: "Infants", type: "number", defaultValue: 0 },
        { key: "preferredLanguage", label: "Language", type: "text", nullable: true },
        {
          key: "roomPreference",
          label: "Room Preference",
          type: "select",
          nullable: true,
          options: [
            { label: "DOUBLE", value: "DOUBLE" },
            { label: "TWIN", value: "TWIN" },
            { label: "MIXED", value: "MIXED" },
          ],
        },
        {
          key: "mealPreference",
          label: "Meal Preference",
          type: "select",
          nullable: true,
          options: [
            { label: "BB", value: "BB" },
            { label: "HB", value: "HB" },
            { label: "FB", value: "FB" },
            { label: "AI", value: "AI" },
          ],
        },
        { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
        {
          key: "exchangeRateMode",
          label: "FX Mode",
          type: "select",
          defaultValue: "AUTO",
          options: [
            { label: "AUTO", value: "AUTO" },
            { label: "MANUAL", value: "MANUAL" },
          ],
        },
        { key: "exchangeRate", label: "FX Rate", type: "number", defaultValue: 0 },
        {
          key: "priceMode",
          label: "Price Mode",
          type: "select",
          defaultValue: "EXCLUSIVE",
          options: [
            { label: "EXCLUSIVE", value: "EXCLUSIVE" },
            { label: "INCLUSIVE", value: "INCLUSIVE" },
          ],
        },
        { key: "pricingPolicy", label: "Pricing Policy JSON", type: "json", nullable: true },
        { key: "baseTotal", label: "Base Total", type: "number", defaultValue: 0 },
        { key: "taxTotal", label: "Tax Total", type: "number", defaultValue: 0 },
        { key: "grandTotal", label: "Grand Total", type: "number", defaultValue: 0 },
        { key: "version", label: "Version", type: "number", defaultValue: 1 },
        { key: "isLocked", label: "Locked", type: "boolean", defaultValue: false },
        { key: "notes", label: "Notes", type: "textarea", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-days":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "dayNumber", label: "Day Number", type: "number", required: true, defaultValue: 1 },
        { key: "date", label: "Date", type: "datetime", required: true },
        { key: "title", label: "Title", type: "text", nullable: true },
        { key: "startLocationId", label: "Start Location", type: "select", nullable: true, options: locationOptions },
        { key: "endLocationId", label: "End Location", type: "select", nullable: true, options: locationOptions },
        { key: "notes", label: "Notes", type: "textarea", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-items":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "dayId", label: "Day", type: "select", required: true, options: dayOptions },
        {
          key: "itemType",
          label: "Item Type",
          type: "select",
          defaultValue: "MISC",
          options: [
            { label: "ACTIVITY", value: "ACTIVITY" },
            { label: "ACCOMMODATION", value: "ACCOMMODATION" },
            { label: "GUIDE", value: "GUIDE" },
            { label: "CEREMONY", value: "CEREMONY" },
            { label: "SUPPLEMENT", value: "SUPPLEMENT" },
            { label: "MISC", value: "MISC" },
          ],
        },
        {
          key: "serviceId",
          label: "Service",
          type: "select",
          nullable: true,
          options: selectedPreTourItemType === "ACCOMMODATION" ? accommodationServiceOptions : serviceOptions,
        },
        { key: "title", label: "Title", type: "text", nullable: true },
        { key: "description", label: "Description", type: "textarea", nullable: true },
        { key: "startAt", label: "Start At", type: "datetime", nullable: true },
        { key: "endAt", label: "End At", type: "datetime", nullable: true },
        { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
        { key: "pax", label: "Pax", type: "number", nullable: true },
        { key: "units", label: "Units", type: "number", nullable: true },
        { key: "nights", label: "Nights", type: "number", nullable: true },
        { key: "rooms", label: "Rooms JSON", type: "json", nullable: true },
        { key: "locationId", label: "Location", type: "select", nullable: true, options: locationOptions },
        { key: "rateId", label: "Rate Id", type: "text", nullable: true },
        { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
        { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
        { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
        { key: "pricingSnapshot", label: "Pricing Snapshot JSON", type: "json", nullable: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          defaultValue: "PLANNED",
          options: [
            { label: "PLANNED", value: "PLANNED" },
            { label: "CONFIRMED", value: "CONFIRMED" },
            { label: "CANCELLED", value: "CANCELLED" },
            { label: "COMPLETED", value: "COMPLETED" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-item-addons":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "planItemId", label: "Plan Item", type: "select", required: true, options: filteredItemOptions },
        {
          key: "addonType",
          label: "Addon Type",
          type: "select",
          defaultValue: "SUPPLEMENT",
          options: [
            { label: "SUPPLEMENT", value: "SUPPLEMENT" },
            { label: "MISC", value: "MISC" },
          ],
        },
        { key: "addonServiceId", label: "Addon Service", type: "text", nullable: true },
        { key: "title", label: "Title", type: "text", required: true },
        { key: "qty", label: "Quantity", type: "number", defaultValue: 1 },
        { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
        { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
        { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
        { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
        { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-totals":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
        { key: "totalsByType", label: "Totals By Type JSON", type: "json", nullable: true },
        { key: "baseTotal", label: "Base Total", type: "number", required: true, defaultValue: 0 },
        { key: "taxTotal", label: "Tax Total", type: "number", required: true, defaultValue: 0 },
        { key: "grandTotal", label: "Grand Total", type: "number", required: true, defaultValue: 0 },
        { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-categories":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "typeId", label: "Category Type", type: "select", required: true, options: tourCategoryTypeOptions },
        { key: "categoryId", label: "Category", type: "select", required: true, options: tourCategoryOptions },
        { key: "notes", label: "Notes", type: "textarea", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    case "pre-tour-technical-visits":
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
        { key: "dayId", label: "Day", type: "select", nullable: true, options: dayOptions },
        { key: "technicalVisitId", label: "Field Visit", type: "select", required: true, options: technicalVisitOptions },
        { key: "notes", label: "Notes", type: "textarea", nullable: true },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    default:
      return [];
  }
}

export function getVisiblePreTourFields(
  fields: Field[],
  resource: PreTourResourceKey,
  isPlanManageMode: boolean
) {
  if (!isPlanManageMode) return fields;
  if (resource === "pre-tour-days") return fields.filter((field) => field.key !== "planId");
  if (resource === "pre-tour-items") {
    return fields.filter(
      (field) =>
        field.key !== "planId" &&
        field.key !== "dayId" &&
        field.key !== "currencyCode" &&
        field.key !== "priceMode"
    );
  }
  if (resource === "pre-tour-item-addons") {
    return fields.filter((field) => field.key !== "planId" && field.key !== "planItemId");
  }
  if (resource === "pre-tour-totals") return fields.filter((field) => field.key !== "planId");
  if (resource === "pre-tour-categories") return fields.filter((field) => field.key !== "planId");
  if (resource === "pre-tour-technical-visits") return fields.filter((field) => field.key !== "planId");
  return fields;
}
