"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Sparkles,
  Unlock,
} from "lucide-react";
import { ActivityCardEditor } from "@/components/itinerary/editors/activity-card-editor";
import { DiningCardEditor } from "@/components/itinerary/editors/dining-card-editor";
import { InclusionExclusionEditor } from "@/components/itinerary/editors/inclusion-exclusion-editor";
import { PoliciesEditor } from "@/components/itinerary/editors/policies-editor";
import { PropertyCardEditor } from "@/components/itinerary/editors/property-card-editor";
import { TransferCardEditor } from "@/components/itinerary/editors/transfer-card-editor";
import { DayCard } from "@/components/itinerary/day-card";
import { EmptyState } from "@/components/itinerary/empty-state";
import { GalleryManager } from "@/components/itinerary/gallery-manager";
import { ItineraryHeader } from "@/components/itinerary/itinerary-header";
import { ItinerarySidebar } from "@/components/itinerary/itinerary-sidebar";
import { PreviewPanel } from "@/components/itinerary/preview-panel";
import { SectionCard } from "@/components/itinerary/section-card";
import { SectionToolbar } from "@/components/itinerary/section-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { itineraryEditorSchema, type ItineraryEditorInput } from "@/lib/schemas/itinerary";
import type {
  Activity,
  CustomSection,
  DayPlan,
  DiningReservation,
  GalleryAssignment,
  Itinerary,
  ItineraryPreviewTarget,
  ItinerarySection,
  MediaAsset,
  PreviewDevice,
  SaveState,
  Stay,
  Transfer,
  WorkspaceMode,
} from "@/lib/types/itinerary";
import { cn } from "@/lib/utils";

