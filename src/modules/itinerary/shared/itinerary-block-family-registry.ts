import type {
  ItineraryBlockFamily,
  ItineraryPageFamily,
  ItinerarySurface,
  ItineraryWebSectionFamily,
} from "@/modules/itinerary/shared/itinerary-types";

type BlockFamilyConfig = {
  label: string;
  description: string;
  surfaces: ItinerarySurface[];
  richText?: boolean;
  mediaCapable?: boolean;
  defaultLayoutVariant: string;
  supportedLayoutVariants: string[];
  documentFamilies?: ItineraryPageFamily[];
  webFamilies?: ItineraryWebSectionFamily[];
};

export const ITINERARY_BLOCK_FAMILY_REGISTRY: Record<ItineraryBlockFamily, BlockFamilyConfig> = {
  TITLE: {
    label: "Title",
    description: "Primary headline or section heading.",
    surfaces: ["DOCUMENT", "WEB"],
    defaultLayoutVariant: "EDITORIAL",
    supportedLayoutVariants: ["EDITORIAL", "COMPACT"],
  },
  RICH_TEXT: {
    label: "Rich Text",
    description: "Safe narrative text with controlled formatting.",
    surfaces: ["DOCUMENT", "WEB"],
    richText: true,
    defaultLayoutVariant: "BALANCED",
    supportedLayoutVariants: ["COMPACT", "BALANCED", "CINEMATIC"],
  },
  CHIP_LIST: {
    label: "Chip List",
    description: "Short travel fact or hero chip list.",
    surfaces: ["DOCUMENT", "WEB"],
    defaultLayoutVariant: "PILL",
    supportedLayoutVariants: ["PILL", "STACK"],
  },
  FACT_CARD: {
    label: "Fact Card",
    description: "Structured fact/value card.",
    surfaces: ["DOCUMENT", "WEB"],
    defaultLayoutVariant: "CARD",
    supportedLayoutVariants: ["CARD", "MINIMAL"],
    documentFamilies: ["TRIP_SUMMARY"],
    webFamilies: ["QUICK_FACTS"],
  },
  HIGHLIGHT_CARD: {
    label: "Highlight Card",
    description: "Story-led card with optional media.",
    surfaces: ["DOCUMENT", "WEB"],
    richText: true,
    mediaCapable: true,
    defaultLayoutVariant: "FEATURE",
    supportedLayoutVariants: ["FEATURE", "COMPACT", "CINEMATIC"],
    documentFamilies: ["TRIP_SUMMARY", "HIGHLIGHTS"],
    webFamilies: ["QUICK_FACTS", "GALLERY"],
  },
  ROUTE_STOP: {
    label: "Route Stop",
    description: "Ordered route stop or roadmap item.",
    surfaces: ["DOCUMENT", "WEB"],
    defaultLayoutVariant: "NUMBERED",
    supportedLayoutVariants: ["NUMBERED", "INLINE"],
    documentFamilies: ["ROUTE_OVERVIEW"],
    webFamilies: ["ROUTE"],
  },
  DAY_ITEM_CARD: {
    label: "Day Item",
    description: "Structured itinerary item inside a day page.",
    surfaces: ["DOCUMENT"],
    richText: true,
    mediaCapable: true,
    defaultLayoutVariant: "TIMELINE",
    supportedLayoutVariants: ["TIMELINE", "CARD"],
    documentFamilies: ["DAY_DETAIL"],
  },
  DAY_STORY: {
    label: "Day Story",
    description: "Narrative day summary block.",
    surfaces: ["DOCUMENT", "WEB"],
    richText: true,
    defaultLayoutVariant: "EDITORIAL",
    supportedLayoutVariants: ["EDITORIAL", "COMPACT"],
    documentFamilies: ["DAY_DETAIL"],
    webFamilies: ["TIMELINE"],
  },
  STAY_CARD: {
    label: "Stay Card",
    description: "Accommodation card with room and meal context.",
    surfaces: ["DOCUMENT", "WEB"],
    richText: true,
    mediaCapable: true,
    defaultLayoutVariant: "CARD",
    supportedLayoutVariants: ["CARD", "CINEMATIC", "COMPACT"],
    documentFamilies: ["ACCOMMODATION_SUMMARY"],
    webFamilies: ["STAYS"],
  },
  TRANSFER_CARD: {
    label: "Transfer Card",
    description: "Transfer or transport block.",
    surfaces: ["DOCUMENT"],
    richText: true,
    defaultLayoutVariant: "CARD",
    supportedLayoutVariants: ["CARD", "INLINE"],
    documentFamilies: ["TRANSPORT_SUMMARY"],
  },
  PRICING_PANEL: {
    label: "Pricing Panel",
    description: "Commercial totals and cost snapshot block.",
    surfaces: ["DOCUMENT", "WEB"],
    defaultLayoutVariant: "SUMMARY",
    supportedLayoutVariants: ["SUMMARY", "TABLE"],
    documentFamilies: ["PRICING_SUMMARY"],
    webFamilies: ["PRICING"],
  },
  POLICY_GROUP: {
    label: "Policy Group",
    description: "Policy or terms group with bullet points.",
    surfaces: ["DOCUMENT", "WEB"],
    richText: true,
    defaultLayoutVariant: "STACK",
    supportedLayoutVariants: ["STACK", "CARD"],
    documentFamilies: ["POLICY_NOTES"],
    webFamilies: ["TRAVEL_NOTES"],
  },
  SUPPORT_LINE: {
    label: "Support Line",
    description: "Support, emergency, or footer line.",
    surfaces: ["WEB"],
    richText: true,
    defaultLayoutVariant: "INLINE",
    supportedLayoutVariants: ["INLINE", "CALLOUT"],
    webFamilies: ["SUPPORT_FOOTER"],
  },
};
