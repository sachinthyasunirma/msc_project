"use client";

import Link from "next/link";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileStack,
  Globe2,
  GripVertical,
  Link2,
  MoreHorizontal,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getErrorMessage, notify, notifyApiError } from "@/lib/notify";
import {
  createItineraryExportHook,
  createItineraryShareLink,
  revokeItineraryShareLink,
  updateItineraryDraftVersion,
} from "@/modules/itinerary/lib/itinerary-api";
import {
  DOCUMENT_PAGE_FAMILY_REGISTRY,
  WEB_SECTION_FAMILY_REGISTRY,
} from "@/modules/itinerary/shared/itinerary-page-family-registry";
import { ITINERARY_BLOCK_FAMILY_REGISTRY } from "@/modules/itinerary/shared/itinerary-block-family-registry";
import {
  getDocumentBlockDescriptors,
  getWebBlockDescriptors,
  ItineraryStudioDocumentCanvasPage,
  ItineraryStudioWebCanvasSection,
} from "@/modules/itinerary/ui/components/itinerary-studio-canvas";
import type {
  ItineraryBlockFamily,
  ItineraryBlockStudioState,
  ItineraryDensityMode,
  ItineraryDocumentLayout,
  ItineraryDocumentOrientation,
  ItineraryDocumentPage,
  ItineraryDocumentPageSize,
  ItineraryFact,
  ItineraryHighlight,
  ItineraryMediaRef,
  ItineraryPageFamily,
  ItineraryPolicyBlock,
  ItineraryPreviewPayload,
  ItineraryShareSurface,
  ItineraryStaySummary,
  ItineraryStructuredDraft,
  ItinerarySurface,
  ItinerarySurfaceState,
  ItineraryThemeTone,
  ItineraryTransferSummary,
  ItineraryTypographyTheme,
  ItineraryWebLayout,
  ItineraryWebSection,
  ItineraryWebSectionFamily,
} from "@/modules/itinerary/shared/itinerary-types";

type ItineraryStudioViewProps = {
  payload: ItineraryPreviewPayload;
  initialSurface: ItinerarySurface;
};

type StudioSelection =
  | { kind: "DOCUMENT"; surface: ItinerarySurface }
  | { kind: "PAGE"; surface: "DOCUMENT"; itemId: string }
  | { kind: "SECTION"; surface: "WEB"; itemId: string }
  | { kind: "BLOCK"; surface: ItinerarySurface; itemId: string; blockId: string };

type CanvasMode = "STACK" | "FOCUSED";
type CanvasChrome = "STUDIO" | "PREVIEW";
type SaveState = "saved" | "dirty" | "saving" | "error";

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function moveItem<T extends { id: string }>(items: T[], activeId: string, targetId: string) {
  const fromIndex = items.findIndex((item) => item.id === activeId);
  const toIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function collectMediaLibrary(value: unknown, bucket = new Map<string, ItineraryMediaRef>()) {
  if (!value) return bucket;
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectMediaLibrary(entry, bucket);
    }
    return bucket;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "src" in value &&
    typeof (value as ItineraryMediaRef).src === "string"
  ) {
    const media = value as ItineraryMediaRef;
    const key = media.assetId || media.src;
    if (!bucket.has(key)) {
      bucket.set(key, media);
    }
    return bucket;
  }

  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectMediaLibrary(nested, bucket);
    }
  }

  return bucket;
}

function getToneShellClasses(tone: ItineraryThemeTone) {
  switch (tone) {
    case "OCEAN":
      return "bg-[linear-gradient(160deg,#dbe8ee_0%,#f8fbfc_36%,#dfe9ef_100%)]";
    case "FOREST":
      return "bg-[linear-gradient(160deg,#e5ede7_0%,#fbfcfb_42%,#eef4ef_100%)]";
    case "SUNSET":
      return "bg-[linear-gradient(160deg,#f4e4d7_0%,#fffaf7_42%,#f9ece1_100%)]";
    case "SANDSTONE":
    default:
      return "bg-[linear-gradient(160deg,#efe7db_0%,#faf8f3_40%,#f4ecdf_100%)]";
  }
}

function createBlockStateKey(surface: ItinerarySurface, itemId: string, blockId: string) {
  return `${surface}:${itemId}:${blockId}`;
}

function replaceAtIndex<T>(items: T[], index: number, nextValue: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextValue : item));
}

function isDocumentPageFamily<TFamily extends ItineraryPageFamily>(
  page: ItineraryDocumentPage,
  family: TFamily
): page is Extract<ItineraryDocumentPage, { family: TFamily }> {
  return page.family === family;
}

function isWebSectionFamily<TFamily extends ItineraryWebSectionFamily>(
  section: ItineraryWebSection,
  family: TFamily
): section is Extract<ItineraryWebSection, { family: TFamily }> {
  return section.family === family;
}

function createDefaultFact(): ItineraryFact {
  return { label: "New fact", value: "Add concise trip detail." };
}

function createDefaultHighlight(): ItineraryHighlight {
  return {
    title: "New highlight",
    description: "Write the signature story for this moment.",
    eyebrow: "Featured",
    image: null,
  };
}

function createDefaultStay(): ItineraryStaySummary {
  return {
    id: nanoid(),
    hotelId: null,
    name: "New stay",
    city: null,
    country: null,
    starLabel: null,
    nights: 1,
    mealPlan: null,
    roomSummary: "Add room and meal details.",
    image: null,
  };
}

function createDefaultTransfer(): ItineraryTransferSummary {
  return {
    id: nanoid(),
    title: "New transfer",
    fromLabel: null,
    toLabel: null,
    vehicleLabel: null,
    startLabel: null,
    endLabel: null,
    notes: "Add routing notes or transfer summary.",
  };
}

function createDefaultPolicyBlock(): ItineraryPolicyBlock {
  return {
    title: "New policy group",
    items: ["Add the first policy line."],
  };
}

function findDocumentBlockMedia(page: ItineraryDocumentPage, blockId: string): ItineraryMediaRef | null {
  if (page.family === "TRIP_SUMMARY" && blockId.startsWith("highlight:")) {
    return page.highlights[Number(blockId.split(":")[1])]?.image || null;
  }
  if (page.family === "HIGHLIGHTS" && blockId.startsWith("highlight:")) {
    return page.items[Number(blockId.split(":")[1])]?.image || null;
  }
  if (page.family === "DAY_DETAIL" && blockId.startsWith("item:")) {
    return page.day.items.find((item) => `item:${item.id}` === blockId)?.image || null;
  }
  if (page.family === "ACCOMMODATION_SUMMARY" && blockId.startsWith("stay:")) {
    return page.stays.find((stay) => `stay:${stay.id}` === blockId)?.image || null;
  }
  return null;
}

function setDocumentBlockMedia(
  page: ItineraryDocumentPage,
  blockId: string,
  media: ItineraryMediaRef | null
): ItineraryDocumentPage {
  if (page.family === "TRIP_SUMMARY" && blockId.startsWith("highlight:")) {
    const index = Number(blockId.split(":")[1]);
    return { ...page, highlights: replaceAtIndex(page.highlights, index, { ...page.highlights[index], image: media }) };
  }
  if (page.family === "HIGHLIGHTS" && blockId.startsWith("highlight:")) {
    const index = Number(blockId.split(":")[1]);
    return { ...page, items: replaceAtIndex(page.items, index, { ...page.items[index], image: media }) };
  }
  if (page.family === "DAY_DETAIL" && blockId.startsWith("item:")) {
    return {
      ...page,
      day: {
        ...page.day,
        items: page.day.items.map((item) => (`item:${item.id}` === blockId ? { ...item, image: media } : item)),
      },
    };
  }
  if (page.family === "ACCOMMODATION_SUMMARY" && blockId.startsWith("stay:")) {
    return {
      ...page,
      stays: page.stays.map((stay) => (`stay:${stay.id}` === blockId ? { ...stay, image: media } : stay)),
    };
  }
  return page;
}

function findWebBlockMedia(section: ItineraryWebSection, blockId: string): ItineraryMediaRef | null {
  if (section.family === "QUICK_FACTS" && blockId.startsWith("highlight:")) {
    return section.highlights[Number(blockId.split(":")[1])]?.image || null;
  }
  if (section.family === "GALLERY" && blockId.startsWith("gallery:")) {
    return section.items[Number(blockId.split(":")[1])]?.image || null;
  }
  if (section.family === "STAYS" && blockId.startsWith("stay:")) {
    return section.stays.find((stay) => `stay:${stay.id}` === blockId)?.image || null;
  }
  if (section.family === "TIMELINE" && blockId.startsWith("day:")) {
    return section.days.find((day) => `day:${day.id}` === blockId)?.heroImage || null;
  }
  return null;
}

function setWebBlockMedia(
  section: ItineraryWebSection,
  blockId: string,
  media: ItineraryMediaRef | null
): ItineraryWebSection {
  if (section.family === "QUICK_FACTS" && blockId.startsWith("highlight:")) {
    const index = Number(blockId.split(":")[1]);
    return {
      ...section,
      highlights: replaceAtIndex(section.highlights, index, { ...section.highlights[index], image: media }),
    };
  }
  if (section.family === "GALLERY" && blockId.startsWith("gallery:")) {
    const index = Number(blockId.split(":")[1]);
    return { ...section, items: replaceAtIndex(section.items, index, { ...section.items[index], image: media }) };
  }
  if (section.family === "STAYS" && blockId.startsWith("stay:")) {
    return {
      ...section,
      stays: section.stays.map((stay) => (`stay:${stay.id}` === blockId ? { ...stay, image: media } : stay)),
    };
  }
  if (section.family === "TIMELINE" && blockId.startsWith("day:")) {
    return {
      ...section,
      days: section.days.map((day) => (`day:${day.id}` === blockId ? { ...day, heroImage: media } : day)),
    };
  }
  return section;
}

function insertBlockIntoDocumentPage(page: ItineraryDocumentPage, family: ItineraryBlockFamily) {
  switch (page.family) {
    case "TRIP_SUMMARY":
      if (family === "FACT_CARD") return { ...page, facts: [...page.facts, createDefaultFact()] };
      if (family === "HIGHLIGHT_CARD") return { ...page, highlights: [...page.highlights, createDefaultHighlight()] };
      return page;
    case "ROUTE_OVERVIEW":
      if (family === "ROUTE_STOP") return { ...page, routeStops: [...page.routeStops, "New route stop"] };
      return page;
    case "HIGHLIGHTS":
      if (family === "HIGHLIGHT_CARD") return { ...page, items: [...page.items, createDefaultHighlight()] };
      return page;
    case "DAY_DETAIL":
      if (family === "DAY_ITEM_CARD") {
        return {
          ...page,
          day: {
            ...page.day,
            items: [
              ...page.day.items,
              {
                id: nanoid(),
                type: "ACTIVITY",
                title: "New itinerary item",
                summary: "Describe the service or sightseeing moment.",
                image: null,
              },
            ],
          },
        };
      }
      return page;
    case "ACCOMMODATION_SUMMARY":
      if (family === "STAY_CARD") return { ...page, stays: [...page.stays, createDefaultStay()] };
      return page;
    case "TRANSPORT_SUMMARY":
      if (family === "TRANSFER_CARD") return { ...page, transfers: [...page.transfers, createDefaultTransfer()] };
      return page;
    case "POLICY_NOTES":
      if (family === "POLICY_GROUP") return { ...page, blocks: [...page.blocks, createDefaultPolicyBlock()] };
      return page;
    default:
      return page;
  }
}

function insertBlockIntoWebSection(section: ItineraryWebSection, family: ItineraryBlockFamily) {
  switch (section.family) {
    case "HERO":
      if (family === "CHIP_LIST") return { ...section, chips: [...section.chips, "New hero chip"] };
      return section;
    case "QUICK_FACTS":
      if (family === "FACT_CARD") return { ...section, facts: [...section.facts, createDefaultFact()] };
      if (family === "HIGHLIGHT_CARD") return { ...section, highlights: [...section.highlights, createDefaultHighlight()] };
      return section;
    case "ROUTE":
      if (family === "ROUTE_STOP") return { ...section, routeStops: [...section.routeStops, "New route stop"] };
      return section;
    case "STAYS":
      if (family === "STAY_CARD") return { ...section, stays: [...section.stays, createDefaultStay()] };
      return section;
    case "GALLERY":
      if (family === "HIGHLIGHT_CARD") return { ...section, items: [...section.items, createDefaultHighlight()] };
      return section;
    case "TRAVEL_NOTES":
      if (family === "POLICY_GROUP") return { ...section, blocks: [...section.blocks, createDefaultPolicyBlock()] };
      return section;
    case "SUPPORT_FOOTER":
      if (family === "SUPPORT_LINE") return { ...section, lines: [...section.lines, "New support line"] };
      return section;
    default:
      return section;
  }
}

