"use client";

import { Plus, Sparkles, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ItinerarySection } from "@/lib/types/itinerary";

type ItinerarySidebarProps = {
  sections: ItinerarySection[];
  selectedSectionId: string;
  draggedSectionId: string | null;
  openMobile: boolean;
  onOpenMobileChange: (open: boolean) => void;
  onSelectSection: (sectionId: string) => void;
  onAddCustomSection: () => void;
  onToggleVisibility: (sectionId: string) => void;
  onDragStart: (sectionId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetSectionId: string) => void;
};

function SidebarBody({
  sections,
  selectedSectionId,
  draggedSectionId,
  onSelectSection,
  onAddCustomSection,
  onToggleVisibility,
  onDragStart,
  onDragEnd,
  onDrop,
}: Omit<ItinerarySidebarProps, "openMobile" | "onOpenMobileChange">) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b border-slate-200/70 px-4 py-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Structure</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Itinerary flow</h2>
          <p className="text-sm leading-6 text-slate-500">
            Organize the experience like a polished travel proposal, then edit each section in the composer.
          </p>
        </div>
        <div className="grid gap-2">
          <Button type="button" className="justify-start" onClick={onAddCustomSection}>
            <Plus className="size-4" />
            Add custom section
          </Button>
          <Button type="button" variant="outline" className="justify-start">
            <Sparkles className="size-4" />
            Generate structure ideas
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {sections.map((section, index) => {
            const active = selectedSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                draggable
                onDragStart={() => onDragStart(section.id)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(section.id)}
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  "group w-full rounded-[24px] border px-4 py-4 text-left transition-all",
                  active
                    ? "border-slate-900 bg-slate-950 text-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.55)]"
                    : "border-slate-200 bg-white/90 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]",
                  draggedSectionId === section.id ? "opacity-60" : ""
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className={cn("text-[11px] uppercase tracking-[0.2em]", active ? "text-white/70" : "text-slate-400")}>
                      Section {index + 1}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className={cn("text-xs leading-5", active ? "text-white/70" : "text-slate-500")}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                        active ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {section.visible ? "Visible" : "Hidden"}
                    </span>
                    <Button
                      type="button"
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("h-8 px-2 text-xs", active ? "bg-white/10 text-white hover:bg-white/15" : "")}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleVisibility(section.id);
                      }}
                    >
                      {section.visible ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 pt-0">
          <Separator className="mb-4" />
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-4 py-4 text-left">
            <div className="flex items-center gap-2 text-slate-900">
              <StickyNote className="size-4" />
              <p className="text-sm font-semibold">Custom editorial space</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add bespoke content like concierge notes, wellness guidance, shopping tips, or a special celebration page.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function ItinerarySidebar(props: ItinerarySidebarProps) {
  return (
    <>
      <aside className="hidden xl:block">
        <div className="sticky top-[7.5rem] h-[calc(100vh-8.5rem)] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/85 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
          <SidebarBody {...props} />
        </div>
      </aside>

      <Sheet open={props.openMobile} onOpenChange={props.onOpenMobileChange}>
        <SheetContent side="left" className="w-[90vw] max-w-sm border-r border-slate-200 bg-[#f8f5ef] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Itinerary sections</SheetTitle>
            <SheetDescription>Navigate through itinerary sections.</SheetDescription>
          </SheetHeader>
          <SidebarBody {...props} />
        </SheetContent>
      </Sheet>
    </>
  );
}
