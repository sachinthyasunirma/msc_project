export const PRE_TOUR_ITEM_TYPES = [
  "ACCOMMODATION",
  "ACTIVITY",
  "TRANSPORT",
  "GUIDE",
  "SUPPLEMENT",
  "MISC",
] as const;

export type PreTourAllocationItemType = (typeof PRE_TOUR_ITEM_TYPES)[number];

export const PRE_TOUR_MARKUP_MODES = ["NONE", "PERCENT", "FIXED"] as const;

export type PreTourMarkupMode = (typeof PRE_TOUR_MARKUP_MODES)[number];

export type PreTourPriceMode = "EXCLUSIVE" | "INCLUSIVE";

export type PreTourRateSourceType = "MASTER_RATE" | "CONTRACT_RATE" | "MANUAL";

export type PreTourPricingAmount = {
  currencyCode: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type PreTourCommercialPricing = {
  markupMode: PreTourMarkupMode;
  markupValue: number;
  sellBaseAmount: number;
  sellTaxAmount: number;
  sellTotalAmount: number;
};

export type PreTourRateCard = {
  sourceRateId: string;
  sourceType: PreTourRateSourceType;
  sourceLabel: string;
  serviceId: string;
  serviceLabel: string;
  currencyCode: string;
  effectiveDate: string;
  validFrom: string | null;
  validTo: string | null;
  buyBaseAmount: number;
  buyTaxAmount: number;
  buyTotalAmount: number;
  pricingDimensions: Record<string, unknown>;
  locked: boolean;
};

export type PreTourAccommodationRateCard = PreTourRateCard & {
  hotelId: string;
  hotelCode: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeCode: string;
  roomTypeName: string;
  roomBasis: string | null;
  maxOccupancy: number | null;
  roomRateHeaderId: string | null;
  roomRateHeaderCode: string | null;
  roomRateHeaderName: string | null;
  seasonId: string | null;
};

export type ResolveAccommodationRateRequest = {
  hotelId: string;
  travelDate: string;
  roomTypeId?: string | null;
  roomBasis?: string | null;
};

export type ResolveAccommodationRateResponse = {
  options: PreTourAccommodationRateCard[];
};

export type PreTourPricingSnapshot = {
  snapshotVersion: 1;
  source: {
    sourceRateType: PreTourRateSourceType;
    sourceRateId: string | null;
    sourceLabel: string | null;
    serviceId: string | null;
    serviceLabel: string | null;
    effectiveDate: string | null;
    validFrom: string | null;
    validTo: string | null;
    locked: boolean;
  };
  dimensions: Record<string, unknown>;
  buy: PreTourPricingAmount;
  commercial: {
    markupMode: PreTourMarkupMode;
    markupValue: number;
    sellBaseAmount: number;
    sellTaxAmount: number;
    sellTotalAmount: number;
  };
  override: {
    applied: boolean;
    reason: string | null;
  };
  priceMode: PreTourPriceMode;
  generatedAt: string;
};

export type PreTourAccommodationAllocationState = {
  hotelId: string;
  stayDate: string;
  roomTypeId: string;
  roomBasis: string;
  occupancy: string;
  roomCount: string;
  nights: string;
  roomingContext: string;
};

export type PreTourActivityAllocationState = {
  activityId: string;
  unitBasis: string;
  paxSlab: string;
  ageBand: string;
  quantity: string;
};

export type PreTourTransportAllocationState = {
  vehicleTypeId: string;
  unitBasis: string;
  routeLabel: string;
  quantity: string;
  pax: string;
};

export type PreTourGuideAllocationState = {
  guideId: string;
  language: string;
  unitBasis: string;
  paxSlab: string;
  quantity: string;
};

export type PreTourSupplementAllocationState = {
  serviceLabel: string;
  unitBasis: string;
  quantity: string;
};

export type PreTourItemAllocationFormState = {
  code: string;
  title: string;
  description: string;
  notes: string;
  status: "PLANNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  itemType: PreTourAllocationItemType;
  priceMode: PreTourPriceMode;
  currencyCode: string;
  pax: string;
  units: string;
  nights: string;
  buyBaseAmount: string;
  buyTaxAmount: string;
  overrideSourceRate: boolean;
  overrideReason: string;
  markupMode: PreTourMarkupMode;
  markupValue: string;
  selectedRateId: string;
  accommodation: PreTourAccommodationAllocationState;
  activity: PreTourActivityAllocationState;
  transport: PreTourTransportAllocationState;
  guide: PreTourGuideAllocationState;
  supplement: PreTourSupplementAllocationState;
};
