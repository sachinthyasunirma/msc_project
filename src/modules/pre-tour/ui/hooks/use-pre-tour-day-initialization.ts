"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { initializePreTourDays } from "@/modules/pre-tour/lib/pre-tour-api";
import { toDayCount } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type UsePreTourDayInitializationParams = {
  planId: string;
  selectedPlan: Row | null;
  daysCount: number;
  loading: boolean;
  isReadOnly: boolean;
  onDaysChange: (days: Row[]) => void;
};

export function usePreTourDayInitialization({
  planId,
  selectedPlan,
  daysCount,
  loading,
  isReadOnly,
  onDaysChange,
}: UsePreTourDayInitializationParams) {
  const [syncingDays, setSyncingDays] = useState(false);
  const autoInitializationRef = useRef<string | null>(null);

  const syncDaysFromRange = useCallback(
    async ({ automatic = false }: { automatic?: boolean } = {}) => {
      if (!selectedPlan || syncingDays) return null;
      const expectedDays = toDayCount(
        String(selectedPlan.startDate || ""),
        String(selectedPlan.endDate || "")
      );
      if (expectedDays <= 0) {
        if (!automatic) {
          notify.error("Invalid plan date range. Update pre-tour header dates first.");
        }
        return null;
      }

      setSyncingDays(true);
      try {
        const result = await initializePreTourDays(planId);
        onDaysChange(result.days);
        if (result.createdCount === 0) {
          if (!automatic) {
            notify.info("All days are already initialized from the date range.");
          }
        } else {
          notify.success(`Initialized ${result.createdCount} day(s) from plan date range.`);
        }
        return result;
      } catch (error) {
        if (!automatic) {
          notify.error(error instanceof Error ? error.message : "Failed to initialize plan days.");
        }
        return null;
      } finally {
        setSyncingDays(false);
      }
    },
    [onDaysChange, planId, selectedPlan, syncingDays]
  );

  useEffect(() => {
    if (!selectedPlan || loading || syncingDays || isReadOnly || daysCount > 0) return;
    if (autoInitializationRef.current === planId) return;
    autoInitializationRef.current = planId;
    void syncDaysFromRange({ automatic: true });
  }, [daysCount, isReadOnly, loading, planId, selectedPlan, syncDaysFromRange, syncingDays]);

  useEffect(() => {
    if (planId !== autoInitializationRef.current && daysCount === 0) {
      autoInitializationRef.current = null;
    }
  }, [daysCount, planId]);

  return {
    syncingDays,
    syncDaysFromRange,
  };
}
