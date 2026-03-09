"use client";

import { useMemo } from "react";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";

export function useTransportAccess() {
  const { isReadOnly } = useDashboardAccessState();

  return useMemo(
    () => ({
      isReadOnly,
    }),
    [isReadOnly]
  );
}
