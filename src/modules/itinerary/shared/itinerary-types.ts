export const ITINERARY_OUTPUT_MODES = ["DOCUMENT", "WEB", "BOTH"] as const;
export type ItineraryOutputMode = (typeof ITINERARY_OUTPUT_MODES)[number];

export const ITINERARY_SURFACES = ["DOCUMENT", "WEB"] as const;
export type ItinerarySurface = (typeof ITINERARY_SURFACES)[number];

export const ITINERARY_STATUSES = ["DRAFT", "ARCHIVED"] as const;
export type ItineraryStatus = (typeof ITINERARY_STATUSES)[number];

export const ITINERARY_PAGE_FAMILIES = [
  "COVER",
  "TRIP_SUMMARY",
  "ROUTE_OVERVIEW",
  "HIGHLIGHTS",
  "DAY_DETAIL",
  "ACCOMMODATION_SUMMARY",
  "TRANSPORT_SUMMARY",
  "PRICING_SUMMARY",
  "POLICY_NOTES",
] as const;
export type ItineraryPageFamily = (typeof ITINERARY_PAGE_FAMILIES)[number];

export const ITINERARY_BLOCK_FAMILIES = [
  "TITLE",
  "RICH_TEXT",
  "CHIP_LIST",
  "FACT_CARD",
  "HIGHLIGHT_CARD",
  "ROUTE_STOP",
  "DAY_ITEM_CARD",
  "DAY_STORY",
  "STAY_CARD",
  "TRANSFER_CARD",
  "PRICING_PANEL",
  "POLICY_GROUP",
  "SUPPORT_LINE",
] as const;
export type ItineraryBlockFamily = (typeof ITINERARY_BLOCK_FAMILIES)[number];

export const ITINERARY_WEB_SECTION_FAMILIES = [
  "HERO",
  "QUICK_FACTS",
  "ROUTE",
  "TIMELINE",
  "STAYS",
  "GALLERY",
  "PRICING",
  "TRAVEL_NOTES",
  "SUPPORT_FOOTER",
] as const;
export type ItineraryWebSectionFamily = (typeof ITINERARY_WEB_SECTION_FAMILIES)[number];

export const ITINERARY_DOCUMENT_LAYOUTS = [
  "EDITORIAL_COVER",
  "FACT_GRID",
  "ROUTE_STORY",
  "FEATURE_GRID",
  "TIMELINE_SPREAD",
  "MATRIX_TABLE",
  "COMMERCIAL_SUMMARY",
  "POLICY_COLUMNS",
] as const;
export type ItineraryDocumentLayout = (typeof ITINERARY_DOCUMENT_LAYOUTS)[number];

export const ITINERARY_WEB_LAYOUTS = [
  "IMMERSIVE_HERO",
  "FACT_RIBBON",
  "ROUTE_SCROLLER",
  "TIMELINE_CARDS",
  "STAY_COLLECTION",
  "MEDIA_STORY_GRID",
  "COMMERCIAL_PANEL",
  "TRAVEL_NOTES_STACK",
  "SUPPORT_STRIP",
] as const;
export type ItineraryWebLayout = (typeof ITINERARY_WEB_LAYOUTS)[number];

export const ITINERARY_EXPORT_FORMATS = ["PDF", "DOCX"] as const;
export type ItineraryExportFormat = (typeof ITINERARY_EXPORT_FORMATS)[number];

export const ITINERARY_EXPORT_STATUSES = ["PREPARED", "FAILED"] as const;
export type ItineraryExportStatus = (typeof ITINERARY_EXPORT_STATUSES)[number];

export const ITINERARY_SHARE_SURFACES = ["WEB", "DOCUMENT"] as const;
export type ItineraryShareSurface = (typeof ITINERARY_SHARE_SURFACES)[number];

export const ITINERARY_THEME_TONES = ["SANDSTONE", "OCEAN", "FOREST", "SUNSET"] as const;
export type ItineraryThemeTone = (typeof ITINERARY_THEME_TONES)[number];

export const ITINERARY_TYPOGRAPHY_THEMES = ["EDITORIAL", "CLASSIC", "CONTEMPORARY"] as const;
export type ItineraryTypographyTheme = (typeof ITINERARY_TYPOGRAPHY_THEMES)[number];

export const ITINERARY_DENSITY_MODES = ["COMPACT", "BALANCED", "CINEMATIC"] as const;
export type ItineraryDensityMode = (typeof ITINERARY_DENSITY_MODES)[number];

export const ITINERARY_DOCUMENT_PAGE_SIZES = ["A4", "LETTER"] as const;
export type ItineraryDocumentPageSize = (typeof ITINERARY_DOCUMENT_PAGE_SIZES)[number];

export const ITINERARY_DOCUMENT_ORIENTATIONS = ["PORTRAIT", "LANDSCAPE"] as const;
export type ItineraryDocumentOrientation = (typeof ITINERARY_DOCUMENT_ORIENTATIONS)[number];

