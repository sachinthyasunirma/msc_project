"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  toolbar?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  toolbar,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("rounded-[28px] border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.22)]", className)}>
      <CardHeader className="gap-3 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-1">
              <CardTitle className="text-xl tracking-tight text-slate-950">{title}</CardTitle>
              {description ? <CardDescription className="max-w-3xl text-sm leading-6">{description}</CardDescription> : null}
            </div>
          </div>
          {toolbar ? <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
