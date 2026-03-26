"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-slate-300 bg-slate-100 text-slate-700",
  PENDING_CONFIRMATION: "border-amber-200 bg-amber-100 text-amber-800",
  CONFIRMED: "border-sky-200 bg-sky-100 text-sky-700",
  READY_TO_OPERATE: "border-violet-200 bg-violet-100 text-violet-700",
  IN_PROGRESS: "border-indigo-200 bg-indigo-100 text-indigo-700",
  COMPLETED: "border-emerald-200 bg-emerald-100 text-emerald-700",
  CLOSED: "border-zinc-300 bg-zinc-100 text-zinc-700",
  CANCELED: "border-rose-200 bg-rose-100 text-rose-700",
  CONFIRMED_SERVICE: "border-emerald-200 bg-emerald-100 text-emerald-700",
};

export function OnTourStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[normalized] ?? "border-muted bg-muted text-muted-foreground", className)}
    >
      {normalized.replaceAll("_", " ")}
    </Badge>
  );
}
