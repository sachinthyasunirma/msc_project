"use client";

import { TourLoader } from "@/components/ui/tour-loader";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  className?: string;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
};

export function LoadingState({
  className,
  title = "Preparing your route",
  description = "Aligning the next stop in your journey.",
  size = "md",
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-left",
        compact ? "py-2" : "justify-center rounded-xl border bg-card/70 px-6 py-8",
        className
      )}
    >
      <TourLoader size={size} label={title} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
