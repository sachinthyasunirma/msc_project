"use client";

import { useMemo } from "react";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";

export function usePreTourAccess() {
  const { canWritePreTour, isAdmin, privileges } = useDashboardAccessState();

  return useMemo(
    () => ({
      isReadOnly: !canWritePreTour,
      isAdmin,
      privileges,
      canViewRouteMap: privileges.includes("PRE_TOUR_MAP"),
      canViewCosting: privileges.includes("PRE_TOUR_COSTING"),
    }),
    [canWritePreTour, isAdmin, privileges]
  );
}
