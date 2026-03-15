"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import { useTechnicalVisitManagement } from "@/modules/technical-visit/lib/use-technical-visit-management";
import type {
  TechnicalVisitManagementInitialData,
} from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

const META: Record<TechnicalVisitResourceKey, { title: string; description: string }> = {
  "technical-visits": {
    title: "Technical Visits",
    description: "Capture supplier field visits and quality assessments.",
  },
  "technical-visit-checklists": {
    title: "Checklist",
    description: "Capture detailed checks per technical visit.",
  },
  "technical-visit-media": {
    title: "Media",
    description: "Attach evidence photos and files for each visit.",
  },
  "technical-visit-actions": {
    title: "Actions",
    description: "Follow-up actions and ownership after visit.",
  },
};

const COLUMNS: Record<TechnicalVisitResourceKey, Array<{ key: string; label: string }>> = {
  "technical-visits": [
    { key: "code", label: "Code" },
    { key: "visitType", label: "Type" },
    { key: "referenceId", label: "Reference" },
    { key: "visitDate", label: "Visit Date" },
    { key: "visitedByUserId", label: "Visited By" },
    { key: "overallRating", label: "Rating" },
    { key: "status", label: "Status" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-checklists": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "category", label: "Category" },
    { key: "item", label: "Item" },
    { key: "rating", label: "Rating" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-media": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "fileUrl", label: "File URL" },
    { key: "caption", label: "Caption" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-actions": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "action", label: "Action" },
    { key: "assignedToUserId", label: "Assigned To" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status" },
    { key: "isActive", label: "Active" },
  ],
};

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function TechnicalVisitManagementView({
  initialResource = "technical-visits",
  initialData = null,
  isReadOnly: providedIsReadOnly,
}: {
  initialResource?: TechnicalVisitResourceKey;
  initialData?: TechnicalVisitManagementInitialData | null;
  isReadOnly?: boolean;
}) {
  const { isReadOnly: accessIsReadOnly } = useDashboardAccessState();
  const isReadOnly = providedIsReadOnly ?? accessIsReadOnly;
  const state = useTechnicalVisitManagement({ initialResource, initialData, isReadOnly });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
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

        <Tabs value={state.resource} onValueChange={(value) => state.setResource(value as TechnicalVisitResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {Object.keys(META).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key as TechnicalVisitResourceKey].title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {state.resource !== "technical-visits" ? (
            <Select value={state.selectedVisitId} onValueChange={state.setSelectedVisitId}>
              <SelectTrigger className="w-[320px] max-w-full">
                <SelectValue placeholder="Select visit" />
              </SelectTrigger>
              <SelectContent>
                {state.visitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Input
            value={state.query}
            onChange={(event) => state.setQuery(event.target.value)}
            placeholder="Search..."
            className="max-w-md"
          />
        </div>

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
                <TableCell colSpan={COLUMNS[state.resource].length + 1} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[state.resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              state.visibleRows.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[state.resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "isActive" ? (
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      ) : column.key === "status" ? (
                        <Badge variant="outline">{String(row.status || "-")}</Badge>
                      ) : (
                        formatCell(row[column.key], state.lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => state.openDialog("edit", row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void state.onDelete(row)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!state.loading && state.rows.length > 0 ? (
          <TablePagination
            totalItems={state.rows.length}
            page={state.page}
            pageSize={state.pageSize}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        ) : null}
      </CardContent>

      <Dialog open={state.dialog.open} onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{state.dialog.mode === "create" ? "Add" : "Edit"} {META[state.resource].title}</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {state.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? " *" : ""}</Label>
                {field.type === "select" ? (
                  <Select
                    value={
                      field.nullable
                        ? state.form[field.key]
                          ? String(state.form[field.key])
                          : "__none__"
                        : String(state.form[field.key] ?? "")
                    }
                    onValueChange={(value) =>
                      state.setForm((prev) => ({
                        ...prev,
                        ...(field.key === "visitType" ? { referenceId: "" } : {}),
                        [field.key]: field.nullable && value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label}`} />
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
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-xs text-muted-foreground">
                      {Boolean(state.form[field.key]) ? "Yes" : "No"}
                    </span>
                    <Switch
                      checked={Boolean(state.form[field.key])}
                      onCheckedChange={(checked) =>
                        state.setForm((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(state.form[field.key] ?? "")}
                    onChange={(event) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => state.setDialog({ open: false, mode: "create", row: null })}>
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
