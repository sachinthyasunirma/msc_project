"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  buildBusinessNetworkRecordsParams,
  businessNetworkKeys,
} from "@/modules/business-network/lib/business-network-query";
import {
  createBusinessNetworkRecord,
  deleteBusinessNetworkRecord,
  listBusinessNetworkRecords,
  updateBusinessNetworkRecord,
} from "@/modules/business-network/lib/business-network-api";
import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listCompanyUsersLookup } from "@/modules/dashboard/lib/company-users-api";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

type UseBusinessNetworkManagementOptions = {
  initialResource?: BusinessNetworkResourceKey;
  initialData?: BusinessNetworkManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

const ORG_MEMBER_ROLE_OPTIONS_BY_TYPE: Record<
  "PLATFORM" | "OPERATOR" | "MARKET" | "SUPPLIER",
  Array<{ label: string; value: string }>
> = {
  PLATFORM: [
    { label: "Platform Admin", value: "PLATFORM_ADMIN" },
    { label: "Platform Operations", value: "PLATFORM_OPERATIONS" },
    { label: "Platform Finance", value: "PLATFORM_FINANCE" },
  ],
  OPERATOR: [
    { label: "Operator Admin", value: "OPERATOR_ADMIN" },
    { label: "Operator Contracts", value: "OPERATOR_CONTRACTS" },
    { label: "Operator Reservations", value: "OPERATOR_RESERVATIONS" },
    { label: "Operator Ticketing", value: "OPERATOR_TICKETING" },
    { label: "Operator Finance", value: "OPERATOR_FINANCE" },
  ],
  MARKET: [
    { label: "Market Admin", value: "MARKET_ADMIN" },
    { label: "Market Sales", value: "MARKET_SALES" },
    { label: "Market Reservations", value: "MARKET_RESERVATIONS" },
    { label: "Market Finance", value: "MARKET_FINANCE" },
  ],
  SUPPLIER: [
    { label: "Supplier Admin", value: "SUPPLIER_ADMIN" },
    { label: "Supplier Operations", value: "SUPPLIER_OPERATIONS" },
    { label: "Supplier Finance", value: "SUPPLIER_FINANCE" },
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

export function useBusinessNetworkManagement({
  initialResource = "organizations",
  initialData = null,
  isReadOnly,
}: UseBusinessNetworkManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<BusinessNetworkResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const lookupsInitialData = initialData
    ? {
        organizations: initialData.organizations,
        users: initialData.users,
        currencies: initialData.currencies,
      }
    : undefined;

  const recordsInput = useMemo(
    () =>
      buildBusinessNetworkRecordsParams({
        resource,
        q: query || undefined,
        limit: 200,
      }),
    [query, resource]
  );

  const isDefaultRecordsQuery = resource === initialResource && query.length === 0;

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: businessNetworkKeys.lookups(),
    queryFn: async () => {
      const [organizations, users, currencies] = await Promise.all([
        listBusinessNetworkRecords("organizations", { limit: 200 }),
        listCompanyUsersLookup(),
        listCurrencyRecords("currencies", { limit: 500 }),
      ]);
      return {
        organizations,
        users,
        currencies,
      };
    },
    initialData: lookupsInitialData,
  });

  const {
    data: records = EMPTY_ROWS,
    error: recordsError,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: businessNetworkKeys.records({
      resource,
      q: recordsInput.q,
      limit: recordsInput.limit,
    }),
    queryFn: () => listBusinessNetworkRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.records ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createBusinessNetworkMutation = useMutation({
    mutationFn: ({
      targetResource,
      payload,
    }: {
      targetResource: string;
      payload: Record<string, unknown>;
    }) => createBusinessNetworkRecord(targetResource, payload),
  });
  const updateBusinessNetworkMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: string;
      id: string;
      payload: Record<string, unknown>;
    }) => updateBusinessNetworkRecord(targetResource, id, payload),
  });
  const deleteBusinessNetworkMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: string; id: string }) =>
      deleteBusinessNetworkRecord(targetResource, id),
  });

  const organizations = lookupsData?.organizations ?? EMPTY_ROWS;
  const users = lookupsData?.users ?? EMPTY_ROWS;
  const currencies = lookupsData?.currencies ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving =
    createBusinessNetworkMutation.isPending ||
    updateBusinessNetworkMutation.isPending ||
    deleteBusinessNetworkMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(
      lookupsError instanceof Error ? lookupsError.message : "Failed to load lookup data."
    );
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(
      recordsError instanceof Error ? recordsError.message : "Failed to load records."
    );
  }, [recordsError]);

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

  const currencyOptions = useMemo(
    () =>
      currencies.map((item) => ({
        value: String(item.code),
        label: `${item.code} - ${item.name}`,
      })),
    [currencies]
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

  const orgMemberRoleOptions = useMemo(() => {
    const selectedOrganization = organizations.find(
      (item) => String(item.id) === String(form.organizationId ?? "")
    );
    const selectedType = String(selectedOrganization?.type ?? "").toUpperCase() as
      | "PLATFORM"
      | "OPERATOR"
      | "MARKET"
      | "SUPPLIER";
    const scopedOptions =
      selectedType && ORG_MEMBER_ROLE_OPTIONS_BY_TYPE[selectedType]
        ? ORG_MEMBER_ROLE_OPTIONS_BY_TYPE[selectedType]
        : [
            ...ORG_MEMBER_ROLE_OPTIONS_BY_TYPE.PLATFORM,
            ...ORG_MEMBER_ROLE_OPTIONS_BY_TYPE.OPERATOR,
            ...ORG_MEMBER_ROLE_OPTIONS_BY_TYPE.MARKET,
            ...ORG_MEMBER_ROLE_OPTIONS_BY_TYPE.SUPPLIER,
          ];
    const currentRole = String(form.role ?? "").toUpperCase();
    if (currentRole && !scopedOptions.some((option) => option.value === currentRole)) {
      return [...scopedOptions, { label: `${currentRole} (Legacy)`, value: currentRole }];
    }
    return scopedOptions;
  }, [form.organizationId, form.role, organizations]);

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
          { key: "country", label: "Country", type: "text", nullable: true },
          { key: "city", label: "City", type: "text", nullable: true },
          { key: "address", label: "Address", type: "text", nullable: true },
          {
            key: "baseCurrency",
            label: "Base Currency",
            type: "select",
            defaultValue: "LKR",
            options: currencyOptions,
          },
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
          {
            key: "preferredCurrency",
            label: "Preferred Currency",
            type: "select",
            nullable: true,
            options: currencyOptions,
          },
          { key: "creditEnabled", label: "Credit Enabled", type: "boolean", defaultValue: false },
          { key: "creditLimit", label: "Credit Limit", type: "number", nullable: true },
          { key: "paymentTermDays", label: "Payment Term Days", type: "number", nullable: true },
          {
            key: "defaultMarkupPercent",
            label: "Default Markup %",
            type: "number",
            defaultValue: 0,
          },
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
          {
            key: "role",
            label: "Role",
            type: "select",
            required: true,
            options: orgMemberRoleOptions,
          },
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
          {
            key: "defaultMarkupPercent",
            label: "Default Markup %",
            type: "number",
            defaultValue: 0,
          },
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
  }, [
    currencyOptions,
    marketOrganizationOptions,
    orgMemberRoleOptions,
    operatorOrganizationOptions,
    organizationOptions,
    resource,
    userOptions,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [pageSize, records.length]
  );

  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [currentPage, pageSize, records]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, resource]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: businessNetworkKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: businessNetworkKeys.recordsRoot() }),
    ]);
    await Promise.all([refetchLookups(), refetchRecords()]);
  }, [queryClient, refetchLookups, refetchRecords]);

  const openDialog = useCallback(
    (mode: "create" | "edit", row?: Record<string, unknown>) => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
        return;
      }

      const next: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (mode === "edit" && row) {
          const raw = row[field.key];
          if (field.type === "datetime") {
            next[field.key] = toLocalDateTime(raw);
          } else if (field.type === "json") {
            next[field.key] = raw ? JSON.stringify(raw) : "";
          } else {
            next[field.key] = raw ?? defaultValue(field);
          }
        } else {
          next[field.key] = defaultValue(field);
        }
      });

      setForm(next);
      setDialog({ open: true, mode, row: row ?? null });
    },
    [fields, isReadOnly]
  );

  const onSubmit = useCallback(async () => {
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          return;
        }
        if ((value === "" || value === undefined) && !field.required) {
          return;
        }
        if (field.required && (value === "" || value === undefined)) {
          throw new Error(`${field.label} is required.`);
        }
        if (field.type === "number") {
          payload[field.key] = value === "" ? null : Number(value);
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(value);
        } else if (field.type === "json") {
          payload[field.key] = value ? JSON.parse(String(value)) : null;
        } else if (field.type === "datetime") {
          payload[field.key] = toIsoDateTime(value);
        } else if (field.key === "code" && typeof value === "string") {
          payload[field.key] = value.toUpperCase().trim();
        } else {
          payload[field.key] = value;
        }
      });

      if (dialog.mode === "create") {
        await createBusinessNetworkMutation.mutateAsync({ targetResource: resource, payload });
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateBusinessNetworkMutation.mutateAsync({
          targetResource: resource,
          id: String(dialog.row.id),
          payload,
        });
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    }
  }, [
    createBusinessNetworkMutation,
    dialog.mode,
    dialog.row,
    fields,
    form,
    refreshAll,
    resource,
    updateBusinessNetworkMutation,
  ]);

  const onDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (!row.id) return;
      const targetLabel =
        String(row.code ?? "").trim() ||
        String(row.name ?? "").trim() ||
        String(row.id);
      const confirmed = await confirm({
        title: "Delete Record",
        targetLabel,
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) return;

      try {
        await deleteBusinessNetworkMutation.mutateAsync({
          targetResource: resource,
          id: String(row.id),
        });
        notify.success("Record deleted.");
        await refreshAll();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete record.");
      }
    },
    [confirm, deleteBusinessNetworkMutation, refreshAll, resource]
  );

  return {
    currentPage,
    dialog,
    fields,
    form,
    loading,
    lookups,
    onDelete,
    onSubmit,
    openDialog,
    pageSize,
    pagedRecords,
    query,
    records,
    refreshAll,
    resource,
    saving,
    setCurrentPage,
    setDialog,
    setForm,
    setPageSize,
    setQuery,
    setResource,
  };
}