export type ItineraryMediaRef = {
  kind: "ASSET" | "URL";
  src: string;
  alt: string;
  caption?: string | null;
  assetId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  shareSafe?: boolean | null;
  role?: "HERO" | "GALLERY" | "DETAIL" | "CARD" | null;
};

export type ItineraryFact = {
  label: string;
  value: string;
};

export type ItineraryHighlight = {
  title: string;
  description: string;
  eyebrow?: string | null;
  image?: ItineraryMediaRef | null;
};

export type ItineraryDayItem = {
  id: string;
  type: string;
  title: string;
  timeLabel?: string | null;
  summary?: string | null;
  routeLabel?: string | null;
  amountLabel?: string | null;
  image?: ItineraryMediaRef | null;
};

export type ItineraryDayBlock = {
  id: string;
  dayNumber: number;
  dateLabel: string;
  title: string;
  routeLabel?: string | null;
  narrative?: string | null;
  items: ItineraryDayItem[];
  heroImage?: ItineraryMediaRef | null;
};

export type ItineraryStaySummary = {
  id: string;
  hotelId?: string | null;
  name: string;
  city?: string | null;
  country?: string | null;
  starLabel?: string | null;
  nights: number;
  mealPlan?: string | null;
  roomSummary?: string | null;
  image?: ItineraryMediaRef | null;
};

export type ItineraryTransferSummary = {
  id: string;
  title: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  vehicleLabel?: string | null;
  startLabel?: string | null;
  endLabel?: string | null;
  notes?: string | null;
};

export type ItineraryPricingSummary = {
  currencyCode: string;
  baseTotal: string;
  taxTotal: string;
  grandTotal: string;
  estimatedPerGuestLabel?: string | null;
  totalsByType: Array<{
    type: string;
    base: string;
    tax: string;
    total: string;
  }>;
};

export type ItineraryPolicyBlock = {
  title: string;
  items: string[];
};

export type ItinerarySurfaceState = {
  isVisible?: boolean;
  isLocked?: boolean;
  backgroundStyle?: "AUTO" | "SOFT" | "BOLD";
  notes?: string | null;
  sourceMode?: "SOURCE" | "OVERRIDE" | "MANUAL";
};

export type ItineraryBlockStudioState = {
  family: ItineraryBlockFamily;
  sourceMode: "SOURCE" | "OVERRIDE" | "MANUAL";
  bindingKey?: string | null;
  notes?: string | null;
  layoutVariant?: string | null;
};

export type ItineraryStudioTheme = {
  documentThemeName: string;
  webThemeName: string;
  tone: ItineraryThemeTone;
  typography: ItineraryTypographyTheme;
  density: ItineraryDensityMode;
  documentPageSize: ItineraryDocumentPageSize;
  documentOrientation: ItineraryDocumentOrientation;
  brandLabel?: string | null;
};

export type ItineraryDocumentPageBase = {
  id: string;
  family: ItineraryPageFamily;
  layoutVariant: ItineraryDocumentLayout;
  anchorLabel: string;
  state?: ItinerarySurfaceState;
};

export type ItineraryWebSectionBase = {
  id: string;
  family: ItineraryWebSectionFamily;
  layoutVariant: ItineraryWebLayout;
  anchorLabel: string;
  state?: ItinerarySurfaceState;
};

export type ItineraryDocumentPage =
  | (ItineraryDocumentPageBase & {
      family: "COVER";
      title: string;
      subtitle: string;
      heroImage?: ItineraryMediaRef | null;
      meta: string[];
      routeLabel?: string | null;
    })
  | (ItineraryDocumentPageBase & {
      family: "TRIP_SUMMARY";
      title: string;
      facts: ItineraryFact[];
      highlights: ItineraryHighlight[];
    })
  | (ItineraryDocumentPageBase & {
      family: "ROUTE_OVERVIEW";
      title: string;
      routeStops: string[];
      summary: string;
      image?: ItineraryMediaRef | null;
    })
  | (ItineraryDocumentPageBase & {
      family: "HIGHLIGHTS";
      title: string;
      items: ItineraryHighlight[];
    })
  | (ItineraryDocumentPageBase & {
      family: "DAY_DETAIL";
      title: string;
      day: ItineraryDayBlock;
    })
  | (ItineraryDocumentPageBase & {
      family: "ACCOMMODATION_SUMMARY";
      title: string;
      stays: ItineraryStaySummary[];
    })
  | (ItineraryDocumentPageBase & {
      family: "TRANSPORT_SUMMARY";
      title: string;
      transfers: ItineraryTransferSummary[];
    })
  | (ItineraryDocumentPageBase & {
      family: "PRICING_SUMMARY";
      title: string;
      pricing: ItineraryPricingSummary;
    })
  | (ItineraryDocumentPageBase & {
      family: "POLICY_NOTES";
      title: string;
      blocks: ItineraryPolicyBlock[];
    });

