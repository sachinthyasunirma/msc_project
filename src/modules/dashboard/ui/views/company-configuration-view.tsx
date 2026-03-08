"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, Settings2, ShieldCheck, Trash2, Users } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Role = "ADMIN" | "MANAGER" | "USER";
type Plan = "STARTER" | "GROWTH" | "ENTERPRISE";
type TransportRateBasis = "VEHICLE_CATEGORY" | "VEHICLE_TYPE";

type CompanyUsersResponse = {
  company: {
    id: string;
    code: string;
    name: string;
    email: string;
    baseCurrencyCode: string;
    transportRateBasis: TransportRateBasis;
    helpEnabled: boolean;
    joinSecretCode: string | null;
    managerPrivilegeCode: string | null;
    subscriptionPlan: Plan | null;
    subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  };
  userCount: number;
  userLimit: number;
  currentUserId: string;
  currentUserRole: Role;
  currentUserReadOnly: boolean;
  currentUserPrivileges: string[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: Role;
    readOnly: boolean;
    canWriteMasterData: boolean;
    canWritePreTour: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
  customRoles: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
  }>;
  userRoleAssignments: Array<{ userId: string; roleId: string }>;
  rolePrivileges: Array<{ roleId: string; privilegeCode: string }>;
  availablePrivileges: Array<{
    code: string;
    name: string;
    description: string;
    minPlan: Plan;
  }>;
};

type UserDraft = {
  role: Role;
  roleIds: string[];
  readOnly: boolean;
  canWriteMasterData: boolean;
  canWritePreTour: boolean;
  isActive: boolean;
};

const NO_ROLE_PROFILE = "__NONE__";

function getPrivilegeGroup(code: string) {
  if (code.startsWith("NAV_")) return "Navigation";
  if (code.startsWith("SCREEN_")) return "Screens";
  if (code.endsWith("_WRITE")) return "Write Access";
  if (code.includes("COMPANY") || code.includes("ROLE")) return "Company Admin";
  if (code.includes("SUBSCRIPTION")) return "Subscription";
  return "Other";
}

function getGroupColorClass(group: string) {
  if (group === "Navigation") return "bg-blue-50 text-blue-700 border-blue-100";
  if (group === "Screens") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (group === "Write Access") return "bg-amber-50 text-amber-700 border-amber-100";
  if (group === "Company Admin") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
  if (group === "Subscription") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-50 text-slate-700 border-slate-100";
}

