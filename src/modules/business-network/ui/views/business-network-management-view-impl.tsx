"use client";

import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { useBusinessNetworkManagement } from "@/modules/business-network/lib/use-business-network-management";
import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";

const META: Record<BusinessNetworkResourceKey, { title: string; description: string }> = {
  organizations: {
    title: "Organizations",
    description: "Manage tour operators, markets (agents), suppliers, and platform entities.",
  },
  "operator-profiles": {
    title: "Operator Profiles",
    description: "Manage operator business rules, regions, and payout preferences.",
  },
  "market-profiles": {
    title: "Market Profiles",
    description: "Manage travel agent/market terms, credit, and default markup behavior.",
  },
  "org-members": {
    title: "Organization Members",
    description: "Assign users to organizations with operational roles and status.",
  },
  "operator-market-contracts": {
    title: "Operator-Market Contracts",
    description: "Define pricing and credit relationship between operator and market organizations.",
  },
};

const COLUMNS: Record<BusinessNetworkResourceKey, Array<{ key: string; label: string }>> = {
  organizations: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "baseCurrency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "operator-profiles": [
    { key: "code", label: "Code" },
    { key: "organizationId", label: "Organization" },
    { key: "operatorKind", label: "Kind" },
    { key: "bookingMode", label: "Booking" },
    { key: "isActive", label: "Status" },
  ],
  "market-profiles": [
    { key: "code", label: "Code" },
    { key: "organizationId", label: "Organization" },
    { key: "agencyType", label: "Agency Type" },
    { key: "creditEnabled", label: "Credit" },
    { key: "isActive", label: "Status" },
  ],
  "org-members": [
    { key: "code", label: "Code" },
    { key: "organizationId", label: "Organization" },
    { key: "userId", label: "User" },
    { key: "role", label: "Role" },
    { key: "isActive", label: "Status" },
  ],
  "operator-market-contracts": [
    { key: "code", label: "Code" },
    { key: "operatorOrgId", label: "Operator" },
    { key: "marketOrgId", label: "Market" },
    { key: "pricingMode", label: "Pricing" },
    { key: "status", label: "Contract" },
    { key: "isActive", label: "Status" },
  ],
};

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function BusinessNetworkManagementView() {
  return <BusinessNetworkManagementViewContent initialResource="organizations" />;
}

export function BusinessNetworkManagementViewContent({
  initialResource = "organizations",
  initialData = null,
  isReadOnly: providedIsReadOnly,
}: {
  initialResource?: BusinessNetworkResourceKey;
  initialData?: BusinessNetworkManagementInitialData | null;
  isReadOnly?: boolean;
}) {
  const { isReadOnly: accessIsReadOnly } = useDashboardAccessState();
  const isReadOnly = providedIsReadOnly ?? accessIsReadOnly;
  const state = useBusinessNetworkManagement({
    initialResource,
    initialData,
    isReadOnly,
  });

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
          onValueChange={(value) => state.setResource(value as BusinessNetworkResourceKey)}
        >
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {(Object.keys(META) as BusinessNetworkResourceKey[]).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key].title}
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
                      ) : column.key === "creditEnabled" ? (
                        <Badge variant={row.creditEnabled ? "default" : "secondary"}>
                          {row.creditEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      ) : (
                        formatCell(row[column.key], state.lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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

      <Dialog
        open={state.dialog.open}
        onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
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
                className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}
              >
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
                      {Boolean(state.form[field.key]) ? "Active" : "Inactive"}
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
                    onChange={(event) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
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
                    onChange={(event) =>
                      state.setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
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
            <Button
              onClick={() => void state.onSubmit()}
              disabled={state.saving || (isReadOnly && state.dialog.mode === "create")}
            >
              {state.saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
