"use client";

import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import { useTourCategoryManagement } from "@/modules/tour-category/lib/use-tour-category-management";
import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

const META: Record<TourCategoryResourceKey, { title: string; description: string }> = {
  "tour-category-types": {
    title: "Tour Category Types",
    description: "Define classification dimensions (theme, comfort level, travel style).",
  },
  "tour-categories": {
    title: "Tour Categories",
    description: "Define reusable values under each type.",
  },
  "tour-category-rules": {
    title: "Tour Category Rules",
    description: "Define pricing and operational rules per category.",
  },
};

const COLUMNS: Record<TourCategoryResourceKey, Array<{ key: string; label: string }>> = {
  "tour-category-types": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "allowMultiple", label: "Allow Multiple" },
    { key: "sortOrder", label: "Sort" },
    { key: "isActive", label: "Status" },
  ],
  "tour-categories": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "typeId", label: "Type" },
    { key: "parentId", label: "Parent" },
    { key: "isActive", label: "Status" },
  ],
  "tour-category-rules": [
    { key: "code", label: "Code" },
    { key: "categoryId", label: "Category" },
    { key: "requireHotel", label: "Hotel Required" },
    { key: "requireTransport", label: "Transport Required" },
    { key: "requireItinerary", label: "Itinerary Required" },
    { key: "isActive", label: "Status" },
  ],
};

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function TourCategoryManagementView({
  initialResource = "tour-category-types",
  initialData = null,
  isReadOnly: providedIsReadOnly,
}: {
  initialResource?: TourCategoryResourceKey;
  initialData?: TourCategoryManagementInitialData | null;
  isReadOnly?: boolean;
}) {
  const { isReadOnly: accessIsReadOnly } = useDashboardAccessState();
  const isReadOnly = providedIsReadOnly ?? accessIsReadOnly;
  const state = useTourCategoryManagement({ initialResource, initialData, isReadOnly });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[state.resource].title}</CardTitle>
            <CardDescription>{META[state.resource].description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="master-refresh-btn"
              onClick={() => void state.refreshAll()}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button
              onClick={() => state.openDialog("create")}
              disabled={isReadOnly}
              title={isReadOnly ? "View only mode" : undefined}
              className="master-add-btn"
            >
              <Plus className="mr-2 size-4" />
              Add Record
            </Button>
          </div>
        </div>

        <Tabs
          value={state.resource}
          onValueChange={(value) => state.setResource(value as TourCategoryResourceKey)}
        >
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {Object.keys(META).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key as TourCategoryResourceKey].title.replace("Tour ", "")}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          value={state.query}
          onChange={(event) => state.setQuery(event.target.value)}
          placeholder="Search..."
          className="max-w-md"
        />

        <div className="overflow-hidden rounded-md border">
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
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS[state.resource].length + 1}
                    className="text-center text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : state.records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS[state.resource].length + 1}
                    className="text-center text-muted-foreground"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                state.pagedRecords.map((row) => (
                  <TableRow key={String(row.id)}>
                    {COLUMNS[state.resource].map((column) => (
                      <TableCell key={column.key}>
                        {column.key === "isActive" ? (
                          <Badge variant={row.isActive ? "default" : "secondary"}>
                            {row.isActive ? "Active" : "Inactive"}
                          </Badge>
                        ) : (
                          formatCell(row[column.key], state.lookups)
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => state.openDialog("edit", row)}
                          title="Edit"
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void state.onDelete(row)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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

      <Dialog
        open={state.dialog.open}
        onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {state.dialog.mode === "create" ? "Add" : "Edit"} {META[state.resource].title}
            </DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {state.fields.map((field) => (
              <div
                key={field.key}
                className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}
              >
                <Label>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={String(state.form[field.key] ?? (field.nullable ? "__none__" : ""))}
                    onValueChange={(value) =>
                      state.setForm((prev) => ({
                        ...prev,
                        ...(state.resource === "tour-categories" && field.key === "typeId"
                          ? { parentId: "" }
                          : {}),
                        [field.key]: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {(state.resource === "tour-categories" && field.key === "parentId"
                        ? state.parentCategoryOptions
                        : field.options ?? []
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-xs text-muted-foreground">
                      {Boolean(state.form[field.key]) ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={Boolean(state.form[field.key])}
                      disabled={
                        state.resource === "tour-category-rules" &&
                        ((field.key === "allowWithoutHotel" &&
                          Boolean(state.form.requireHotel)) ||
                          (field.key === "allowWithoutTransport" &&
                            Boolean(state.form.requireTransport)))
                      }
                      onCheckedChange={(checked) =>
                        state.setForm((prev) => {
                          const next = { ...prev, [field.key]: checked };
                          if (state.resource === "tour-category-rules") {
                            if (field.key === "requireHotel" && checked) {
                              next.allowWithoutHotel = false;
                            }
                            if (field.key === "requireTransport" && checked) {
                              next.allowWithoutTransport = false;
                            }
                          }
                          return next;
                        })
                      }
                    />
                  </div>
                ) : field.type === "textarea" ? (
                  <Textarea
                    value={String(state.form[field.key] ?? "")}
                    onChange={(event) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="min-h-[92px]"
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(state.form[field.key] ?? "")}
                    onChange={(event) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
                {state.resource === "tour-category-rules" &&
                field.key === "allowWithoutHotel" &&
                Boolean(state.form.requireHotel) ? (
                  <p className="text-xs text-muted-foreground">
                    Disabled because Require Hotel is enabled.
                  </p>
                ) : null}
                {state.resource === "tour-category-rules" &&
                field.key === "allowWithoutTransport" &&
                Boolean(state.form.requireTransport) ? (
                  <p className="text-xs text-muted-foreground">
                    Disabled because Require Transport is enabled.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={state.dialog.row} className="mr-auto" />
            <Button
              variant="outline"
              onClick={() => state.setDialog({ open: false, mode: "create", row: null })}
            >
              Cancel
            </Button>
            <Button onClick={() => void state.onSave()} disabled={state.saving}>
              {state.saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
