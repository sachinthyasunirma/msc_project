"use client";

import { useCallback, useState } from "react";
import { notify } from "@/lib/notify";
import {
  copyPreTourPlanChildren,
  createPreTourVersion,
} from "@/modules/pre-tour/lib/pre-tour-api";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type UsePreTourPlanOperationsParams = {
  onSuccess: () => Promise<void>;
};

export function usePreTourPlanOperations({ onSuccess }: UsePreTourPlanOperationsParams) {
  const [creatingVersion, setCreatingVersion] = useState(false);

  const clonePlanChildren = useCallback(
    async (sourcePlan: Row, newPlanId: string, codePrefix: string) => {
      await copyPreTourPlanChildren({
        sourcePlanId: String(sourcePlan.id),
        targetPlanId: newPlanId,
        codePrefix,
      });
    },
    []
  );

  const createVersionFromPlan = useCallback(
    async (sourcePlan: Row) => {
      if (!sourcePlan.categoryId || !sourcePlan.operatorOrgId || !sourcePlan.marketOrgId) {
        notify.error("Source pre-tour must have Category, Operator and Market before creating a version.");
        return;
      }

      setCreatingVersion(true);
      try {
        const createdPlan = await createPreTourVersion(String(sourcePlan.id));
        notify.success(
          `Version V${String(createdPlan.version ?? "").trim() || "new"} created.`
        );
        await onSuccess();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setCreatingVersion(false);
      }
    },
    [onSuccess]
  );

  return { clonePlanChildren, createVersionFromPlan, creatingVersion };
}
