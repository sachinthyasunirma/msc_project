"use client";

import { useCallback, useState } from "react";
import { notify } from "@/lib/notify";
import {
  createPreTourRecord,
  createPreTourVersion,
  listPreTourRecords,
} from "@/modules/pre-tour/lib/pre-tour-api";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type UsePreTourPlanOperationsParams = {
  canViewCosting: boolean;
  companyBaseCurrencyCode: string;
  onSuccess: () => Promise<void>;
};

export function usePreTourPlanOperations({
  canViewCosting,
  companyBaseCurrencyCode,
  onSuccess,
}: UsePreTourPlanOperationsParams) {
  const [creatingVersion, setCreatingVersion] = useState(false);

  const clonePlanChildren = useCallback(
    async (sourcePlan: Row, newPlanId: string, codePrefix: string) => {
      const sourcePlanId = String(sourcePlan.id);
      const [sourceDays, sourceItems, sourceGuideAllocations, sourceAddons, sourceTotals, sourceCategories, sourceTechnicalVisits] =
        await Promise.all([
          listPreTourRecords("pre-tour-days", { planId: sourcePlanId, limit: 1000 }),
          listPreTourRecords("pre-tour-items", { planId: sourcePlanId, limit: 2000 }),
          listPreTourRecords("pre-tour-guide-allocations", { planId: sourcePlanId, limit: 500 }),
          listPreTourRecords("pre-tour-item-addons", { planId: sourcePlanId, limit: 2000 }),
          canViewCosting
            ? listPreTourRecords("pre-tour-totals", { planId: sourcePlanId, limit: 10 })
            : Promise.resolve([] as Row[]),
          listPreTourRecords("pre-tour-categories", { planId: sourcePlanId, limit: 200 }),
          listPreTourRecords("pre-tour-technical-visits", { planId: sourcePlanId, limit: 200 }),
        ]);

      const dayIdMap = new Map<string, string>();
      const sortedSourceDays = [...sourceDays].sort((a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0));
      for (const sourceDay of sortedSourceDays) {
        const dayNumber = Number(sourceDay.dayNumber || 1);
        const createdDay = await createPreTourRecord("pre-tour-days", {
          code: `${codePrefix}_DAY_${String(dayNumber).padStart(2, "0")}`.slice(0, 80),
          planId: newPlanId,
          dayNumber,
          date: new Date(String(sourceDay.date)).toISOString(),
          title: sourceDay.title ?? null,
          notes: sourceDay.notes ?? null,
          startLocationId: sourceDay.startLocationId ?? null,
          endLocationId: sourceDay.endLocationId ?? null,
          isActive: Boolean(sourceDay.isActive ?? true),
        });
        dayIdMap.set(String(sourceDay.id), String(createdDay.id));
      }

      const itemIdMap = new Map<string, string>();
      const sortedSourceItems = [...sourceItems].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      for (const sourceItem of sortedSourceItems) {
        const mappedDayId = dayIdMap.get(String(sourceItem.dayId));
        if (!mappedDayId) continue;
        const createdItem = await createPreTourRecord("pre-tour-items", {
          code: `${codePrefix}_ITEM_${String(sourceItem.sortOrder || 0)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId,
          itemType: String(sourceItem.itemType || "MISC"),
          serviceId: sourceItem.serviceId ?? null,
          startAt: sourceItem.startAt ? new Date(String(sourceItem.startAt)).toISOString() : null,
          endAt: sourceItem.endAt ? new Date(String(sourceItem.endAt)).toISOString() : null,
          sortOrder: Number(sourceItem.sortOrder || 0),
          pax: sourceItem.pax ?? null,
          units: sourceItem.units ?? null,
          nights: sourceItem.nights ?? null,
          rooms: sourceItem.rooms ?? null,
          fromLocationId: sourceItem.fromLocationId ?? null,
          toLocationId: sourceItem.toLocationId ?? null,
          locationId: sourceItem.locationId ?? null,
          rateId: sourceItem.rateId ?? null,
          currencyCode: String(sourceItem.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode),
          priceMode: String(sourceItem.priceMode || sourcePlan.priceMode || "EXCLUSIVE"),
          baseAmount: Number(sourceItem.baseAmount || 0),
          taxAmount: Number(sourceItem.taxAmount || 0),
          totalAmount: Number(sourceItem.totalAmount || 0),
          pricingSnapshot: sourceItem.pricingSnapshot ?? null,
          title: sourceItem.title ?? null,
          description: sourceItem.description ?? null,
          notes: sourceItem.notes ?? null,
          status: String(sourceItem.status || "PLANNED"),
          isActive: Boolean(sourceItem.isActive ?? true),
        });
        itemIdMap.set(String(sourceItem.id), String(createdItem.id));
      }

      for (const sourceAddon of sourceAddons) {
        const mappedItemId = itemIdMap.get(String(sourceAddon.planItemId));
        if (!mappedItemId) continue;
        await createPreTourRecord("pre-tour-item-addons", {
          code: `${codePrefix}_ADDON_${String(sourceAddon.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          planItemId: mappedItemId,
          addonType: String(sourceAddon.addonType || "SUPPLEMENT"),
          addonServiceId: sourceAddon.addonServiceId ?? null,
          title: sourceAddon.title ?? null,
          qty: Number(sourceAddon.qty || 1),
          currencyCode: String(sourceAddon.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode),
          baseAmount: Number(sourceAddon.baseAmount || 0),
          taxAmount: Number(sourceAddon.taxAmount || 0),
          totalAmount: Number(sourceAddon.totalAmount || 0),
          snapshot: sourceAddon.snapshot ?? null,
          isActive: Boolean(sourceAddon.isActive ?? true),
        });
      }

      for (const sourceGuideAllocation of sourceGuideAllocations) {
        await createPreTourRecord("pre-tour-guide-allocations", {
          code: `${codePrefix}_GUIDE_${String(sourceGuideAllocation.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          serviceId: sourceGuideAllocation.serviceId ?? null,
          coverageMode: String(sourceGuideAllocation.coverageMode || "FULL_TOUR"),
          startDayId: sourceGuideAllocation.startDayId
            ? (dayIdMap.get(String(sourceGuideAllocation.startDayId)) ?? null)
            : null,
          endDayId: sourceGuideAllocation.endDayId
            ? (dayIdMap.get(String(sourceGuideAllocation.endDayId)) ?? null)
            : null,
          language: sourceGuideAllocation.language ?? null,
          guideBasis: sourceGuideAllocation.guideBasis ?? null,
          pax: sourceGuideAllocation.pax ?? null,
          units: sourceGuideAllocation.units ?? 1,
          rateId: sourceGuideAllocation.rateId ?? null,
          currencyCode: String(
            sourceGuideAllocation.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
          priceMode: String(sourceGuideAllocation.priceMode || "EXCLUSIVE"),
          baseAmount: Number(sourceGuideAllocation.baseAmount || 0),
          taxAmount: Number(sourceGuideAllocation.taxAmount || 0),
          totalAmount: Number(sourceGuideAllocation.totalAmount || 0),
          pricingSnapshot: sourceGuideAllocation.pricingSnapshot ?? null,
          title: sourceGuideAllocation.title ?? null,
          notes: sourceGuideAllocation.notes ?? null,
          status: String(sourceGuideAllocation.status || "PLANNED"),
          isActive: Boolean(sourceGuideAllocation.isActive ?? true),
        });
      }

      for (const sourceTotal of sourceTotals) {
        await createPreTourRecord("pre-tour-totals", {
          code: `${codePrefix}_TOTAL`.slice(0, 80),
          planId: newPlanId,
          currencyCode: String(sourceTotal.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode),
          totalsByType: sourceTotal.totalsByType ?? null,
          baseTotal: Number(sourceTotal.baseTotal || 0),
          taxTotal: Number(sourceTotal.taxTotal || 0),
          grandTotal: Number(sourceTotal.grandTotal || 0),
          snapshot: sourceTotal.snapshot ?? null,
          isActive: Boolean(sourceTotal.isActive ?? true),
        });
      }

      for (const sourceCategory of sourceCategories) {
        if (!sourceCategory.typeId || !sourceCategory.categoryId) continue;
        await createPreTourRecord("pre-tour-categories", {
          code: `${codePrefix}_CAT_${String(sourceCategory.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          typeId: String(sourceCategory.typeId),
          categoryId: String(sourceCategory.categoryId),
          notes: sourceCategory.notes ?? null,
          isActive: Boolean(sourceCategory.isActive ?? true),
        });
      }

      for (const sourceTechnicalVisit of sourceTechnicalVisits) {
        if (!sourceTechnicalVisit.technicalVisitId) continue;
        const mappedDayId = sourceTechnicalVisit.dayId ? dayIdMap.get(String(sourceTechnicalVisit.dayId)) : null;
        await createPreTourRecord("pre-tour-technical-visits", {
          code: `${codePrefix}_TV_${String(sourceTechnicalVisit.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId ?? null,
          technicalVisitId: String(sourceTechnicalVisit.technicalVisitId),
          notes: sourceTechnicalVisit.notes ?? null,
          isActive: Boolean(sourceTechnicalVisit.isActive ?? true),
        });
      }
    },
    [canViewCosting, companyBaseCurrencyCode]
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