function replaceDocumentBlockWithDefault(page: ItineraryDocumentPage, blockId: string) {
  switch (page.family) {
    case "TRIP_SUMMARY":
      if (blockId.startsWith("fact:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...page, facts: replaceAtIndex(page.facts, index, createDefaultFact()) };
      }
      if (blockId.startsWith("highlight:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...page, highlights: replaceAtIndex(page.highlights, index, createDefaultHighlight()) };
      }
      return page;
    case "ROUTE_OVERVIEW":
      if (blockId.startsWith("route-stop:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...page, routeStops: replaceAtIndex(page.routeStops, index, "New route stop") };
      }
      return page;
    case "HIGHLIGHTS":
      if (blockId.startsWith("highlight:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...page, items: replaceAtIndex(page.items, index, createDefaultHighlight()) };
      }
      return page;
    case "DAY_DETAIL":
      if (blockId.startsWith("item:")) {
        return {
          ...page,
          day: {
            ...page.day,
            items: page.day.items.map((item) =>
              `item:${item.id}` === blockId
                ? {
                    id: item.id,
                    type: "ACTIVITY",
                    title: "New itinerary item",
                    summary: "Describe the service or sightseeing moment.",
                    image: null,
                  }
                : item
            ),
          },
        };
      }
      return page;
    case "ACCOMMODATION_SUMMARY":
      if (blockId.startsWith("stay:")) {
        return {
          ...page,
          stays: page.stays.map((stay) => (`stay:${stay.id}` === blockId ? { ...createDefaultStay(), id: stay.id } : stay)),
        };
      }
      return page;
    case "TRANSPORT_SUMMARY":
      if (blockId.startsWith("transfer:")) {
        return {
          ...page,
          transfers: page.transfers.map((transfer) =>
            `transfer:${transfer.id}` === blockId ? { ...createDefaultTransfer(), id: transfer.id } : transfer
          ),
        };
      }
      return page;
    case "POLICY_NOTES":
      if (blockId.startsWith("policy:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...page, blocks: replaceAtIndex(page.blocks, index, createDefaultPolicyBlock()) };
      }
      return page;
    default:
      return page;
  }
}

function replaceWebBlockWithDefault(section: ItineraryWebSection, blockId: string) {
  switch (section.family) {
    case "HERO":
      if (blockId === "chips") return { ...section, chips: ["New hero chip"] };
      return section;
    case "QUICK_FACTS":
      if (blockId.startsWith("fact:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, facts: replaceAtIndex(section.facts, index, createDefaultFact()) };
      }
      if (blockId.startsWith("highlight:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, highlights: replaceAtIndex(section.highlights, index, createDefaultHighlight()) };
      }
      return section;
    case "ROUTE":
      if (blockId.startsWith("route-stop:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, routeStops: replaceAtIndex(section.routeStops, index, "New route stop") };
      }
      return section;
    case "STAYS":
      if (blockId.startsWith("stay:")) {
        return {
          ...section,
          stays: section.stays.map((stay) => (`stay:${stay.id}` === blockId ? { ...createDefaultStay(), id: stay.id } : stay)),
        };
      }
      return section;
    case "GALLERY":
      if (blockId.startsWith("gallery:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, items: replaceAtIndex(section.items, index, createDefaultHighlight()) };
      }
      return section;
    case "TRAVEL_NOTES":
      if (blockId.startsWith("policy:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, blocks: replaceAtIndex(section.blocks, index, createDefaultPolicyBlock()) };
      }
      return section;
    case "SUPPORT_FOOTER":
      if (blockId.startsWith("line:")) {
        const index = Number(blockId.split(":")[1]);
        return { ...section, lines: replaceAtIndex(section.lines, index, "New support line") };
      }
      return section;
    default:
      return section;
  }
}

function ensureDocumentSelection(
  draft: ItineraryStructuredDraft,
  surface: ItinerarySurface,
  selection: StudioSelection
): StudioSelection {
  if (surface === "DOCUMENT") {
    const firstPage = draft.document.pages[0];
    if (
      selection.surface === "DOCUMENT" &&
      selection.kind !== "DOCUMENT" &&
      draft.document.pages.some((page) => page.id === selection.itemId)
    ) {
      return selection;
    }
    return firstPage
      ? { kind: "PAGE", surface: "DOCUMENT", itemId: firstPage.id }
      : { kind: "DOCUMENT", surface: "DOCUMENT" };
  }

  const firstSection = draft.web.sections[0];
  if (
    selection.surface === "WEB" &&
    selection.kind !== "DOCUMENT" &&
    draft.web.sections.some((section) => section.id === selection.itemId)
  ) {
    return selection;
  }
  return firstSection
    ? { kind: "SECTION", surface: "WEB", itemId: firstSection.id }
    : { kind: "DOCUMENT", surface: "WEB" };
}

function createDocumentPageFromFamily(
  family: ItineraryPageFamily,
  draft: ItineraryStructuredDraft
): ItineraryDocumentPage {
  const state: ItinerarySurfaceState = {
    isVisible: true,
    isLocked: false,
    backgroundStyle: "AUTO",
    notes: null,
    sourceMode: "OVERRIDE",
  };

  switch (family) {
    case "COVER":
      return {
        id: nanoid(),
        family: "COVER",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.COVER.label,
        state,
        layoutVariant: "EDITORIAL_COVER",
        title: draft.overview.title,
        subtitle: draft.overview.subtitle,
        heroImage: draft.overview.heroImage || null,
        meta: [draft.overview.durationLabel, draft.overview.paxLabel, draft.overview.marketLabel || "Market"],
        routeLabel: draft.overview.routeLabel,
      };
    case "TRIP_SUMMARY":
      return {
        id: nanoid(),
        family: "TRIP_SUMMARY",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.TRIP_SUMMARY.label,
        state,
        layoutVariant: "FACT_GRID",
        title: "Trip Summary",
        facts: [
          { label: "Travel window", value: `${draft.overview.startDateLabel} - ${draft.overview.endDateLabel}` },
          { label: "Guests", value: draft.overview.paxLabel },
        ],
        highlights: [],
      };
    case "ROUTE_OVERVIEW":
      return {
        id: nanoid(),
        family: "ROUTE_OVERVIEW",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.ROUTE_OVERVIEW.label,
        state,
        layoutVariant: "ROUTE_STORY",
        title: "Route Overview",
        routeStops: draft.overview.routeLabel.split(" / ").map((item) => item.trim()).filter(Boolean),
        summary: "Shape the travel narrative for this route.",
        image: draft.overview.heroImage || null,
      };
    case "HIGHLIGHTS":
      return {
        id: nanoid(),
        family: "HIGHLIGHTS",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.HIGHLIGHTS.label,
        state,
        layoutVariant: "FEATURE_GRID",
        title: "Trip Highlights",
        items: [],
      };
    case "DAY_DETAIL":
      return {
        id: nanoid(),
        family: "DAY_DETAIL",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.DAY_DETAIL.label,
        state,
        layoutVariant: "TIMELINE_SPREAD",
        title: "Day Detail",
        day: {
          id: nanoid(),
          dayNumber: draft.document.pages.filter((page) => page.family === "DAY_DETAIL").length + 1,
          dateLabel: draft.overview.startDateLabel,
          title: "New itinerary day",
          routeLabel: draft.overview.routeLabel,
          narrative: "Build the day story, timings, and service sequence here.",
          items: [],
          heroImage: draft.overview.heroImage || null,
        },
      };
    case "ACCOMMODATION_SUMMARY":
      return {
        id: nanoid(),
        family: "ACCOMMODATION_SUMMARY",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.ACCOMMODATION_SUMMARY.label,
        state,
        layoutVariant: "MATRIX_TABLE",
        title: "Stay Summary",
        stays: [],
      };
    case "TRANSPORT_SUMMARY":
      return {
        id: nanoid(),
        family: "TRANSPORT_SUMMARY",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.TRANSPORT_SUMMARY.label,
        state,
        layoutVariant: "MATRIX_TABLE",
        title: "Transfers & Routing",
        transfers: [],
      };
    case "PRICING_SUMMARY":
      return {
        id: nanoid(),
        family: "PRICING_SUMMARY",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.PRICING_SUMMARY.label,
        state,
        layoutVariant: "COMMERCIAL_SUMMARY",
        title: "Pricing Snapshot",
        pricing: {
          currencyCode: "USD",
          baseTotal: "0.00",
          taxTotal: "0.00",
          grandTotal: "0.00",
          estimatedPerGuestLabel: "0.00",
          totalsByType: [],
        },
      };
    case "POLICY_NOTES":
      return {
        id: nanoid(),
        family: "POLICY_NOTES",
        anchorLabel: DOCUMENT_PAGE_FAMILY_REGISTRY.POLICY_NOTES.label,
        state,
        layoutVariant: "POLICY_COLUMNS",
        title: "Travel Notes & Policies",
        blocks: [],
      };
  }
}

function createWebSectionFromFamily(
  family: ItineraryWebSectionFamily,
  draft: ItineraryStructuredDraft
): ItineraryWebSection {
  const state: ItinerarySurfaceState = {
    isVisible: true,
    isLocked: false,
    backgroundStyle: "AUTO",
    notes: null,
    sourceMode: "OVERRIDE",
  };

  switch (family) {
    case "HERO":
      return {
        id: nanoid(),
        family: "HERO",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.HERO.label,
        state,
        layoutVariant: "IMMERSIVE_HERO",
        title: draft.overview.title,
        subtitle: draft.overview.subtitle,
        heroImage: draft.overview.heroImage || null,
        chips: [draft.overview.durationLabel, draft.overview.paxLabel],
      };
    case "QUICK_FACTS":
      return {
        id: nanoid(),
        family: "QUICK_FACTS",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.QUICK_FACTS.label,
        state,
        layoutVariant: "FACT_RIBBON",
        title: "Trip Snapshot",
        facts: [
          { label: "Route", value: draft.overview.routeLabel },
          { label: "Travel window", value: `${draft.overview.startDateLabel} - ${draft.overview.endDateLabel}` },
        ],
        highlights: [],
      };
    case "ROUTE":
      return {
        id: nanoid(),
        family: "ROUTE",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.ROUTE.label,
        state,
        layoutVariant: "ROUTE_SCROLLER",
        title: "Route Story",
        routeStops: draft.overview.routeLabel.split(" / ").map((item) => item.trim()).filter(Boolean),
        summary: "Introduce the guest to the travel flow, destination order, and overall rhythm.",
        image: draft.overview.heroImage || null,
      };
    case "TIMELINE":
      return {
        id: nanoid(),
        family: "TIMELINE",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.TIMELINE.label,
        state,
        layoutVariant: "TIMELINE_CARDS",
        title: "Day Timeline",
        days: [],
      };
    case "STAYS":
      return {
        id: nanoid(),
        family: "STAYS",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.STAYS.label,
        state,
        layoutVariant: "STAY_COLLECTION",
        title: "Where You Stay",
        stays: [],
      };
    case "GALLERY":
      return {
        id: nanoid(),
        family: "GALLERY",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.GALLERY.label,
        state,
        layoutVariant: "MEDIA_STORY_GRID",
        title: "Gallery",
        items: [],
      };
    case "PRICING":
      return {
        id: nanoid(),
        family: "PRICING",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.PRICING.label,
        state,
        layoutVariant: "COMMERCIAL_PANEL",
        title: "Costing Snapshot",
        pricing: {
          currencyCode: "USD",
          baseTotal: "0.00",
          taxTotal: "0.00",
          grandTotal: "0.00",
          estimatedPerGuestLabel: "0.00",
          totalsByType: [],
        },
      };
    case "TRAVEL_NOTES":
      return {
        id: nanoid(),
        family: "TRAVEL_NOTES",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.TRAVEL_NOTES.label,
        state,
        layoutVariant: "TRAVEL_NOTES_STACK",
        title: "Travel Notes",
        blocks: [],
      };
    case "SUPPORT_FOOTER":
      return {
        id: nanoid(),
        family: "SUPPORT_FOOTER",
        anchorLabel: WEB_SECTION_FAMILY_REGISTRY.SUPPORT_FOOTER.label,
        state,
        layoutVariant: "SUPPORT_STRIP",
        title: "Support & Contacts",
        lines: [],
      };
  }
}

function pageTitleForStudio(page: ItineraryDocumentPage) {
  switch (page.family) {
    case "COVER":
    case "TRIP_SUMMARY":
    case "ROUTE_OVERVIEW":
    case "HIGHLIGHTS":
    case "ACCOMMODATION_SUMMARY":
    case "TRANSPORT_SUMMARY":
    case "PRICING_SUMMARY":
    case "POLICY_NOTES":
      return page.title;
    case "DAY_DETAIL":
      return page.day.title;
  }
}

function sectionTitleForStudio(section: ItineraryWebSection) {
  switch (section.family) {
    case "HERO":
    case "QUICK_FACTS":
    case "ROUTE":
    case "TIMELINE":
    case "STAYS":
    case "GALLERY":
    case "PRICING":
    case "TRAVEL_NOTES":
    case "SUPPORT_FOOTER":
      return section.title;
  }
}

function updateDocumentPageState(page: ItineraryDocumentPage, patch: Partial<NonNullable<ItineraryDocumentPage["state"]>>) {
  const nextState: ItinerarySurfaceState = {
    isVisible: true,
    isLocked: false,
    backgroundStyle: "AUTO",
    notes: null,
    sourceMode: "OVERRIDE",
    ...page.state,
    ...patch,
  };
  return {
    ...page,
    state: nextState,
  };
}

function updateWebSectionState(
  section: ItineraryWebSection,
  patch: Partial<NonNullable<ItineraryWebSection["state"]>>
) {
  const nextState: ItinerarySurfaceState = {
    isVisible: true,
    isLocked: false,
    backgroundStyle: "AUTO",
    notes: null,
    sourceMode: "OVERRIDE",
    ...section.state,
    ...patch,
  };
  return {
    ...section,
    state: nextState,
  };
}

function SectionLabel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function StudioSurfaceStat({
  label,
  value,
  emphasis = "default",
}: {
  label: string;
  value: string | number;
  emphasis?: "default" | "accent";
}) {
  return (
    <div
      className={cn(
        "min-w-[112px] rounded-[22px] border px-4 py-3 shadow-sm backdrop-blur",
        emphasis === "accent"
          ? "border-primary/20 bg-primary/10 text-foreground"
          : "border-white/70 bg-white/72 text-foreground"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StudioSidebarPanel({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[26px] border border-black/5 bg-white/80 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.3)] backdrop-blur", className)}>
      <div className="space-y-2 px-4 pb-0 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="px-4 pb-4 pt-4">{children}</div>
    </div>
  );
}

function StudioQuickActionCard({
  label,
  description,
  badge,
  onClick,
}: {
  label: string;
  description: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,244,238,0.92)_100%)] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_35px_-24px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {badge}
        </span>
      </div>
    </button>
  );
}

function StudioFocusTag({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-border/70 bg-white/78 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
      <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="ml-2 font-medium text-foreground">{value}</span>
    </div>
  );
}

function MediaSlotEditor({
  label,
  value,
  mediaLibrary,
  onChange,
}: {
  label: string;
  value: ItineraryMediaRef | null | undefined;
  mediaLibrary: ItineraryMediaRef[];
  onChange: (next: ItineraryMediaRef | null) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel
        eyebrow="Media"
        title={label}
        description="Pick from itinerary-safe source media already connected to this itinerary, or set a custom URL override."
      />
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={value?.src || ""}
          onChange={(event) =>
            onChange(
              event.target.value.trim()
                ? {
                    kind: "URL",
                    src: event.target.value.trim(),
                    alt: value?.alt || "Itinerary image",
                    caption: value?.caption || null,
                    role: value?.role || "HERO",
                    shareSafe: value?.shareSafe ?? null,
                  }
                : null
            )
          }
          placeholder="https://example.com/scenic-cover.jpg"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Alt text</Label>
          <Input
            value={value?.alt || ""}
            onChange={(event) =>
              onChange(
                value
                  ? {
                      ...value,
                      alt: event.target.value,
                    }
                  : {
                      kind: "URL",
                      src: "",
                      alt: event.target.value,
                      caption: null,
                      role: "HERO",
                      shareSafe: null,
                    }
              )
            }
            placeholder="Describe the scenic image"
          />
        </div>
        <div className="space-y-2">
          <Label>Caption</Label>
          <Input
            value={value?.caption || ""}
            onChange={(event) =>
              onChange(
                value
                  ? {
                      ...value,
                      caption: event.target.value,
                    }
                  : {
                      kind: "URL",
                      src: "",
                      alt: "Itinerary image",
                      caption: event.target.value,
                      role: "HERO",
                      shareSafe: null,
                    }
              )
            }
            placeholder="Optional image caption"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Source media library</Label>
        <div className="grid max-h-56 gap-3 overflow-y-auto pr-1">
          {mediaLibrary.length ? (
            mediaLibrary.slice(0, 12).map((media) => (
              <button
                key={media.assetId || media.src}
                type="button"
                className={cn(
                  "grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-background",
                  value?.src === media.src ? "border-primary bg-primary/5" : "border-border bg-background"
                )}
                onClick={() => onChange(media)}
              >
                <div
                  className="h-[72px] rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url("${media.src}")` }}
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{media.alt}</p>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {media.caption || media.entityType || "Itinerary source media"}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No itinerary-safe source media is available yet.</p>
          )}
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
        Remove media
      </Button>
    </div>
  );
}

function FactListEditor({
  items,
  onChange,
}: {
  items: ItineraryFact[];
  onChange: (next: ItineraryFact[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Fact blocks" description="Quick summary cards for guests and sales teams." />
      <div className="space-y-3">
        {items.map((fact, index) => (
          <div key={`${fact.label}-${index}`} className="grid gap-3 rounded-xl border bg-background p-3">
            <Input
              value={fact.label}
              onChange={(event) =>
                onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)))
              }
              placeholder="Label"
            />
            <Input
              value={fact.value}
              onChange={(event) =>
                onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value } : item)))
              }
              placeholder="Value"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="size-4" />
              Remove fact
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { label: "New fact", value: "Details" }])}>
        <Plus className="size-4" />
        Add fact
      </Button>
    </div>
  );
}

function HighlightListEditor({
  items,
  onChange,
}: {
  items: ItineraryHighlight[];
  onChange: (next: ItineraryHighlight[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Highlight cards" description="Story-led feature cards for signature moments." />
      <div className="space-y-3">
        {items.map((highlight, index) => (
          <div key={`${highlight.title}-${index}`} className="grid gap-3 rounded-xl border bg-background p-3">
            <Input
              value={highlight.eyebrow || ""}
              onChange={(event) =>
                onChange(
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, eyebrow: event.target.value || null } : item
                  )
                )
              }
              placeholder="Eyebrow"
            />
            <Input
              value={highlight.title}
              onChange={(event) =>
                onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item)))
              }
              placeholder="Highlight title"
            />
            <Textarea
              value={highlight.description}
              onChange={(event) =>
                onChange(
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: event.target.value } : item
                  )
                )
              }
              rows={3}
              placeholder="Describe why this moment matters."
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="size-4" />
              Remove highlight
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { title: "New highlight", description: "Describe the experience." }])}
      >
        <Plus className="size-4" />
        Add highlight
      </Button>
    </div>
  );
}

function StringListEditor({
  title,
  description,
  items,
  emptyLabel,
  addLabel,
  onChange,
}: {
  title: string;
  description: string;
  items: string[];
  emptyLabel: string;
  addLabel: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title={title} description={description} />
      <div className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex gap-2 rounded-xl border bg-background p-3">
              <Input
                value={item}
                onChange={(event) =>
                  onChange(items.map((existing, itemIndex) => (itemIndex === index ? event.target.value : existing)))
                }
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, "New entry"])}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function PolicyBlockEditor({
  blocks,
  onChange,
}: {
  blocks: ItineraryPolicyBlock[];
  onChange: (next: ItineraryPolicyBlock[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Policy blocks" description="Commercial guidance, travel notes, and legal text." />
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={`${block.title}-${index}`} className="space-y-3 rounded-xl border bg-background p-3">
            <Input
              value={block.title}
              onChange={(event) =>
                onChange(blocks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: event.target.value } : entry)))
              }
              placeholder="Block title"
            />
            <Textarea
              value={block.items.join("\n")}
              onChange={(event) =>
                onChange(
                  blocks.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          items: event.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }
                      : entry
                  )
                )
              }
              rows={5}
              placeholder="One bullet per line"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(blocks.filter((_, entryIndex) => entryIndex !== index))}>
              <Trash2 className="size-4" />
              Remove block
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...blocks, { title: "New note block", items: [] }])}>
        <Plus className="size-4" />
        Add block
      </Button>
    </div>
  );
}

