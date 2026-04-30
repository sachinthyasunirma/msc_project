"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RichTextContent, RichTextEditor } from "@/modules/itinerary/ui/components/itinerary-rich-text";
import type { ItineraryBlockFamily } from "@/modules/itinerary/shared/itinerary-types";
import type {
  ItineraryDocumentPage,
  ItineraryFact,
  ItineraryHighlight,
  ItineraryPolicyBlock,
  ItineraryPricingSummary,
  ItineraryStaySummary,
  ItineraryTransferSummary,
  ItineraryWebSection,
} from "@/modules/itinerary/shared/itinerary-types";

export type StudioBlockDescriptor = {
  id: string;
  label: string;
  description?: string;
  family: ItineraryBlockFamily;
  bindingKey?: string;
  richText?: boolean;
  mediaCapable?: boolean;
};

type ItineraryStudioDocumentCanvasPageProps = {
  page: ItineraryDocumentPage;
  selectedBlockId: string | null;
  onSelectPage: () => void;
  onSelectBlock: (blockId: string) => void;
  onChange: (next: ItineraryDocumentPage) => void;
};

type ItineraryStudioWebCanvasSectionProps = {
  section: ItineraryWebSection;
  selectedBlockId: string | null;
  onSelectSection: () => void;
  onSelectBlock: (blockId: string) => void;
  onChange: (next: ItineraryWebSection) => void;
};

function createDescriptor(
  id: string,
  label: string,
  description: string | undefined,
  config: Pick<StudioBlockDescriptor, "family" | "bindingKey" | "richText" | "mediaCapable">
): StudioBlockDescriptor {
  return { id, label, description, ...config };
}

