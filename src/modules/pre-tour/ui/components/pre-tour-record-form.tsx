"use client";

import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  PRE_TOUR_DAY_FORM_GROUPS,
  PRE_TOUR_FORM_GROUPS,
} from "@/modules/pre-tour/ui/views/pre-tour-management/constants";
import type { Field, PreTourResourceKey, Row } from "@/modules/pre-tour/ui/views/pre-tour-management/types";
import { formatDate, toNightCount } from "@/modules/pre-tour/ui/views/pre-tour-management/utils";

type DayTransportForm = {
  enabled: boolean;
  serviceId: string;
  startAt: string;
  endAt: string;
  pax: string;
  baseAmount: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  notes: string;
};

type PreTourRecordFormProps = {
  resource: PreTourResourceKey;
  visibleFields: Field[];
  form: Row;
  setForm: Dispatch<SetStateAction<Row>>;
  selectedDialogMarketOrgId: string;
  hasContractForSelectedDialogMarket: boolean;
  selectedPreTourItemType: string;
  lookupLabel: (id: unknown) => string;
  dayTransportForm: DayTransportForm;
  setDayTransportForm: Dispatch<SetStateAction<DayTransportForm>>;
  transportVehicleOptions: Array<{ value: string; label: string }>;
};

export function PreTourRecordForm({
  resource,
  visibleFields,
  form,
  setForm,
  selectedDialogMarketOrgId,
  hasContractForSelectedDialogMarket,
  selectedPreTourItemType,
  lookupLabel,
  dayTransportForm,
  setDayTransportForm,
  transportVehicleOptions,
}: PreTourRecordFormProps) {
  const renderField = (field: Field) => (
    <div
      key={field.key}
      className={field.type === "textarea" || field.type === "json" ? "md:col-span-2" : ""}
    >
      <Label className="mb-1 block text-xs font-medium">
        {field.label}
        {field.required ? " *" : ""}
      </Label>

      {field.type === "boolean" ? (
        <div className="flex h-9 items-center justify-between rounded-md border px-3">
          <span className="text-xs text-muted-foreground">
            {Boolean(form[field.key]) ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={Boolean(form[field.key])}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [field.key]: checked }))}
          />
        </div>
      ) : null}

      {field.type === "select" ? (
        <>
          <Select
            value={
              field.nullable
                ? form[field.key]
                  ? String(form[field.key])
                  : "__none__"
                : String(form[field.key] ?? "")
            }
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                ...(field.key === "typeId" ? { categoryId: "" } : {}),
                [field.key]: field.nullable && value === "__none__" ? "" : value,
              }))
            }
            disabled={resource === "pre-tours" && field.key === "operatorOrgId" && !selectedDialogMarketOrgId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  resource === "pre-tours" && field.key === "operatorOrgId" && !selectedDialogMarketOrgId
                    ? "Select market first"
                    : `Select ${field.label}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
              {(field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resource === "pre-tours" && field.key === "operatorOrgId" && !selectedDialogMarketOrgId ? (
            <p className="mt-1 text-xs text-muted-foreground">Select a market to load relevant operators.</p>
          ) : null}
          {resource === "pre-tours" &&
          field.key === "operatorOrgId" &&
          selectedDialogMarketOrgId &&
          !hasContractForSelectedDialogMarket ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No active contracts for selected market. Showing all operators.
            </p>
          ) : null}
          {resource === "pre-tour-items" &&
          field.key === "serviceId" &&
          selectedPreTourItemType === "ACCOMMODATION" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Hotels are filtered by active status and tour category star rule. Room/meal preferences from pre-tour
              header are auto-applied to allocation.
            </p>
          ) : null}
        </>
      ) : null}

      {field.type === "text" ? (
        <Input
          value={String(form[field.key] ?? "")}
          onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
        />
      ) : null}

      {field.type === "number" ? (
        <Input
          type="number"
          value={String(form[field.key] ?? "")}
          readOnly={resource === "pre-tours" && field.key === "totalNights"}
          className={resource === "pre-tours" && field.key === "totalNights" ? "bg-muted/30 text-muted-foreground" : undefined}
          onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
        />
      ) : null}

      {field.type === "datetime" ? (
        <Input
          type="datetime-local"
          value={String(form[field.key] ?? "")}
          onChange={(event) => {
            const nextValue = event.target.value;
            setForm((prev) => {
              const next: Row = { ...prev, [field.key]: nextValue };
              if (resource === "pre-tours" && (field.key === "startDate" || field.key === "endDate")) {
                const startDate = String(field.key === "startDate" ? nextValue : next.startDate ?? "");
                const endDate = String(field.key === "endDate" ? nextValue : next.endDate ?? "");
                next.totalNights = String(toNightCount(startDate, endDate));
              }
              return next;
            });
          }}
        />
      ) : null}

      {field.type === "json" ? (
        <Textarea
          value={String(form[field.key] ?? "")}
          onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
          className="min-h-[120px] font-mono text-xs"
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          value={String(form[field.key] ?? "")}
          onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
          className="min-h-[100px]"
        />
      ) : null}
    </div>
  );

  const renderDayTransport = () => {
    if (resource !== "pre-tour-days") return null;
    return (
      <div className="mt-3 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Day Transport Plan</p>
            <p className="text-xs text-muted-foreground">
              Optional transport baseline for this day. It will save as the day transport record.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
            <span className="text-xs text-muted-foreground">{dayTransportForm.enabled ? "Enabled" : "Disabled"}</span>
            <Switch
              checked={dayTransportForm.enabled}
              onCheckedChange={(checked) => setDayTransportForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        {dayTransportForm.enabled ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service & Schedule</p>
              <div className="grid gap-2.5 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium">Vehicle Type *</Label>
                  <Select
                    value={dayTransportForm.serviceId || "__none__"}
                    onValueChange={(value) =>
                      setDayTransportForm((prev) => ({ ...prev, serviceId: value === "__none__" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {transportVehicleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">Status</Label>
                  <Select
                    value={dayTransportForm.status}
                    onValueChange={(value) => setDayTransportForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">PLANNED</SelectItem>
                      <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                      <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={dayTransportForm.startAt}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={dayTransportForm.endAt}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">Pax</Label>
                  <Input
                    type="number"
                    value={dayTransportForm.pax}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, pax: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Costing</p>
              <div className="grid gap-2.5 md:grid-cols-3">
                <div>
                  <Label className="mb-1 block text-xs font-medium">Base Amount</Label>
                  <Input
                    type="number"
                    value={dayTransportForm.baseAmount}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, baseAmount: event.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">Tax Amount</Label>
                  <Input
                    type="number"
                    value={dayTransportForm.taxAmount}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, taxAmount: event.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium">Total Amount</Label>
                  <Input
                    type="number"
                    value={dayTransportForm.totalAmount}
                    onChange={(event) => setDayTransportForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <Label className="mb-1 block text-xs font-medium">Transport Notes</Label>
              <Textarea
                value={dayTransportForm.notes}
                onChange={(event) => setDayTransportForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px]"
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (resource === "pre-tour-days") {
    const groupedKeys = new Set(PRE_TOUR_DAY_FORM_GROUPS.flatMap((group) => group.keys));
    const ungroupedFields = visibleFields.filter((field) => !groupedKeys.has(field.key));
    const currentDayNumber = String(form.dayNumber ?? "-");
    const currentDayDate = String(form.date ?? "");
    const currentRoute = `${lookupLabel(form.startLocationId) || "-"} -> ${lookupLabel(form.endLocationId) || "-"}`;

    return (
      <>
        <div className="grid gap-3 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-8">
            {PRE_TOUR_DAY_FORM_GROUPS.map((group) => {
              const groupFields = group.keys
                .map((key) => visibleFields.find((field) => field.key === key))
                .filter((field): field is Field => Boolean(field));
              if (groupFields.length === 0) return null;

              return (
                <div key={group.title} className="rounded-xl border border-border/70 bg-card p-3.5">
                  <div className="mb-2.5">
                    <p className="text-sm font-semibold">{group.title}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-2">{groupFields.map(renderField)}</div>
                </div>
              );
            })}
            {ungroupedFields.length > 0 ? (
              <div className="rounded-xl border border-border/70 bg-card p-3.5">
                <div className="grid gap-2.5 md:grid-cols-2">{ungroupedFields.map(renderField)}</div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 xl:col-span-4">
            <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day Snapshot</p>
              <div className="mt-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Day</span>
                  <Badge variant="outline" className="font-medium">{`Day ${currentDayNumber}`}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Date</p>
                  <p className="rounded-md bg-background px-2 py-1.5 text-foreground">
                    {currentDayDate ? formatDate(currentDayDate) : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Route</p>
                  <p className="rounded-md bg-background px-2 py-1.5 text-foreground">{currentRoute}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={Boolean(form.isActive ?? true) ? "default" : "secondary"}>
                    {Boolean(form.isActive ?? true) ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderDayTransport()}
      </>
    );
  }

  if (resource !== "pre-tours") {
    return <div className="grid gap-2 md:grid-cols-2">{visibleFields.map(renderField)}</div>;
  }

  const groupedKeys = new Set(PRE_TOUR_FORM_GROUPS.flatMap((group) => group.keys));
  const ungroupedFields = visibleFields.filter((field) => !groupedKeys.has(field.key));

  return (
    <div className="space-y-4">
      {PRE_TOUR_FORM_GROUPS.map((group) => {
        const groupFields = group.keys
          .map((key) => visibleFields.find((field) => field.key === key))
          .filter((field): field is Field => Boolean(field));
        if (groupFields.length === 0) return null;

        return (
          <div key={group.title} className="rounded-md border p-3">
            <div className="mb-3">
              <p className="text-sm font-semibold">{group.title}</p>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">{groupFields.map(renderField)}</div>
          </div>
        );
      })}
      {ungroupedFields.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">{ungroupedFields.map(renderField)}</div>
      ) : null}
    </div>
  );
}

