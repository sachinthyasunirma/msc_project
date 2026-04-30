"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveState } from "@/lib/types/itinerary";

type AutoSaveIndicatorProps = {
  state: SaveState;
  lastSavedAt: string | null;
  className?: string;
};

export function AutoSaveIndicator({
  state,
  lastSavedAt,
  className,
}: AutoSaveIndicatorProps) {
  const label =
    state === "saving"
      ? "Autosaving"
      : state === "dirty"
        ? "Unsaved changes"
        : lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "Saved";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm",
        className
      )}
    >
      {state === "saving" ? (
        <Loader2 className="size-3.5 animate-spin text-sky-600" />
      ) : state === "dirty" ? (
        <Sparkles className="size-3.5 text-amber-600" />
      ) : (
        <CheckCircle2 className="size-3.5 text-emerald-600" />
      )}
      {label}
    </div>
  );
}
