import type {
  ItineraryBlockFamily,
  ItineraryDocumentLayout,
  ItineraryPageFamily,
  ItineraryWebLayout,
  ItineraryWebSectionFamily,
} from "@/modules/itinerary/shared/itinerary-types";

export const DOCUMENT_PAGE_FAMILY_REGISTRY: Record<
  ItineraryPageFamily,
  {
    label: string;
    description: string;
    supportedLayouts: ItineraryDocumentLayout[];
    insertableBlocks: ItineraryBlockFamily[];
  }
> = {
  COVER: {
    label: "Cover",
    description: "Branded opening page with title, route, and hero imagery.",
    supportedLayouts: ["EDITORIAL_COVER"],
    insertableBlocks: ["CHIP_LIST"],
  },
  TRIP_SUMMARY: {
    label: "Trip Summary",
    description: "Quick facts and key highlights for the traveler or sales team.",
    supportedLayouts: ["FACT_GRID", "FEATURE_GRID"],
    insertableBlocks: ["FACT_CARD", "HIGHLIGHT_CARD"],
  },
  ROUTE_OVERVIEW: {
    label: "Route Overview",
    description: "High-level route sequence with destination storytelling.",
    supportedLayouts: ["ROUTE_STORY", "FEATURE_GRID"],
    insertableBlocks: ["ROUTE_STOP", "RICH_TEXT"],
  },
  HIGHLIGHTS: {
    label: "Highlights",
    description: "Feature-led summary of signature stays, sights, and moments.",
    supportedLayouts: ["FEATURE_GRID", "FACT_GRID"],
    insertableBlocks: ["HIGHLIGHT_CARD"],
  },
  DAY_DETAIL: {
    label: "Day Detail",
    description: "Day-by-day narrative layout using structured service items.",
    supportedLayouts: ["TIMELINE_SPREAD"],
    insertableBlocks: ["DAY_ITEM_CARD", "DAY_STORY"],
  },
  ACCOMMODATION_SUMMARY: {
    label: "Accommodation Summary",
    description: "Matrix or summary layout for hotels, nights, and meal basis.",
    supportedLayouts: ["MATRIX_TABLE", "FEATURE_GRID"],
    insertableBlocks: ["STAY_CARD"],
  },
  TRANSPORT_SUMMARY: {
    label: "Transport Summary",
    description: "Transfer and routing summary with vehicle and timing data.",
    supportedLayouts: ["MATRIX_TABLE", "FACT_GRID"],
    insertableBlocks: ["TRANSFER_CARD"],
  },
  PRICING_SUMMARY: {
    label: "Pricing Summary",
    description: "Commercial view for totals and by-type cost buckets.",
    supportedLayouts: ["COMMERCIAL_SUMMARY", "MATRIX_TABLE"],
    insertableBlocks: ["PRICING_PANEL"],
  },
  POLICY_NOTES: {
    label: "Policy Notes",
    description: "Travel notes, commercial terms, and client-facing guidance.",
    supportedLayouts: ["POLICY_COLUMNS", "FACT_GRID"],
    insertableBlocks: ["POLICY_GROUP"],
  },
};

export const WEB_SECTION_FAMILY_REGISTRY: Record<
  ItineraryWebSectionFamily,
  {
    label: string;
    description: string;
    supportedLayouts: ItineraryWebLayout[];
    insertableBlocks: ItineraryBlockFamily[];
  }
> = {
  HERO: {
    label: "Hero",
    description: "Landing-section hero with strong imagery and trip positioning.",
    supportedLayouts: ["IMMERSIVE_HERO"],
    insertableBlocks: ["CHIP_LIST", "RICH_TEXT"],
  },
  QUICK_FACTS: {
    label: "Quick Facts",
    description: "Responsive summary cards for trip details and highlights.",
    supportedLayouts: ["FACT_RIBBON", "MEDIA_STORY_GRID"],
    insertableBlocks: ["FACT_CARD", "HIGHLIGHT_CARD"],
  },
  ROUTE: {
    label: "Route",
    description: "Travel path and destination story section.",
    supportedLayouts: ["ROUTE_SCROLLER", "TIMELINE_CARDS"],
    insertableBlocks: ["ROUTE_STOP", "RICH_TEXT"],
  },
  TIMELINE: {
    label: "Timeline",
    description: "Scrollable day sequence with structured service cards.",
    supportedLayouts: ["TIMELINE_CARDS"],
    insertableBlocks: ["DAY_STORY"],
  },
  STAYS: {
    label: "Stays",
    description: "Hotel/stay section for curated accommodation storytelling.",
    supportedLayouts: ["STAY_COLLECTION", "MEDIA_STORY_GRID"],
    insertableBlocks: ["STAY_CARD"],
  },
  GALLERY: {
    label: "Gallery",
    description: "Image-forward content band for destination and activity media.",
    supportedLayouts: ["MEDIA_STORY_GRID", "STAY_COLLECTION"],
    insertableBlocks: ["HIGHLIGHT_CARD"],
  },
  PRICING: {
    label: "Pricing",
    description: "Commercial section for pricing summary and by-type totals.",
    supportedLayouts: ["COMMERCIAL_PANEL"],
    insertableBlocks: ["PRICING_PANEL"],
  },
  TRAVEL_NOTES: {
    label: "Travel Notes",
    description: "Notes, terms, and operational guidance block.",
    supportedLayouts: ["TRAVEL_NOTES_STACK", "FACT_RIBBON"],
    insertableBlocks: ["POLICY_GROUP"],
  },
  SUPPORT_FOOTER: {
    label: "Support Footer",
    description: "Footer strip with support context and planning metadata.",
    supportedLayouts: ["SUPPORT_STRIP"],
    insertableBlocks: ["SUPPORT_LINE"],
  },
};
