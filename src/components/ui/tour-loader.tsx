"use client";

import { MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

type TourLoaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const sizeClasses = {
  sm: {
    wrapper: "size-5",
    icon: "size-2.5",
    dot: "size-1.5",
  },
  md: {
    wrapper: "size-8",
    icon: "size-4",
    dot: "size-2",
  },
  lg: {
    wrapper: "size-12",
    icon: "size-5",
    dot: "size-2.5",
  },
} as const;

export function TourLoader({
  className,
  size = "md",
  label = "Loading",
}: TourLoaderProps) {
  const scale = sizeClasses[size];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center text-primary",
        scale.wrapper,
        className
      )}
    >
      <span className="absolute inset-0 rounded-full border border-primary/20" />
      <span className="absolute inset-[14%] rounded-full border border-primary/10" />
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/80 border-r-primary/35 motion-safe:animate-[spin_2.4s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute inset-0 motion-safe:animate-[spin_1.45s_linear_infinite_reverse] motion-reduce:animate-none">
        <span
          className={cn(
            "absolute left-1/2 top-[2px] -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]",
            scale.dot
          )}
        />
      </span>
      <span className="absolute inset-[28%] rounded-full bg-primary/10 motion-safe:animate-pulse motion-reduce:animate-none" />
      <MapPinned className={cn("relative z-10", scale.icon)} strokeWidth={2.25} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