export function getDocumentBlockDescriptors(page: ItineraryDocumentPage): StudioBlockDescriptor[] {
  switch (page.family) {
    case "COVER":
      return [
        createDescriptor("title", "Cover title", "Primary itinerary headline.", {
          family: "TITLE",
          bindingKey: "overview.title",
        }),
        createDescriptor("subtitle", "Cover subtitle", "Lead narrative under the cover title.", {
          family: "RICH_TEXT",
          bindingKey: "overview.subtitle",
          richText: true,
        }),
        createDescriptor("meta", "Meta chips", "Short trip metadata chips.", {
          family: "CHIP_LIST",
          bindingKey: "overview.meta",
        }),
      ];
    case "TRIP_SUMMARY":
      return [
        createDescriptor("title", "Summary title", "Heading for the trip summary page.", {
          family: "TITLE",
          bindingKey: "summary.title",
        }),
        ...page.facts.map((fact, index) =>
          createDescriptor(`fact:${index}`, fact.label || `Fact ${index + 1}`, "Structured fact card.", {
            family: "FACT_CARD",
            bindingKey: `facts.${index}`,
          })
        ),
        ...page.highlights.map((item, index) =>
          createDescriptor(`highlight:${index}`, item.title || `Highlight ${index + 1}`, "Story-led highlight card.", {
            family: "HIGHLIGHT_CARD",
            bindingKey: `highlights.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "ROUTE_OVERVIEW":
      return [
        createDescriptor("title", "Route title", "Heading for the route page.", {
          family: "TITLE",
          bindingKey: "route.title",
        }),
        createDescriptor("summary", "Route summary", "Destination flow narrative.", {
          family: "RICH_TEXT",
          bindingKey: "route.summary",
          richText: true,
        }),
        ...page.routeStops.map((stop, index) =>
          createDescriptor(`route-stop:${index}`, stop || `Stop ${index + 1}`, "Ordered route stop.", {
            family: "ROUTE_STOP",
            bindingKey: `routeStops.${index}`,
          })
        ),
      ];
    case "HIGHLIGHTS":
      return [
        createDescriptor("title", "Highlights title", "Heading for the highlights page.", {
          family: "TITLE",
          bindingKey: "highlights.title",
        }),
        ...page.items.map((item, index) =>
          createDescriptor(`highlight:${index}`, item.title || `Highlight ${index + 1}`, "Feature highlight card.", {
            family: "HIGHLIGHT_CARD",
            bindingKey: `items.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "DAY_DETAIL":
      return [
        createDescriptor("page-title", "Page title", "Heading above the day story.", {
          family: "TITLE",
          bindingKey: "page.title",
        }),
        createDescriptor("day-title", "Day title", "Main day heading.", {
          family: "TITLE",
          bindingKey: "day.title",
        }),
        createDescriptor("day-narrative", "Day narrative", "Narrative summary for the selected day.", {
          family: "DAY_STORY",
          bindingKey: "day.narrative",
          richText: true,
        }),
        ...page.day.items.map((item, index) =>
          createDescriptor(`item:${item.id}`, item.title || `Day item ${index + 1}`, "Structured itinerary item.", {
            family: "DAY_ITEM_CARD",
            bindingKey: `day.items.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "ACCOMMODATION_SUMMARY":
      return [
        createDescriptor("title", "Stay section title", "Heading for the stay summary.", {
          family: "TITLE",
          bindingKey: "stays.title",
        }),
        ...page.stays.map((stay, index) =>
          createDescriptor(`stay:${stay.id}`, stay.name || `Stay ${index + 1}`, "Accommodation card.", {
            family: "STAY_CARD",
            bindingKey: `stays.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "TRANSPORT_SUMMARY":
      return [
        createDescriptor("title", "Transport section title", "Heading for the transfer section.", {
          family: "TITLE",
          bindingKey: "transfers.title",
        }),
        ...page.transfers.map((transfer, index) =>
          createDescriptor(`transfer:${transfer.id}`, transfer.title || `Transfer ${index + 1}`, "Transfer block.", {
            family: "TRANSFER_CARD",
            bindingKey: `transfers.${index}`,
            richText: true,
          })
        ),
      ];
    case "PRICING_SUMMARY":
      return [
        createDescriptor("title", "Pricing title", "Heading for pricing summary.", {
          family: "TITLE",
          bindingKey: "pricing.title",
        }),
        createDescriptor("pricing", "Pricing panel", "Commercial totals panel.", {
          family: "PRICING_PANEL",
          bindingKey: "pricing",
        }),
      ];
    case "POLICY_NOTES":
      return [
        createDescriptor("title", "Policy title", "Heading for travel notes and policies.", {
          family: "TITLE",
          bindingKey: "policies.title",
        }),
        ...page.blocks.map((block, index) =>
          createDescriptor(`policy:${index}`, block.title || `Policy ${index + 1}`, "Policy group with bullet points.", {
            family: "POLICY_GROUP",
            bindingKey: `blocks.${index}`,
            richText: true,
          })
        ),
      ];
  }
}

export function getWebBlockDescriptors(section: ItineraryWebSection): StudioBlockDescriptor[] {
  switch (section.family) {
    case "HERO":
      return [
        createDescriptor("title", "Hero title", "Main web hero headline.", {
          family: "TITLE",
          bindingKey: "hero.title",
        }),
        createDescriptor("subtitle", "Hero subtitle", "Hero supporting copy.", {
          family: "RICH_TEXT",
          bindingKey: "hero.subtitle",
          richText: true,
        }),
        createDescriptor("chips", "Hero chips", "Short travel fact chips.", {
          family: "CHIP_LIST",
          bindingKey: "hero.chips",
        }),
      ];
    case "QUICK_FACTS":
      return [
        createDescriptor("title", "Facts title", "Heading for quick facts.", {
          family: "TITLE",
          bindingKey: "quickFacts.title",
        }),
        ...section.facts.map((fact, index) =>
          createDescriptor(`fact:${index}`, fact.label || `Fact ${index + 1}`, "Structured fact card.", {
            family: "FACT_CARD",
            bindingKey: `facts.${index}`,
          })
        ),
        ...section.highlights.map((item, index) =>
          createDescriptor(`highlight:${index}`, item.title || `Highlight ${index + 1}`, "Story highlight card.", {
            family: "HIGHLIGHT_CARD",
            bindingKey: `highlights.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "ROUTE":
      return [
        createDescriptor("title", "Route title", "Heading for the route section.", {
          family: "TITLE",
          bindingKey: "route.title",
        }),
        createDescriptor("summary", "Route summary", "Scrolling route narrative.", {
          family: "RICH_TEXT",
          bindingKey: "route.summary",
          richText: true,
        }),
        ...section.routeStops.map((stop, index) =>
          createDescriptor(`route-stop:${index}`, stop || `Stop ${index + 1}`, "Ordered route stop.", {
            family: "ROUTE_STOP",
            bindingKey: `routeStops.${index}`,
          })
        ),
      ];
    case "TIMELINE":
      return [
        createDescriptor("title", "Timeline title", "Heading for the day timeline.", {
          family: "TITLE",
          bindingKey: "timeline.title",
        }),
        ...section.days.map((day, index) =>
          createDescriptor(`day:${day.id}`, day.title || `Day ${index + 1}`, "Narrative day story.", {
            family: "DAY_STORY",
            bindingKey: `days.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "STAYS":
      return [
        createDescriptor("title", "Stay section title", "Heading for stays.", {
          family: "TITLE",
          bindingKey: "stays.title",
        }),
        ...section.stays.map((stay, index) =>
          createDescriptor(`stay:${stay.id}`, stay.name || `Stay ${index + 1}`, "Stay card.", {
            family: "STAY_CARD",
            bindingKey: `stays.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "GALLERY":
      return [
        createDescriptor("title", "Gallery title", "Heading for gallery band.", {
          family: "TITLE",
          bindingKey: "gallery.title",
        }),
        ...section.items.map((item, index) =>
          createDescriptor(`gallery:${index}`, item.title || `Gallery item ${index + 1}`, "Media story card.", {
            family: "HIGHLIGHT_CARD",
            bindingKey: `items.${index}`,
            richText: true,
            mediaCapable: true,
          })
        ),
      ];
    case "PRICING":
      return [
        createDescriptor("title", "Pricing title", "Heading for web pricing section.", {
          family: "TITLE",
          bindingKey: "pricing.title",
        }),
        createDescriptor("pricing", "Pricing panel", "Commercial totals panel.", {
          family: "PRICING_PANEL",
          bindingKey: "pricing",
        }),
      ];
    case "TRAVEL_NOTES":
      return [
        createDescriptor("title", "Travel notes title", "Heading for travel notes.", {
          family: "TITLE",
          bindingKey: "travelNotes.title",
        }),
        ...section.blocks.map((block, index) =>
          createDescriptor(`policy:${index}`, block.title || `Policy ${index + 1}`, "Travel notes policy group.", {
            family: "POLICY_GROUP",
            bindingKey: `blocks.${index}`,
            richText: true,
          })
        ),
      ];
    case "SUPPORT_FOOTER":
      return [
        createDescriptor("title", "Support title", "Heading for support footer.", {
          family: "TITLE",
          bindingKey: "support.title",
        }),
        ...section.lines.map((line, index) =>
          createDescriptor(`line:${index}`, line || `Support line ${index + 1}`, "Support line.", {
            family: "SUPPORT_LINE",
            bindingKey: `lines.${index}`,
            richText: true,
          })
        ),
      ];
  }
}

function SelectableBlock({
  blockId,
  label,
  selected,
  onSelect,
  children,
  className,
}: {
  blockId: string;
  label: string;
  selected: boolean;
  onSelect: (blockId: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(blockId);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onSelect(blockId);
        }
      }}
      className={cn(
        "relative rounded-2xl border border-transparent transition-all outline-none",
        selected ? "border-primary/70 bg-primary/5 ring-2 ring-primary/20" : "hover:border-border/70",
        className
      )}
    >
      <div className="pointer-events-none absolute right-3 top-3 rounded-full border bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground shadow-sm">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function InlineText({
  selected,
  value,
  onChange,
  placeholder,
  multiline = false,
  richText = false,
  rows = 3,
  className,
  display,
  tone = "light",
}: {
  selected: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  richText?: boolean;
  rows?: number;
  className?: string;
  display: ReactNode;
  tone?: "light" | "dark";
}) {
  if (!selected) {
    return <>{display}</>;
  }

  if (multiline) {
    if (richText) {
      return (
        <RichTextEditor
          value={value}
          rows={rows}
          tone={tone}
          placeholder={placeholder}
          onChange={onChange}
          className={className}
        />
      );
    }
    return (
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        className={cn("min-h-[120px] border-primary/50 bg-background/90 shadow-sm", className)}
      />
    );
  }

  return (
    <Input
      value={value}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      className={cn("border-primary/50 bg-background/90 shadow-sm", className)}
    />
  );
}

function ChipsEditor({
  selected,
  items,
  onChange,
  tone = "light",
}: {
  selected: boolean;
  items: string[];
  onChange: (next: string[]) => void;
  tone?: "light" | "dark";
}) {
  if (!selected) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              tone === "dark"
                ? "border-white/20 bg-white/10 text-white/90"
                : "border-slate-300 bg-white/80 text-slate-700"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <Textarea
      value={items.join("\n")}
      rows={Math.max(3, items.length + 1)}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) =>
        onChange(
          event.target.value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      }
      className="border-primary/50 bg-background/90 shadow-sm"
      placeholder="One chip per line"
    />
  );
}

function FactCard({
  fact,
  selected,
  onChange,
}: {
  fact: ItineraryFact;
  selected: boolean;
  onChange: (next: ItineraryFact) => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{fact.label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{fact.value}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-primary/40 bg-white px-4 py-4 shadow-sm">
      <Input
        value={fact.label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...fact, label: event.target.value })}
        placeholder="Fact label"
        className="border-primary/50"
      />
      <Textarea
        value={fact.value}
        rows={3}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...fact, value: event.target.value })}
        placeholder="Fact value"
        className="border-primary/50"
      />
    </div>
  );
}

function HighlightCard({
  item,
  selected,
  onChange,
  dark = false,
}: {
  item: ItineraryHighlight;
  selected: boolean;
  onChange: (next: ItineraryHighlight) => void;
  dark?: boolean;
}) {
  if (!selected) {
    return (
      <article
        className={cn(
          "overflow-hidden rounded-2xl border",
          dark ? "border-white/10 bg-white/8 backdrop-blur" : "border-slate-200 bg-white"
        )}
      >
        {item.image ? (
          <div
            role="img"
            aria-label={item.image.alt}
            className="h-36 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${item.image.src}")` }}
          />
        ) : null}
        <div className="space-y-2 px-4 py-4">
          {item.eyebrow ? (
            <p className={cn("text-[11px] uppercase tracking-[0.18em]", dark ? "text-white/60" : "text-slate-500")}>
              {item.eyebrow}
            </p>
          ) : null}
          <h3 className={cn("text-base font-semibold", dark ? "text-white" : "text-slate-900")}>{item.title}</h3>
          <RichTextContent value={item.description} tone={dark ? "dark" : "light"} className={cn("text-sm leading-6", dark ? "text-white/75" : "text-slate-600")} />
        </div>
      </article>
    );
  }

  return (
    <article className={cn("grid gap-3 rounded-2xl border px-4 py-4 shadow-sm", dark ? "border-white/20 bg-white/10" : "border-primary/40 bg-white")}>
      <Input
        value={item.eyebrow || ""}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...item, eyebrow: event.target.value || null })}
        placeholder="Eyebrow"
        className={cn(dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-primary/50")}
      />
      <Input
        value={item.title}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...item, title: event.target.value })}
        placeholder="Title"
        className={cn(dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-primary/50")}
      />
      <RichTextEditor
        value={item.description}
        rows={4}
        onChange={(value) => onChange({ ...item, description: value })}
        placeholder="Description"
        className={cn(dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-primary/50")}
        tone={dark ? "dark" : "light"}
      />
    </article>
  );
}

function StayCard({
  stay,
  selected,
  onChange,
}: {
  stay: ItineraryStaySummary;
  selected: boolean;
  onChange: (next: ItineraryStaySummary) => void;
}) {
  if (!selected) {
    return (
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-[#fbfaf7]">
        {stay.image ? (
          <div
            role="img"
            aria-label={stay.image.alt}
            className="h-44 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${stay.image.src}")` }}
          />
        ) : null}
        <div className="space-y-2 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{stay.starLabel || "Stay"}</p>
          <h3 className="text-lg font-semibold text-slate-900">{stay.name}</h3>
          <p className="text-sm text-slate-600">
            {[stay.city, stay.country].filter(Boolean).join(", ") || "Destination pending"}
          </p>
        <p className="text-sm text-slate-600">{stay.nights} night(s)</p>
        {stay.mealPlan ? <p className="text-sm text-slate-600">Meal plan: {stay.mealPlan}</p> : null}
        {stay.roomSummary ? <RichTextContent value={stay.roomSummary} className="text-sm text-slate-600" /> : null}
      </div>
    </article>
  );
  }

  return (
    <article className="grid gap-3 rounded-3xl border border-primary/40 bg-white px-4 py-4 shadow-sm">
      <Input
        value={stay.name}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...stay, name: event.target.value })}
        placeholder="Hotel name"
        className="border-primary/50"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={stay.city || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...stay, city: event.target.value || null })}
          placeholder="City"
          className="border-primary/50"
        />
        <Input
          value={stay.country || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...stay, country: event.target.value || null })}
          placeholder="Country"
          className="border-primary/50"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={String(stay.nights)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            onChange({
              ...stay,
              nights: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0,
            })
          }
          placeholder="Nights"
          className="border-primary/50"
        />
        <Input
          value={stay.mealPlan || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...stay, mealPlan: event.target.value || null })}
          placeholder="Meal plan"
          className="border-primary/50"
        />
        <Input
          value={stay.starLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...stay, starLabel: event.target.value || null })}
          placeholder="Star label"
          className="border-primary/50"
        />
      </div>
      <RichTextEditor
        value={stay.roomSummary || ""}
        rows={3}
        onChange={(value) => onChange({ ...stay, roomSummary: value || null })}
        placeholder="Room or stay summary"
        className="border-primary/50"
      />
    </article>
  );
}

function TransferCard({
  transfer,
  selected,
  onChange,
}: {
  transfer: ItineraryTransferSummary;
  selected: boolean;
  onChange: (next: ItineraryTransferSummary) => void;
}) {
  if (!selected) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">{transfer.title}</p>
            <p className="text-sm text-slate-600">
              {[transfer.fromLabel, transfer.toLabel].filter(Boolean).join(" -> ") || "Route pending"}
            </p>
          </div>
          {transfer.vehicleLabel ? <p className="text-sm font-medium text-slate-700">{transfer.vehicleLabel}</p> : null}
        </div>
        {transfer.notes ? <RichTextContent value={transfer.notes} className="mt-3 text-sm leading-6 text-slate-600" /> : null}
      </article>
    );
  }

  return (
    <article className="grid gap-3 rounded-2xl border border-primary/40 bg-white px-4 py-4 shadow-sm">
      <Input
        value={transfer.title}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...transfer, title: event.target.value })}
        placeholder="Transfer title"
        className="border-primary/50"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={transfer.fromLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...transfer, fromLabel: event.target.value || null })}
          placeholder="From"
          className="border-primary/50"
        />
        <Input
          value={transfer.toLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...transfer, toLabel: event.target.value || null })}
          placeholder="To"
          className="border-primary/50"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={transfer.vehicleLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...transfer, vehicleLabel: event.target.value || null })}
          placeholder="Vehicle"
          className="border-primary/50"
        />
        <Input
          value={transfer.startLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...transfer, startLabel: event.target.value || null })}
          placeholder="Start"
          className="border-primary/50"
        />
        <Input
          value={transfer.endLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...transfer, endLabel: event.target.value || null })}
          placeholder="End"
          className="border-primary/50"
        />
      </div>
      <RichTextEditor
        value={transfer.notes || ""}
        rows={3}
        onChange={(value) => onChange({ ...transfer, notes: value || null })}
        placeholder="Transfer notes"
        className="border-primary/50"
      />
    </article>
  );
}

function PolicyCard({
  block,
  selected,
  onChange,
  dark = false,
}: {
  block: ItineraryPolicyBlock;
  selected: boolean;
  onChange: (next: ItineraryPolicyBlock) => void;
  dark?: boolean;
}) {
  if (!selected) {
    return (
      <article className={cn("rounded-2xl border px-4 py-4", dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/60")}>
        <h3 className={cn("text-base font-semibold", dark ? "text-white" : "text-slate-900")}>{block.title}</h3>
        <RichTextContent
          value={block.items.map((item) => `- ${item}`).join("\n")}
          tone={dark ? "dark" : "light"}
          className={cn("mt-3 text-sm leading-6", dark ? "text-white/75" : "text-slate-600")}
        />
      </article>
    );
  }

  return (
    <article className={cn("grid gap-3 rounded-2xl border px-4 py-4 shadow-sm", dark ? "border-white/20 bg-white/10" : "border-primary/40 bg-white")}>
      <Input
        value={block.title}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ ...block, title: event.target.value })}
        placeholder="Policy title"
        className={cn(dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-primary/50")}
      />
      <RichTextEditor
        value={block.items.join("\n")}
        rows={Math.max(4, block.items.length + 1)}
        onChange={(value) =>
          onChange({
            ...block,
            items: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          })
        }
        placeholder="One policy item per line"
        className={cn(dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/50" : "border-primary/50")}
        tone={dark ? "dark" : "light"}
      />
    </article>
  );
}

function PricingPanel({
  pricing,
  selected,
  onChange,
  dark = false,
}: {
  pricing: ItineraryPricingSummary;
  selected: boolean;
  onChange: (next: ItineraryPricingSummary) => void;
  dark?: boolean;
}) {
  if (!selected) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <div className={cn("rounded-2xl border px-4 py-4", dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", dark ? "text-white/60" : "text-slate-500")}>Base Total</p>
          <p className={cn("mt-2 text-xl font-semibold", dark ? "text-white" : "text-slate-900")}>
            {pricing.currencyCode} {pricing.baseTotal}
          </p>
        </div>
        <div className={cn("rounded-2xl border px-4 py-4", dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", dark ? "text-white/60" : "text-slate-500")}>Tax Total</p>
          <p className={cn("mt-2 text-xl font-semibold", dark ? "text-white" : "text-slate-900")}>
            {pricing.currencyCode} {pricing.taxTotal}
          </p>
        </div>
        <div className={cn("rounded-2xl border px-4 py-4", dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", dark ? "text-white/60" : "text-slate-500")}>Grand Total</p>
          <p className={cn("mt-2 text-xl font-semibold", dark ? "text-white" : "text-slate-900")}>
            {pricing.currencyCode} {pricing.grandTotal}
          </p>
        </div>
        <div className={cn("rounded-2xl border px-4 py-4", dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50")}>
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", dark ? "text-white/60" : "text-slate-500")}>Per Guest</p>
          <p className={cn("mt-2 text-xl font-semibold", dark ? "text-white" : "text-slate-900")}>
            {pricing.estimatedPerGuestLabel || "-"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-primary/40 bg-white px-4 py-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={pricing.currencyCode}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...pricing, currencyCode: event.target.value })}
          placeholder="Currency"
          className="border-primary/50"
        />
        <Input
          value={pricing.estimatedPerGuestLabel || ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...pricing, estimatedPerGuestLabel: event.target.value || null })}
          placeholder="Per guest"
          className="border-primary/50"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={pricing.baseTotal}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...pricing, baseTotal: event.target.value })}
          placeholder="Base total"
          className="border-primary/50"
        />
        <Input
          value={pricing.taxTotal}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...pricing, taxTotal: event.target.value })}
          placeholder="Tax total"
          className="border-primary/50"
        />
        <Input
          value={pricing.grandTotal}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange({ ...pricing, grandTotal: event.target.value })}
          placeholder="Grand total"
          className="border-primary/50"
        />
      </div>
    </div>
  );
}

function StudioMediaFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-muted", className)}>
      <div
        role="img"
        aria-label={alt}
        className="h-full w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${src}")` }}
      />
    </div>
  );
}

export function ItineraryStudioDocumentCanvasPage({
  page,
  selectedBlockId,
  onSelectPage,
  onSelectBlock,
  onChange,
}: ItineraryStudioDocumentCanvasPageProps) {
  switch (page.family) {
    case "COVER":
      return (
        <section
          data-page-family={page.family}
          data-layout-variant={page.layoutVariant}
          onClick={onSelectPage}
          className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]"
        >
          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6 bg-[linear-gradient(160deg,#f7f4ee_0%,#ffffff_62%,#eef4f7_100%)] px-5 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Curated Itinerary Draft</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{page.anchorLabel}</p>
              </div>
              <SelectableBlock
                blockId="title"
                label="Cover title"
                selected={selectedBlockId === "title"}
                onSelect={onSelectBlock}
                className="p-3"
              >
                <InlineText
                  selected={selectedBlockId === "title"}
                  value={page.title}
                  onChange={(value) => onChange({ ...page, title: value })}
                  placeholder="Cover title"
                  className="text-3xl lg:text-5xl"
                  display={<h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 lg:text-5xl">{page.title}</h1>}
                />
              </SelectableBlock>
              <SelectableBlock
                blockId="subtitle"
                label="Cover subtitle"
                selected={selectedBlockId === "subtitle"}
                onSelect={onSelectBlock}
                className="p-3"
              >
                <InlineText
                  selected={selectedBlockId === "subtitle"}
                  value={page.subtitle}
                  onChange={(value) => onChange({ ...page, subtitle: value })}
                  placeholder="Cover subtitle"
                  multiline
                  richText
                  rows={4}
                  display={<RichTextContent value={page.subtitle} className="max-w-2xl text-sm leading-7 text-slate-600 lg:text-base" />}
                />
              </SelectableBlock>
              <SelectableBlock
                blockId="meta"
                label="Meta chips"
                selected={selectedBlockId === "meta"}
                onSelect={onSelectBlock}
                className="p-3"
              >
                <ChipsEditor
                  selected={selectedBlockId === "meta"}
                  items={page.meta}
                  onChange={(meta) => onChange({ ...page, meta })}
                />
              </SelectableBlock>
              {page.routeLabel ? (
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Route</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{page.routeLabel}</p>
                </div>
              ) : null}
            </div>
            <div className="min-h-[220px] bg-slate-100 sm:min-h-[260px]">
              {page.heroImage ? (
                <StudioMediaFrame src={page.heroImage.src} alt={page.heroImage.alt} className="h-full rounded-none" />
              ) : (
                <div className="flex h-full items-end bg-[radial-gradient(circle_at_top,#dbe7ee_0%,#f3f6f8_46%,#eef0ef_100%)] p-5 sm:p-8">
                  <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready for media</p>
                    <p className="mt-1 text-sm text-slate-700">Primary hotel, activity, or location media will appear here once available.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    case "TRIP_SUMMARY":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <SelectableBlock blockId="title" label="Summary title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "title"}
                  value={page.title}
                  onChange={(value) => onChange({ ...page, title: value })}
                  placeholder="Summary title"
                  display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
                />
              </SelectableBlock>
              <div className="grid gap-3">
                {page.facts.map((fact, index) => (
                  <SelectableBlock
                    key={`fact:${index}`}
                    blockId={`fact:${index}`}
                    label={`Fact ${index + 1}`}
                    selected={selectedBlockId === `fact:${index}`}
                    onSelect={onSelectBlock}
                  >
                    <FactCard
                      fact={fact}
                      selected={selectedBlockId === `fact:${index}`}
                      onChange={(next) =>
                        onChange({
                          ...page,
                          facts: page.facts.map((item, itemIndex) => (itemIndex === index ? next : item)),
                        })
                      }
                    />
                  </SelectableBlock>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {page.highlights.map((highlight, index) => (
                <SelectableBlock
                  key={`highlight:${index}`}
                  blockId={`highlight:${index}`}
                  label={`Highlight ${index + 1}`}
                  selected={selectedBlockId === `highlight:${index}`}
                  onSelect={onSelectBlock}
                >
                  <HighlightCard
                    item={highlight}
                    selected={selectedBlockId === `highlight:${index}`}
                    onChange={(next) =>
                      onChange({
                        ...page,
                        highlights: page.highlights.map((item, itemIndex) => (itemIndex === index ? next : item)),
                      })
                    }
                  />
                </SelectableBlock>
              ))}
            </div>
          </div>
        </section>
      );
    case "ROUTE_OVERVIEW":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-5">
              <SelectableBlock blockId="title" label="Route title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "title"}
                  value={page.title}
                  onChange={(value) => onChange({ ...page, title: value })}
                  placeholder="Route title"
                  display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
                />
              </SelectableBlock>
              <div className="space-y-3">
                {page.routeStops.map((stop, index) => (
                  <SelectableBlock
                    key={`route-stop:${index}`}
                    blockId={`route-stop:${index}`}
                    label={`Stop ${index + 1}`}
                    selected={selectedBlockId === `route-stop:${index}`}
                    onSelect={onSelectBlock}
                    className="p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{index + 1}</span>
                      <InlineText
                        selected={selectedBlockId === `route-stop:${index}`}
                        value={stop}
                        onChange={(value) =>
                          onChange({
                            ...page,
                            routeStops: page.routeStops.map((item, itemIndex) => (itemIndex === index ? value : item)),
                          })
                        }
                        placeholder="Route stop"
                        display={<span className="text-sm font-medium text-slate-900">{stop}</span>}
                      />
                    </div>
                  </SelectableBlock>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {page.image ? <StudioMediaFrame src={page.image.src} alt={page.image.alt} className="h-60" /> : null}
              <SelectableBlock blockId="summary" label="Route summary" selected={selectedBlockId === "summary"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "summary"}
                  value={page.summary}
                  onChange={(value) => onChange({ ...page, summary: value })}
                  placeholder="Route summary"
                  multiline
                  richText
                  rows={5}
                  display={<RichTextContent value={page.summary} className="text-sm leading-7 text-slate-600" />}
                />
              </SelectableBlock>
            </div>
          </div>
        </section>
      );
    case "HIGHLIGHTS":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <SelectableBlock blockId="title" label="Highlights title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={page.title}
              onChange={(value) => onChange({ ...page, title: value })}
              placeholder="Highlights title"
              display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 md:grid-cols-2">
            {page.items.map((item, index) => (
              <SelectableBlock
                key={`highlight:${index}`}
                blockId={`highlight:${index}`}
                label={`Highlight ${index + 1}`}
                selected={selectedBlockId === `highlight:${index}`}
                onSelect={onSelectBlock}
              >
                <HighlightCard
                  item={item}
                  selected={selectedBlockId === `highlight:${index}`}
                  onChange={(next) =>
                    onChange({
                      ...page,
                      items: page.items.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
                    })
                  }
                />
              </SelectableBlock>
            ))}
          </div>
        </section>
      );
    case "DAY_DETAIL":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="space-y-4">
            <SelectableBlock blockId="page-title" label="Page title" selected={selectedBlockId === "page-title"} onSelect={onSelectBlock} className="p-3">
              <InlineText
                selected={selectedBlockId === "page-title"}
                value={page.title}
                onChange={(value) => onChange({ ...page, title: value })}
                placeholder="Page title"
                display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
              />
            </SelectableBlock>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-3">
                <SelectableBlock blockId="day-title" label="Day title" selected={selectedBlockId === "day-title"} onSelect={onSelectBlock} className="p-3">
                  <div className="space-y-2">
                    <InlineText
                      selected={selectedBlockId === "day-title"}
                      value={page.day.title}
                      onChange={(value) =>
                        onChange({
                          ...page,
                          day: {
                            ...page.day,
                            title: value,
                          },
                        })
                      }
                      placeholder="Day title"
                      display={<h2 className="text-2xl font-semibold text-slate-900">{page.day.title}</h2>}
                    />
                    <p className="text-sm text-slate-600">
                      {page.day.dateLabel}
                      {page.day.routeLabel ? ` • ${page.day.routeLabel}` : ""}
                    </p>
                  </div>
                </SelectableBlock>
              </div>
              {page.day.heroImage ? <StudioMediaFrame src={page.day.heroImage.src} alt={page.day.heroImage.alt} className="h-40 w-full max-w-md shrink-0 sm:h-48" /> : null}
            </div>
            <SelectableBlock blockId="day-narrative" label="Day narrative" selected={selectedBlockId === "day-narrative"} onSelect={onSelectBlock} className="p-3">
              <InlineText
                selected={selectedBlockId === "day-narrative"}
                value={page.day.narrative || ""}
                onChange={(value) =>
                  onChange({
                    ...page,
                    day: {
                      ...page.day,
                      narrative: value,
                    },
                  })
                }
                placeholder="Day narrative"
                multiline
                richText
                rows={5}
                display={<RichTextContent value={page.day.narrative || ""} className="text-sm leading-7 text-slate-600" />}
              />
            </SelectableBlock>
            <div className="grid gap-4">
              {page.day.items.map((item) => {
                const blockId = `item:${item.id}`;
                const selected = selectedBlockId === blockId;
                return (
                  <SelectableBlock key={blockId} blockId={blockId} label={item.type || "Item"} selected={selected} onSelect={onSelectBlock}>
                    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 xl:grid-cols-[160px_minmax(0,1fr)_140px]">
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.type}</p>
                        <InlineText
                          selected={selected}
                          value={item.timeLabel || ""}
                          onChange={(value) =>
                            onChange({
                              ...page,
                              day: {
                                ...page.day,
                                items: page.day.items.map((entry) =>
                                  entry.id === item.id ? { ...entry, timeLabel: value || null } : entry
                                ),
                              },
                            })
                          }
                          placeholder="Time label"
                          display={<p className="text-sm font-medium text-slate-900">{item.timeLabel || "Scheduled"}</p>}
                        />
                        {item.routeLabel ? <p className="text-xs text-slate-500">{item.routeLabel}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <InlineText
                          selected={selected}
                          value={item.title}
                          onChange={(value) =>
                            onChange({
                              ...page,
                              day: {
                                ...page.day,
                                items: page.day.items.map((entry) => (entry.id === item.id ? { ...entry, title: value } : entry)),
                              },
                            })
                          }
                          placeholder="Item title"
                          display={<h3 className="text-base font-semibold text-slate-900">{item.title}</h3>}
                        />
                        <InlineText
                          selected={selected}
                          value={item.summary || ""}
                          onChange={(value) =>
                            onChange({
                              ...page,
                              day: {
                                ...page.day,
                                items: page.day.items.map((entry) =>
                                  entry.id === item.id ? { ...entry, summary: value || null } : entry
                                ),
                              },
                            })
                          }
                          placeholder="Item summary"
                          multiline
                          richText
                          rows={4}
                          display={
                            item.summary ? (
                              <RichTextContent value={item.summary} className="text-sm leading-6 text-slate-600" />
                            ) : (
                              <p className="text-sm leading-6 text-slate-400">Add item summary</p>
                            )
                          }
                        />
                      </div>
                      <div className="space-y-3 lg:text-right">
                        {item.image ? <StudioMediaFrame src={item.image.src} alt={item.image.alt} className="h-24 w-24 lg:ml-auto" /> : null}
                        <InlineText
                          selected={selected}
                          value={item.amountLabel || ""}
                          onChange={(value) =>
                            onChange({
                              ...page,
                              day: {
                                ...page.day,
                                items: page.day.items.map((entry) =>
                                  entry.id === item.id ? { ...entry, amountLabel: value || null } : entry
                                ),
                              },
                            })
                          }
                          placeholder="Amount label"
                          display={item.amountLabel ? <p className="text-sm font-medium text-slate-700">{item.amountLabel}</p> : <p className="text-sm text-slate-400">Add amount</p>}
                        />
                      </div>
                    </article>
                  </SelectableBlock>
                );
              })}
            </div>
          </div>
        </section>
      );
    case "ACCOMMODATION_SUMMARY":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <SelectableBlock blockId="title" label="Stay title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={page.title}
              onChange={(value) => onChange({ ...page, title: value })}
              placeholder="Stay section title"
              display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {page.stays.map((stay) => {
              const blockId = `stay:${stay.id}`;
              return (
                <SelectableBlock key={blockId} blockId={blockId} label={stay.name || "Stay"} selected={selectedBlockId === blockId} onSelect={onSelectBlock}>
                  <StayCard
                    stay={stay}
                    selected={selectedBlockId === blockId}
                    onChange={(next) =>
                      onChange({
                        ...page,
                        stays: page.stays.map((entry) => (entry.id === stay.id ? next : entry)),
                      })
                    }
                  />
                </SelectableBlock>
              );
            })}
          </div>
        </section>
      );
    case "TRANSPORT_SUMMARY":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <SelectableBlock blockId="title" label="Transport title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={page.title}
              onChange={(value) => onChange({ ...page, title: value })}
              placeholder="Transport section title"
              display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4">
            {page.transfers.map((transfer) => {
              const blockId = `transfer:${transfer.id}`;
              return (
                <SelectableBlock key={blockId} blockId={blockId} label={transfer.title || "Transfer"} selected={selectedBlockId === blockId} onSelect={onSelectBlock}>
                  <TransferCard
                    transfer={transfer}
                    selected={selectedBlockId === blockId}
                    onChange={(next) =>
                      onChange({
                        ...page,
                        transfers: page.transfers.map((entry) => (entry.id === transfer.id ? next : entry)),
                      })
                    }
                  />
                </SelectableBlock>
              );
            })}
          </div>
        </section>
      );
    case "PRICING_SUMMARY":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <SelectableBlock blockId="title" label="Pricing title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={page.title}
              onChange={(value) => onChange({ ...page, title: value })}
              placeholder="Pricing title"
              display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
            />
          </SelectableBlock>
          <SelectableBlock blockId="pricing" label="Pricing panel" selected={selectedBlockId === "pricing"} onSelect={onSelectBlock}>
            <PricingPanel
              pricing={page.pricing}
              selected={selectedBlockId === "pricing"}
              onChange={(pricing) => onChange({ ...page, pricing })}
            />
          </SelectableBlock>
        </section>
      );
    case "POLICY_NOTES":
      return (
        <section data-page-family={page.family} data-layout-variant={page.layoutVariant} onClick={onSelectPage} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <SelectableBlock blockId="title" label="Policy title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={page.title}
              onChange={(value) => onChange({ ...page, title: value })}
              placeholder="Policy title"
              display={<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 md:grid-cols-2">
            {page.blocks.map((block, index) => (
              <SelectableBlock
                key={`policy:${index}`}
                blockId={`policy:${index}`}
                label={block.title || `Policy ${index + 1}`}
                selected={selectedBlockId === `policy:${index}`}
                onSelect={onSelectBlock}
              >
                <PolicyCard
                  block={block}
                  selected={selectedBlockId === `policy:${index}`}
                  onChange={(next) =>
                    onChange({
                      ...page,
                      blocks: page.blocks.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
                    })
                  }
                />
              </SelectableBlock>
            ))}
          </div>
        </section>
      );
  }
}

export function ItineraryStudioWebCanvasSection({
  section,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onChange,
}: ItineraryStudioWebCanvasSectionProps) {
  switch (section.family) {
    case "HERO":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="grid gap-8 rounded-[24px] bg-[linear-gradient(160deg,#17343b_0%,#244b54_48%,#426870_100%)] px-5 py-6 text-white sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:grid-cols-[1.05fr_0.95fr] xl:px-10 xl:py-12">
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Travel Microsite Draft</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{section.anchorLabel}</p>
            </div>
            <SelectableBlock blockId="title" label="Hero title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
              <InlineText
                selected={selectedBlockId === "title"}
                value={section.title}
                onChange={(value) => onChange({ ...section, title: value })}
                placeholder="Hero title"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                display={<h1 className="max-w-3xl text-4xl font-semibold tracking-tight lg:text-6xl">{section.title}</h1>}
              />
            </SelectableBlock>
            <SelectableBlock blockId="subtitle" label="Hero subtitle" selected={selectedBlockId === "subtitle"} onSelect={onSelectBlock} className="p-3">
              <InlineText
                selected={selectedBlockId === "subtitle"}
                value={section.subtitle}
                onChange={(value) => onChange({ ...section, subtitle: value })}
                placeholder="Hero subtitle"
                multiline
                richText
                rows={5}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                tone="dark"
                display={<RichTextContent value={section.subtitle} tone="dark" className="max-w-2xl text-sm leading-7 text-white/80 lg:text-base" />}
              />
            </SelectableBlock>
            <SelectableBlock blockId="chips" label="Hero chips" selected={selectedBlockId === "chips"} onSelect={onSelectBlock} className="p-3">
              <ChipsEditor selected={selectedBlockId === "chips"} items={section.chips} onChange={(chips) => onChange({ ...section, chips })} tone="dark" />
            </SelectableBlock>
          </div>
          <div>
            {section.heroImage ? (
              <StudioMediaFrame src={section.heroImage.src} alt={section.heroImage.alt} className="h-[220px] rounded-[24px] sm:h-[280px] sm:rounded-[28px] xl:h-[320px]" />
            ) : (
              <div className="flex h-[220px] items-end rounded-[24px] bg-[radial-gradient(circle_at_top,#88a3a9_0%,#3b5861_45%,#1b363d_100%)] p-5 sm:h-[280px] sm:rounded-[28px] sm:p-6 xl:h-[320px]">
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Hero media slot</p>
                  <p className="mt-1 text-sm text-white/90">This web template is ready for destination or supplier imagery.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      );
    case "QUICK_FACTS":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="space-y-6 rounded-[24px] bg-[#f9f7f2] px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <SelectableBlock blockId="title" label="Facts title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "title"}
                  value={section.title}
                  onChange={(value) => onChange({ ...section, title: value })}
                  placeholder="Quick facts title"
                  display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
                />
              </SelectableBlock>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.facts.map((fact, index) => (
                  <SelectableBlock
                    key={`fact:${index}`}
                    blockId={`fact:${index}`}
                    label={`Fact ${index + 1}`}
                    selected={selectedBlockId === `fact:${index}`}
                    onSelect={onSelectBlock}
                  >
                    <FactCard
                      fact={fact}
                      selected={selectedBlockId === `fact:${index}`}
                      onChange={(next) =>
                        onChange({
                          ...section,
                          facts: section.facts.map((item, itemIndex) => (itemIndex === index ? next : item)),
                        })
                      }
                    />
                  </SelectableBlock>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {section.highlights.map((item, index) => (
                <SelectableBlock
                  key={`highlight:${index}`}
                  blockId={`highlight:${index}`}
                  label={`Highlight ${index + 1}`}
                  selected={selectedBlockId === `highlight:${index}`}
                  onSelect={onSelectBlock}
                >
                  <HighlightCard
                    item={item}
                    selected={selectedBlockId === `highlight:${index}`}
                    onChange={(next) =>
                      onChange({
                        ...section,
                        highlights: section.highlights.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
                      })
                    }
                  />
                </SelectableBlock>
              ))}
            </div>
          </div>
        </section>
      );
    case "ROUTE":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="rounded-[24px] bg-white px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-5">
              <SelectableBlock blockId="title" label="Route title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "title"}
                  value={section.title}
                  onChange={(value) => onChange({ ...section, title: value })}
                  placeholder="Route title"
                  display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
                />
              </SelectableBlock>
              <div className="space-y-3">
                {section.routeStops.map((stop, index) => (
                  <SelectableBlock
                    key={`route-stop:${index}`}
                    blockId={`route-stop:${index}`}
                    label={`Stop ${index + 1}`}
                    selected={selectedBlockId === `route-stop:${index}`}
                    onSelect={onSelectBlock}
                    className="p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17343b] text-sm font-semibold text-white">{index + 1}</span>
                      <InlineText
                        selected={selectedBlockId === `route-stop:${index}`}
                        value={stop}
                        onChange={(value) =>
                          onChange({
                            ...section,
                            routeStops: section.routeStops.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
                          })
                        }
                        placeholder="Route stop"
                        display={<span className="text-sm font-medium text-[#1d2c30]">{stop}</span>}
                      />
                    </div>
                  </SelectableBlock>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {section.image ? <StudioMediaFrame src={section.image.src} alt={section.image.alt} className="h-44 rounded-[24px] sm:h-60 sm:rounded-[28px]" /> : null}
              <SelectableBlock blockId="summary" label="Route summary" selected={selectedBlockId === "summary"} onSelect={onSelectBlock} className="p-3">
                <InlineText
                  selected={selectedBlockId === "summary"}
                  value={section.summary}
                  onChange={(value) => onChange({ ...section, summary: value })}
                  placeholder="Route summary"
                  multiline
                  richText
                  rows={5}
                  display={<RichTextContent value={section.summary} className="text-sm leading-7 text-[#5a645f]" />}
                />
              </SelectableBlock>
            </div>
          </div>
        </section>
      );
    case "TIMELINE":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="space-y-6 rounded-[24px] bg-[#f1ece2] px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Timeline title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Timeline title"
              display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
            />
          </SelectableBlock>
          <div className="space-y-5">
            {section.days.map((day) => {
              const blockId = `day:${day.id}`;
              const selected = selectedBlockId === blockId;
              return (
                <SelectableBlock key={blockId} blockId={blockId} label={`Day ${day.dayNumber}`} selected={selected} onSelect={onSelectBlock}>
                  <article className="rounded-[28px] border border-[#ddd4c7] bg-white p-5">
                    <div className="grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)_280px]">
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Day {day.dayNumber}</p>
                        <InlineText
                          selected={selected}
                          value={day.title}
                          onChange={(value) =>
                            onChange({
                              ...section,
                              days: section.days.map((entry) => (entry.id === day.id ? { ...entry, title: value } : entry)),
                            })
                          }
                          placeholder="Day title"
                          display={<h3 className="text-xl font-semibold text-[#1d2c30]">{day.title}</h3>}
                        />
                        <p className="text-sm text-[#5a645f]">{day.dateLabel}</p>
                        {day.routeLabel ? <p className="text-sm text-[#5a645f]">{day.routeLabel}</p> : null}
                      </div>
                      <div className="space-y-4">
                        <InlineText
                          selected={selected}
                          value={day.narrative || ""}
                          onChange={(value) =>
                            onChange({
                              ...section,
                              days: section.days.map((entry) =>
                                entry.id === day.id ? { ...entry, narrative: value || null } : entry
                              ),
                            })
                          }
                          placeholder="Day narrative"
                          multiline
                          richText
                          rows={5}
                          display={<RichTextContent value={day.narrative || ""} className="text-sm leading-7 text-[#5a645f]" />}
                        />
                      </div>
                      {day.heroImage ? <StudioMediaFrame src={day.heroImage.src} alt={day.heroImage.alt} className="min-h-[220px] rounded-[24px] sm:min-h-[260px] sm:rounded-[28px]" /> : null}
                    </div>
                  </article>
                </SelectableBlock>
              );
            })}
          </div>
        </section>
      );
    case "STAYS":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="rounded-[24px] bg-white px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Stay title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Stay section title"
              display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {section.stays.map((stay) => {
              const blockId = `stay:${stay.id}`;
              return (
                <SelectableBlock key={blockId} blockId={blockId} label={stay.name || "Stay"} selected={selectedBlockId === blockId} onSelect={onSelectBlock}>
                  <StayCard
                    stay={stay}
                    selected={selectedBlockId === blockId}
                    onChange={(next) =>
                      onChange({
                        ...section,
                        stays: section.stays.map((entry) => (entry.id === stay.id ? next : entry)),
                      })
                    }
                  />
                </SelectableBlock>
              );
            })}
          </div>
        </section>
      );
    case "GALLERY":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="space-y-4 rounded-[24px] bg-[#17343b] px-5 py-6 text-white sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Gallery title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Gallery title"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
              display={<p className="text-xs uppercase tracking-[0.22em] text-white/60">{section.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {section.items.map((item, index) => (
              <SelectableBlock
                key={`gallery:${index}`}
                blockId={`gallery:${index}`}
                label={`Gallery ${index + 1}`}
                selected={selectedBlockId === `gallery:${index}`}
                onSelect={onSelectBlock}
              >
                <HighlightCard
                  item={item}
                  selected={selectedBlockId === `gallery:${index}`}
                  onChange={(next) =>
                    onChange({
                      ...section,
                      items: section.items.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
                    })
                  }
                  dark
                />
              </SelectableBlock>
            ))}
          </div>
        </section>
      );
    case "PRICING":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="rounded-[24px] bg-white px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Pricing title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Pricing title"
              display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
            />
          </SelectableBlock>
          <SelectableBlock blockId="pricing" label="Pricing panel" selected={selectedBlockId === "pricing"} onSelect={onSelectBlock}>
            <PricingPanel
              pricing={section.pricing}
              selected={selectedBlockId === "pricing"}
              onChange={(pricing) => onChange({ ...section, pricing })}
            />
          </SelectableBlock>
        </section>
      );
    case "TRAVEL_NOTES":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="space-y-4 rounded-[24px] bg-[#f9f7f2] px-5 py-6 sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Notes title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Travel notes title"
              display={<p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-4 md:grid-cols-2">
            {section.blocks.map((block, index) => (
              <SelectableBlock
                key={`policy:${index}`}
                blockId={`policy:${index}`}
                label={block.title || `Policy ${index + 1}`}
                selected={selectedBlockId === `policy:${index}`}
                onSelect={onSelectBlock}
              >
                <PolicyCard
                  block={block}
                  selected={selectedBlockId === `policy:${index}`}
                  onChange={(next) =>
                    onChange({
                      ...section,
                      blocks: section.blocks.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
                    })
                  }
                />
              </SelectableBlock>
            ))}
          </div>
        </section>
      );
    case "SUPPORT_FOOTER":
      return (
        <section data-section-family={section.family} data-layout-variant={section.layoutVariant} onClick={onSelectSection} className="rounded-[24px] bg-[#17343b] px-5 py-6 text-white sm:rounded-[32px] sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <SelectableBlock blockId="title" label="Support title" selected={selectedBlockId === "title"} onSelect={onSelectBlock} className="mb-5 p-3">
            <InlineText
              selected={selectedBlockId === "title"}
              value={section.title}
              onChange={(value) => onChange({ ...section, title: value })}
              placeholder="Support title"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
              display={<p className="text-xs uppercase tracking-[0.22em] text-white/60">{section.title}</p>}
            />
          </SelectableBlock>
          <div className="grid gap-3">
            {section.lines.map((line, index) => (
              <SelectableBlock
                key={`line:${index}`}
                blockId={`line:${index}`}
                label={`Line ${index + 1}`}
                selected={selectedBlockId === `line:${index}`}
                onSelect={onSelectBlock}
                className="p-3"
              >
                <InlineText
                  selected={selectedBlockId === `line:${index}`}
                  value={line}
                  onChange={(value) =>
                    onChange({
                      ...section,
                      lines: section.lines.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
                    })
                  }
                  placeholder="Support line"
                  multiline
                  richText
                  rows={3}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  tone="dark"
                  display={<RichTextContent value={line} tone="dark" className="text-sm leading-7 text-white/80" />}
                />
              </SelectableBlock>
            ))}
          </div>
        </section>
      );
  }
}
