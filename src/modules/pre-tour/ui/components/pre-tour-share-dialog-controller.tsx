"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { createPreTourRecord } from "@/modules/pre-tour/lib/pre-tour-api";
import { sanitizeCodePart } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { PreTourShareDialog } from "@/modules/pre-tour/ui/components/pre-tour-share-dialog";

type PreTourShareDialogControllerProps = {
  sharingItem: Row | null;
  onClose: () => void;
  dayOptions: Array<{ value: string; label: string }>;
  sortedDays: Row[];
  managedPlanId: string;
  selectedPlan: Row | null;
  companyBaseCurrencyCode: string;
  isReadOnly: boolean;
  onSuccess: () => Promise<void>;
};

export function PreTourShareDialogController({
  sharingItem,
  onClose,
  dayOptions,
  sortedDays,
  managedPlanId,
  selectedPlan,
  companyBaseCurrencyCode,
  isReadOnly,
  onSuccess,
}: PreTourShareDialogControllerProps) {
  const [shareTargetDayId, setShareTargetDayId] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (sharingItem) setShareTargetDayId("");
  }, [sharingItem]);

  const shareItemToDay = async () => {
    if (!sharingItem || !shareTargetDayId) {
      notify.error("Select a target day.");
      return;
    }

    const targetDay = sortedDays.find((day) => String(day.id) === shareTargetDayId);
    const dayNum = Number(targetDay?.dayNumber ?? 0);
    const sourceCode = sanitizeCodePart(String(sharingItem.code || "ITEM"));
    const code = `${sourceCode}_D${String(dayNum || 0).padStart(2, "0")}_${Date.now().toString().slice(-4)}`;

    const payload: Record<string, unknown> = {
      code: code.slice(0, 80),
      planId: managedPlanId,
      dayId: shareTargetDayId,
      itemType: String(sharingItem.itemType || "MISC"),
      serviceId: sharingItem.serviceId ?? null,
      startAt: sharingItem.startAt ? new Date(String(sharingItem.startAt)).toISOString() : null,
      endAt: sharingItem.endAt ? new Date(String(sharingItem.endAt)).toISOString() : null,
      sortOrder: Number(sharingItem.sortOrder ?? 0),
      pax: sharingItem.pax ?? null,
      units: sharingItem.units ?? null,
      nights: sharingItem.nights ?? null,
      rooms: sharingItem.rooms ?? null,
      fromLocationId: sharingItem.fromLocationId ?? null,
      toLocationId: sharingItem.toLocationId ?? null,
      locationId: sharingItem.locationId ?? null,
      rateId: sharingItem.rateId ?? null,
      currencyCode: String(sharingItem.currencyCode || selectedPlan?.currencyCode || companyBaseCurrencyCode),
      priceMode: String(sharingItem.priceMode || selectedPlan?.priceMode || "EXCLUSIVE"),
      baseAmount: Number(sharingItem.baseAmount ?? 0),
      taxAmount: Number(sharingItem.taxAmount ?? 0),
      totalAmount: Number(sharingItem.totalAmount ?? 0),
      pricingSnapshot: sharingItem.pricingSnapshot ?? null,
      title: sharingItem.title ?? null,
      description: sharingItem.description ?? null,
      notes: sharingItem.notes ?? null,
      status: String(sharingItem.status || "PLANNED"),
      isActive: Boolean(sharingItem.isActive ?? true),
    };

    setSharing(true);
    try {
      await createPreTourRecord("pre-tour-items", payload);
      notify.success("Item shared to selected day.");
      onClose();
      await onSuccess();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to share item.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <PreTourShareDialog
      sharingItem={sharingItem}
      shareTargetDayId={shareTargetDayId}
      onShareTargetDayIdChange={setShareTargetDayId}
      dayOptions={dayOptions}
      sharing={sharing}
      isReadOnly={isReadOnly}
      onClose={onClose}
      onShare={() => void shareItemToDay()}
    />
  );
}
