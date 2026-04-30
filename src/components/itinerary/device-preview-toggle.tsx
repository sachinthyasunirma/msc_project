"use client";

import { Laptop2, Smartphone, StretchHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewDevice } from "@/lib/types/itinerary";

type DevicePreviewToggleProps = {
  value: PreviewDevice;
  onChange: (value: PreviewDevice) => void;
  className?: string;
};

const OPTIONS: Array<{
  value: PreviewDevice;
  label: string;
  icon: typeof Laptop2;
}> = [
  { value: "DESKTOP", label: "Desktop", icon: Laptop2 },
  { value: "MOBILE", label: "Mobile", icon: Smartphone },
  { value: "PDF_SAFE", label: "PDF-safe", icon: StretchHorizontal },
];

export function DevicePreviewToggle({
  value,
  onChange,
  className,
}: DevicePreviewToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm", className)}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 text-xs font-medium",
              active ? "bg-slate-900 text-white hover:bg-slate-900/90 hover:text-white" : "text-slate-600"
            )}
          >
            <Icon className="size-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
