"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { buildAutoCode, getAutoCodeFieldKey, getAutoCodeHint } from "@/modules/pre-tour/lib/pre-tour-code-generator";
import { META } from "@/modules/pre-tour/shared/pre-tour-management-constants";
import type { Field, PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { EMPTY_DAY_TRANSPORT_FORM, type DayTransportForm } from "@/modules/pre-tour/ui/lib/pre-tour-form-config";
import { PreTourRecordForm } from "@/modules/pre-tour/ui/components/pre-tour-record-form";

type PreTourRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  resource: PreTourResourceKey;
  row: Row | null;
  isReadOnly: boolean;
  saving: boolean;
  visibleFields: Field[];
  buildVisibleFields?: (form: Row) => Field[];
  initialForm: Row;
  initialDayTransportForm?: DayTransportForm;
  selectedDialogMarketOrgId: string;
  hasContractForSelectedDialogMarket: boolean;
  getHasContractForSelectedDialogMarket?: (form: Row) => boolean;
  selectedPreTourItemType: string;
  lookupLabel: (id: unknown) => string;
  transportVehicleOptions: Array<{ value: string; label: string }>;
  onSubmit: (payload: { form: Row; dayTransportForm: DayTransportForm }) => void;
};

export function PreTourRecordDialog({
  open,
  onOpenChange,
  mode,
  resource,
  row,
  isReadOnly,
  saving,
  visibleFields,
  buildVisibleFields,
  initialForm,
  initialDayTransportForm,
  selectedDialogMarketOrgId,
  hasContractForSelectedDialogMarket,
  getHasContractForSelectedDialogMarket,
  selectedPreTourItemType,
  lookupLabel,
  transportVehicleOptions,
  onSubmit,
}: PreTourRecordDialogProps) {
  const [form, setForm] = useState<Row>(initialForm);
  const [dayTransportForm, setDayTransportForm] = useState<DayTransportForm>(
    initialDayTransportForm ?? EMPTY_DAY_TRANSPORT_FORM
  );
  const autoCodeFieldKey = useMemo(() => getAutoCodeFieldKey(resource), [resource]);
  const [autoCodeEnabled, setAutoCodeEnabled] = useState(
    mode === "create" && Boolean(autoCodeFieldKey)
  );

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setDayTransportForm(initialDayTransportForm ?? EMPTY_DAY_TRANSPORT_FORM);
    const initialCodeValue =
      autoCodeFieldKey && mode === "create"
        ? String(initialForm[autoCodeFieldKey] ?? "").trim()
        : "";
    setAutoCodeEnabled(mode === "create" && Boolean(autoCodeFieldKey) && initialCodeValue.length === 0);
  }, [autoCodeFieldKey, initialDayTransportForm, initialForm, mode, open]);

  const generatedCode = useMemo(() => {
    if (!autoCodeFieldKey || mode !== "create") return "";
    return buildAutoCode(resource, form);
  }, [autoCodeFieldKey, form, mode, resource]);

  useEffect(() => {
    if (!open || mode !== "create" || !autoCodeFieldKey || !autoCodeEnabled || !generatedCode) return;
    setForm((current) => {
      if (String(current[autoCodeFieldKey] ?? "") === generatedCode) return current;
      return { ...current, [autoCodeFieldKey]: generatedCode };
    });
  }, [autoCodeEnabled, autoCodeFieldKey, generatedCode, mode, open]);

  const resolvedSelectedDialogMarketOrgId =
    resource === "pre-tours"
      ? String(form.marketOrgId ?? selectedDialogMarketOrgId ?? "")
      : selectedDialogMarketOrgId;
  const resolvedSelectedPreTourItemType =
    resource === "pre-tour-items"
      ? String(form.itemType ?? selectedPreTourItemType ?? "").toUpperCase()
      : selectedPreTourItemType;
  const resolvedVisibleFields = buildVisibleFields ? buildVisibleFields(form) : visibleFields;
  const resolvedHasContractForSelectedDialogMarket = getHasContractForSelectedDialogMarket
    ? getHasContractForSelectedDialogMarket(form)
    : hasContractForSelectedDialogMarket;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[90vh] flex-col ${resource === "pre-tour-days" ? "sm:max-w-6xl" : "sm:max-w-4xl"}`}
      >
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add" : "Edit"} {META[resource].title}</DialogTitle>
          <DialogDescription>Fill required fields and save.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-y-auto pr-2">
          <PreTourRecordForm
            resource={resource}
            visibleFields={resolvedVisibleFields}
            form={form}
            setForm={setForm}
            selectedDialogMarketOrgId={resolvedSelectedDialogMarketOrgId}
            hasContractForSelectedDialogMarket={resolvedHasContractForSelectedDialogMarket}
            selectedPreTourItemType={resolvedSelectedPreTourItemType}
            lookupLabel={lookupLabel}
            dayTransportForm={dayTransportForm}
            setDayTransportForm={setDayTransportForm}
            transportVehicleOptions={transportVehicleOptions}
            autoCodeFieldKey={mode === "create" ? autoCodeFieldKey : null}
            autoCodeEnabled={autoCodeEnabled}
            onAutoCodeEnabledChange={setAutoCodeEnabled}
            autoCodeHint={getAutoCodeHint(resource)}
            generatedCode={generatedCode}
          />
        </div>

        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit({ form, dayTransportForm })} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