export type ItineraryWebSection =
  | (ItineraryWebSectionBase & {
      family: "HERO";
      title: string;
      subtitle: string;
      heroImage?: ItineraryMediaRef | null;
      chips: string[];
    })
  | (ItineraryWebSectionBase & {
      family: "QUICK_FACTS";
      title: string;
      facts: ItineraryFact[];
      highlights: ItineraryHighlight[];
    })
  | (ItineraryWebSectionBase & {
      family: "ROUTE";
      title: string;
      routeStops: string[];
      summary: string;
      image?: ItineraryMediaRef | null;
    })
  | (ItineraryWebSectionBase & {
      family: "TIMELINE";
      title: string;
      days: ItineraryDayBlock[];
    })
  | (ItineraryWebSectionBase & {
      family: "STAYS";
      title: string;
      stays: ItineraryStaySummary[];
    })
  | (ItineraryWebSectionBase & {
      family: "GALLERY";
      title: string;
      items: ItineraryHighlight[];
    })
  | (ItineraryWebSectionBase & {
      family: "PRICING";
      title: string;
      pricing: ItineraryPricingSummary;
    })
  | (ItineraryWebSectionBase & {
      family: "TRAVEL_NOTES";
      title: string;
      blocks: ItineraryPolicyBlock[];
    })
  | (ItineraryWebSectionBase & {
      family: "SUPPORT_FOOTER";
      title: string;
      lines: string[];
    });

export type ItineraryStructuredDraft = {
  version: 1 | 2 | 3;
  overview: {
    planId: string;
    title: string;
    subtitle: string;
    referenceNo: string;
    planCode: string;
    status: string;
    startDateLabel: string;
    endDateLabel: string;
    routeLabel: string;
    paxLabel: string;
    durationLabel: string;
    operatorLabel?: string | null;
    marketLabel?: string | null;
    categoryLabel?: string | null;
    preferredLanguage?: string | null;
    mealPreference?: string | null;
    notes?: string | null;
    heroImage?: ItineraryMediaRef | null;
  };
  theme?: ItineraryStudioTheme;
  studio?: {
    lastSavedAt?: string | null;
    lastEditedAt?: string | null;
    lastEditedByName?: string | null;
    blockStates?: Record<string, ItineraryBlockStudioState>;
  };
  document: {
    pages: ItineraryDocumentPage[];
  };
  web: {
    sections: ItineraryWebSection[];
  };
};

export type ItinerarySourceSnapshot = {
  planId: string;
  planVersion: number;
  dayCount: number;
  itemCount: number;
  totalCount: number;
  generatedAt: string;
};

export type ItineraryGenerationOptions = {
  outputMode: ItineraryOutputMode;
  includeMedia: boolean;
  includeCommercials: boolean;
  includePolicies: boolean;
};

export type ItineraryTemplateDescriptor = {
  key: string;
  title: string;
  description: string;
  badge: string;
  supportedOutputs: ItineraryOutputMode[];
  documentTheme: string;
  webTheme: string;
  pageComposition: {
    document: Array<{ family: ItineraryPageFamily; layoutVariant: ItineraryDocumentLayout }>;
    web: Array<{ family: ItineraryWebSectionFamily; layoutVariant: ItineraryWebLayout }>;
  };
  documentFamilies: ItineraryPageFamily[];
  webFamilies: ItineraryWebSectionFamily[];
};

export type ItinerarySummaryRecord = {
  id: string;
  code: string;
  title: string;
  status: ItineraryStatus;
  planId: string;
  templateKey: string;
  outputMode: ItineraryOutputMode;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type ItineraryExportRecord = {
  id: string;
  itineraryId: string;
  versionNumber: number;
  format: ItineraryExportFormat;
  status: ItineraryExportStatus;
  fileName: string;
  createdAt: string;
  downloadUrl: string;
};

export type ItineraryShareRecord = {
  id: string;
  itineraryId: string;
  versionNumber: number;
  surface: ItineraryShareSurface;
  shareUrl: string | null;
  tokenHint: string;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type ItineraryLauncherPayload = {
  plan: {
    id: string;
    title: string;
    referenceNo: string;
    planCode: string;
    status: string;
    startDate: string;
    endDate: string;
    totalNights: number;
    adults: number;
    children: number;
    currencyCode: string;
  };
  templates: ItineraryTemplateDescriptor[];
  itineraries: ItinerarySummaryRecord[];
};

export type ItineraryPreviewPayload = {
  itinerary: ItinerarySummaryRecord;
  template: ItineraryTemplateDescriptor | null;
  exports: ItineraryExportRecord[];
  shares: ItineraryShareRecord[];
  currentVersion: {
    id: string;
    versionNumber: number;
    createdAt: string;
    generationOptions: ItineraryGenerationOptions | null;
    draft: ItineraryStructuredDraft;
  };
};

export type ItineraryPublicSharePayload = {
  share: ItineraryShareRecord;
  itinerary: Pick<ItinerarySummaryRecord, "id" | "title" | "templateKey" | "outputMode">;
  template: ItineraryTemplateDescriptor | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    createdAt: string;
    draft: ItineraryStructuredDraft;
  };
};
