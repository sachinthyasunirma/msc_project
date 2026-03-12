"use client";

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";

export function ViewOnlyModeBadge() {
  const { isReadOnly, viewer } = useDashboardAccessState();

  if (!viewer || !isReadOnly) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50">
      <Badge variant="secondary" className="px-3 py-1 text-xs font-medium shadow">
        <Eye className="mr-1 size-3.5" />
        View Only Mode
      </Badge>
    </div>
  );
}
