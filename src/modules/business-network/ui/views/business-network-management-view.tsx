"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
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
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  createBusinessNetworkRecord,
  deleteBusinessNetworkRecord,
  listBusinessNetworkRecords,
  updateBusinessNetworkRecord,
} from "@/modules/business-network/lib/business-network-api";

export type BusinessNetworkResourceKey =
  | "organizations"
  | "operator-profiles"
  | "market-profiles"
  | "org-members"
  | "operator-market-contracts";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

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

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

function toLocalDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

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
}: {
  initialResource?: BusinessNetworkResourceKey;
}) {
  const confirm = useConfirm();
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;

  const [resource, setResource] = useState<BusinessNetworkResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});

  const organizationOptions = useMemo(
    () =>
      organizations.map((item) => ({
        value: String(item.id),
        label: `${item.code} - ${item.name}`,
      })),
    [organizations]
  );

  const operatorOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((item) => item.type === "OPERATOR" || item.type === "SUPPLIER")
        .map((item) => ({
          value: String(item.id),
          label: `${item.code} - ${item.name}`,
        })),
    [organizations]
  );

  const marketOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((item) => item.type === "MARKET")
        .map((item) => ({
          value: String(item.id),
          label: `${item.code} - ${item.name}`,
        })),
    [organizations]
  );

  const userOptions = useMemo(
    () =>
      users.map((item) => ({
        value: String(item.id),
        label: `${item.name || item.email} (${item.email})`,
      })),
    [users]
  );

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    organizations.forEach((item) => {
      items.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    users.forEach((item) => {
      items.push([String(item.id), `${item.name || item.email}`]);
    });
    return Object.fromEntries(items);
  }, [organizations, users]);

  const fields = useMemo<Field[]>(() => {
    switch (resource) {
      case "organizations":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "type",
            label: "Type",
            type: "select",
            required: true,
            defaultValue: "OPERATOR",
            options: [
              { label: "OPERATOR", value: "OPERATOR" },
              { label: "MARKET", value: "MARKET" },
              { label: "SUPPLIER", value: "SUPPLIER" },
              { label: "PLATFORM", value: "PLATFORM" },
            ],
          },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "legalName", label: "Legal Name", type: "text", nullable: true },
          { key: "registrationNo", label: "Registration No", type: "text", nullable: true },
          { key: "email", label: "Email", type: "text", nullable: true },
          { key: "phone", label: "Phone", type: "text", nullable: true },
          { key: "website", label: "Website", type: "text", nullable: true },
          { key: "country", label: "Country (ISO2)", type: "text", nullable: true },
          { key: "city", label: "City", type: "text", nullable: true },
          { key: "address", label: "Address", type: "text", nullable: true },
          { key: "baseCurrency", label: "Base Currency", type: "text", defaultValue: "LKR" },
          { key: "timezone", label: "Timezone", type: "text", defaultValue: "Asia/Colombo" },
          { key: "metadata", label: "Metadata JSON", type: "json", nullable: true },
          { key: "isVerified", label: "Verified", type: "boolean", defaultValue: false },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "operator-profiles":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "organizationId",
            label: "Operator Organization",
            type: "select",
            required: true,
            options: operatorOrganizationOptions,
          },
          {
            key: "operatorKind",
            label: "Operator Kind",
            type: "select",
            defaultValue: "DMC",
            options: [
              { label: "DMC", value: "DMC" },
              { label: "TOUR_OPERATOR", value: "TOUR_OPERATOR" },
              { label: "TRANSPORT", value: "TRANSPORT" },
              { label: "ACTIVITY_PROVIDER", value: "ACTIVITY_PROVIDER" },
              { label: "MIXED", value: "MIXED" },
            ],
          },
          { key: "serviceRegions", label: "Service Regions JSON", type: "json", nullable: true },
          { key: "languages", label: "Languages JSON", type: "json", nullable: true },
          {
            key: "bookingMode",
            label: "Booking Mode",
            type: "select",
            defaultValue: "ON_REQUEST",
            options: [
              { label: "ON_REQUEST", value: "ON_REQUEST" },
              { label: "INSTANT", value: "INSTANT" },
            ],
          },
          { key: "leadTimeHours", label: "Lead Time Hours", type: "number", defaultValue: 0 },
          {
            key: "payoutMode",
            label: "Payout Mode",
            type: "select",
            defaultValue: "POST_TRAVEL",
            options: [
              { label: "POST_TRAVEL", value: "POST_TRAVEL" },
              { label: "POST_CONFIRMATION", value: "POST_CONFIRMATION" },
              { label: "MILESTONE", value: "MILESTONE" },
            ],
          },
          {
            key: "payoutCycle",
            label: "Payout Cycle",
            type: "select",
            defaultValue: "MONTHLY",
            options: [
              { label: "WEEKLY", value: "WEEKLY" },
              { label: "BIWEEKLY", value: "BIWEEKLY" },
              { label: "MONTHLY", value: "MONTHLY" },
            ],
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "market-profiles":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "organizationId",
            label: "Market Organization",
            type: "select",
            required: true,
            options: marketOrganizationOptions,
          },
          {
            key: "agencyType",
            label: "Agency Type",
            type: "select",
            defaultValue: "TRAVEL_AGENT",
            options: [
              { label: "TRAVEL_AGENT", value: "TRAVEL_AGENT" },
              { label: "ONLINE_AGENT", value: "ONLINE_AGENT" },
              { label: "CORPORATE", value: "CORPORATE" },
              { label: "WHOLESALER", value: "WHOLESALER" },
            ],
          },
          { key: "licenseNo", label: "License No", type: "text", nullable: true },
          { key: "preferredCurrency", label: "Preferred Currency", type: "text", nullable: true },
          { key: "creditEnabled", label: "Credit Enabled", type: "boolean", defaultValue: false },
          { key: "creditLimit", label: "Credit Limit", type: "number", nullable: true },
          { key: "paymentTermDays", label: "Payment Term Days", type: "number", nullable: true },
          { key: "defaultMarkupPercent", label: "Default Markup %", type: "number", defaultValue: 0 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "org-members":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "organizationId",
            label: "Organization",
            type: "select",
            required: true,
            options: organizationOptions,
          },
          {
            key: "userId",
            label: "User",
            type: "select",
            required: true,
            options: userOptions,
          },
          { key: "role", label: "Role", type: "text", required: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "operator-market-contracts":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "operatorOrgId",
            label: "Operator Organization",
            type: "select",
            required: true,
            options: operatorOrganizationOptions,
          },
          {
            key: "marketOrgId",
            label: "Market Organization",
            type: "select",
            required: true,
            options: marketOrganizationOptions,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "ACTIVE",
            options: [
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "SUSPENDED", value: "SUSPENDED" },
              { label: "TERMINATED", value: "TERMINATED" },
            ],
          },
          {
            key: "pricingMode",
            label: "Pricing Mode",
            type: "select",
            defaultValue: "MARKUP",
            options: [
              { label: "MARKUP", value: "MARKUP" },
              { label: "COMMISSION", value: "COMMISSION" },
              { label: "NET_ONLY", value: "NET_ONLY" },
            ],
          },
          { key: "defaultMarkupPercent", label: "Default Markup %", type: "number", defaultValue: 0 },
          {
            key: "defaultCommissionPercent",
            label: "Default Commission %",
            type: "number",
            defaultValue: 0,
          },
          { key: "creditEnabled", label: "Credit Enabled", type: "boolean", defaultValue: false },
          { key: "creditLimit", label: "Credit Limit", type: "number", nullable: true },
          { key: "paymentTermDays", label: "Payment Term Days", type: "number", nullable: true },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", nullable: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "notes", label: "Notes", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      default:
        return [];
    }
  }, [marketOrganizationOptions, operatorOrganizationOptions, organizationOptions, resource, userOptions]);

  const loadLookups = useCallback(async () => {
    try {
      const [orgs, companyUsersResponse] = await Promise.all([
        listBusinessNetworkRecords("organizations", { limit: 200 }),
        fetch("/api/companies/users", { cache: "no-store" }),
      ]);

      const usersPayload = (await companyUsersResponse.json()) as {
        users?: Array<Record<string, unknown>>;
        message?: string;
      };
      if (!companyUsersResponse.ok) {
        throw new Error(usersPayload.message || "Failed to load company users.");
      }

      setOrganizations(orgs);
      setUsers(usersPayload.users ?? []);
    } catch (error) {
      setOrganizations([]);
      setUsers([]);
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listBusinessNetworkRecords(resource, {
        q: query || undefined,
        limit: 200,
      });
      setRecords(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [query, resource]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw = row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else if (field.type === "json") next[field.key] = raw ? JSON.stringify(raw) : "";
        else next[field.key] = raw ?? defaultValue(field);
      } else {
        next[field.key] = defaultValue(field);
      }
    });
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSubmit = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          return;
        }
        if ((value === "" || value === undefined) && !field.required) return;
        if (field.required && (value === "" || value === undefined)) {
          throw new Error(`${field.label} is required.`);
        }
        if (field.type === "number") payload[field.key] = value === "" ? null : Number(value);
        else if (field.type === "boolean") payload[field.key] = Boolean(value);
        else if (field.type === "json") payload[field.key] = value ? JSON.parse(String(value)) : null;
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else payload[field.key] = value;
      });

      if (dialog.mode === "create") {
        await createBusinessNetworkRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateBusinessNetworkRecord(resource, String(dialog.row.id), payload);
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Record<string, unknown>) => {
    if (!row.id) return;
    const confirmed = await confirm({
      title: "Delete Record",
      description: "Delete this record? This action cannot be undone.",
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setSaving(true);
      await deleteBusinessNetworkRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[resource].title}</CardTitle>
            <CardDescription>{META[resource].description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void Promise.all([load(), loadLookups()])}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button
              onClick={() => openDialog("create")}
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
          value={resource}
          onValueChange={(value) => setResource(value as BusinessNetworkResourceKey)}
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
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="max-w-md" />

        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS[resource].map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              records.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[resource].map((column) => (
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
                        formatCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog("edit", row)}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void onDelete(row)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "Add" : "Edit"} {META[resource].title}
            </DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}>
                <Label>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={String(form[field.key] ?? (field.nullable ? "__none__" : ""))}
                    onValueChange={(value) =>
                      setForm((prev) => ({
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
                      {Boolean(form[field.key]) ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={Boolean(form[field.key])}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ) : field.type === "json" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} disabled={saving || (isReadOnly && dialog.mode === "create")}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
