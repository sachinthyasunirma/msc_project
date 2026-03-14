"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { guideImportConfig } from "@/components/batch-import/master-batch-import-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createGuideRecord } from "@/modules/guides/lib/guides-api";
import { useGuidesManagement } from "@/modules/guides/lib/use-guides-management";
import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";

const MasterBatchImportDialog = dynamic(
  () =>
    import("@/components/batch-import/master-batch-import-dialog").then(
      (module) => module.MasterBatchImportDialog
    ),
  { ssr: false }
);

const META: Record<GuideResourceKey, { title: string; description: string }> = {
  guides: { title: "Guides", description: "Manage guide profiles and professional information." },
  languages: { title: "Languages", description: "Manage language master for guide skills." },
  "guide-languages": { title: "Guide Languages", description: "Map guide language proficiency." },
  "guide-coverage-areas": { title: "Coverage Areas", description: "Map guide service coverage locations." },
  "guide-licenses": { title: "Licenses", description: "Manage guide license and verification data." },
  "guide-certifications": { title: "Certifications", description: "Track certifications and validity windows." },
  "guide-documents": { title: "Documents", description: "Store guide document metadata and file URLs." },
  "guide-weekly-availability": { title: "Weekly Availability", description: "Configure weekly guide availability slots." },
  "guide-blackout-dates": { title: "Blackout Dates", description: "Track blocked/unavailable date ranges." },
  "guide-rates": { title: "Guide Rates", description: "Manage guide pricing rules and effective windows." },
  "guide-assignments": { title: "Assignments", description: "Track booking-level guide assignments and amount snapshot." },
};

const COLUMNS: Record<GuideResourceKey, Array<{ key: string; label: string }>> = {
  guides: [{ key: "code", label: "Code" }, { key: "fullName", label: "Full Name" }, { key: "guideType", label: "Type" }, { key: "yearsExperience", label: "Exp" }, { key: "isActive", label: "Status" }],
  languages: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "isActive", label: "Status" }],
  "guide-languages": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "languageId", label: "Language" }, { key: "proficiency", label: "Proficiency" }],
  "guide-coverage-areas": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "locationId", label: "Location" }, { key: "coverageType", label: "Type" }],
  "guide-licenses": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "licenseType", label: "License Type" }, { key: "isVerified", label: "Verified" }],
  "guide-certifications": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "name", label: "Name" }, { key: "provider", label: "Provider" }],
  "guide-documents": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "docType", label: "Doc Type" }, { key: "isActive", label: "Status" }],
  "guide-weekly-availability": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "weekday", label: "Weekday" }, { key: "isAvailable", label: "Available" }],
  "guide-blackout-dates": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "startAt", label: "Start" }, { key: "endAt", label: "End" }],
  "guide-rates": [{ key: "code", label: "Code" }, { key: "guideId", label: "Guide" }, { key: "rateName", label: "Rate" }, { key: "pricingModel", label: "Model" }, { key: "isActive", label: "Status" }],
  "guide-assignments": [{ key: "code", label: "Code" }, { key: "bookingId", label: "Booking" }, { key: "guideId", label: "Guide" }, { key: "status", label: "Status" }, { key: "totalAmount", label: "Total" }],
};

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getBooleanMeta(fieldKey: string, value: boolean) {
  switch (fieldKey) {
    case "isActive":
      return { text: value ? "Active" : "Inactive", active: value };
    case "isAvailable":
      return { text: value ? "Available" : "Unavailable", active: value };
    case "isVerified":
      return { text: value ? "Verified" : "Unverified", active: value };
    default:
      return { text: value ? "Yes" : "No", active: value };
  }
}

type GuidesManagementSectionProps = {
  initialResource?: GuideResourceKey;
  managedGuideId?: string;
  initialData?: GuidesManagementInitialData | null;
  isReadOnly: boolean;
};