function StayListEditor({
  stays,
  onChange,
}: {
  stays: ItineraryStaySummary[];
  onChange: (next: ItineraryStaySummary[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Stay cards" description="Hotel storytelling and room/meal context." />
      <div className="space-y-3">
        {stays.map((stay, index) => (
          <div key={`${stay.id}-${index}`} className="grid gap-3 rounded-xl border bg-background p-3">
            <Input
              value={stay.name}
              onChange={(event) =>
                onChange(stays.map((entry, entryIndex) => (entryIndex === index ? { ...entry, name: event.target.value } : entry)))
              }
              placeholder="Hotel name"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={stay.city || ""}
                onChange={(event) =>
                  onChange(stays.map((entry, entryIndex) => (entryIndex === index ? { ...entry, city: event.target.value } : entry)))
                }
                placeholder="City"
              />
              <Input
                value={stay.country || ""}
                onChange={(event) =>
                  onChange(stays.map((entry, entryIndex) => (entryIndex === index ? { ...entry, country: event.target.value } : entry)))
                }
                placeholder="Country"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={String(stay.nights)}
                onChange={(event) =>
                  onChange(
                    stays.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, nights: Number(event.target.value || 0) } : entry
                    )
                  )
                }
                type="number"
                min={0}
                placeholder="Nights"
              />
              <Input
                value={stay.mealPlan || ""}
                onChange={(event) =>
                  onChange(stays.map((entry, entryIndex) => (entryIndex === index ? { ...entry, mealPlan: event.target.value } : entry)))
                }
                placeholder="Meal plan"
              />
              <Input
                value={stay.roomSummary || ""}
                onChange={(event) =>
                  onChange(stays.map((entry, entryIndex) => (entryIndex === index ? { ...entry, roomSummary: event.target.value } : entry)))
                }
                placeholder="Room summary"
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(stays.filter((_, entryIndex) => entryIndex !== index))}>
              <Trash2 className="size-4" />
              Remove stay
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...stays,
            {
              id: nanoid(),
              name: "New stay",
              nights: 1,
            },
          ])
        }
      >
        <Plus className="size-4" />
        Add stay
      </Button>
    </div>
  );
}

function TransferListEditor({
  transfers,
  onChange,
}: {
  transfers: ItineraryTransferSummary[];
  onChange: (next: ItineraryTransferSummary[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Transfer cards" description="Arrival, departure, and overland movement details." />
      <div className="space-y-3">
        {transfers.map((transfer, index) => (
          <div key={`${transfer.id}-${index}`} className="grid gap-3 rounded-xl border bg-background p-3">
            <Input
              value={transfer.title}
              onChange={(event) =>
                onChange(
                  transfers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: event.target.value } : entry))
                )
              }
              placeholder="Transfer title"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={transfer.fromLabel || ""}
                onChange={(event) =>
                  onChange(
                    transfers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, fromLabel: event.target.value } : entry))
                  )
                }
                placeholder="From"
              />
              <Input
                value={transfer.toLabel || ""}
                onChange={(event) =>
                  onChange(
                    transfers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, toLabel: event.target.value } : entry))
                  )
                }
                placeholder="To"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={transfer.vehicleLabel || ""}
                onChange={(event) =>
                  onChange(
                    transfers.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, vehicleLabel: event.target.value } : entry
                    )
                  )
                }
                placeholder="Vehicle"
              />
              <Input
                value={transfer.startLabel || ""}
                onChange={(event) =>
                  onChange(
                    transfers.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, startLabel: event.target.value } : entry
                    )
                  )
                }
                placeholder="Timing"
              />
            </div>
            <Textarea
              value={transfer.notes || ""}
              onChange={(event) =>
                onChange(
                  transfers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, notes: event.target.value } : entry))
                )
              }
              rows={3}
              placeholder="Transfer notes"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(transfers.filter((_, entryIndex) => entryIndex !== index))}>
              <Trash2 className="size-4" />
              Remove transfer
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...transfers,
            {
              id: nanoid(),
              title: "New transfer",
            },
          ])
        }
      >
        <Plus className="size-4" />
        Add transfer
      </Button>
    </div>
  );
}

function DayItemsEditor({
  page,
  onChange,
}: {
  page: Extract<ItineraryDocumentPage, { family: "DAY_DETAIL" }>;
  onChange: (next: Extract<ItineraryDocumentPage, { family: "DAY_DETAIL" }>) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <SectionLabel eyebrow="Blocks" title="Day timeline" description="Narrative, route, and structured service moments." />
      <div className="space-y-3">
        <Input
          value={page.day.title}
          onChange={(event) =>
            onChange({
              ...page,
              day: {
                ...page.day,
                title: event.target.value,
              },
            })
          }
          placeholder="Day title"
        />
        <Input
          value={page.day.routeLabel || ""}
          onChange={(event) =>
            onChange({
              ...page,
              day: {
                ...page.day,
                routeLabel: event.target.value,
              },
            })
          }
          placeholder="Route label"
        />
        <Textarea
          value={page.day.narrative || ""}
          onChange={(event) =>
            onChange({
              ...page,
              day: {
                ...page.day,
                narrative: event.target.value,
              },
            })
          }
          rows={4}
          placeholder="Narrative summary"
        />
        {page.day.items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="grid gap-3 rounded-xl border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.type}
                onChange={(event) =>
                  onChange({
                    ...page,
                    day: {
                      ...page.day,
                      items: page.day.items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, type: event.target.value } : entry
                      ),
                    },
                  })
                }
                placeholder="Type"
              />
              <Input
                value={item.timeLabel || ""}
                onChange={(event) =>
                  onChange({
                    ...page,
                    day: {
                      ...page.day,
                      items: page.day.items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, timeLabel: event.target.value } : entry
                      ),
                    },
                  })
                }
                placeholder="Time"
              />
            </div>
            <Input
              value={item.title}
              onChange={(event) =>
                onChange({
                  ...page,
                  day: {
                    ...page.day,
                    items: page.day.items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, title: event.target.value } : entry
                    ),
                  },
                })
              }
              placeholder="Title"
            />
            <Textarea
              value={item.summary || ""}
              onChange={(event) =>
                onChange({
                  ...page,
                  day: {
                    ...page.day,
                    items: page.day.items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, summary: event.target.value } : entry
                    ),
                  },
                })
              }
              rows={3}
              placeholder="Service summary"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.routeLabel || ""}
                onChange={(event) =>
                  onChange({
                    ...page,
                    day: {
                      ...page.day,
                      items: page.day.items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, routeLabel: event.target.value } : entry
                      ),
                    },
                  })
                }
                placeholder="Route label"
              />
              <Input
                value={item.amountLabel || ""}
                onChange={(event) =>
                  onChange({
                    ...page,
                    day: {
                      ...page.day,
                      items: page.day.items.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, amountLabel: event.target.value } : entry
                      ),
                    },
                  })
                }
                placeholder="Amount label"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...page,
                  day: {
                    ...page.day,
                    items: page.day.items.filter((_, entryIndex) => entryIndex !== index),
                  },
                })
              }
            >
              <Trash2 className="size-4" />
              Remove item
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...page,
            day: {
              ...page.day,
              items: [
                ...page.day.items,
                {
                  id: nanoid(),
                  type: "ACTIVITY",
                  title: "New itinerary item",
                },
              ],
            },
          })
        }
      >
        <Plus className="size-4" />
        Add day item
      </Button>
    </div>
  );
}

