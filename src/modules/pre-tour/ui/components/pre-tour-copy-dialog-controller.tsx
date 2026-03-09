"use client";

import { useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { createPreTourRecord } from "@/modules/pre-tour/lib/pre-tour-api";
import { toIsoDateTime, toLocalDateTime } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { PreTourCopyDialog } from "@/modules/pre-tour/ui/components/pre-tour-copy-dialog";

type CopyForm = {
  planCode: string;
  title: string;
  startDate: string;
  endDate: string;
  totalNights: string;
  adults: string;
  children: string;
  infants: string;
  categoryId: string;
  operatorOrgId: string;
  marketOrgId: string;
  currencyCode: string;
  priceMode: string;
};

type PreTourCopyDialogControllerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePlan: Row | null;
  companyBaseCurrencyCode: string;
  operatorIdsByMarketId: Map<string, string[]>;
  operatorOrganizationOptions: Array<{ value: string; label: string }>;
  marketOrganizationOptions: Array<{ value: string; label: string }>;
  allTourCategoryOptions: Array<{ value: string; label: string }>;
  currencyOptions: Array<{ value: string; label: string }>;
  isReadOnly: boolean;
  clonePlanChildren: (sourcePlan: Row, newPlanId: string, codePrefix: string) => Promise<void>;
  onSuccess: () => Promise<void>;
};

const EMPTY_COPY_FORM: CopyForm = {
  planCode: "",
  title: "",
  startDate: "",
  endDate: "",
  totalNights: "0",
  adults: "1",
  children: "0",
  infants: "0",
  categoryId: "",
  operatorOrgId: "",
  marketOrgId: "",
  currencyCode: "USD",
  priceMode: "EXCLUSIVE",
};

export function PreTourCopyDialogController({
  open,
  onOpenChange,
  sourcePlan,
  companyBaseCurrencyCode,
  operatorIdsByMarketId,
  operatorOrganizationOptions,
  marketOrganizationOptions,
  allTourCategoryOptions,
  currencyOptions,
  isReadOnly,
  clonePlanChildren,
  onSuccess,
}: PreTourCopyDialogControllerProps) {
  const [copyForm, setCopyForm] = useState<CopyForm>({
    ...EMPTY_COPY_FORM,
    currencyCode: companyBaseCurrencyCode,
  });
  const [copySaving, setCopySaving] = useState(false);

  useEffect(() => {
    if (!open || !sourcePlan) return;
    const sourcePlanCode = String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR");
    const copySuffix = Date.now().toString().slice(-4);
    setCopyForm({
      planCode: `${sourcePlanCode}_COPY_${copySuffix}`.slice(0, 80),
      title: `${String(sourcePlan.title || "Pre-Tour")} (Copy)`,
      startDate: toLocalDateTime(sourcePlan.startDate),
      endDate: toLocalDateTime(sourcePlan.endDate),
      totalNights: String(Number(sourcePlan.totalNights || 0)),
      adults: String(Number(sourcePlan.adults || 1)),
      children: String(Number(sourcePlan.children || 0)),
      infants: String(Number(sourcePlan.infants || 0)),
      categoryId: String(sourcePlan.categoryId || ""),
      operatorOrgId: String(sourcePlan.operatorOrgId || ""),
      marketOrgId: String(sourcePlan.marketOrgId || ""),
      currencyCode: String(sourcePlan.currencyCode || companyBaseCurrencyCode),
      priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
    });
  }, [companyBaseCurrencyCode, open, sourcePlan]);

  const copyOperatorOptions = useMemo(() => {
    if (!copyForm.marketOrgId) return operatorOrganizationOptions;
    const allowedOperatorIds = operatorIdsByMarketId.get(copyForm.marketOrgId) ?? [];
    if (allowedOperatorIds.length === 0) return operatorOrganizationOptions;
    return operatorOrganizationOptions.filter((option) => allowedOperatorIds.includes(option.value));
  }, [copyForm.marketOrgId, operatorIdsByMarketId, operatorOrganizationOptions]);

  const hasContractForCopyMarket = useMemo(() => {
    if (!copyForm.marketOrgId) return true;
    return (operatorIdsByMarketId.get(copyForm.marketOrgId)?.length ?? 0) > 0;
  }, [copyForm.marketOrgId, operatorIdsByMarketId]);

  useEffect(() => {
    const currentOperatorOrgId = String(copyForm.operatorOrgId || "");
    if (!currentOperatorOrgId) return;
    if (copyOperatorOptions.some((option) => option.value === currentOperatorOrgId)) return;
    setCopyForm((prev) => ({ ...prev, operatorOrgId: "" }));
  }, [copyForm.operatorOrgId, copyOperatorOptions]);

  const submitCopyPlan = async () => {
    if (!sourcePlan) return;
    if (
      !copyForm.planCode.trim() ||
      !copyForm.categoryId ||
      !copyForm.operatorOrgId ||
      !copyForm.marketOrgId
    ) {
      notify.error("Plan Code, Tour Category, Operator and Market are required.");
      return;
    }

    const startIso = toIsoDateTime(copyForm.startDate);
    const endIso = toIsoDateTime(copyForm.endDate);
    if (!startIso || !endIso) {
      notify.error("Start Date and End Date are required.");
      return;
    }

    const headerPayload: Record<string, unknown> = {
      planCode: copyForm.planCode.trim().toUpperCase(),
      title: copyForm.title.trim() || "Pre-Tour",
      categoryId: copyForm.categoryId,
      operatorOrgId: copyForm.operatorOrgId,
      marketOrgId: copyForm.marketOrgId,
      status: "DRAFT",
      startDate: startIso,
      endDate: endIso,
      totalNights: Number(copyForm.totalNights || 0),
      adults: Number(copyForm.adults || 1),
      children: Number(copyForm.children || 0),
      infants: Number(copyForm.infants || 0),
      preferredLanguage: sourcePlan.preferredLanguage ?? null,
      roomPreference: sourcePlan.roomPreference ?? null,
      mealPreference: sourcePlan.mealPreference ?? null,
      notes: sourcePlan.notes ?? null,
      currencyCode: copyForm.currencyCode,
      priceMode: copyForm.priceMode,
      pricingPolicy: sourcePlan.pricingPolicy ?? null,
      baseTotal: Number(sourcePlan.baseTotal || 0),
      taxTotal: Number(sourcePlan.taxTotal || 0),
      grandTotal: Number(sourcePlan.grandTotal || 0),
      version: 1,
      isLocked: false,
      isActive: Boolean(sourcePlan.isActive ?? true),
    };

    setCopySaving(true);
    try {
      const createdPlan = await createPreTourRecord("pre-tours", headerPayload);
      await clonePlanChildren(sourcePlan, String(createdPlan.id), copyForm.planCode.trim().toUpperCase());
      notify.success("Pre-tour copied successfully.");
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to copy pre-tour.");
    } finally {
      setCopySaving(false);
    }
  };

  return (
    <PreTourCopyDialog
      open={open}
      onOpenChange={onOpenChange}
      copyForm={copyForm}
      setCopyForm={(updater) => setCopyForm((prev) => updater(prev))}
      allTourCategoryOptions={allTourCategoryOptions}
      marketOrganizationOptions={marketOrganizationOptions}
      copyOperatorOptions={copyOperatorOptions}
      hasContractForCopyMarket={hasContractForCopyMarket}
      currencyOptions={currencyOptions}
      copySaving={copySaving}
      isReadOnly={isReadOnly}
      onSubmit={() => void submitCopyPlan()}
    />
  );
}
