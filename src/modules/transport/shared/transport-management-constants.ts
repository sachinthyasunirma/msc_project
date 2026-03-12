import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

export const TRANSPORT_RESOURCE_META: Record<
  TransportResourceKey,
  { title: string; description: string }
> = {
  locations: {
    title: "Transport Locations",
    description: "Manage pickup and drop locations used by transport rules.",
  },
  "vehicle-categories": {
    title: "Transport Vehicle Categories",
    description: "Manage high-level vehicle groups (Sedan, Van, SUV...).",
  },
  "vehicle-types": {
    title: "Transport Vehicle Types",
    description: "Manage detailed vehicle definitions and capacities.",
  },
  "location-rates": {
    title: "Transport Location Rates",
    description: "Manage point-to-point transport rates.",
  },
  "location-expenses": {
    title: "Transport Location Expenses",
    description: "Manage additional location-based charges.",
  },
  "pax-vehicle-rates": {
    title: "Transport Pax Vehicle Rates",
    description: "Manage passenger pricing rules for transport.",
  },
  "baggage-rates": {
    title: "Transport Baggage Rates",
    description: "Manage baggage transportation pricing.",
  },
};

export const TRANSPORT_RESOURCE_COLUMNS: Record<
  TransportResourceKey,
  Array<{ key: string; label: string }>
> = {
  locations: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "country", label: "Country" },
    { key: "region", label: "Region" },
    { key: "isActive", label: "Status" },
  ],
  "vehicle-categories": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "sortOrder", label: "Sort" },
    { key: "isActive", label: "Status" },
  ],
  "vehicle-types": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "categoryId", label: "Category" },
    { key: "paxCapacity", label: "Pax" },
    { key: "isActive", label: "Status" },
  ],
  "location-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "location-expenses": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "locationId", label: "Location" },
    { key: "expenseType", label: "Type" },
    { key: "amount", label: "Amount" },
    { key: "isActive", label: "Status" },
  ],
  "pax-vehicle-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "baggage-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "unit", label: "Unit" },
    { key: "pricingModel", label: "Model" },
    { key: "isActive", label: "Status" },
  ],
};