export function GuidesManagementSection({
  initialResource = "guides",
  managedGuideId = "",
  initialData = null,
  isReadOnly,
}: GuidesManagementSectionProps) {
  const state = useGuidesManagement({
    initialResource,
    managedGuideId,
    initialData,
    isReadOnly,
  });

  const batchConfig = useMemo(
    () => ({
      ...guideImportConfig,
      fields: guideImportConfig.fields.map((field) =>
        field.key === "baseCurrencyCode"
          ? {
              ...field,
              options: state.currencies.map((item) => ({
                value: String(item.code ?? "").trim().toUpperCase(),
                label: `${String(item.code ?? "").trim().toUpperCase()} - ${String(item.name ?? "")}`,
              })),
            }
          : field
      ),
      lookupHints: [
        {
          label: "Available Currency Codes",
          values: state.currencies
            .map((item) => String(item.code ?? "").trim().toUpperCase())
            .filter((value) => value.length > 0)
            .slice(0, 20),
        },
      ],
    }),
    [state.currencies]
  );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[state.resource].title}</CardTitle>
            <CardDescription>
              {META[state.resource].description}
              {state.isGuideManageMode && state.managedGuide
                ? ` Managing: ${state.managedGuide.code} - ${state.managedGuide.fullName}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {state.isGuideManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/guides">Back to Guides</Link>
              </Button>
            ) : null}
            <Button variant="outline" className="master-refresh-btn" onClick={() => void state.refreshAll()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {!state.isGuideManageMode && state.resource === "guides" ? (
              <Button variant="outline" onClick={() => state.setBatchOpen(true)}>
                Batch Upload
              </Button>
            ) : null}
            <Button onClick={() => state.openDialog("create")} disabled={isReadOnly} className="master-add-btn">
              <Plus className="mr-2 size-4" />
              Add Record
            </Button>
          </div>
        </div>
        <Tabs value={state.resource} onValueChange={(value) => state.setResource(value as GuideResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {state.visibleResources.map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key].title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input value={state.query} onChange={(e) => state.setQuery(e.target.value)} placeholder="Search..." className="max-w-md" />
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS[state.resource].map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.loading ? (
              <TableLoadingRow
                colSpan={COLUMNS[state.resource].length + 1}
                title="Aligning guide operations"
                description="Loading guide profiles, coverage, and commercial records."
              />
            ) : state.records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[state.resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              state.pagedRecords.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[state.resource].map((column) => (
                    <TableCell key={column.key}>
                      {typeof row[column.key] === "boolean" ? (
                        <Badge
                          variant={
                            getBooleanMeta(column.key, Boolean(row[column.key])).active
                              ? "default"
                              : "secondary"
                          }
                        >
                          {getBooleanMeta(column.key, Boolean(row[column.key])).text}
                        </Badge>
                      ) : (
                        formatCell(row[column.key], state.lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {state.resource === "guides" && row.id ? (
                        <Button size="sm" variant="outline" className="master-manage-btn" asChild>
                          <Link href={`/master-data/guides/manage/${row.id}`}>
                            <Settings2 className="mr-1 size-4" />
                            Manage
                          </Link>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => state.openDialog("edit", row)}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void state.onDelete(row)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!state.loading && state.records.length > 0 ? (
          <TablePagination
            totalItems={state.records.length}
            page={state.currentPage}
            pageSize={state.pageSize}
            onPageChange={state.setCurrentPage}
            onPageSizeChange={state.setPageSize}
          />
        ) : null}
      </CardContent>

      <Dialog open={state.dialog.open} onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {state.dialog.mode === "create" ? "Add" : "Edit"} {META[state.resource].title}
            </DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {state.visibleFields.map((field) => (
              <div key={field.key} className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}>
                <Label>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={String(state.form[field.key] ?? (field.nullable ? "__none__" : ""))}
                    onValueChange={(value) =>
                      state.setForm((prev) => ({
                        ...prev,
                        [field.key]: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-muted-foreground text-xs">
                      {getBooleanMeta(field.key, Boolean(state.form[field.key])).text}
                    </span>
                    <Switch
                      checked={Boolean(state.form[field.key])}
                      onCheckedChange={(checked) =>
                        state.setForm((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ) : field.type === "json" ? (
                  <Textarea
                    value={String(state.form[field.key] ?? "")}
                    onChange={(e) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "datetime"
                          ? "datetime-local"
                          : "text"
                    }
                    value={String(state.form[field.key] ?? "")}
                    onChange={(e) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={state.dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => state.setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button onClick={() => void state.onSubmit()} disabled={state.saving || (isReadOnly && state.dialog.mode === "create")}>
              {state.saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MasterBatchImportDialog
        open={state.batchOpen}
        onOpenChange={state.setBatchOpen}
        config={batchConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode: new Map(),
          currencyByCode: state.currencyByCode,
          vehicleCategoryByCode: new Map(),
          vehicleTypeByCode: new Map(),
          vehicleTypeCategoryCodeByCode: new Map(),
        }}
        existingCodes={state.guideExistingCodes}
        onRefreshExistingCodes={state.refreshGuideExistingCodes}
        onUploadRow={async (payload) => {
          await createGuideRecord("guides", payload);
        }}
        onCompleted={async () => {
          await state.refreshAll();
        }}
      />
    </Card>
  );
}
