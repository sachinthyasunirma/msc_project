"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnTourScreenHeaderProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function OnTourScreenHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  onRefresh,
  refreshing = false,
}: OnTourScreenHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        {backHref ? (
          <Button variant="ghost" size="sm" className="-ml-3 w-fit" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onRefresh ? (
          <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
