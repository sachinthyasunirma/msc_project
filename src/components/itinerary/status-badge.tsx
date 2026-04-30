"use client";

import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ItineraryStatus } from "@/lib/types/itinerary";

const STATUS_META: Record<
  ItineraryStatus,
  { label: string; icon: typeof FileText; className: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: FileText,
    className: "border-slate-200 bg-white text-slate-700",
  },
  PUBLISHED: {
    label: "Published",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  NEEDS_REVIEW: {
    label: "Needs Review",
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

type StatusBadgeProps = {
  status: ItineraryStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full px-3 py-1 font-medium", meta.className, className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
}