type ItineraryBuilderPageProps = {
  initialItinerary: Itinerary;
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function moveById<T extends { id: string }>(items: T[], activeId: string, targetId: string) {
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

function createDayPlan(dayNumber: number): DayPlan {
  return {
    id: nanoid(),
    dayNumber,
    title: `Day ${dayNumber}`,
    date: "",
    summary: "Add a polished summary for this day.",
    morning: "Morning plan",
    afternoon: "Afternoon plan",
    evening: "Evening plan",
    activities: [],
    transportation: "",
    meals: [],
    accommodation: "",
    notes: "",
    expanded: true,
    timeline: [
      {
        id: nanoid(),
        title: "New timeline item",
        time: "09:00",
        type: "activity",
        phase: "morning",
        location: "Add location",
        description: "Describe the guest-facing moment.",
      },
    ],
  };
}

function createStay(): Stay {
  return {
    id: nanoid(),
    propertyName: "New property",
    address: "Add property address",
    city: "Destination",
    checkIn: "",
    checkOut: "",
    roomType: "Room type",
    confirmation: "Reference",
    amenities: ["Breakfast"],
    notes: "Add stay notes.",
  };
}

function createTransfer(): Transfer {
  return {
    id: nanoid(),
    mode: "Private transfer",
    from: "From",
    to: "To",
    departureTime: "",
    arrivalTime: "",
    confirmation: "Reference",
    driverContact: "Driver / contact",
    notes: "Add transfer notes.",
  };
}

function createActivity(): Activity {
  return {
    id: nanoid(),
    title: "New activity",
    startTime: "",
    duration: "",
    location: "Location",
    bookingReference: "Reference",
    included: true,
    notes: "Add activity notes.",
  };
}

function createDiningReservation(): DiningReservation {
  return {
    id: nanoid(),
    restaurantName: "New restaurant",
    reservationTime: "",
    cuisine: "Cuisine",
    address: "Address",
    confirmation: "Reference",
    notes: "Add dining notes.",
  };
}

function createCustomSection(): { section: ItinerarySection; content: CustomSection } {
  const customSectionId = nanoid();
  return {
    section: {
      id: nanoid(),
      type: "custom",
      title: "Custom Section",
      description: "Bespoke editorial content for this itinerary.",
      visible: true,
      locked: false,
      customSectionId,
    },
    content: {
      id: customSectionId,
      title: "Custom Section",
      body: "Add a high-touch traveler-facing story, recommendation, or editorial note.",
      eyebrow: "Editorial",
    },
  };
}

function buildPreviewTargets(itinerary: Itinerary): ItineraryPreviewTarget[] {
  return [
    { type: "hero", id: "hero", label: "Hero cover" },
    { type: "overview", id: "overview", label: "Overview" },
    ...itinerary.days.map((day) => ({
      type: "day" as const,
      id: day.id,
      label: `Day ${day.dayNumber}: ${day.title}`,
    })),
    ...itinerary.stays.map((stay) => ({
      type: "stay" as const,
      id: stay.id,
      label: `Stay: ${stay.propertyName}`,
    })),
    ...itinerary.activities.map((activity) => ({
      type: "activity" as const,
      id: activity.id,
      label: `Activity: ${activity.title}`,
    })),
  ];
}

function getCustomSection(itinerary: Itinerary, section: ItinerarySection | null) {
  if (!section || section.type !== "custom" || !section.customSectionId) {
    return null;
  }
  return itinerary.customSections.find((entry) => entry.id === section.customSectionId) || null;
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ListEditor({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Textarea
        rows={5}
        value={value.join("\n")}
        onChange={(event) => onChange(parseList(event.target.value))}
        placeholder={placeholder}
      />
    </div>
  );
}

function QuickFactsEditor({
  facts,
  onChange,
}: {
  facts: Itinerary["tripSummary"]["quickFacts"];
  onChange: (next: Itinerary["tripSummary"]["quickFacts"]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Quick facts</Label>
          <p className="mt-1 text-sm text-slate-500">These anchor the snapshot cards shown near the top of the preview.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...facts, { id: nanoid(), label: "New fact", value: "Add detail" }])}
        >
          <Plus className="size-4" />
          Add fact
        </Button>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3">
              <Input
                value={fact.label}
                onChange={(event) =>
                  onChange(facts.map((entry) => (entry.id === fact.id ? { ...entry, label: event.target.value } : entry)))
                }
                placeholder="Label"
              />
              <Input
                value={fact.value}
                onChange={(event) =>
                  onChange(facts.map((entry) => (entry.id === fact.id ? { ...entry, value: event.target.value } : entry)))
                }
                placeholder="Value"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DestinationEditor({
  destinations,
  onChange,
}: {
  destinations: Itinerary["destinations"];
  onChange: (next: Itinerary["destinations"]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Destination sequence</Label>
          <p className="mt-1 text-sm text-slate-500">Give each stop a clear role in the story and the travel flow.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...destinations,
              { id: nanoid(), city: "New destination", country: "Country", nights: 1, summary: "Add destination story." },
            ])
          }
        >
          <Plus className="size-4" />
          Add destination
        </Button>
      </div>
      <div className="grid gap-4">
        {destinations.map((stop) => (
          <div key={stop.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_140px]">
              <div className="grid gap-4 xl:grid-cols-2">
                <Input
                  value={stop.city}
                  onChange={(event) =>
                    onChange(destinations.map((entry) => (entry.id === stop.id ? { ...entry, city: event.target.value } : entry)))
                  }
                  placeholder="City"
                />
                <Input
                  value={stop.country}
                  onChange={(event) =>
                    onChange(destinations.map((entry) => (entry.id === stop.id ? { ...entry, country: event.target.value } : entry)))
                  }
                  placeholder="Country"
                />
              </div>
              <Input
                value={String(stop.nights)}
                onChange={(event) =>
                  onChange(
                    destinations.map((entry) =>
                      entry.id === stop.id ? { ...entry, nights: Number(event.target.value) || 0 } : entry
                    )
                  )
                }
                placeholder="Nights"
              />
            </div>
            <Textarea
              className="mt-4"
              rows={3}
              value={stop.summary}
              onChange={(event) =>
                onChange(destinations.map((entry) => (entry.id === stop.id ? { ...entry, summary: event.target.value } : entry)))
              }
              placeholder="Destination story"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectorCard({
  section,
  onToggleVisibility,
  onToggleLock,
}: {
  section: ItinerarySection | null;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
}) {
  if (!section) return null;

  return (
    <Card className="rounded-[30px] border-slate-200/80 bg-white/88 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg tracking-tight">Inspector</CardTitle>
        <CardDescription>Keep editing states explicit without turning the builder into a dense admin panel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Current section</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{section.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left"
          >
            <span>
              <p className="text-sm font-semibold text-slate-900">Visibility</p>
              <p className="text-xs text-slate-500">Hide the section from the preview without deleting it.</p>
            </span>
            {section.visible ? <Eye className="size-4 text-slate-500" /> : <EyeOff className="size-4 text-slate-500" />}
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left"
          >
            <span>
              <p className="text-sm font-semibold text-slate-900">Lock state</p>
              <p className="text-xs text-slate-500">Use this when a section is ready for review.</p>
            </span>
            {section.locked ? <Lock className="size-4 text-slate-500" /> : <Unlock className="size-4 text-slate-500" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ItineraryBuilderPage({ initialItinerary }: ItineraryBuilderPageProps) {
  const form = useForm<ItineraryEditorInput>({
    resolver: zodResolver(itineraryEditorSchema),
    defaultValues: initialItinerary,
    mode: "onChange",
  });
  const itinerary = (useWatch({ control: form.control }) as Itinerary) || initialItinerary;
  const [selectedSectionId, setSelectedSectionId] = useState(initialItinerary.sections[0]?.id ?? "");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("SPLIT");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("DESKTOP");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(new Date().toISOString());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedDayId, setDraggedDayId] = useState<string | null>(null);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);

  useEffect(() => {
    if (!itinerary.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(itinerary.sections[0]?.id ?? "");
    }
  }, [itinerary.sections, selectedSectionId]);

  const selectedSection =
    itinerary.sections.find((section) => section.id === selectedSectionId) || itinerary.sections[0] || null;
  const selectedCustomSection = getCustomSection(itinerary, selectedSection);
  const previewTargets = useMemo(() => buildPreviewTargets(itinerary), [itinerary]);
  const coverMedia = itinerary.gallery.find((asset) => asset.id === itinerary.hero.coverMediaId) || null;

  const applyUpdate = (updater: (current: Itinerary) => Itinerary) => {
    const next = updater(cloneValue(form.getValues() as Itinerary));
    form.reset(next);
    setSaveState("dirty");
  };

  const persist = async (nextStatus?: Itinerary["status"]) => {
    const parsed = itineraryEditorSchema.safeParse({
      ...form.getValues(),
      status: nextStatus ?? itinerary.status,
    });

    if (!parsed.success) {
      setSaveState("dirty");
      return;
    }

    setSaveState("saving");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    form.reset(parsed.data);
    setLastSavedAt(new Date().toISOString());
    setSaveState("saved");
  };

  useEffect(() => {
    if (saveState !== "dirty") return;
    const timeout = window.setTimeout(() => {
      void persist();
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [saveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSectionVisibility = (sectionId: string) => {
    applyUpdate((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
  };

  const toggleSectionLock = (sectionId: string) => {
    applyUpdate((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, locked: !section.locked } : section
      ),
    }));
  };

  const addCustomSection = () => {
    const next = createCustomSection();
    applyUpdate((current) => ({
      ...current,
      sections: [...current.sections, next.section],
      customSections: [...current.customSections, next.content],
    }));
    setSelectedSectionId(next.section.id);
    setMobileSidebarOpen(false);
  };

  const removeCurrentCustomSection = () => {
    if (!selectedSection || selectedSection.type !== "custom" || !selectedSection.customSectionId) return;
    applyUpdate((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== selectedSection.id),
      customSections: current.customSections.filter((entry) => entry.id !== selectedSection.customSectionId),
    }));
  };

  const duplicateCurrentCustomSection = () => {
    if (!selectedCustomSection) return;
    const next = createCustomSection();
    next.section.title = `${selectedCustomSection.title} Copy`;
    next.section.description = selectedSection?.description || next.section.description;
    next.content.title = `${selectedCustomSection.title} Copy`;
    next.content.eyebrow = selectedCustomSection.eyebrow;
    next.content.body = selectedCustomSection.body;
    applyUpdate((current) => ({
      ...current,
      sections: [...current.sections, next.section],
      customSections: [...current.customSections, next.content],
    }));
    setSelectedSectionId(next.section.id);
  };

  const addDay = () => {
    applyUpdate((current) => ({
      ...current,
      days: [...current.days, createDayPlan(current.days.length + 1)],
    }));
  };

  const duplicateDay = (dayId: string) => {
    applyUpdate((current) => {
      const source = current.days.find((day) => day.id === dayId);
      if (!source) return current;
      const nextDay = cloneValue(source);
      nextDay.id = nanoid();
      nextDay.dayNumber = current.days.length + 1;
      nextDay.title = `${source.title} Copy`;
      nextDay.timeline = nextDay.timeline.map((item) => ({ ...item, id: nanoid() }));
      return { ...current, days: [...current.days, nextDay] };
    });
  };

  const removeDay = (dayId: string) => {
    applyUpdate((current) => {
      const nextDays = current.days.filter((day) => day.id !== dayId).map((day, index) => ({ ...day, dayNumber: index + 1 }));
      return { ...current, days: nextDays.length ? nextDays : [createDayPlan(1)] };
    });
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const id = nanoid();
      const objectUrl = URL.createObjectURL(file);
      const nextAsset: MediaAsset = {
        id,
        type: file.type.startsWith("video") ? "video" : "image",
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        url: objectUrl,
        thumbnailUrl: objectUrl,
        caption: "",
        altText: file.name.replace(/\.[^/.]+$/, ""),
        tags: [],
        uploadProgress: 0,
        status: "uploading",
      };

      applyUpdate((current) => ({
        ...current,
        gallery: [nextAsset, ...current.gallery],
      }));

      let progress = 0;
      const interval = window.setInterval(() => {
        progress = Math.min(progress + 25, 100);
        applyUpdate((current) => ({
          ...current,
          gallery: current.gallery.map((asset) =>
            asset.id === id
              ? {
                  ...asset,
                  uploadProgress: progress,
                  status: progress >= 100 ? "ready" : "uploading",
                }
              : asset
          ),
        }));
        if (progress >= 100) {
          window.clearInterval(interval);
        }
      }, 160);
    });
  };

  const renderEditor = () => {
    if (!selectedSection) {
      return (
        <EmptyState
          title="Select a section"
          description="Choose a section from the left rail to start shaping the itinerary."
        />
      );
    }

    if (selectedSection.type === "overview") {
      return (
        <SectionCard
          eyebrow="Overview"
          title="Trip-level framing"
          description="Shape the metadata that informs both the editorial preview and the operational summary."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Itinerary title</Label>
              <Input value={itinerary.title} onChange={(event) => applyUpdate((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Traveler / group</Label>
              <Input
                value={itinerary.travelerLabel}
                onChange={(event) => applyUpdate((current) => ({ ...current, travelerLabel: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                value={itinerary.destination}
                onChange={(event) => applyUpdate((current) => ({ ...current, destination: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status note</Label>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This builder is currently in <span className="font-semibold">{itinerary.status.toLowerCase()}</span> mode.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                value={itinerary.startDate}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    startDate: event.target.value,
                    hero: { ...current.hero, startDate: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                value={itinerary.endDate}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    endDate: event.target.value,
                    hero: { ...current.hero, endDate: event.target.value },
                  }))
                }
              />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "hero") {
      return (
        <SectionCard
          eyebrow="Hero"
          title="Lead the story"
          description="Open with a strong promise: where the guest is going, why it feels special, and what visual sets the tone."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hero title</Label>
                <Input
                  value={itinerary.hero.title}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      hero: { ...current.hero, title: event.target.value },
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Textarea
                  rows={4}
                  value={itinerary.hero.subtitle}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      hero: { ...current.hero, subtitle: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Input
                    value={itinerary.hero.destination}
                    onChange={(event) =>
                      applyUpdate((current) => ({
                        ...current,
                        hero: { ...current.hero, destination: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={itinerary.hero.country}
                    onChange={(event) =>
                      applyUpdate((current) => ({
                        ...current,
                        hero: { ...current.hero, country: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration label</Label>
                  <Input
                    value={itinerary.hero.durationLabel}
                    onChange={(event) =>
                      applyUpdate((current) => ({
                        ...current,
                        hero: { ...current.hero, durationLabel: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Traveler label</Label>
                  <Input
                    value={itinerary.hero.travelerLabel}
                    onChange={(event) =>
                      applyUpdate((current) => ({
                        ...current,
                        hero: { ...current.hero, travelerLabel: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <ListEditor
                label="CTA chips / tags"
                description="Short tags that make the itinerary feel curated at a glance."
                value={itinerary.hero.tags}
                onChange={(next) => applyUpdate((current) => ({ ...current, hero: { ...current.hero, tags: next } }))}
                placeholder="Culture&#10;Beach&#10;Private Guide"
              />
            </div>

            <div className="space-y-3 rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cover media</p>
                <p className="mt-1 text-sm text-slate-500">Choose the hero visual that leads the itinerary.</p>
              </div>
              <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
                {coverMedia ? (
                  coverMedia.type === "image" ? (
                    <img src={coverMedia.thumbnailUrl} alt={coverMedia.altText} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <video src={coverMedia.url} className="aspect-[4/3] w-full object-cover" muted playsInline />
                  )
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#dbe4e8_0%,#f6f2ea_100%)] text-sm text-slate-500">
                    No cover selected yet
                  </div>
                )}
              </div>
              <div className="grid gap-3">
                {itinerary.gallery.slice(0, 4).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      applyUpdate((current) => ({
                        ...current,
                        hero: { ...current.hero, coverMediaId: asset.id },
                        galleryAssignments: [
                          ...current.galleryAssignments.filter(
                            (assignment) => !(assignment.targetType === "hero" && assignment.targetId === "hero")
                          ),
                          {
                            id: nanoid(),
                            mediaId: asset.id,
                            targetType: "hero",
                            targetId: "hero",
                            featured: true,
                          },
                        ],
                      }))
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-all",
                      itinerary.hero.coverMediaId === asset.id
                        ? "border-slate-900 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="size-14 overflow-hidden rounded-[16px] bg-slate-100">
                      {asset.type === "image" ? (
                        <img src={asset.thumbnailUrl} alt={asset.altText} className="h-full w-full object-cover" />
                      ) : (
                        <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{asset.title}</p>
                      <p className={cn("truncate text-xs", itinerary.hero.coverMediaId === asset.id ? "text-white/70" : "text-slate-500")}>
                        {asset.type === "video" ? "Video cover" : "Image cover"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "tripSummary") {
      return (
        <SectionCard
          eyebrow="Trip Summary"
          title="Editorial summary"
          description="Balance warmth and clarity. This is the part that should feel like a crafted travel proposal, not a dry system export."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Rich intro</Label>
              <Textarea
                rows={5}
                value={itinerary.tripSummary.intro}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    tripSummary: { ...current.tripSummary, intro: event.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ListEditor
                label="Highlights"
                description="Use one line per highlight."
                value={itinerary.tripSummary.highlights}
                onChange={(next) =>
                  applyUpdate((current) => ({
                    ...current,
                    tripSummary: { ...current.tripSummary, highlights: next },
                  }))
                }
              />
              <ListEditor
                label="Important notes"
                description="Use this for pacing, upgrades, or operational context."
                value={itinerary.tripSummary.importantNotes}
                onChange={(next) =>
                  applyUpdate((current) => ({
                    ...current,
                    tripSummary: { ...current.tripSummary, importantNotes: next },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Budget range</Label>
                <Input
                  value={itinerary.tripSummary.budgetRange}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      tripSummary: { ...current.tripSummary, budgetRange: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Travel style</Label>
                <Input
                  value={itinerary.tripSummary.travelStyle}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      tripSummary: { ...current.tripSummary, travelStyle: event.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <QuickFactsEditor
              facts={itinerary.tripSummary.quickFacts}
              onChange={(next) =>
                applyUpdate((current) => ({
                  ...current,
                  tripSummary: { ...current.tripSummary, quickFacts: next },
                }))
              }
            />
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "destinations") {
      return (
        <SectionCard
          eyebrow="Destinations"
          title="Route and destination story"
          description="Turn the trip path into something legible, premium, and easy to scan."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <DestinationEditor
            destinations={itinerary.destinations}
            onChange={(next) => applyUpdate((current) => ({ ...current, destinations: next }))}
          />
        </SectionCard>
      );
    }

    if (selectedSection.type === "dayPlan") {
      return (
        <SectionCard
          eyebrow="Day-by-Day"
          title="Daily experience builder"
          description="Compose the guest journey as a series of elegant, collapsible day cards with clean pacing and clear operational detail."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onAdd={addDay}
            />
          }
        >
          <div className="space-y-4">
            {itinerary.days.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                draggedDayId={draggedDayId}
                onDragStart={setDraggedDayId}
                onDragEnd={() => setDraggedDayId(null)}
                onDrop={(targetId) =>
                  draggedDayId
                    ? applyUpdate((current) => ({
                        ...current,
                        days: moveById(current.days, draggedDayId, targetId).map((entry, index) => ({
                          ...entry,
                          dayNumber: index + 1,
                        })),
                      }))
                    : undefined
                }
                onChange={(nextDay) =>
                  applyUpdate((current) => ({
                    ...current,
                    days: current.days.map((entry) => (entry.id === nextDay.id ? nextDay : entry)),
                  }))
                }
                onDuplicate={duplicateDay}
                onRemove={removeDay}
              />
            ))}
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "stays") {
      return (
        <SectionCard
          eyebrow="Stays"
          title="Property editor"
          description="Make accommodation details feel editorial and organized rather than buried in one long table."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onAdd={() => applyUpdate((current) => ({ ...current, stays: [...current.stays, createStay()] }))}
            />
          }
        >
          <div className="space-y-4">
            {itinerary.stays.map((stay) => (
              <PropertyCardEditor
                key={stay.id}
                stay={stay}
                onChange={(nextStay) =>
                  applyUpdate((current) => ({
                    ...current,
                    stays: current.stays.map((entry) => (entry.id === nextStay.id ? nextStay : entry)),
                  }))
                }
                onRemove={(stayId) =>
                  applyUpdate((current) => ({ ...current, stays: current.stays.filter((entry) => entry.id !== stayId) }))
                }
              />
            ))}
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "transfers") {
      return (
        <SectionCard
          eyebrow="Transfers"
          title="Movement and logistics"
          description="Keep transfers clear, lightweight, and trustworthy for both clients and internal teams."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onAdd={() => applyUpdate((current) => ({ ...current, transfers: [...current.transfers, createTransfer()] }))}
            />
          }
        >
          <div className="space-y-4">
            {itinerary.transfers.map((transfer) => (
              <TransferCardEditor
                key={transfer.id}
                transfer={transfer}
                onChange={(nextTransfer) =>
                  applyUpdate((current) => ({
                    ...current,
                    transfers: current.transfers.map((entry) => (entry.id === nextTransfer.id ? nextTransfer : entry)),
                  }))
                }
                onRemove={(transferId) =>
                  applyUpdate((current) => ({
                    ...current,
                    transfers: current.transfers.filter((entry) => entry.id !== transferId),
                  }))
                }
              />
            ))}
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "activities") {
      return (
        <SectionCard
          eyebrow="Activities"
          title="Experience cards"
          description="Bring together timing, references, notes, and media so activities read like sellable moments."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onAdd={() => applyUpdate((current) => ({ ...current, activities: [...current.activities, createActivity()] }))}
            />
          }
        >
          <div className="space-y-4">
            {itinerary.activities.map((activity) => (
              <ActivityCardEditor
                key={activity.id}
                activity={activity}
                onChange={(nextActivity) =>
                  applyUpdate((current) => ({
                    ...current,
                    activities: current.activities.map((entry) => (entry.id === nextActivity.id ? nextActivity : entry)),
                  }))
                }
                onRemove={(activityId) =>
                  applyUpdate((current) => ({
                    ...current,
                    activities: current.activities.filter((entry) => entry.id !== activityId),
                  }))
                }
              />
            ))}
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "dining") {
      return (
        <SectionCard
          eyebrow="Dining"
          title="Dining moments"
          description="Elevate restaurant reservations from raw booking notes into elegant guest-facing recommendations."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onAdd={() => applyUpdate((current) => ({ ...current, dining: [...current.dining, createDiningReservation()] }))}
            />
          }
        >
          <div className="space-y-4">
            {itinerary.dining.map((item) => (
              <DiningCardEditor
                key={item.id}
                dining={item}
                onChange={(nextDining) =>
                  applyUpdate((current) => ({
                    ...current,
                    dining: current.dining.map((entry) => (entry.id === nextDining.id ? nextDining : entry)),
                  }))
                }
                onRemove={(diningId) =>
                  applyUpdate((current) => ({
                    ...current,
                    dining: current.dining.filter((entry) => entry.id !== diningId),
                  }))
                }
              />
            ))}
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "inclusionsExclusions") {
      return (
        <SectionCard
          eyebrow="Commercial"
          title="Inclusions and exclusions"
          description="Present the commercial checklist with clarity so the itinerary feels polished and trustworthy."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <InclusionExclusionEditor
            inclusions={itinerary.inclusions}
            exclusions={itinerary.exclusions}
            onChange={(next) => applyUpdate((current) => ({ ...current, ...next }))}
          />
        </SectionCard>
      );
    }

    if (selectedSection.type === "policies") {
      return (
        <SectionCard
          eyebrow="Policies"
          title="Important information"
          description="Treat policies as part of the product experience: reassuring, clear, and structured."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <PoliciesEditor
            policies={itinerary.policies}
            contact={itinerary.contact}
            onPoliciesChange={(next) => applyUpdate((current) => ({ ...current, policies: next }))}
            onContactChange={(next) => applyUpdate((current) => ({ ...current, contact: next }))}
          />
        </SectionCard>
      );
    }

    if (selectedSection.type === "gallery") {
      return (
        <GalleryManager
          assets={itinerary.gallery}
          assignments={itinerary.galleryAssignments}
          previewTargets={previewTargets}
          coverMediaId={itinerary.hero.coverMediaId}
          draggedMediaId={draggedMediaId}
          onFilesSelected={handleFilesSelected}
          onDragStart={setDraggedMediaId}
          onDragEnd={() => setDraggedMediaId(null)}
          onDrop={(targetMediaId) =>
            draggedMediaId
              ? applyUpdate((current) => ({
                  ...current,
                  gallery: moveById(current.gallery, draggedMediaId, targetMediaId),
                }))
              : undefined
          }
          onRemove={(mediaId) =>
            applyUpdate((current) => ({
              ...current,
              gallery: current.gallery.filter((asset) => asset.id !== mediaId),
              galleryAssignments: current.galleryAssignments.filter((assignment) => assignment.mediaId !== mediaId),
              hero: {
                ...current.hero,
                coverMediaId: current.hero.coverMediaId === mediaId ? null : current.hero.coverMediaId,
              },
            }))
          }
          onSetCover={(mediaId) =>
            applyUpdate((current) => ({
              ...current,
              hero: { ...current.hero, coverMediaId: mediaId },
              galleryAssignments: [
                ...current.galleryAssignments.filter(
                  (assignment) => !(assignment.targetType === "hero" && assignment.targetId === "hero")
                ),
                {
                  id: nanoid(),
                  mediaId,
                  targetType: "hero",
                  targetId: "hero",
                  featured: true,
                },
              ],
            }))
          }
          onUpdateMedia={(mediaId, patch) =>
            applyUpdate((current) => ({
              ...current,
              gallery: current.gallery.map((asset) => (asset.id === mediaId ? { ...asset, ...patch } : asset)),
            }))
          }
          onChangeAssignment={(mediaId, targetValue) =>
            applyUpdate((current) => {
              const nextAssignments = current.galleryAssignments.filter((assignment) => assignment.mediaId !== mediaId);
              if (targetValue) {
                const [targetType, targetId] = targetValue.split(":");
                nextAssignments.push({
                  id: nanoid(),
                  mediaId,
                  targetType: targetType as GalleryAssignment["targetType"],
                  targetId,
                  featured: false,
                });
              }
              return { ...current, galleryAssignments: nextAssignments };
            })
          }
        />
      );
    }

    if (selectedSection.type === "notes") {
      return (
        <SectionCard
          eyebrow="Notes"
          title="Production notes"
          description="Keep internal direction, sales nuance, and traveler-specific reminders in one clean place."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={8}
              value={itinerary.notes}
              onChange={(event) => applyUpdate((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "ctaFooter") {
      return (
        <SectionCard
          eyebrow="Footer"
          title="Closing CTA"
          description="Finish the itinerary with a confident, polished invitation to confirm or refine."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
            />
          }
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>CTA copy</Label>
              <Textarea
                rows={4}
                value={itinerary.footerCta}
                onChange={(event) => applyUpdate((current) => ({ ...current, footerCta: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Concierge</Label>
                <Input
                  value={itinerary.contact.conciergeName}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      contact: { ...current.contact, conciergeName: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Support email</Label>
                <Input
                  value={itinerary.contact.supportEmail}
                  onChange={(event) =>
                    applyUpdate((current) => ({
                      ...current,
                      contact: { ...current.contact, supportEmail: event.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (selectedSection.type === "custom" && selectedCustomSection) {
      return (
        <SectionCard
          eyebrow={selectedCustomSection.eyebrow}
          title={selectedCustomSection.title}
          description="Custom editorial space for unique recommendations, storytelling, or concierge notes."
          toolbar={
            <SectionToolbar
              visible={selectedSection.visible}
              onToggleVisibility={() => toggleSectionVisibility(selectedSection.id)}
              onDuplicate={duplicateCurrentCustomSection}
              onRemove={removeCurrentCustomSection}
            />
          }
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Eyebrow</Label>
              <Input
                value={selectedCustomSection.eyebrow}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    customSections: current.customSections.map((entry) =>
                      entry.id === selectedCustomSection.id ? { ...entry, eyebrow: event.target.value } : entry
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={selectedCustomSection.title}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    sections: current.sections.map((entry) =>
                      entry.id === selectedSection.id ? { ...entry, title: event.target.value } : entry
                    ),
                    customSections: current.customSections.map((entry) =>
                      entry.id === selectedCustomSection.id ? { ...entry, title: event.target.value } : entry
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                rows={8}
                value={selectedCustomSection.body}
                onChange={(event) =>
                  applyUpdate((current) => ({
                    ...current,
                    customSections: current.customSections.map((entry) =>
                      entry.id === selectedCustomSection.id ? { ...entry, body: event.target.value } : entry
                    ),
                  }))
                }
              />
            </div>
          </div>
        </SectionCard>
      );
    }

    return null;
  };

  const mainLayoutClass =
    workspaceMode === "PREVIEW"
      ? "grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]"
      : "grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_420px]";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f3ee_0%,#fbfaf7_32%,#f4f6f8_100%)]">
      <ItineraryHeader
        title={itinerary.title}
        status={itinerary.status}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
        onSave={() => void persist()}
        onPublish={() => void persist("PUBLISHED")}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
      />

      <main className="px-4 py-5 lg:px-6">
        <div className={mainLayoutClass}>
          <ItinerarySidebar
            sections={itinerary.sections}
            selectedSectionId={selectedSectionId}
            draggedSectionId={draggedSectionId}
            openMobile={mobileSidebarOpen}
            onOpenMobileChange={setMobileSidebarOpen}
            onSelectSection={(sectionId) => {
              setSelectedSectionId(sectionId);
              setMobileSidebarOpen(false);
            }}
            onAddCustomSection={addCustomSection}
            onToggleVisibility={toggleSectionVisibility}
            onDragStart={setDraggedSectionId}
            onDragEnd={() => setDraggedSectionId(null)}
            onDrop={(targetSectionId) =>
              draggedSectionId
                ? applyUpdate((current) => ({
                    ...current,
                    sections: moveById(current.sections, draggedSectionId, targetSectionId),
                  }))
                : undefined
            }
          />

          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200/80 bg-white/80 px-5 py-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Builder</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedSection?.title || "Itinerary composer"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {selectedSection?.description || "Select a section to begin shaping the itinerary."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {itinerary.sections.filter((section) => section.visible).length} visible sections
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {itinerary.days.length} days
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {itinerary.gallery.length} media
                  </Badge>
                </div>
              </div>
            </div>

            {workspaceMode === "PREVIEW" ? (
              <PreviewPanel
                itinerary={itinerary}
                selectedSection={selectedSection}
                device={previewDevice}
                showFullPreview
                onDeviceChange={setPreviewDevice}
              />
            ) : (
              renderEditor()
            )}

            {workspaceMode !== "PREVIEW" ? (
              <div className="space-y-5 2xl:hidden">
                <PreviewPanel
                  itinerary={itinerary}
                  selectedSection={selectedSection}
                  device={previewDevice}
                  showFullPreview={workspaceMode === "SPLIT"}
                  onDeviceChange={setPreviewDevice}
                />
                <InspectorCard
                  section={selectedSection}
                  onToggleVisibility={() => selectedSection && toggleSectionVisibility(selectedSection.id)}
                  onToggleLock={() => selectedSection && toggleSectionLock(selectedSection.id)}
                />
              </div>
            ) : null}
          </div>

          {workspaceMode !== "PREVIEW" ? (
            <div className="hidden 2xl:block">
              <div className="space-y-5">
                <PreviewPanel
                  itinerary={itinerary}
                  selectedSection={selectedSection}
                  device={previewDevice}
                  showFullPreview={workspaceMode === "SPLIT"}
                  onDeviceChange={setPreviewDevice}
                />
                <InspectorCard
                  section={selectedSection}
                  onToggleVisibility={() => selectedSection && toggleSectionVisibility(selectedSection.id)}
                  onToggleLock={() => selectedSection && toggleSectionLock(selectedSection.id)}
                />
              </div>
            </div>
          ) : null}
        </div>

        {saveState === "dirty" ? (
          <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-4 py-2 text-sm text-amber-700 shadow-lg backdrop-blur">
            <AlertCircle className="size-4" />
            Changes are queued for autosave
          </div>
        ) : saveState === "saving" ? (
          <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-sm text-sky-700 shadow-lg backdrop-blur">
            <Sparkles className="size-4 animate-pulse" />
            Saving itinerary
          </div>
        ) : (
          <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm text-emerald-700 shadow-lg backdrop-blur">
            <CheckCircle2 className="size-4" />
            Everything is synced
          </div>
        )}
      </main>
    </div>
  );
}