export function ItineraryStudioView({ payload, initialSurface }: ItineraryStudioViewProps) {
  const router = useRouter();
  const availableSurfaces: ItinerarySurface[] =
    payload.itinerary.outputMode === "DOCUMENT"
      ? ["DOCUMENT"]
      : payload.itinerary.outputMode === "WEB"
        ? ["WEB"]
        : ["DOCUMENT", "WEB"];

  const safeInitialSurface = availableSurfaces.includes(initialSurface) ? initialSurface : availableSurfaces[0];
  const [draft, setDraft] = useState<ItineraryStructuredDraft>(() => cloneValue(payload.currentVersion.draft));
  const [generatedDraft] = useState<ItineraryStructuredDraft>(() => cloneValue(payload.currentVersion.draft));
  const [surface, setSurface] = useState<ItinerarySurface>(safeInitialSurface);
  const [selection, setSelection] = useState<StudioSelection>(() =>
    safeInitialSurface === "DOCUMENT" && payload.currentVersion.draft.document.pages[0]
      ? {
          kind: "PAGE",
          surface: "DOCUMENT",
          itemId: payload.currentVersion.draft.document.pages[0].id,
        }
      : safeInitialSurface === "WEB" && payload.currentVersion.draft.web.sections[0]
        ? {
            kind: "SECTION",
            surface: "WEB",
            itemId: payload.currentVersion.draft.web.sections[0].id,
          }
        : { kind: "DOCUMENT", surface: safeInitialSurface }
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("STACK");
  const [canvasChrome, setCanvasChrome] = useState<CanvasChrome>("STUDIO");
  const [zoom, setZoom] = useState(92);
  const [historyPast, setHistoryPast] = useState<ItineraryStructuredDraft[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ItineraryStructuredDraft[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedSerialized, setLastSavedSerialized] = useState(() =>
    JSON.stringify(payload.currentVersion.draft)
  );
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(payload.currentVersion.createdAt);
  const [publishSheetOpen, setPublishSheetOpen] = useState(false);
  const [shareSurface, setShareSurface] = useState<ItineraryShareSurface>(
    payload.itinerary.outputMode === "DOCUMENT" ? "DOCUMENT" : "WEB"
  );
  const [shareExpiryDays, setShareExpiryDays] = useState("30");
  const [isPublishing, startPublishing] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const mediaLibrary = Array.from(collectMediaLibrary(draft).values());
  const selectedDocumentPage =
    selection.surface === "DOCUMENT" && selection.kind !== "DOCUMENT"
      ? draft.document.pages.find((page) => page.id === selection.itemId) ?? null
      : null;
  const selectedWebSection =
    selection.surface === "WEB" && selection.kind !== "DOCUMENT"
      ? draft.web.sections.find((section) => section.id === selection.itemId) ?? null
      : null;
  const selectedDocumentBlocks = selectedDocumentPage ? getDocumentBlockDescriptors(selectedDocumentPage) : [];
  const selectedWebBlocks = selectedWebSection ? getWebBlockDescriptors(selectedWebSection) : [];
  const selectedBlockDescriptor =
    selection.kind === "BLOCK"
      ? (
          selection.surface === "DOCUMENT" ? selectedDocumentBlocks : selectedWebBlocks
        ).find((item) => item.id === selection.blockId) ?? null
      : null;
  const selectedBlockKey =
    selection.kind === "BLOCK"
      ? createBlockStateKey(selection.surface, selection.itemId, selection.blockId)
      : null;
  const selectedBlockState = selectedBlockKey ? draft.studio?.blockStates?.[selectedBlockKey] ?? null : null;
  const selectedBlockMedia =
    selection.kind === "BLOCK"
      ? selectedDocumentPage
        ? findDocumentBlockMedia(selectedDocumentPage, selection.blockId)
        : selectedWebSection
          ? findWebBlockMedia(selectedWebSection, selection.blockId)
          : null
      : null;
  const activeItemId = selection.kind === "DOCUMENT" ? null : selection.itemId;
  const selectedTitle =
    selection.kind === "DOCUMENT"
      ? draft.overview.title
      : selectedBlockDescriptor
        ? selectedBlockDescriptor.label
      : selectedDocumentPage
        ? pageTitleForStudio(selectedDocumentPage)
        : selectedWebSection
          ? sectionTitleForStudio(selectedWebSection)
          : draft.overview.title;
  const currentSurfaceItems = surface === "DOCUMENT" ? draft.document.pages : draft.web.sections;
  const currentSurfaceEditedCount = currentSurfaceItems.filter(
    (item) => (item.state?.sourceMode ?? "SOURCE") !== "SOURCE"
  ).length;
  const currentSurfaceHiddenCount = currentSurfaceItems.filter((item) => (item.state?.isVisible ?? true) === false).length;
  const currentSurfaceLockedCount = currentSurfaceItems.filter((item) => item.state?.isLocked ?? false).length;
  const currentSurfaceBlockCount = currentSurfaceItems.reduce((count, item) => {
    if (surface === "DOCUMENT") {
      return count + getDocumentBlockDescriptors(item as ItineraryDocumentPage).length;
    }
    return count + getWebBlockDescriptors(item as ItineraryWebSection).length;
  }, 0);
  const selectedSourceMode =
    selection.kind === "BLOCK"
      ? selectedBlockState?.sourceMode || "SOURCE"
      : selectedDocumentPage?.state?.sourceMode || selectedWebSection?.state?.sourceMode || "SOURCE";
  const selectedVisibility = selectedDocumentPage?.state?.isVisible ?? selectedWebSection?.state?.isVisible ?? true;
  const selectedLocked = selectedDocumentPage?.state?.isLocked ?? selectedWebSection?.state?.isLocked ?? false;
  const selectionKindLabel =
    selection.kind === "DOCUMENT"
      ? "Document"
      : selection.kind === "BLOCK"
        ? "Block"
        : surface === "DOCUMENT"
          ? "Page"
          : "Section";
  const focusSummary =
    selection.kind === "DOCUMENT"
      ? "Adjust the studio-wide visual system, document defaults, and publishing controls."
      : selection.kind === "BLOCK"
        ? "Fine-tune one structured content block while keeping it bound to safe itinerary rules."
        : surface === "DOCUMENT"
          ? "Refine one page in the printable story stack without breaking the itinerary family rules."
          : "Shape one web storytelling section while keeping the shared microsite polished and on-brand.";
  const quickActionCards =
    surface === "DOCUMENT"
      ? [
          {
            label: "Trip summary",
            description: "Open with premium quick facts and selling highlights.",
            badge: "Opener",
            onClick: () => addDocumentPage("TRIP_SUMMARY"),
          },
          {
            label: "Route page",
            description: "Add destination sequence and route narrative for the tour flow.",
            badge: "Route",
            onClick: () => addDocumentPage("ROUTE_OVERVIEW"),
          },
          {
            label: "Highlights page",
            description: "Surface signature moments, experiences, and scenic hero content.",
            badge: "Story",
            onClick: () => addDocumentPage("HIGHLIGHTS"),
          },
          {
            label: "Costing page",
            description: "Keep commercial detail visible without crowding the narrative pages.",
            badge: "Quote",
            onClick: () => addDocumentPage("PRICING_SUMMARY"),
          },
        ]
      : [
          {
            label: "Hero landing",
            description: "Create a premium opening section for the shared travel microsite.",
            badge: "Hero",
            onClick: () => addWebSection("HERO"),
          },
          {
            label: "Route section",
            description: "Show journey flow with ordered destinations and narrative pacing.",
            badge: "Route",
            onClick: () => addWebSection("ROUTE"),
          },
          {
            label: "Gallery section",
            description: "Bring hotel, activity, and destination imagery forward in the story.",
            badge: "Media",
            onClick: () => addWebSection("GALLERY"),
          },
          {
            label: "Support footer",
            description: "Close the shared itinerary with operator guidance and support lines.",
            badge: "Care",
            onClick: () => addWebSection("SUPPORT_FOOTER"),
          },
        ];

  useEffect(() => {
    setSelection((current) => ensureDocumentSelection(draft, surface, current));
  }, [draft, surface]);

  const serializedDraft = JSON.stringify(draft);

  const applyDraftChange = (updater: (current: ItineraryStructuredDraft) => ItineraryStructuredDraft) => {
    setDraft((current) => {
      const next = updater(cloneValue(current));
      setHistoryPast((previous) => [...previous.slice(-39), current]);
      setHistoryFuture([]);
      return next;
    });
  };

  const saveDraft = useCallback((reason: "manual" | "autosave") => {
    startSaving(async () => {
      setSaveState("saving");
      try {
        const result = await updateItineraryDraftVersion(payload.itinerary.id, {
          expectedVersionId: payload.currentVersion.id,
          draft,
        });
        setDraft(cloneValue(result.currentVersion.draft));
        setLastSavedSerialized(JSON.stringify(result.currentVersion.draft));
        setLastSavedLabel(new Date().toISOString());
        setSaveState("saved");
        if (reason === "manual") {
          notify.success("Itinerary studio draft saved.");
        }
      } catch (error) {
        setSaveState("error");
        notifyApiError(error, "Failed to save itinerary studio draft.");
      }
    });
  }, [draft, payload.currentVersion.id, payload.itinerary.id, startSaving]);

  useEffect(() => {
    if (serializedDraft === lastSavedSerialized) {
      setSaveState("saved");
      return;
    }

    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      saveDraft("autosave");
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [lastSavedSerialized, saveDraft, serializedDraft]);

  const onUndo = () => {
    const previous = historyPast.at(-1);
    if (!previous) return;
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [cloneValue(draft), ...current].slice(0, 40));
    setDraft(cloneValue(previous));
  };

  const onRedo = () => {
    const next = historyFuture[0];
    if (!next) return;
    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [...current.slice(-39), cloneValue(draft)]);
    setDraft(cloneValue(next));
  };

  const updateDocumentPage = (pageId: string, updater: (page: ItineraryDocumentPage) => ItineraryDocumentPage) => {
    applyDraftChange((current) => ({
      ...current,
      document: {
        ...current.document,
        pages: current.document.pages.map((page) =>
          page.id === pageId ? updateDocumentPageState(updater(page), { sourceMode: "OVERRIDE" }) : page
        ),
      },
      studio: {
        ...(current.studio ?? {}),
        lastEditedAt: new Date().toISOString(),
      },
    }));
  };

  const updateWebSection = (sectionId: string, updater: (section: ItineraryWebSection) => ItineraryWebSection) => {
    applyDraftChange((current) => ({
      ...current,
      web: {
        ...current.web,
        sections: current.web.sections.map((section) =>
          section.id === sectionId ? updateWebSectionState(updater(section), { sourceMode: "OVERRIDE" }) : section
        ),
      },
      studio: {
        ...(current.studio ?? {}),
        lastEditedAt: new Date().toISOString(),
      },
    }));
  };

  const updateBlockStudioState = (
    surfaceValue: ItinerarySurface,
    itemId: string,
    blockId: string,
    family: ItineraryBlockFamily,
    patch: Partial<ItineraryBlockStudioState>
  ) => {
    const stateKey = createBlockStateKey(surfaceValue, itemId, blockId);
    applyDraftChange((current) => ({
      ...current,
      studio: {
        ...(current.studio ?? {}),
        blockStates: {
          ...(current.studio?.blockStates ?? {}),
          [stateKey]: {
            family,
            sourceMode: "SOURCE",
            bindingKey: null,
            notes: null,
            layoutVariant: ITINERARY_BLOCK_FAMILY_REGISTRY[family].defaultLayoutVariant,
            ...(current.studio?.blockStates?.[stateKey] ?? {}),
            ...patch,
          },
        },
        lastEditedAt: new Date().toISOString(),
      },
    }));
  };

  const markSelectedBlockAsOverride = () => {
    if (!selectedBlockDescriptor || selection.kind !== "BLOCK") return;
    updateBlockStudioState(selection.surface, selection.itemId, selection.blockId, selectedBlockDescriptor.family, {
      sourceMode: "OVERRIDE",
      bindingKey: selectedBlockDescriptor.bindingKey ?? null,
    });
  };

  const replaceCurrentItemFamily = (nextFamily: ItineraryPageFamily | ItineraryWebSectionFamily) => {
    if (selectedDocumentPage) {
      const replacement = createDocumentPageFromFamily(nextFamily as ItineraryPageFamily, draft);
      const nextPage = {
        ...replacement,
        id: selectedDocumentPage.id,
        anchorLabel: selectedDocumentPage.anchorLabel,
        state: {
          ...(selectedDocumentPage.state ?? {}),
          sourceMode: "MANUAL" as const,
        },
      };
      updateDocumentPage(selectedDocumentPage.id, () => nextPage);
      setSelection({ kind: "PAGE", surface: "DOCUMENT", itemId: selectedDocumentPage.id });
      return;
    }

    if (selectedWebSection) {
      const replacement = createWebSectionFromFamily(nextFamily as ItineraryWebSectionFamily, draft);
      const nextSection = {
        ...replacement,
        id: selectedWebSection.id,
        anchorLabel: selectedWebSection.anchorLabel,
        state: {
          ...(selectedWebSection.state ?? {}),
          sourceMode: "MANUAL" as const,
        },
      };
      updateWebSection(selectedWebSection.id, () => nextSection);
      setSelection({ kind: "SECTION", surface: "WEB", itemId: selectedWebSection.id });
    }
  };

  const insertBlockIntoCurrentItem = (blockFamily: ItineraryBlockFamily) => {
    if (selectedDocumentPage) {
      updateDocumentPage(selectedDocumentPage.id, (page) => insertBlockIntoDocumentPage(page, blockFamily));
      return;
    }
    if (selectedWebSection) {
      updateWebSection(selectedWebSection.id, (section) => insertBlockIntoWebSection(section, blockFamily));
    }
  };

  const replaceSelectedBlock = () => {
    if (!selectedBlockDescriptor || selection.kind !== "BLOCK") return;
    if (selectedDocumentPage) {
      updateDocumentPage(selectedDocumentPage.id, (page) => replaceDocumentBlockWithDefault(page, selection.blockId));
      updateBlockStudioState("DOCUMENT", selectedDocumentPage.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: "MANUAL",
        bindingKey: selectedBlockDescriptor.bindingKey ?? null,
      });
      return;
    }
    if (selectedWebSection) {
      updateWebSection(selectedWebSection.id, (section) => replaceWebBlockWithDefault(section, selection.blockId));
      updateBlockStudioState("WEB", selectedWebSection.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: "MANUAL",
        bindingKey: selectedBlockDescriptor.bindingKey ?? null,
      });
    }
  };

  const resetSelectedBlock = () => {
    if (!selectedBlockDescriptor || selection.kind !== "BLOCK") return;
    if (selectedDocumentPage) {
      const sourcePage = generatedDraft.document.pages.find((page) => page.id === selectedDocumentPage.id);
      if (!sourcePage) return;
      const nextPage = (() => {
        if (sourcePage.family !== selectedDocumentPage.family) {
          return replaceDocumentBlockWithDefault(selectedDocumentPage, selection.blockId);
        }
        switch (selectedDocumentPage.family) {
          case "TRIP_SUMMARY": {
            if (!isDocumentPageFamily(sourcePage, "TRIP_SUMMARY")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId.startsWith("fact:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedDocumentPage,
                facts: replaceAtIndex(selectedDocumentPage.facts, index, source.facts[index] ?? createDefaultFact()),
              };
            }
            if (selection.blockId.startsWith("highlight:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedDocumentPage,
                highlights: replaceAtIndex(
                  selectedDocumentPage.highlights,
                  index,
                  source.highlights[index] ?? createDefaultHighlight()
                ),
              };
            }
            return selectedDocumentPage;
          }
          case "ROUTE_OVERVIEW": {
            if (!isDocumentPageFamily(sourcePage, "ROUTE_OVERVIEW")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId === "summary") return { ...selectedDocumentPage, summary: source.summary };
            if (selection.blockId.startsWith("route-stop:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedDocumentPage,
                routeStops: replaceAtIndex(
                  selectedDocumentPage.routeStops,
                  index,
                  source.routeStops[index] ?? "New route stop"
                ),
              };
            }
            return selectedDocumentPage;
          }
          case "HIGHLIGHTS": {
            if (!isDocumentPageFamily(sourcePage, "HIGHLIGHTS")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId.startsWith("highlight:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedDocumentPage,
                items: replaceAtIndex(selectedDocumentPage.items, index, source.items[index] ?? createDefaultHighlight()),
              };
            }
            return selectedDocumentPage;
          }
          case "DAY_DETAIL": {
            if (!isDocumentPageFamily(sourcePage, "DAY_DETAIL")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId === "day-narrative") {
              return { ...selectedDocumentPage, day: { ...selectedDocumentPage.day, narrative: source.day.narrative } };
            }
            if (selection.blockId.startsWith("item:")) {
              const sourceItem = source.day.items.find((item) => `item:${item.id}` === selection.blockId);
              return {
                ...selectedDocumentPage,
                day: {
                  ...selectedDocumentPage.day,
                  items: selectedDocumentPage.day.items.map((item) =>
                    `item:${item.id}` === selection.blockId ? sourceItem ?? item : item
                  ),
                },
              };
            }
            return selectedDocumentPage;
          }
          case "ACCOMMODATION_SUMMARY": {
            if (!isDocumentPageFamily(sourcePage, "ACCOMMODATION_SUMMARY")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId.startsWith("stay:")) {
              const sourceStay = source.stays.find((stay) => `stay:${stay.id}` === selection.blockId);
              return {
                ...selectedDocumentPage,
                stays: selectedDocumentPage.stays.map((stay) =>
                  `stay:${stay.id}` === selection.blockId ? sourceStay ?? stay : stay
                ),
              };
            }
            return selectedDocumentPage;
          }
          case "TRANSPORT_SUMMARY": {
            if (!isDocumentPageFamily(sourcePage, "TRANSPORT_SUMMARY")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId.startsWith("transfer:")) {
              const sourceTransfer = source.transfers.find((transfer) => `transfer:${transfer.id}` === selection.blockId);
              return {
                ...selectedDocumentPage,
                transfers: selectedDocumentPage.transfers.map((transfer) =>
                  `transfer:${transfer.id}` === selection.blockId ? sourceTransfer ?? transfer : transfer
                ),
              };
            }
            return selectedDocumentPage;
          }
          case "POLICY_NOTES": {
            if (!isDocumentPageFamily(sourcePage, "POLICY_NOTES")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId.startsWith("policy:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedDocumentPage,
                blocks: replaceAtIndex(selectedDocumentPage.blocks, index, source.blocks[index] ?? createDefaultPolicyBlock()),
              };
            }
            return selectedDocumentPage;
          }
          case "COVER": {
            if (!isDocumentPageFamily(sourcePage, "COVER")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId === "title") return { ...selectedDocumentPage, title: source.title };
            if (selection.blockId === "subtitle") return { ...selectedDocumentPage, subtitle: source.subtitle };
            if (selection.blockId === "meta") return { ...selectedDocumentPage, meta: [...source.meta] };
            return selectedDocumentPage;
          }
          case "PRICING_SUMMARY": {
            if (!isDocumentPageFamily(sourcePage, "PRICING_SUMMARY")) return selectedDocumentPage;
            const source = sourcePage;
            if (selection.blockId === "pricing") return { ...selectedDocumentPage, pricing: source.pricing };
            return selectedDocumentPage;
          }
        }
      })();
      updateDocumentPage(selectedDocumentPage.id, () => nextPage);
      updateBlockStudioState("DOCUMENT", selectedDocumentPage.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: "SOURCE",
      });
      return;
    }

    if (selectedWebSection) {
      const sourceSection = generatedDraft.web.sections.find((section) => section.id === selectedWebSection.id);
      if (!sourceSection || sourceSection.family !== selectedWebSection.family) return;
      const nextSection = (() => {
        switch (selectedWebSection.family) {
          case "HERO": {
            if (!isWebSectionFamily(sourceSection, "HERO")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId === "title") return { ...selectedWebSection, title: source.title };
            if (selection.blockId === "subtitle") return { ...selectedWebSection, subtitle: source.subtitle };
            if (selection.blockId === "chips") return { ...selectedWebSection, chips: [...source.chips] };
            return selectedWebSection;
          }
          case "QUICK_FACTS": {
            if (!isWebSectionFamily(sourceSection, "QUICK_FACTS")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("fact:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                facts: replaceAtIndex(selectedWebSection.facts, index, source.facts[index] ?? createDefaultFact()),
              };
            }
            if (selection.blockId.startsWith("highlight:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                highlights: replaceAtIndex(
                  selectedWebSection.highlights,
                  index,
                  source.highlights[index] ?? createDefaultHighlight()
                ),
              };
            }
            return selectedWebSection;
          }
          case "ROUTE": {
            if (!isWebSectionFamily(sourceSection, "ROUTE")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId === "summary") return { ...selectedWebSection, summary: source.summary };
            if (selection.blockId.startsWith("route-stop:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                routeStops: replaceAtIndex(
                  selectedWebSection.routeStops,
                  index,
                  source.routeStops[index] ?? "New route stop"
                ),
              };
            }
            return selectedWebSection;
          }
          case "TIMELINE": {
            if (!isWebSectionFamily(sourceSection, "TIMELINE")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("day:")) {
              const sourceDay = source.days.find((day) => `day:${day.id}` === selection.blockId);
              return {
                ...selectedWebSection,
                days: selectedWebSection.days.map((day) => (`day:${day.id}` === selection.blockId ? sourceDay ?? day : day)),
              };
            }
            return selectedWebSection;
          }
          case "STAYS": {
            if (!isWebSectionFamily(sourceSection, "STAYS")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("stay:")) {
              const sourceStay = source.stays.find((stay) => `stay:${stay.id}` === selection.blockId);
              return {
                ...selectedWebSection,
                stays: selectedWebSection.stays.map((stay) =>
                  `stay:${stay.id}` === selection.blockId ? sourceStay ?? stay : stay
                ),
              };
            }
            return selectedWebSection;
          }
          case "GALLERY": {
            if (!isWebSectionFamily(sourceSection, "GALLERY")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("gallery:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                items: replaceAtIndex(selectedWebSection.items, index, source.items[index] ?? createDefaultHighlight()),
              };
            }
            return selectedWebSection;
          }
          case "TRAVEL_NOTES": {
            if (!isWebSectionFamily(sourceSection, "TRAVEL_NOTES")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("policy:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                blocks: replaceAtIndex(selectedWebSection.blocks, index, source.blocks[index] ?? createDefaultPolicyBlock()),
              };
            }
            return selectedWebSection;
          }
          case "SUPPORT_FOOTER": {
            if (!isWebSectionFamily(sourceSection, "SUPPORT_FOOTER")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId.startsWith("line:")) {
              const index = Number(selection.blockId.split(":")[1]);
              return {
                ...selectedWebSection,
                lines: replaceAtIndex(selectedWebSection.lines, index, source.lines[index] ?? "New support line"),
              };
            }
            return selectedWebSection;
          }
          case "PRICING": {
            if (!isWebSectionFamily(sourceSection, "PRICING")) return selectedWebSection;
            const source = sourceSection;
            if (selection.blockId === "pricing") return { ...selectedWebSection, pricing: source.pricing };
            return selectedWebSection;
          }
        }
      })();
      updateWebSection(selectedWebSection.id, () => nextSection);
      updateBlockStudioState("WEB", selectedWebSection.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: "SOURCE",
      });
    }
  };

  const regenerateSelectedBlock = () => {
    if (!selectedBlockDescriptor || selection.kind !== "BLOCK") return;
    resetSelectedBlock();
    updateBlockStudioState(selection.surface, selection.itemId, selection.blockId, selectedBlockDescriptor.family, {
      sourceMode: "SOURCE",
      layoutVariant:
        selectedBlockState?.layoutVariant || ITINERARY_BLOCK_FAMILY_REGISTRY[selectedBlockDescriptor.family].defaultLayoutVariant,
    });
  };

  const regenerateCurrentItem = () => {
    if (selectedDocumentPage) {
      const original = generatedDraft.document.pages.find((page) => page.id === selectedDocumentPage.id);
      if (!original) return;
      updateDocumentPage(selectedDocumentPage.id, (page) => ({
        ...cloneValue(original),
        id: page.id,
        anchorLabel: page.anchorLabel,
        layoutVariant: page.layoutVariant,
        state: page.state,
      }));
      return;
    }

    if (selectedWebSection) {
      const original = generatedDraft.web.sections.find((section) => section.id === selectedWebSection.id);
      if (!original) return;
      updateWebSection(selectedWebSection.id, (section) => ({
        ...cloneValue(original),
        id: section.id,
        anchorLabel: section.anchorLabel,
        layoutVariant: section.layoutVariant,
        state: section.state,
      }));
    }
  };

  const setSelectedBlockMedia = (media: ItineraryMediaRef | null) => {
    if (!selectedBlockDescriptor || selection.kind !== "BLOCK") return;
    if (selectedDocumentPage) {
      updateDocumentPage(selectedDocumentPage.id, (page) => setDocumentBlockMedia(page, selection.blockId, media));
      updateBlockStudioState("DOCUMENT", selectedDocumentPage.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: media ? "OVERRIDE" : selectedBlockState?.sourceMode ?? "OVERRIDE",
        bindingKey: selectedBlockDescriptor.bindingKey ?? null,
      });
      return;
    }
    if (selectedWebSection) {
      updateWebSection(selectedWebSection.id, (section) => setWebBlockMedia(section, selection.blockId, media));
      updateBlockStudioState("WEB", selectedWebSection.id, selection.blockId, selectedBlockDescriptor.family, {
        sourceMode: media ? "OVERRIDE" : selectedBlockState?.sourceMode ?? "OVERRIDE",
        bindingKey: selectedBlockDescriptor.bindingKey ?? null,
      });
    }
  };

  const toggleCurrentVisibility = () => {
    if (selectedDocumentPage) {
      updateDocumentPage(selectedDocumentPage.id, (page) =>
        updateDocumentPageState(page, {
          isVisible: !(page.state?.isVisible ?? true),
        })
      );
    }
    if (selectedWebSection) {
      updateWebSection(selectedWebSection.id, (section) =>
        updateWebSectionState(section, {
          isVisible: !(section.state?.isVisible ?? true),
        })
      );
    }
  };

  const toggleCurrentLock = () => {
    if (selectedDocumentPage) {
      updateDocumentPage(selectedDocumentPage.id, (page) =>
        updateDocumentPageState(page, {
          isLocked: !(page.state?.isLocked ?? false),
        })
      );
    }
    if (selectedWebSection) {
      updateWebSection(selectedWebSection.id, (section) =>
        updateWebSectionState(section, {
          isLocked: !(section.state?.isLocked ?? false),
        })
      );
    }
  };

  const duplicateCurrentItem = () => {
    if (selectedDocumentPage) {
      const cloned = cloneValue(selectedDocumentPage);
      cloned.id = nanoid();
      cloned.anchorLabel = `${cloned.anchorLabel} Copy`;
      cloned.state = {
        ...(cloned.state ?? {}),
        isVisible: true,
        isLocked: false,
        sourceMode: "OVERRIDE",
      };
      applyDraftChange((current) => ({
        ...current,
        document: {
          ...current.document,
          pages: [...current.document.pages, cloned],
        },
      }));
      setSelection({ kind: "PAGE", surface: "DOCUMENT", itemId: cloned.id });
    }

    if (selectedWebSection) {
      const cloned = cloneValue(selectedWebSection);
      cloned.id = nanoid();
      cloned.anchorLabel = `${cloned.anchorLabel} Copy`;
      cloned.state = {
        ...(cloned.state ?? {}),
        isVisible: true,
        isLocked: false,
        sourceMode: "OVERRIDE",
      };
      applyDraftChange((current) => ({
        ...current,
        web: {
          ...current.web,
          sections: [...current.web.sections, cloned],
        },
      }));
      setSelection({ kind: "SECTION", surface: "WEB", itemId: cloned.id });
    }
  };

  const removeCurrentItem = () => {
    if (selectedDocumentPage && draft.document.pages.length > 1) {
      applyDraftChange((current) => ({
        ...current,
        document: {
          ...current.document,
          pages: current.document.pages.filter((page) => page.id !== selectedDocumentPage.id),
        },
      }));
      return;
    }

    if (selectedWebSection && draft.web.sections.length > 1) {
      applyDraftChange((current) => ({
        ...current,
        web: {
          ...current.web,
          sections: current.web.sections.filter((section) => section.id !== selectedWebSection.id),
        },
      }));
    }
  };

  const resetCurrentItem = () => {
    if (selectedDocumentPage) {
      const original = generatedDraft.document.pages.find((page) => page.id === selectedDocumentPage.id);
      if (!original) return;
      updateDocumentPage(selectedDocumentPage.id, () => cloneValue(original));
    }
    if (selectedWebSection) {
      const original = generatedDraft.web.sections.find((section) => section.id === selectedWebSection.id);
      if (!original) return;
      updateWebSection(selectedWebSection.id, () => cloneValue(original));
    }
  };

  const addDocumentPage = (family: ItineraryPageFamily) => {
    const page = createDocumentPageFromFamily(family, draft);
    applyDraftChange((current) => ({
      ...current,
      document: {
        ...current.document,
        pages: [...current.document.pages, page],
      },
    }));
    setSurface("DOCUMENT");
    setSelection({ kind: "PAGE", surface: "DOCUMENT", itemId: page.id });
  };

  const addWebSection = (family: ItineraryWebSectionFamily) => {
    const section = createWebSectionFromFamily(family, draft);
    applyDraftChange((current) => ({
      ...current,
      web: {
        ...current.web,
        sections: [...current.web.sections, section],
      },
    }));
    setSurface("WEB");
    setSelection({ kind: "SECTION", surface: "WEB", itemId: section.id });
  };

  const onCreateExport = (format: "PDF" | "DOCX") => {
    startPublishing(async () => {
      try {
        await createItineraryExportHook(payload.itinerary.id, { format });
        notify.success(`${format} export prepared.`);
        router.refresh();
      } catch (error) {
        notifyApiError(error, `Failed to prepare ${format} export.`);
      }
    });
  };

  const onCreateShare = () => {
    startPublishing(async () => {
      try {
        const parsedExpiry = shareExpiryDays.trim()
          ? Number.parseInt(shareExpiryDays.trim(), 10)
          : undefined;
        const result = await createItineraryShareLink(payload.itinerary.id, {
          surface: shareSurface,
          expiresInDays: Number.isFinite(parsedExpiry) ? parsedExpiry : undefined,
        });

        if (result.share.shareUrl && typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(result.share.shareUrl);
        }
        notify.success("Secure share link created.");
        router.refresh();
      } catch (error) {
        notifyApiError(error, "Failed to create secure share link.");
      }
    });
  };

  const onRevokeShare = (shareId: string) => {
    startPublishing(async () => {
      try {
        await revokeItineraryShareLink(payload.itinerary.id, shareId);
        notify.success("Share link revoked.");
        router.refresh();
      } catch (error) {
        notifyApiError(error, "Failed to revoke share link.");
      }
    });
  };

  const documentItemsForCanvas =
    canvasMode === "FOCUSED" && selectedDocumentPage ? [selectedDocumentPage] : draft.document.pages;
  const webItemsForCanvas =
    canvasMode === "FOCUSED" && selectedWebSection ? [selectedWebSection] : draft.web.sections;

  const supportsWebShare = payload.itinerary.outputMode === "BOTH" || payload.itinerary.outputMode === "WEB";
  const supportsDocumentShare =
    payload.itinerary.outputMode === "BOTH" || payload.itinerary.outputMode === "DOCUMENT";

  return (
    <div className="space-y-5 pb-8">
      <div>
        <div
          className={cn(
            "overflow-hidden rounded-[32px] border border-black/5 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-xl",
            getToneShellClasses(draft.theme?.tone || "SANDSTONE")
          )}
        >
          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.58)_100%)]">
            <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    <Link href={`/master-data/pre-tours/${payload.itinerary.planId}`} className="font-semibold text-foreground">
                      Source pre-tour
                    </Link>
                    <span>/</span>
                    <span>Itinerary studio</span>
                    <span>/</span>
                    <span>{surface === "DOCUMENT" ? "Document composition" : "Web storytelling"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-[2.15rem]">
                      {draft.overview.title}
                    </h1>
                    <Badge variant="outline" className="border-white/70 bg-white/70">
                      {payload.template?.title || payload.itinerary.templateKey}
                    </Badge>
                    <Badge variant="outline" className="border-white/70 bg-white/70">
                      {payload.itinerary.outputMode}
                    </Badge>
                  </div>
                  <p className="max-w-4xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                    {draft.overview.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <StudioSurfaceStat
                      label={surface === "DOCUMENT" ? "Pages" : "Sections"}
                      value={currentSurfaceItems.length}
                      emphasis="accent"
                    />
                    <StudioSurfaceStat label="Edited" value={currentSurfaceEditedCount} />
                    <StudioSurfaceStat label="Hidden" value={currentSurfaceHiddenCount} />
                    <StudioSurfaceStat label="Locked" value={currentSurfaceLockedCount} />
                    <StudioSurfaceStat label="Blocks" value={currentSurfaceBlockCount} />
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 xl:min-w-[360px] xl:max-w-[420px]">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant="outline" className="gap-1.5 border-white/70 bg-white/78 px-3 py-1.5">
                      {saveState === "saving" ? <Sparkles className="size-3.5" /> : <Check className="size-3.5" />}
                      {saveState === "saving"
                        ? "Saving"
                        : saveState === "dirty"
                          ? "Unsaved"
                          : saveState === "error"
                            ? "Save failed"
                            : "Saved"}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={onUndo} disabled={!historyPast.length} className="border-white/70 bg-white/74">
                          <Undo2 className="size-4" />
                          Undo
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Step back through recent studio edits.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={onRedo} disabled={!historyFuture.length} className="border-white/70 bg-white/74">
                          <Redo2 className="size-4" />
                          Redo
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reapply the last undone studio change.</TooltipContent>
                    </Tooltip>
                    <Button variant="outline" size="sm" onClick={() => saveDraft("manual")} disabled={isSaving} className="border-white/70 bg-white/74">
                      <Save className="size-4" />
                      Save
                    </Button>
                    <Button size="sm" onClick={() => setPublishSheetOpen(true)} className="shadow-sm">
                      <ShieldCheck className="size-4" />
                      Publish
                    </Button>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/72 px-4 py-4 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tabs value={surface} onValueChange={(value) => setSurface(value as ItinerarySurface)}>
                          <TabsList className="bg-muted/60">
                            {availableSurfaces.includes("DOCUMENT") ? (
                              <TabsTrigger value="DOCUMENT" className="gap-2">
                                <FileStack className="size-4" />
                                Document
                              </TabsTrigger>
                            ) : null}
                            {availableSurfaces.includes("WEB") ? (
                              <TabsTrigger value="WEB" className="gap-2">
                                <Globe2 className="size-4" />
                                Web
                              </TabsTrigger>
                            ) : null}
                          </TabsList>
                        </Tabs>
                        <Tabs value={canvasMode} onValueChange={(value) => setCanvasMode(value as CanvasMode)}>
                          <TabsList className="bg-muted/60">
                            <TabsTrigger value="STACK">Full document</TabsTrigger>
                            <TabsTrigger value="FOCUSED">Focused item</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <Tabs value={canvasChrome} onValueChange={(value) => setCanvasChrome(value as CanvasChrome)}>
                          <TabsList className="bg-muted/60">
                            <TabsTrigger value="STUDIO">Studio chrome</TabsTrigger>
                            <TabsTrigger value="PREVIEW">Clean preview</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      <Separator className="bg-border/60" />

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            Active focus
                          </p>
                          <p className="text-sm font-semibold text-foreground">{selectedTitle}</p>
                          <p className="text-xs leading-5 text-muted-foreground">{focusSummary}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-white/78 px-4 py-2 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Zoom</p>
                            <div className="w-36">
                              <Slider value={[zoom]} min={70} max={120} step={2} onValueChange={(value) => setZoom(value[0] ?? 92)} />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{zoom}%</span>
                          </div>
                          <div className="text-right text-xs leading-5 text-muted-foreground">
                            <p>Reference {draft.overview.referenceNo}</p>
                            <p>{lastSavedLabel ? `Last save ${new Date(lastSavedLabel).toLocaleString("en-US")}` : "Never saved"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[32px] border border-black/5 bg-white/55 shadow-[0_26px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[330px_minmax(0,1fr)_390px]">
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(249,247,243,0.84)_100%)]">
          <div className="space-y-4 p-4">
              <StudioSidebarPanel
                eyebrow="Navigator"
                title={surface === "DOCUMENT" ? "Document composition rail" : "Web story rail"}
                description="Move through the itinerary structure with clear status signals and tourism-safe insert points."
              >
                <div className="flex flex-wrap gap-2">
                  <StudioFocusTag label="Surface" value={surface === "DOCUMENT" ? "Document" : "Web"} />
                  <StudioFocusTag label="Selection" value={selectionKindLabel} />
                  <StudioFocusTag label="Mode" value={canvasMode === "STACK" ? "Stack" : "Focused"} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickActionCards.map((tool) => (
                    <StudioQuickActionCard
                      key={tool.label}
                      label={tool.label}
                      description={tool.description}
                      badge={tool.badge}
                      onClick={tool.onClick}
                    />
                  ))}
                </div>
              </StudioSidebarPanel>

              <Card className="border-border/60 bg-white/82 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
                <CardHeader className="space-y-2 pb-4">
                  <CardTitle className="text-base tracking-tight">
                    {surface === "DOCUMENT" ? "Document outline" : "Story outline"}
                  </CardTitle>
                  <CardDescription>
                    Reorder pages, move through the document stack, and keep the editing studio anchored to structured itinerary families.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelection({ kind: "DOCUMENT", surface })}
                    className={cn(
                      "w-full rounded-[22px] border px-4 py-4 text-left transition-all",
                      selection.kind === "DOCUMENT" && selection.surface === surface
                        ? "border-primary/30 bg-primary/8 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.3)]"
                        : "border-border/70 bg-muted/10 hover:border-primary/20 hover:bg-muted/20"
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Studio root</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {surface === "DOCUMENT" ? "Document settings" : "Web settings"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Global branding, typography, output defaults, and document-wide controls.
                    </p>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {surface === "DOCUMENT" ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="size-4" />
                            Add page
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <div className="space-y-3">
                            <SectionLabel
                              eyebrow="Insert"
                              title="Document page library"
                              description="All inserted pages stay inside the structured itinerary system."
                            />
                            <div className="grid gap-2">
                              {(
                                Object.entries(DOCUMENT_PAGE_FAMILY_REGISTRY) as Array<
                                  [ItineraryPageFamily, (typeof DOCUMENT_PAGE_FAMILY_REGISTRY)[ItineraryPageFamily]]
                                >
                              ).map(([family, config]) => (
                                <button
                                  key={family}
                                  type="button"
                                  className="rounded-[22px] border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20"
                                  onClick={() => addDocumentPage(family)}
                                >
                                  <p className="text-sm font-medium">{config.label}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="size-4" />
                            Add section
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <div className="space-y-3">
                            <SectionLabel
                              eyebrow="Insert"
                              title="Web section library"
                              description="Add new web storytelling sections while keeping web rendering separate from document pages."
                            />
                            <div className="grid gap-2">
                              {(
                                Object.entries(WEB_SECTION_FAMILY_REGISTRY) as Array<
                                  [
                                    ItineraryWebSectionFamily,
                                    (typeof WEB_SECTION_FAMILY_REGISTRY)[ItineraryWebSectionFamily],
                                  ]
                                >
                              ).map(([family, config]) => (
                                <button
                                  key={family}
                                  type="button"
                                  className="rounded-[22px] border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20"
                                  onClick={() => addWebSection(family)}
                                >
                                  <p className="text-sm font-medium">{config.label}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {selectedDocumentPage || selectedWebSection ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="size-4" />
                            Insert block
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <div className="space-y-3">
                            <SectionLabel
                              eyebrow="Insert"
                              title="Block library"
                              description="Only itinerary-safe block families that fit the selected page or section are shown here."
                            />
                            <div className="grid gap-2">
                              {(
                                selectedDocumentPage
                                  ? DOCUMENT_PAGE_FAMILY_REGISTRY[selectedDocumentPage.family].insertableBlocks
                                  : selectedWebSection
                                    ? WEB_SECTION_FAMILY_REGISTRY[selectedWebSection.family].insertableBlocks
                                    : []
                              ).map((family) => {
                                const config = ITINERARY_BLOCK_FAMILY_REGISTRY[family];
                                return (
                                  <button
                                    key={family}
                                    type="button"
                                    className="rounded-[22px] border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20"
                                    onClick={() => insertBlockIntoCurrentItem(family)}
                                  >
                                    <p className="text-sm font-medium">{config.label}</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={duplicateCurrentItem} disabled={selection.kind === "DOCUMENT"}>
                      <Copy className="size-4" />
                      Duplicate
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(surface === "DOCUMENT" ? draft.document.pages : draft.web.sections).map((item, index) => {
                      const isSelected =
                        selection.kind !== "DOCUMENT" &&
                        selection.surface === surface &&
                        selection.itemId === item.id;
                      const registryLabel =
                        surface === "DOCUMENT"
                          ? DOCUMENT_PAGE_FAMILY_REGISTRY[(item as ItineraryDocumentPage).family].label
                          : WEB_SECTION_FAMILY_REGISTRY[(item as ItineraryWebSection).family].label;
                      const itemTitle =
                        surface === "DOCUMENT"
                          ? pageTitleForStudio(item as ItineraryDocumentPage)
                          : sectionTitleForStudio(item as ItineraryWebSection);
                      const isVisible = item.state?.isVisible ?? true;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          draggable
                          onDragStart={() => setDraggedId(item.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (!draggedId || draggedId === item.id) return;
                            if (surface === "DOCUMENT") {
                              applyDraftChange((current) => ({
                                ...current,
                                document: {
                                  ...current.document,
                                  pages: moveItem(current.document.pages, draggedId, item.id),
                                },
                              }));
                            } else {
                              applyDraftChange((current) => ({
                                ...current,
                                web: {
                                  ...current.web,
                                  sections: moveItem(current.web.sections, draggedId, item.id),
                                },
                              }));
                            }
                            setDraggedId(null);
                          }}
                          onClick={() =>
                            setSelection(
                              surface === "DOCUMENT"
                                ? { kind: "PAGE", surface: "DOCUMENT", itemId: item.id }
                                : { kind: "SECTION", surface: "WEB", itemId: item.id }
                            )
                          }
                          className={cn(
                            "w-full rounded-[24px] border px-4 py-4 text-left transition-all",
                            isSelected
                              ? "border-primary/30 bg-primary/8 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.35)]"
                              : "border-border/70 bg-muted/10 hover:border-primary/20 hover:bg-muted/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full border bg-background/90 p-1.5 text-muted-foreground shadow-sm">
                              <GripVertical className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                    {surface === "DOCUMENT" ? `Page ${index + 1}` : `Section ${index + 1}`}
                                  </p>
                                  <p className="truncate text-sm font-semibold text-foreground">{itemTitle}</p>
                                </div>
                                {isVisible ? <Eye className="size-4 text-muted-foreground" /> : <EyeOff className="size-4 text-muted-foreground" />}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-1">{registryLabel}</span>
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-1">{item.layoutVariant}</span>
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-1">
                                  {item.state?.sourceMode || "SOURCE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {(selectedDocumentPage || selectedWebSection) ? (
                <Card className="border-border/60 bg-white/82 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
                  <CardHeader className="space-y-2 pb-4">
                    <CardTitle className="text-base tracking-tight">Block navigator</CardTitle>
                    <CardDescription>
                      Select a content block inside the current {selectedDocumentPage ? "page" : "section"} to edit it directly on the canvas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(selectedDocumentPage ? selectedDocumentBlocks : selectedWebBlocks).length ? (
                      (selectedDocumentPage ? selectedDocumentBlocks : selectedWebBlocks).map((block, index) => {
                        const isSelected =
                          selection.kind === "BLOCK" &&
                          selection.blockId === block.id &&
                          selection.itemId === (selectedDocumentPage?.id || selectedWebSection?.id);

                        return (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() =>
                              setSelection({
                                kind: "BLOCK",
                                surface: selectedDocumentPage ? "DOCUMENT" : "WEB",
                                itemId: selectedDocumentPage?.id || selectedWebSection?.id || "",
                                blockId: block.id,
                              })
                            }
                            className={cn(
                              "w-full rounded-[22px] border px-4 py-4 text-left transition-all",
                              isSelected
                                ? "border-primary/30 bg-primary/8 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.3)]"
                                : "border-border/70 bg-muted/10 hover:border-primary/20 hover:bg-muted/20"
                            )}
                          >
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Block {index + 1}</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{block.label}</p>
                            {block.description ? (
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{block.description}</p>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This {selectedDocumentPage ? "page" : "section"} does not expose block-level selection yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
        </div>

        <div className="bg-[radial-gradient(circle_at_top,rgba(244,239,229,0.8)_0%,rgba(249,248,245,0.92)_28%,rgba(245,246,248,1)_100%)]">
          <div className="flex min-h-[60vh] flex-col xl:min-h-[72vh]">
            <div className="border-b border-border/60 bg-white/72 px-5 py-4 backdrop-blur-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {surface === "DOCUMENT" ? "Document canvas" : "Web canvas"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">{selectedTitle}</h2>
                      <Badge variant="outline" className="border-border/70 bg-white/80">
                        {selectionKindLabel}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StudioFocusTag label="Source" value={selectedSourceMode} />
                    <StudioFocusTag label="Visibility" value={selectedVisibility ? "Visible" : "Hidden"} />
                    <StudioFocusTag label="Lock" value={selectedLocked ? "Locked" : "Editable"} />
                    <StudioFocusTag label="View" value={canvasChrome === "STUDIO" ? "Studio" : "Preview"} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selection.kind !== "DOCUMENT" ? (
                    <Button variant="outline" size="sm" onClick={resetCurrentItem} className="border-white/80 bg-white/76">
                      <RotateCcw className="size-4" />
                      Reset to source
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCurrentVisibility}
                    disabled={selection.kind === "DOCUMENT"}
                    className="border-white/80 bg-white/76"
                  >
                    {(selectedDocumentPage?.state?.isVisible ?? selectedWebSection?.state?.isVisible ?? true) === false ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                    Toggle visibility
                  </Button>
                </div>
              </div>
            </div>

            <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-8 xl:px-8">
                <div className="rounded-[28px] border border-white/70 bg-white/76 px-5 py-4 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.25)] backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Composition focus
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selection.kind === "BLOCK"
                          ? "Editing a structured content block"
                          : selection.kind === "DOCUMENT"
                            ? "Editing the document system"
                            : surface === "DOCUMENT"
                              ? "Editing a page in the proposal stack"
                              : "Editing a section in the shared microsite"}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">{focusSummary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StudioFocusTag label="Surface" value={surface === "DOCUMENT" ? "Document" : "Web"} />
                      <StudioFocusTag
                        label={surface === "DOCUMENT" ? "Pages in view" : "Sections in view"}
                        value={surface === "DOCUMENT" ? String(documentItemsForCanvas.length) : String(webItemsForCanvas.length)}
                      />
                      <StudioFocusTag label="Zoom" value={`${zoom}%`} />
                    </div>
                  </div>
                </div>

                {surface === "DOCUMENT"
                  ? documentItemsForCanvas.map((page) => {
                      const isSelected =
                        selection.surface === "DOCUMENT" &&
                        selection.kind !== "DOCUMENT" &&
                        activeItemId === page.id;
                      const selectedBlockId =
                        selection.kind === "BLOCK" && selection.surface === "DOCUMENT" && activeItemId === page.id
                          ? selection.blockId
                          : null;
                      return (
                        <div key={page.id} className={cn("w-full text-left", canvasChrome === "PREVIEW" ? "" : "focus:outline-none")}>
                          <div className="relative mx-auto flex max-w-[1010px] justify-center">
                            {canvasChrome === "STUDIO" ? (
                              <div className="pointer-events-none absolute inset-x-8 top-6 h-full rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(226,216,199,0.22)_0%,rgba(255,255,255,0)_72%)]" />
                            ) : null}
                            <div
                              className={cn(
                                "relative w-full rounded-[40px] border border-white/80 bg-white/78 p-4 shadow-[0_30px_90px_-42px_rgba(15,23,42,0.38)] backdrop-blur-sm transition-all sm:p-5",
                                isSelected && canvasChrome === "STUDIO"
                                  ? "ring-2 ring-primary/40 ring-offset-8 ring-offset-transparent"
                                  : ""
                              )}
                            >
                              {canvasChrome === "STUDIO" ? (
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-border/70 bg-white/80">
                                      {DOCUMENT_PAGE_FAMILY_REGISTRY[page.family].label}
                                    </Badge>
                                    {page.state?.sourceMode === "OVERRIDE" ? (
                                      <Badge variant="outline" className="border-primary/20 bg-primary/10">
                                        Edited
                                      </Badge>
                                    ) : null}
                                    {(page.state?.isVisible ?? true) === false ? <Badge variant="outline">Hidden</Badge> : null}
                                    {page.state?.isLocked ? <Badge variant="outline">Locked</Badge> : null}
                                    {selectedBlockId ? <Badge variant="outline">Block active</Badge> : null}
                                  </div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{page.anchorLabel}</p>
                                </div>
                              ) : null}
                              <div
                                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                                className="mx-auto transition-all"
                              >
                                <ItineraryStudioDocumentCanvasPage
                                  page={page}
                                  selectedBlockId={selectedBlockId}
                                  onSelectPage={() => setSelection({ kind: "PAGE", surface: "DOCUMENT", itemId: page.id })}
                                  onSelectBlock={(blockId) =>
                                    setSelection({
                                      kind: "BLOCK",
                                      surface: "DOCUMENT",
                                      itemId: page.id,
                                      blockId,
                                    })
                                  }
                                  onChange={(next) => {
                                    updateDocumentPage(page.id, () => next);
                                    if (selectedBlockId && selection.surface === "DOCUMENT" && activeItemId === page.id) {
                                      markSelectedBlockAsOverride();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : webItemsForCanvas.map((section) => {
                      const isSelected =
                        selection.surface === "WEB" &&
                        selection.kind !== "DOCUMENT" &&
                        activeItemId === section.id;
                      const selectedBlockId =
                        selection.kind === "BLOCK" && selection.surface === "WEB" && activeItemId === section.id
                          ? selection.blockId
                          : null;
                      return (
                        <div key={section.id} className="w-full text-left">
                          <div className="relative mx-auto flex max-w-[1120px] justify-center">
                            {canvasChrome === "STUDIO" ? (
                              <div className="pointer-events-none absolute inset-x-10 top-6 h-full rounded-[42px] bg-[radial-gradient(circle_at_top,rgba(212,228,235,0.22)_0%,rgba(255,255,255,0)_72%)]" />
                            ) : null}
                            <div
                              className={cn(
                                "relative w-full rounded-[42px] border border-white/80 bg-white/74 p-4 shadow-[0_30px_90px_-42px_rgba(15,23,42,0.34)] backdrop-blur-sm transition-all sm:p-5",
                                isSelected && canvasChrome === "STUDIO"
                                  ? "ring-2 ring-primary/40 ring-offset-8 ring-offset-transparent"
                                  : ""
                              )}
                            >
                              {canvasChrome === "STUDIO" ? (
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-border/70 bg-white/80">
                                      {WEB_SECTION_FAMILY_REGISTRY[section.family].label}
                                    </Badge>
                                    {section.state?.sourceMode === "OVERRIDE" ? (
                                      <Badge variant="outline" className="border-primary/20 bg-primary/10">
                                        Edited
                                      </Badge>
                                    ) : null}
                                    {(section.state?.isVisible ?? true) === false ? <Badge variant="outline">Hidden</Badge> : null}
                                    {section.state?.isLocked ? <Badge variant="outline">Locked</Badge> : null}
                                    {selectedBlockId ? <Badge variant="outline">Block active</Badge> : null}
                                  </div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{section.anchorLabel}</p>
                                </div>
                              ) : null}
                              <div
                                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                                className="mx-auto transition-all"
                              >
                                <ItineraryStudioWebCanvasSection
                                  section={section}
                                  selectedBlockId={selectedBlockId}
                                  onSelectSection={() => setSelection({ kind: "SECTION", surface: "WEB", itemId: section.id })}
                                  onSelectBlock={(blockId) =>
                                    setSelection({
                                      kind: "BLOCK",
                                      surface: "WEB",
                                      itemId: section.id,
                                      blockId,
                                    })
                                  }
                                  onChange={(next) => {
                                    updateWebSection(section.id, () => next);
                                    if (selectedBlockId && selection.surface === "WEB" && activeItemId === section.id) {
                                      markSelectedBlockAsOverride();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,248,246,0.9)_100%)] xl:col-span-2 2xl:col-span-1">
          <div className="space-y-4 p-4">
              <StudioSidebarPanel
                eyebrow="Inspector"
                title="Contextual properties"
                description="Tune layout, media, and override behavior for the current focus without losing structured quality."
              >
                <div className="flex flex-wrap gap-2">
                  <StudioFocusTag label="Focus" value={selectionKindLabel} />
                  <StudioFocusTag label="Source" value={selectedSourceMode} />
                  <StudioFocusTag label="Visibility" value={selectedVisibility ? "Visible" : "Hidden"} />
                  <StudioFocusTag label="Lock" value={selectedLocked ? "Locked" : "Editable"} />
                </div>
                <div className="mt-4 rounded-[22px] border border-border/70 bg-white/78 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Inspector focus
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedTitle}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{focusSummary}</p>
                </div>
              </StudioSidebarPanel>

              <Card className="border-border/60 bg-white/82 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
                <CardHeader className="space-y-2 pb-4">
                  <CardTitle className="text-base tracking-tight">Properties</CardTitle>
                  <CardDescription>
                    Structured layout, content, and source-safe editing controls for the current document, page, section, or block focus.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selection.kind === "DOCUMENT" ? (
                    <>
                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <SectionLabel
                          eyebrow="Document"
                          title="Document-level editing"
                          description="Update brand, typography, spacing, and output defaults without breaking template rules."
                        />
                        <div className="space-y-2">
                          <Label>Itinerary title</Label>
                          <Input
                            value={draft.overview.title}
                            onChange={(event) =>
                              applyDraftChange((current) => ({
                                ...current,
                                overview: {
                                  ...current.overview,
                                  title: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subtitle</Label>
                          <Textarea
                            value={draft.overview.subtitle}
                            onChange={(event) =>
                              applyDraftChange((current) => ({
                                ...current,
                                overview: {
                                  ...current.overview,
                                  subtitle: event.target.value,
                                },
                              }))
                            }
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <SectionLabel
                          eyebrow="Theme"
                          title="Visual system"
                          description="These controls shape both the page stack and the web microsite while preserving the renderer split."
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Color tone</Label>
                            <Select
                              value={draft.theme?.tone || "SANDSTONE"}
                              onValueChange={(value) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    tone: value as ItineraryThemeTone,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SANDSTONE">Sandstone</SelectItem>
                                <SelectItem value="OCEAN">Ocean</SelectItem>
                                <SelectItem value="FOREST">Forest</SelectItem>
                                <SelectItem value="SUNSET">Sunset</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Typography theme</Label>
                            <Select
                              value={draft.theme?.typography || "EDITORIAL"}
                              onValueChange={(value) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    typography: value as ItineraryTypographyTheme,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EDITORIAL">Editorial</SelectItem>
                                <SelectItem value="CLASSIC">Classic</SelectItem>
                                <SelectItem value="CONTEMPORARY">Contemporary</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Density</Label>
                            <Select
                              value={draft.theme?.density || "BALANCED"}
                              onValueChange={(value) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    density: value as ItineraryDensityMode,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="COMPACT">Compact</SelectItem>
                                <SelectItem value="BALANCED">Balanced</SelectItem>
                                <SelectItem value="CINEMATIC">Cinematic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Page size</Label>
                            <Select
                              value={draft.theme?.documentPageSize || "A4"}
                              onValueChange={(value) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    documentPageSize: value as ItineraryDocumentPageSize,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A4">A4</SelectItem>
                                <SelectItem value="LETTER">Letter</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Orientation</Label>
                            <Select
                              value={draft.theme?.documentOrientation || "PORTRAIT"}
                              onValueChange={(value) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    documentOrientation: value as ItineraryDocumentOrientation,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PORTRAIT">Portrait</SelectItem>
                                <SelectItem value="LANDSCAPE">Landscape</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Brand label</Label>
                            <Input
                              value={draft.theme?.brandLabel || ""}
                              onChange={(event) =>
                                applyDraftChange((current) => ({
                                  ...current,
                                  theme: {
                                    ...(current.theme || {
                                      documentThemeName: payload.template?.documentTheme || "Classic Journal",
                                      webThemeName: payload.template?.webTheme || "Editorial Landing",
                                      tone: "SANDSTONE",
                                      typography: "EDITORIAL",
                                      density: "BALANCED",
                                      documentPageSize: "A4",
                                      documentOrientation: "PORTRAIT",
                                    }),
                                    brandLabel: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Brand or proposal line"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {selection.kind === "BLOCK" && selectedBlockDescriptor ? (
                    <>
                      <div className="space-y-3 rounded-2xl border bg-primary/5 p-4">
                        <SectionLabel
                          eyebrow="Block"
                          title={selectedBlockDescriptor.label}
                          description="Inline editing is active on the canvas. Use this panel for source binding, safe overrides, media, and block-level actions."
                        />
                        <div className="grid gap-3 rounded-xl border bg-background px-3 py-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Parent</span>
                            <span className="font-medium text-foreground">
                              {selectedDocumentPage
                                ? pageTitleForStudio(selectedDocumentPage)
                                : selectedWebSection
                                  ? sectionTitleForStudio(selectedWebSection)
                                  : "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Surface</span>
                            <span className="font-medium text-foreground">{selection.surface}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Block family</span>
                            <span className="font-medium text-foreground">
                              {ITINERARY_BLOCK_FAMILY_REGISTRY[selectedBlockDescriptor.family].label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Editing mode</span>
                            <span className="font-medium text-foreground">Inline canvas</span>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Source mode</Label>
                            <Select
                              value={selectedBlockState?.sourceMode || "SOURCE"}
                              onValueChange={(value) =>
                                updateBlockStudioState(
                                  selection.surface,
                                  selection.itemId,
                                  selection.blockId,
                                  selectedBlockDescriptor.family,
                                  {
                                    sourceMode: value as ItineraryBlockStudioState["sourceMode"],
                                    bindingKey: selectedBlockDescriptor.bindingKey ?? null,
                                  }
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SOURCE">Source-bound</SelectItem>
                                <SelectItem value="OVERRIDE">Manual override</SelectItem>
                                <SelectItem value="MANUAL">Manual block</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Block layout</Label>
                            <Select
                              value={
                                selectedBlockState?.layoutVariant ||
                                ITINERARY_BLOCK_FAMILY_REGISTRY[selectedBlockDescriptor.family].defaultLayoutVariant
                              }
                              onValueChange={(value) =>
                                updateBlockStudioState(
                                  selection.surface,
                                  selection.itemId,
                                  selection.blockId,
                                  selectedBlockDescriptor.family,
                                  {
                                    layoutVariant: value,
                                    bindingKey: selectedBlockDescriptor.bindingKey ?? null,
                                  }
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ITINERARY_BLOCK_FAMILY_REGISTRY[selectedBlockDescriptor.family].supportedLayoutVariants.map((layout) => (
                                  <SelectItem key={layout} value={layout}>
                                    {layout}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Binding key</Label>
                          <Input
                            value={selectedBlockState?.bindingKey || selectedBlockDescriptor.bindingKey || ""}
                            onChange={(event) =>
                              updateBlockStudioState(
                                selection.surface,
                                selection.itemId,
                                selection.blockId,
                                selectedBlockDescriptor.family,
                                {
                                  bindingKey: event.target.value || null,
                                }
                              )
                            }
                            placeholder="Optional source binding"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Block notes</Label>
                          <Textarea
                            value={selectedBlockState?.notes || ""}
                            onChange={(event) =>
                              updateBlockStudioState(
                                selection.surface,
                                selection.itemId,
                                selection.blockId,
                                selectedBlockDescriptor.family,
                                {
                                  notes: event.target.value || null,
                                }
                              )
                            }
                            rows={3}
                            placeholder="Private note about this block."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={replaceSelectedBlock}>
                            <Copy className="size-4" />
                            Replace block
                          </Button>
                          <Button variant="outline" size="sm" onClick={resetSelectedBlock}>
                            <RotateCcw className="size-4" />
                            Reset block
                          </Button>
                          <Button variant="outline" size="sm" onClick={regenerateSelectedBlock}>
                            <Sparkles className="size-4" />
                            Regenerate block
                          </Button>
                        </div>
                      </div>

                      {selectedBlockDescriptor.mediaCapable ? (
                        <MediaSlotEditor
                          label="Selected block media"
                          mediaLibrary={mediaLibrary}
                          value={selectedBlockMedia}
                          onChange={setSelectedBlockMedia}
                        />
                      ) : null}
                    </>
                  ) : null}

                  {selection.surface === "DOCUMENT" && selection.kind !== "DOCUMENT" && selectedDocumentPage ? (
                    <>
                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <SectionLabel
                          eyebrow="Page"
                          title={DOCUMENT_PAGE_FAMILY_REGISTRY[selectedDocumentPage.family].label}
                          description={DOCUMENT_PAGE_FAMILY_REGISTRY[selectedDocumentPage.family].description}
                        />
                        <div className="space-y-2">
                          <Label>Anchor label</Label>
                          <Input
                            value={selectedDocumentPage.anchorLabel}
                            onChange={(event) =>
                              updateDocumentPage(selection.itemId, (page) => ({
                                ...page,
                                anchorLabel: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Layout variant</Label>
                          <Select
                            value={selectedDocumentPage.layoutVariant}
                            onValueChange={(value) =>
                              updateDocumentPage(selection.itemId, (page) => ({
                                ...page,
                                layoutVariant: value as ItineraryDocumentLayout,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_PAGE_FAMILY_REGISTRY[selectedDocumentPage.family].supportedLayouts.map((layout) => (
                                <SelectItem key={layout} value={layout}>
                                  {layout}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Source mode</Label>
                          <Select
                            value={selectedDocumentPage.state?.sourceMode || "SOURCE"}
                            onValueChange={(value) =>
                              updateDocumentPage(selection.itemId, (page) =>
                                updateDocumentPageState(page, {
                                  sourceMode: value as ItinerarySurfaceState["sourceMode"],
                                })
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SOURCE">Source-bound</SelectItem>
                              <SelectItem value="OVERRIDE">Manual override</SelectItem>
                              <SelectItem value="MANUAL">Manual page</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3">
                            <div>
                              <p className="text-sm font-medium">Visible</p>
                              <p className="text-xs text-muted-foreground">Hide from document export and preview.</p>
                            </div>
                            <Switch checked={selectedDocumentPage.state?.isVisible ?? true} onCheckedChange={toggleCurrentVisibility} />
                          </div>
                          <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3">
                            <div>
                              <p className="text-sm font-medium">Locked</p>
                              <p className="text-xs text-muted-foreground">Prevent accidental edits while reviewing the rest of the document.</p>
                            </div>
                            <Switch checked={selectedDocumentPage.state?.isLocked ?? false} onCheckedChange={toggleCurrentLock} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Studio notes</Label>
                          <Textarea
                            value={selectedDocumentPage.state?.notes || ""}
                            onChange={(event) =>
                              updateDocumentPage(selection.itemId, (page) =>
                                updateDocumentPageState(page, {
                                  notes: event.target.value,
                                })
                              )
                            }
                            rows={3}
                            placeholder="Private editorial notes for this page."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="size-4" />
                                Replace family
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80">
                              <div className="space-y-3">
                                <SectionLabel
                                  eyebrow="Replace"
                                  title="Swap page family"
                                  description="Replace this page with another structured document family while keeping the studio flow intact."
                                />
                                <div className="grid gap-2">
                                  {(
                                    Object.entries(DOCUMENT_PAGE_FAMILY_REGISTRY) as Array<
                                      [ItineraryPageFamily, (typeof DOCUMENT_PAGE_FAMILY_REGISTRY)[ItineraryPageFamily]]
                                    >
                                  ).map(([family, config]) => (
                                    <button
                                      key={family}
                                      type="button"
                                      className="rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                                      onClick={() => replaceCurrentItemFamily(family)}
                                    >
                                      <p className="text-sm font-medium">{config.label}</p>
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button variant="outline" size="sm" onClick={duplicateCurrentItem}>
                            <Copy className="size-4" />
                            Duplicate page
                          </Button>
                          <Button variant="outline" size="sm" onClick={regenerateCurrentItem}>
                            <Sparkles className="size-4" />
                            Regenerate page
                          </Button>
                          <Button variant="outline" size="sm" onClick={resetCurrentItem}>
                            <RotateCcw className="size-4" />
                            Reset from source
                          </Button>
                          <Button variant="outline" size="sm" onClick={removeCurrentItem} disabled={draft.document.pages.length <= 1}>
                            <Trash2 className="size-4" />
                            Remove page
                          </Button>
                        </div>
                      </div>

                      {(selectedDocumentPage.family === "COVER" ||
                        selectedDocumentPage.family === "ROUTE_OVERVIEW" ||
                        selectedDocumentPage.family === "DAY_DETAIL") && (
                        <MediaSlotEditor
                          label="Primary page media"
                          mediaLibrary={mediaLibrary}
                          value={
                            selectedDocumentPage.family === "COVER"
                              ? selectedDocumentPage.heroImage || null
                              : selectedDocumentPage.family === "ROUTE_OVERVIEW"
                                ? selectedDocumentPage.image || null
                                : selectedDocumentPage.day.heroImage || null
                          }
                          onChange={(next) => {
                            if (selectedDocumentPage.family === "COVER") {
                              updateDocumentPage(selection.itemId, () => ({ ...selectedDocumentPage, heroImage: next }));
                            } else if (selectedDocumentPage.family === "ROUTE_OVERVIEW") {
                              updateDocumentPage(selection.itemId, () => ({ ...selectedDocumentPage, image: next }));
                            } else {
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                day: {
                                  ...selectedDocumentPage.day,
                                  heroImage: next,
                                },
                              }));
                            }
                          }}
                        />
                      )}

                      {selectedDocumentPage.family === "COVER" ? (
                        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                          <SectionLabel eyebrow="Content" title="Cover composition" description="Lead headline, subtitle, and top-level trip metadata." />
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Textarea
                              value={selectedDocumentPage.subtitle}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  subtitle: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </div>
                          <StringListEditor
                            title="Cover metadata"
                            description="Short travel chips below the hero statement."
                            items={selectedDocumentPage.meta}
                            emptyLabel="No cover metadata yet."
                            addLabel="Add metadata line"
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                meta: next,
                              }))
                            }
                          />
                        </div>
                      ) : null}

                      {selectedDocumentPage.family === "TRIP_SUMMARY" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <FactListEditor
                            items={selectedDocumentPage.facts}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                facts: next,
                              }))
                            }
                          />
                          <HighlightListEditor
                            items={selectedDocumentPage.highlights}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                highlights: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedDocumentPage.family === "ROUTE_OVERVIEW" ? (
                        <>
                          <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                            <div className="space-y-2">
                              <Label>Page title</Label>
                              <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                  updateDocumentPage(selection.itemId, () => ({
                                    ...selectedDocumentPage,
                                    title: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Summary</Label>
                              <Textarea
                              value={selectedDocumentPage.summary}
                              onChange={(event) =>
                                  updateDocumentPage(selection.itemId, () => ({
                                    ...selectedDocumentPage,
                                    summary: event.target.value,
                                  }))
                                }
                                rows={4}
                              />
                            </div>
                          </div>
                          <StringListEditor
                            title="Route stops"
                            description="Ordered route or roadmap sequence."
                            items={selectedDocumentPage.routeStops}
                            emptyLabel="No route stops yet."
                            addLabel="Add route stop"
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                routeStops: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedDocumentPage.family === "HIGHLIGHTS" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <HighlightListEditor
                            items={selectedDocumentPage.items}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                items: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedDocumentPage.family === "DAY_DETAIL" ? (
                        <DayItemsEditor
                          page={selectedDocumentPage}
                          onChange={(next) => updateDocumentPage(selection.itemId, () => next)}
                        />
                      ) : null}

                      {selectedDocumentPage.family === "ACCOMMODATION_SUMMARY" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <StayListEditor
                            stays={selectedDocumentPage.stays}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                stays: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedDocumentPage.family === "TRANSPORT_SUMMARY" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <TransferListEditor
                            transfers={selectedDocumentPage.transfers}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                transfers: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedDocumentPage.family === "PRICING_SUMMARY" ? (
                        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                          <SectionLabel eyebrow="Content" title="Pricing panel" description="Document-facing commercial summary for the current itinerary draft." />
                          <div className="space-y-2">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              value={selectedDocumentPage.pricing.currencyCode}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  pricing: {
                                    ...selectedDocumentPage.pricing,
                                    currencyCode: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Currency"
                            />
                            <Input
                              value={selectedDocumentPage.pricing.estimatedPerGuestLabel || ""}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  pricing: {
                                    ...selectedDocumentPage.pricing,
                                    estimatedPerGuestLabel: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Per guest"
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Input
                              value={selectedDocumentPage.pricing.baseTotal}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  pricing: {
                                    ...selectedDocumentPage.pricing,
                                    baseTotal: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Base total"
                            />
                            <Input
                              value={selectedDocumentPage.pricing.taxTotal}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  pricing: {
                                    ...selectedDocumentPage.pricing,
                                    taxTotal: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Tax total"
                            />
                            <Input
                              value={selectedDocumentPage.pricing.grandTotal}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  pricing: {
                                    ...selectedDocumentPage.pricing,
                                    grandTotal: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Grand total"
                            />
                          </div>
                        </div>
                      ) : null}

                      {selectedDocumentPage.family === "POLICY_NOTES" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Page title</Label>
                            <Input
                              value={selectedDocumentPage.title}
                              onChange={(event) =>
                                updateDocumentPage(selection.itemId, () => ({
                                  ...selectedDocumentPage,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <PolicyBlockEditor
                            blocks={selectedDocumentPage.blocks}
                            onChange={(next) =>
                              updateDocumentPage(selection.itemId, () => ({
                                ...selectedDocumentPage,
                                blocks: next,
                              }))
                            }
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {selection.surface === "WEB" && selection.kind !== "DOCUMENT" && selectedWebSection ? (
                    <>
                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <SectionLabel
                          eyebrow="Section"
                          title={WEB_SECTION_FAMILY_REGISTRY[selectedWebSection.family].label}
                          description={WEB_SECTION_FAMILY_REGISTRY[selectedWebSection.family].description}
                        />
                        <div className="space-y-2">
                          <Label>Anchor label</Label>
                          <Input
                            value={selectedWebSection.anchorLabel}
                            onChange={(event) =>
                              updateWebSection(selection.itemId, (section) => ({
                                ...section,
                                anchorLabel: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Layout variant</Label>
                          <Select
                            value={selectedWebSection.layoutVariant}
                            onValueChange={(value) =>
                              updateWebSection(selection.itemId, (section) => ({
                                ...section,
                                layoutVariant: value as ItineraryWebLayout,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEB_SECTION_FAMILY_REGISTRY[selectedWebSection.family].supportedLayouts.map((layout) => (
                                <SelectItem key={layout} value={layout}>
                                  {layout}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Source mode</Label>
                          <Select
                            value={selectedWebSection.state?.sourceMode || "SOURCE"}
                            onValueChange={(value) =>
                              updateWebSection(selection.itemId, (section) =>
                                updateWebSectionState(section, {
                                  sourceMode: value as ItinerarySurfaceState["sourceMode"],
                                })
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SOURCE">Source-bound</SelectItem>
                              <SelectItem value="OVERRIDE">Manual override</SelectItem>
                              <SelectItem value="MANUAL">Manual section</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3">
                            <div>
                              <p className="text-sm font-medium">Visible</p>
                              <p className="text-xs text-muted-foreground">Hide from shared microsite and web preview.</p>
                            </div>
                            <Switch checked={selectedWebSection.state?.isVisible ?? true} onCheckedChange={toggleCurrentVisibility} />
                          </div>
                          <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3">
                            <div>
                              <p className="text-sm font-medium">Locked</p>
                              <p className="text-xs text-muted-foreground">Freeze this web section while editing the rest of the story flow.</p>
                            </div>
                            <Switch checked={selectedWebSection.state?.isLocked ?? false} onCheckedChange={toggleCurrentLock} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Studio notes</Label>
                          <Textarea
                            value={selectedWebSection.state?.notes || ""}
                            onChange={(event) =>
                              updateWebSection(selection.itemId, (section) =>
                                updateWebSectionState(section, {
                                  notes: event.target.value,
                                })
                              )
                            }
                            rows={3}
                            placeholder="Private editorial notes for this section."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="size-4" />
                                Replace family
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80">
                              <div className="space-y-3">
                                <SectionLabel
                                  eyebrow="Replace"
                                  title="Swap section family"
                                  description="Replace this section with another structured web family while keeping the same studio route."
                                />
                                <div className="grid gap-2">
                                  {(
                                    Object.entries(WEB_SECTION_FAMILY_REGISTRY) as Array<
                                      [
                                        ItineraryWebSectionFamily,
                                        (typeof WEB_SECTION_FAMILY_REGISTRY)[ItineraryWebSectionFamily],
                                      ]
                                    >
                                  ).map(([family, config]) => (
                                    <button
                                      key={family}
                                      type="button"
                                      className="rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                                      onClick={() => replaceCurrentItemFamily(family)}
                                    >
                                      <p className="text-sm font-medium">{config.label}</p>
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button variant="outline" size="sm" onClick={duplicateCurrentItem}>
                            <Copy className="size-4" />
                            Duplicate section
                          </Button>
                          <Button variant="outline" size="sm" onClick={regenerateCurrentItem}>
                            <Sparkles className="size-4" />
                            Regenerate section
                          </Button>
                          <Button variant="outline" size="sm" onClick={resetCurrentItem}>
                            <RotateCcw className="size-4" />
                            Reset from source
                          </Button>
                          <Button variant="outline" size="sm" onClick={removeCurrentItem} disabled={draft.web.sections.length <= 1}>
                            <Trash2 className="size-4" />
                            Remove section
                          </Button>
                        </div>
                      </div>

                      {(selectedWebSection.family === "HERO" || selectedWebSection.family === "ROUTE") && (
                        <MediaSlotEditor
                          label="Primary section media"
                          mediaLibrary={mediaLibrary}
                          value={selectedWebSection.family === "HERO" ? selectedWebSection.heroImage || null : selectedWebSection.image || null}
                          onChange={(next) =>
                            selectedWebSection.family === "HERO"
                              ? updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  heroImage: next,
                                }))
                              : updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  image: next,
                                }))
                          }
                        />
                      )}

                      {(selectedWebSection.family === "HERO" || selectedWebSection.family === "QUICK_FACTS" || selectedWebSection.family === "ROUTE" || selectedWebSection.family === "TIMELINE" || selectedWebSection.family === "STAYS" || selectedWebSection.family === "GALLERY" || selectedWebSection.family === "PRICING" || selectedWebSection.family === "TRAVEL_NOTES" || selectedWebSection.family === "SUPPORT_FOOTER") && (
                        <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                          <Label>Section title</Label>
                          <Input
                            value={selectedWebSection.title}
                            onChange={(event) =>
                              updateWebSection(selection.itemId, () => ({
                                ...selectedWebSection,
                                title: event.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                      {selectedWebSection.family === "HERO" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Subtitle</Label>
                            <Textarea
                              value={selectedWebSection.subtitle}
                              onChange={(event) =>
                                updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  subtitle: event.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </div>
                          <StringListEditor
                            title="Hero chips"
                            description="Short hero fact pills for the landing section."
                            items={selectedWebSection.chips}
                            emptyLabel="No chips yet."
                            addLabel="Add chip"
                            onChange={(next) =>
                              updateWebSection(selection.itemId, () => ({
                                ...selectedWebSection,
                                chips: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedWebSection.family === "QUICK_FACTS" ? (
                        <>
                          <FactListEditor
                            items={selectedWebSection.facts}
                            onChange={(next) =>
                              updateWebSection(selection.itemId, () => ({
                                ...selectedWebSection,
                                facts: next,
                              }))
                            }
                          />
                          <HighlightListEditor
                            items={selectedWebSection.highlights}
                            onChange={(next) =>
                              updateWebSection(selection.itemId, () => ({
                                ...selectedWebSection,
                                highlights: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedWebSection.family === "ROUTE" ? (
                        <>
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                            <Label>Summary</Label>
                            <Textarea
                              value={selectedWebSection.summary}
                              onChange={(event) =>
                                updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  summary: event.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </div>
                          <StringListEditor
                            title="Route stops"
                            description="Ordered stop list for the web journey section."
                            items={selectedWebSection.routeStops}
                            emptyLabel="No route stops yet."
                            addLabel="Add route stop"
                            onChange={(next) =>
                              updateWebSection(selection.itemId, () => ({
                                ...selectedWebSection,
                                routeStops: next,
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedWebSection.family === "TIMELINE" ? (
                        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                          <SectionLabel eyebrow="Blocks" title="Timeline sequencing" description="Web timeline days remain source-driven and can be refined page by page from the document side." />
                          <p className="text-sm leading-6 text-muted-foreground">
                            This section is currently bound to {selectedWebSection.days.length} day block(s). Edit day-level narrative and items from the corresponding document day pages, then reset or duplicate this web section if you need an alternate story treatment.
                          </p>
                        </div>
                      ) : null}

                      {selectedWebSection.family === "STAYS" ? (
                        <StayListEditor
                          stays={selectedWebSection.stays}
                          onChange={(next) =>
                            updateWebSection(selection.itemId, () => ({
                              ...selectedWebSection,
                              stays: next,
                            }))
                          }
                        />
                      ) : null}

                      {selectedWebSection.family === "GALLERY" ? (
                        <HighlightListEditor
                          items={selectedWebSection.items}
                          onChange={(next) =>
                            updateWebSection(selection.itemId, () => ({
                              ...selectedWebSection,
                              items: next,
                            }))
                          }
                        />
                      ) : null}

                      {selectedWebSection.family === "PRICING" ? (
                        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                          <SectionLabel eyebrow="Blocks" title="Commercial panel" description="Web-facing costing strip and totals summary." />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              value={selectedWebSection.pricing.currencyCode}
                              onChange={(event) =>
                                updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  pricing: {
                                    ...selectedWebSection.pricing,
                                    currencyCode: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Currency"
                            />
                            <Input
                              value={selectedWebSection.pricing.estimatedPerGuestLabel || ""}
                              onChange={(event) =>
                                updateWebSection(selection.itemId, () => ({
                                  ...selectedWebSection,
                                  pricing: {
                                    ...selectedWebSection.pricing,
                                    estimatedPerGuestLabel: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Per guest"
                            />
                          </div>
                        </div>
                      ) : null}

                      {selectedWebSection.family === "TRAVEL_NOTES" ? (
                        <PolicyBlockEditor
                          blocks={selectedWebSection.blocks}
                          onChange={(next) =>
                            updateWebSection(selection.itemId, () => ({
                              ...selectedWebSection,
                              blocks: next,
                            }))
                          }
                        />
                      ) : null}

                      {selectedWebSection.family === "SUPPORT_FOOTER" ? (
                        <StringListEditor
                          title="Support lines"
                          description="Emergency, operator, or footer guidance lines for the shared microsite."
                          items={selectedWebSection.lines}
                          emptyLabel="No support lines yet."
                          addLabel="Add support line"
                          onChange={(next) =>
                            updateWebSection(selection.itemId, () => ({
                              ...selectedWebSection,
                              lines: next,
                            }))
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
        </div>
      </div>

      <Sheet open={publishSheetOpen} onOpenChange={setPublishSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Share & export</SheetTitle>
            <SheetDescription>
              Keep PDF/DOCX exports and secure share links connected to the same itinerary version while editing in the studio.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 pb-6">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Export hooks</CardTitle>
                  <CardDescription>
                    Export preparation remains separate from document and web editing, so the renderers can evolve independently.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onCreateExport("PDF")} disabled={isPublishing}>
                      <FileDown className="size-4" />
                      Prepare PDF
                    </Button>
                    <Button variant="outline" onClick={() => onCreateExport("DOCX")} disabled={isPublishing}>
                      <FileDown className="size-4" />
                      Prepare DOCX
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {payload.exports.length ? (
                      payload.exports.map((item) => (
                        <div key={item.id} className="rounded-2xl border bg-muted/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">
                                {item.format} • v{item.versionNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.fileName} • {new Date(item.createdAt).toLocaleString("en-US")}
                              </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <a href={item.downloadUrl}>
                                <FileDown className="size-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No export hooks prepared yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Secure share links</CardTitle>
                  <CardDescription>
                    Private-by-default links for document or web surfaces, with expiry and revocation controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={shareSurface === "WEB" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareSurface("WEB")}
                      disabled={!supportsWebShare}
                    >
                      <Globe2 className="size-4" />
                      Web
                    </Button>
                    <Button
                      variant={shareSurface === "DOCUMENT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShareSurface("DOCUMENT")}
                      disabled={!supportsDocumentShare}
                    >
                      <FileStack className="size-4" />
                      Document
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={shareExpiryDays}
                      onChange={(event) => setShareExpiryDays(event.target.value)}
                    />
                  </div>
                  <Button onClick={onCreateShare} disabled={isPublishing}>
                    <ShieldCheck className="size-4" />
                    Create secure link
                  </Button>
                  <div className="space-y-2">
                    {payload.shares.length ? (
                      payload.shares.map((item) => (
                        <div key={item.id} className="rounded-2xl border bg-muted/20 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {item.surface} share • v{item.versionNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Token ending {item.tokenHint} • created {new Date(item.createdAt).toLocaleString("en-US")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.revokedAt
                                  ? `Revoked ${new Date(item.revokedAt).toLocaleString("en-US")}`
                                  : item.expiresAt
                                    ? `Expires ${new Date(item.expiresAt).toLocaleString("en-US")}`
                                    : "No expiry set"}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {item.shareUrl ? (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(item.shareUrl || "");
                                        notify.success("Share link copied.");
                                      } catch (error) {
                                        notify.error(getErrorMessage(error, "Unable to copy share link."));
                                      }
                                    }}
                                  >
                                    <Copy className="size-4" />
                                    Copy link
                                  </DropdownMenuItem>
                                ) : null}
                                {!item.revokedAt ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onRevokeShare(item.id)}>
                                      <XCircle className="size-4" />
                                      Revoke link
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {item.shareUrl ? (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs">
                              <Link2 className="size-3.5 text-muted-foreground" />
                              <span className="truncate">{item.shareUrl}</span>
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No share links created yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