export function CompanyConfigurationView() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [payload, setPayload] = useState<CompanyUsersResponse | null>(null);

  const [helpEnabled, setHelpEnabled] = useState(true);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("USD");
  const [transportRateBasis, setTransportRateBasis] = useState<TransportRateBasis>("VEHICLE_TYPE");
  const [subscriptionPlan, setSubscriptionPlan] = useState<Plan>("STARTER");
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ code: string; name: string }>>([]);

  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPrivilegeCodes, setSelectedPrivilegeCodes] = useState<string[]>([]);
  const [newRole, setNewRole] = useState({ code: "", name: "", description: "" });

  const roleIdsByUser = useMemo(() => {
    if (!payload) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const assignment of payload.userRoleAssignments) {
      map.set(assignment.userId, [...(map.get(assignment.userId) ?? []), assignment.roleId]);
    }
    return map;
  }, [payload]);

  const rolePrivilegesByRoleId = useMemo(() => {
    if (!payload) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const row of payload.rolePrivileges) {
      map.set(row.roleId, [...(map.get(row.roleId) ?? []), row.privilegeCode]);
    }
    return map;
  }, [payload]);

  const canManageUsers = Boolean(payload?.currentUserPrivileges.includes("COMPANY_USERS_MANAGE"));
  const canDeleteUsers = Boolean(canManageUsers && payload?.currentUserRole === "ADMIN");
  const canManageRoles = Boolean(payload?.currentUserPrivileges.includes("ROLE_MANAGE"));
  const canManageCompany = Boolean(payload?.currentUserPrivileges.includes("COMPANY_SETTINGS_MANAGE"));
  const canManageSubscription = Boolean(payload?.currentUserPrivileges.includes("SUBSCRIPTION_MANAGE"));

  const selectedRole = payload?.customRoles.find((role) => role.id === selectedRoleId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/companies/users", { cache: "no-store" });
      const body = (await response.json()) as CompanyUsersResponse | { message?: string };
      if (!response.ok) {
        throw new Error(("message" in body && body.message) || "Failed to load configuration.");
      }

      const typed = body as CompanyUsersResponse;
      const assignments = new Map<string, string[]>();
      for (const row of typed.userRoleAssignments) {
        assignments.set(row.userId, [...(assignments.get(row.userId) ?? []), row.roleId]);
      }
      const rolePrivileges = new Map<string, string[]>();
      for (const row of typed.rolePrivileges) {
        rolePrivileges.set(row.roleId, [...(rolePrivileges.get(row.roleId) ?? []), row.privilegeCode]);
      }

      setPayload(typed);
      setHelpEnabled(Boolean(typed.company.helpEnabled));
      setBaseCurrencyCode(typed.company.baseCurrencyCode || "USD");
      setTransportRateBasis(typed.company.transportRateBasis || "VEHICLE_TYPE");
      setSubscriptionPlan(typed.company.subscriptionPlan || "STARTER");
      setDrafts(
        Object.fromEntries(
          typed.users.map((entry) => [
            entry.id,
            {
              role: entry.role,
              roleIds: assignments.get(entry.id) ?? [],
              readOnly: entry.readOnly,
              canWriteMasterData: entry.canWriteMasterData,
              canWritePreTour: entry.canWritePreTour,
              isActive: entry.isActive,
            },
          ])
        )
      );

      const nextSelectedRoleId =
        typed.customRoles.find((role) => !role.isSystem)?.id ??
        typed.customRoles[0]?.id ??
        "";
      setSelectedRoleId((current) => (typed.customRoles.some((role) => role.id === current) ? current : nextSelectedRoleId));
      setSelectedPrivilegeCodes(
        rolePrivileges.get(
          typed.customRoles.some((role) => role.id === selectedRoleId)
            ? selectedRoleId
            : nextSelectedRoleId
        ) ?? []
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/currencies/currencies?limit=500", { cache: "no-store" });
        if (!response.ok) return;
        const rows = (await response.json()) as Array<{ code?: string; name?: string }>;
        if (!active) return;
        setCurrencyOptions(
          rows
            .map((row) => ({ code: String(row.code || ""), name: String(row.name || "") }))
            .filter((row) => row.code)
        );
      } catch {
        if (active) setCurrencyOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    setSelectedPrivilegeCodes(rolePrivilegesByRoleId.get(selectedRoleId) ?? []);
  }, [selectedRoleId, rolePrivilegesByRoleId]);

  const filteredUsers = useMemo(() => {
    if (!payload) return [];
    const term = query.trim().toLowerCase();
    if (!term) return payload.users;
    return payload.users.filter(
      (entry) =>
        entry.name.toLowerCase().includes(term) || entry.email.toLowerCase().includes(term)
    );
  }, [payload, query]);

  const onSaveCompany = async () => {
    if (!payload) return;
    setSavingCompany(true);
    try {
      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payload.company.code,
          name: payload.company.name,
          email: payload.company.email,
          secretCode: payload.company.joinSecretCode || "",
          privilegeCode: payload.company.managerPrivilegeCode || null,
          baseCurrencyCode,
          transportRateBasis,
          helpEnabled,
          subscriptionPlan,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to update company settings.");
      notify.success("Company settings saved.");
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save company settings.");
    } finally {
      setSavingCompany(false);
    }
  };

  const onSaveUser = async (userId: string) => {
    if (!payload) return;
    const current = payload.users.find((entry) => entry.id === userId);
    const draft = drafts[userId];
    if (!current || !draft) return;

    const currentRoleIds = roleIdsByUser.get(userId) ?? [];
    const roleIdsChanged =
      draft.roleIds.length !== currentRoleIds.length ||
      draft.roleIds.some((id) => !currentRoleIds.includes(id));
    const hasChanged =
      draft.role !== current.role ||
      draft.readOnly !== current.readOnly ||
      draft.canWriteMasterData !== current.canWriteMasterData ||
      draft.canWritePreTour !== current.canWritePreTour ||
      draft.isActive !== current.isActive ||
      roleIdsChanged;
    if (!hasChanged) return;

    if (current.isActive && !draft.isActive) {
      const confirmed = await confirm({
        title: "Deactivate User",
        description: "Set this user to inactive? This will remove company access.",
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) return;
    }

    setSavingUserId(userId);
    try {
      const response = await fetch(`/api/companies/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: draft.role,
          roleIds: draft.roleIds,
          readOnly: draft.readOnly,
          canWriteMasterData: draft.canWriteMasterData,
          canWritePreTour: draft.canWritePreTour,
          isActive: draft.isActive,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to update user access.");
      notify.success("User access updated.");
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to update user access.");
    } finally {
      setSavingUserId(null);
    }
  };

  const onDeleteUser = async (userId: string) => {
    if (!payload || !canDeleteUsers) return;
    const targetUser = payload.users.find((entry) => entry.id === userId);
    if (!targetUser) return;

    const confirmed = await confirm({
      title: "Delete User",
      description: `Delete "${targetUser.name}" from this company? This action cannot be undone from here.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      const response = await fetch("/api/companies/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to delete user.");
      notify.success("User deleted from company.");
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const onCreateRole = async () => {
    if (!newRole.code.trim() || !newRole.name.trim()) {
      notify.error("Role code and name are required.");
      return;
    }
    setCreatingRole(true);
    try {
      const response = await fetch("/api/companies/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newRole.code.trim().toUpperCase(),
          name: newRole.name.trim(),
          description: newRole.description.trim() || null,
          privilegeCodes: [],
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to create role.");
      setNewRole({ code: "", name: "", description: "" });
      notify.success("Role created.");
      await load();
      setActiveTab("roles");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  const onSaveRolePrivileges = async () => {
    if (!selectedRoleId) return;
    setSavingRole(true);
    try {
      const response = await fetch(`/api/companies/roles/${selectedRoleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privilegeCodes: selectedPrivilegeCodes }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to save role privileges.");
      notify.success("Role privileges updated.");
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save role privileges.");
    } finally {
      setSavingRole(false);
    }
  };

  const onDeleteRole = async () => {
    if (!selectedRoleId || !selectedRole || selectedRole.isSystem) return;
    const confirmed = await confirm({
      title: "Delete Role",
      description: `Delete role "${selectedRole.name}"? Users must be unassigned first.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingRole(true);
    try {
      const response = await fetch(`/api/companies/roles/${selectedRoleId}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to delete role.");
      notify.success("Role deleted.");
      setSelectedRoleId("");
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete role.");
    } finally {
      setDeletingRole(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Company Configuration Manager
            </CardTitle>
            <CardDescription>
              Centralized company security, role matrix, user access, and plan controls.
            </CardDescription>
            {canManageSubscription ? (
              <div className="flex gap-2">
                <Badge variant="outline">{payload?.company.subscriptionPlan ?? "PENDING"}</Badge>
                <Badge variant="secondary">{payload?.company.subscriptionStatus ?? "..."}</Badge>
              </div>
            ) : null}
          </div>
          <Button
            variant="outline"
            className="master-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Settings2 className="mr-2 size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 size-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles">
            <KeyRound className="mr-2 size-4" />
            Roles & Privileges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Company & Subscription</CardTitle>
                <CardDescription>Manage company-level configuration and subscription.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input
                    readOnly
                    value={payload ? `${payload.company.code} - ${payload.company.name}` : "Loading..."}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Base Currency</Label>
                  <Select
                    value={baseCurrencyCode}
                    onValueChange={setBaseCurrencyCode}
                    disabled={!canManageCompany || savingCompany}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.code} - {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Transport Rate Basis</Label>
                  <Select
                    value={transportRateBasis}
                    onValueChange={(value) => setTransportRateBasis(value as TransportRateBasis)}
                    disabled={!canManageCompany || savingCompany}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VEHICLE_TYPE">Vehicle Type</SelectItem>
                      <SelectItem value="VEHICLE_CATEGORY">Vehicle Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            <div className="space-y-1">
              {canManageSubscription ? (
                <>
                  <Label>Subscription Plan</Label>
                  <Select
                    value={subscriptionPlan}
                    onValueChange={(value) => setSubscriptionPlan(value as Plan)}
                    disabled={savingCompany}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STARTER">STARTER</SelectItem>
                      <SelectItem value="GROWTH">GROWTH</SelectItem>
                      <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : null}
            </div>
                <div className="space-y-1">
                  <Label>Screen Help</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
                    <span className="text-sm text-muted-foreground">
                      {helpEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={helpEnabled}
                      onCheckedChange={setHelpEnabled}
                      disabled={!canManageCompany || savingCompany}
                    />
                  </div>
                </div>
                <Button onClick={() => void onSaveCompany()} disabled={!canManageCompany || savingCompany}>
                  {savingCompany ? "Saving..." : "Save Company Settings"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Codes</CardTitle>
                <CardDescription>Codes used for company join and manager elevation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Company Secret Code</Label>
                  <Input readOnly value={payload?.company.joinSecretCode || "-"} />
                </div>
                <div className="space-y-1">
                  <Label>Manager Privilege Code</Label>
                  <Input readOnly value={payload?.company.managerPrivilegeCode || "-"} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Secret code joins users to the company. Manager code upgrades user to manager level.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>User Access Manager</CardTitle>
                <CardDescription>
                  Assign legacy role, role profile, and review privilege code coverage per user.
                </CardDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    Used Users: {payload?.userCount ?? 0}
                  </Badge>
                  <Badge variant="secondary">
                    Plan Limit: {payload?.userLimit ?? 0}
                  </Badge>
                </div>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by name or email"
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Legacy Role</TableHead>
                    <TableHead>Role Profile</TableHead>
                    <TableHead>Read Only</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((entry) => {
                      const draft = drafts[entry.id] ?? {
                        role: entry.role,
                        roleIds: roleIdsByUser.get(entry.id) ?? [],
                        readOnly: entry.readOnly,
                        canWriteMasterData: entry.canWriteMasterData,
                        canWritePreTour: entry.canWritePreTour,
                        isActive: entry.isActive,
                      };
                      const chosenRoleId = draft.roleIds[0] ?? NO_ROLE_PROFILE;

                      const isSelf = entry.id === payload?.currentUserId;
                      const disabled = !canManageUsers || isSelf;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.name}</TableCell>
                          <TableCell>{entry.email}</TableCell>
                          <TableCell>
                            <Select
                              value={draft.role}
                              disabled={disabled}
                              onValueChange={(value) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [entry.id]: { ...draft, role: value as Role },
                                }))
                              }
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                                <SelectItem value="MANAGER">MANAGER</SelectItem>
                                <SelectItem value="USER">USER</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={chosenRoleId}
                              disabled={disabled}
                              onValueChange={(value) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [entry.id]: {
                                    ...draft,
                                    roleIds: value === NO_ROLE_PROFILE ? [] : [value],
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="w-52">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_ROLE_PROFILE}>No Role Profile</SelectItem>
                                {(payload?.customRoles ?? [])
                                  .filter((role) => role.isActive)
                                  .map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name} ({role.code})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={draft.readOnly}
                                disabled={disabled || draft.role === "ADMIN" || draft.role === "MANAGER"}
                                onCheckedChange={(checked) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [entry.id]: {
                                      ...draft,
                                      readOnly: checked,
                                      canWriteMasterData: checked ? false : draft.canWriteMasterData,
                                      canWritePreTour: checked ? false : draft.canWritePreTour,
                                    },
                                  }))
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                {draft.readOnly ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={draft.isActive}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [entry.id]: { ...draft, isActive: checked },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={disabled || savingUserId === entry.id}
                                onClick={() => void onSaveUser(entry.id)}
                              >
                                {savingUserId === entry.id ? "Saving..." : "Save"}
                              </Button>
                              {canDeleteUsers ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={isSelf || deletingUserId === entry.id}
                                  onClick={() => void onDeleteUser(entry.id)}
                                >
                                  <Trash2 className="mr-1 size-3.5" />
                                  {deletingUserId === entry.id ? "Deleting..." : "Delete"}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Create Role</CardTitle>
                <CardDescription>Create role profile for your company users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Role code (e.g. SALES_EXEC)"
                  value={newRole.code}
                  disabled={!canManageRoles || creatingRole}
                  onChange={(event) =>
                    setNewRole((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                  }
                />
                <Input
                  placeholder="Role name"
                  value={newRole.name}
                  disabled={!canManageRoles || creatingRole}
                  onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newRole.description}
                  disabled={!canManageRoles || creatingRole}
                  onChange={(event) =>
                    setNewRole((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
                <Button onClick={() => void onCreateRole()} disabled={!canManageRoles || creatingRole}>
                  {creatingRole ? "Creating..." : "Create Role"}
                </Button>
                {!canManageRoles ? (
                  <p className="text-xs text-muted-foreground">
                    Missing `ROLE_MANAGE` privilege for current plan/user.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Role Privilege Matrix</CardTitle>
                <CardDescription>
                  Select a role, map privilege codes, and save assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role to configure" />
                    </SelectTrigger>
                    <SelectContent>
                      {(payload?.customRoles ?? []).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} ({role.code}) {role.isSystem ? "- system" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    onClick={() => void onDeleteRole()}
                    disabled={!canManageRoles || !selectedRole || selectedRole.isSystem || deletingRole}
                  >
                    {deletingRole ? "Deleting..." : "Delete"}
                  </Button>
                </div>

                {selectedRole ? (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {selectedRole.name} ({selectedRole.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRole.description || "No description"}
                    </p>
                    {selectedRole.isSystem ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        System roles are read-only.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="max-h-80 space-y-2 overflow-auto rounded-md border p-3">
                  {(payload?.availablePrivileges ?? []).map((entry) => (
                    <label key={entry.code} className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedPrivilegeCodes.includes(entry.code)}
                        disabled={!canManageRoles || !selectedRoleId || Boolean(selectedRole?.isSystem)}
                        onCheckedChange={(checked) =>
                          setSelectedPrivilegeCodes((prev) =>
                            checked ? [...prev, entry.code] : prev.filter((code) => code !== entry.code)
                          )
                        }
                      />
                      <div>
                        <p className="text-sm font-medium">{entry.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.name} | Min Plan: {entry.minPlan}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <Button
                  onClick={() => void onSaveRolePrivileges()}
                  disabled={!canManageRoles || !selectedRoleId || Boolean(selectedRole?.isSystem) || savingRole}
                >
                  {savingRole ? "Saving..." : "Save Role Privileges"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Role To Privilege Visibility</CardTitle>
              <CardDescription>
                Privilege codes grouped by category with color highlights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.customRoles ?? []).map((role) => {
                const codes = rolePrivilegesByRoleId.get(role.id) ?? [];
                const grouped = codes.reduce<Record<string, string[]>>((acc, code) => {
                  const group = getPrivilegeGroup(code);
                  acc[group] = [...(acc[group] ?? []), code];
                  return acc;
                }, {});
                return (
                  <div key={role.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={role.isSystem ? "secondary" : "outline"}>
                        {role.code}
                      </Badge>
                      <span className="text-sm font-medium">{role.name}</span>
                    </div>
                    {codes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No privilege codes assigned.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(grouped).map(([group, groupCodes]) => (
                          <div key={`${role.id}-${group}`} className="space-y-1">
                            <Badge className={getGroupColorClass(group)}>{group}</Badge>
                            <div className="flex flex-wrap gap-1">
                              {groupCodes.map((code) => (
                                <Badge
                                  key={`${role.id}-${code}`}
                                  variant="outline"
                                  className={getGroupColorClass(group)}
                                >
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
