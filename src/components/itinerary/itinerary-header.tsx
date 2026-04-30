"use client";

import { Eye, LayoutDashboard, Menu, Save, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoSaveIndicator } from "@/components/itinerary/auto-save-indicator";
import { StatusBadge } from "@/components/itinerary/status-badge";
import { cn } from "@/lib/utils";
import type { ItineraryStatus, SaveState, WorkspaceMode } from "@/lib/types/itinerary";

type ItineraryHeaderProps = {
  title: string;
  status: ItineraryStatus;
  saveState: SaveState;
  lastSavedAt: string | null;
  workspaceMode: WorkspaceMode;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onSave: () => void;
  onPublish: () => void;
  onOpenSidebar: () => void;
};

const MODES: WorkspaceMode[] = ["BUILDER", "PREVIEW", "SPLIT"];

export function ItineraryHeader({
  title,
  status,
  saveState,
  lastSavedAt,
  workspaceMode,
  onWorkspaceModeChange,
  onSave,
  onPublish,
  onOpenSidebar,
}: ItineraryHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f6f3ee]/85 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="lg:hidden" onClick={onOpenSidebar}>
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Itinerary Studio</p>
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-950 lg:text-2xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <AutoSaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm xl:w-auto">
            {MODES.map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onWorkspaceModeChange(mode)}
                className={cn(
                  "rounded-full px-4",
                  workspaceMode === mode
                    ? "bg-slate-900 text-white hover:bg-slate-900/90 hover:text-white"
                    : "text-slate-600"
                )}
              >
                {mode === "BUILDER" ? <LayoutDashboard className="size-4" /> : <Eye className="size-4" />}
                {mode === "BUILDER" ? "Builder" : mode === "PREVIEW" ? "Preview" : "Split View"}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onSave}>
              <Save className="size-4" />
              Save Now
            </Button>
            <Button type="button" onClick={onPublish}>
              <SendHorizonal className="size-4" />
              Publish
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
