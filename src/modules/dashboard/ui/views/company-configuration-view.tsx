"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Role = "ADMIN" | "MANAGER" | "USER";

type CompanyUsersResponse = {
  company: {
    id: string;
    code: string;
    name: string;
    baseCurrencyCode: string;
    helpEnabled: boolean;
    joinSecretCode: string | null;
    managerPrivilegeCode: string | null;
  };
  currentUserId: string;
  currentUserRole: Role;
  currentUserReadOnly: boolean;
  users: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: Role;
    readOnly: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
  roles: Role[];
};

type UserDraft = {
  role: Role;
  readOnly: boolean;
  isActive: boolean;
};

const ROLE_NOTES: Record<Role, string> = {
  ADMIN: "Full access, including managing admins and company security codes.",
  MANAGER: "Can manage users and data, but cannot assign admin role.",
  USER: "Default role. Read-only by default unless manager enables edit mode.",
};

export function CompanyConfigurationView() {
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingHelp, setSavingHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<CompanyUsersResponse | null>(null);
  const [helpEnabled, setHelpEnabled] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});

  const canManageUsers =
    payload?.currentUserRole === "ADMIN" || payload?.currentUserRole === "MANAGER";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/companies/users", { cache: "no-store" });
      const body = (await response.json()) as
        | CompanyUsersResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(("message" in body && body.message) || "Failed to load configuration.");
      }

      const typed = body as CompanyUsersResponse;
      setPayload(typed);
      setHelpEnabled(Boolean(typed.company.helpEnabled));
      setDrafts(
        Object.fromEntries(
          typed.users.map((user) => [
            user.id,
            { role: user.role, readOnly: user.readOnly, isActive: user.isActive },
          ])
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    if (!payload) return [];
    const term = query.trim().toLowerCase();
    if (!term) return payload.users;
    return payload.users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
    );
  }, [payload, query]);

  const onSaveHelpSetting = async () => {
    if (!payload) return;
    setSavingHelp(true);
    try {
      const currentResponse = await fetch("/api/companies/me", { cache: "no-store" });
      const currentBody = (await currentResponse.json()) as {
        company?: {
          code?: string;
          name?: string;
          email?: string;
          baseCurrencyCode?: string;
          joinSecretCode?: string | null;
          managerPrivilegeCode?: string | null;
          country?: string | null;
          image?: string | null;
        } | null;
        message?: string;
      };
      if (!currentResponse.ok || !currentBody.company) {
        throw new Error(currentBody.message || "Failed to load company profile.");
      }
      const patchResponse = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentBody.company.code || payload.company.code,
          name: currentBody.company.name || payload.company.name,
          email: currentBody.company.email || "",
          baseCurrencyCode:
            currentBody.company.baseCurrencyCode || payload.company.baseCurrencyCode || "USD",
          secretCode: currentBody.company.joinSecretCode || payload.company.joinSecretCode || "",
          privilegeCode:
            currentBody.company.managerPrivilegeCode ||
            payload.company.managerPrivilegeCode ||
            null,
          country: currentBody.company.country ?? null,
          image: currentBody.company.image ?? null,
          helpEnabled,
        }),
      });
      const patchBody = (await patchResponse.json()) as { message?: string };
      if (!patchResponse.ok) {
        throw new Error(patchBody.message || "Failed to update help setting.");
      }
      toast.success("Screen help setting saved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save help setting.");
    } finally {
      setSavingHelp(false);
    }
  };

  const onSaveUser = async (userId: string) => {
    if (!payload) return;
    const user = payload.users.find((entry) => entry.id === userId);
    const draft = drafts[userId];
    if (!user || !draft) return;
    if (
      draft.role === user.role &&
      draft.readOnly === user.readOnly &&
      draft.isActive === user.isActive
    ) {
      return;
    }
    if (user.isActive && !draft.isActive) {
      const confirmed = window.confirm(
        "Set this user to inactive? This will remove the user from company access."
      );
      if (!confirmed) return;
    }

    setSavingUserId(userId);
    try {
      const response = await fetch(`/api/companies/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to update user access.");
      }
      toast.success("User access updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user access.");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Company Configuration
            </CardTitle>
            <CardDescription>
              Manage secret codes, roles, and user access levels for your company.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Privilege Codes
            </CardTitle>
            <CardDescription>
              Use these codes to onboard users and optionally grant manager access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={
                  payload ? `${payload.company.code} - ${payload.company.name}` : "Loading..."
                }
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Code</Label>
              <Input value={payload?.company.joinSecretCode || "-"} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Base Currency Code</Label>
              <Input value={payload?.company.baseCurrencyCode || "-"} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Screen Help</Label>
              <div className="flex h-10 items-center justify-between rounded-md border px-3">
                <span className="text-sm text-muted-foreground">
                  {helpEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={helpEnabled}
                  disabled={!canManageUsers || savingHelp}
                  onCheckedChange={setHelpEnabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager Privilege Code</Label>
              <Input value={payload?.company.managerPrivilegeCode || "-"} readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              Secret code joins company. Manager privilege code promotes joined user to manager.
            </p>
            <Button
              variant="outline"
              disabled={!canManageUsers || savingHelp}
              onClick={() => void onSaveHelpSetting()}
            >
              {savingHelp ? "Saving..." : "Save Help Setting"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role List</CardTitle>
            <CardDescription>Available roles and expected access behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["ADMIN", "MANAGER", "USER"] as Role[]).map((role) => (
              <div key={role} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <Badge variant={role === "USER" ? "secondary" : "default"}>{role}</Badge>
                  {role === "USER" ? (
                    <Badge variant="outline">Default: Read Only</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{ROLE_NOTES[role]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Company User List
            </CardTitle>
            <CardDescription>
              Assign role and edit access. Only managers/admin can update.
            </CardDescription>
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
                <TableHead>Role</TableHead>
                <TableHead>Read Only</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((entry) => {
                  const draft = drafts[entry.id] ?? {
                    role: entry.role,
                    readOnly: entry.readOnly,
                    isActive: entry.isActive,
                  };
                  const isSelf = entry.id === payload?.currentUserId;
                  const isEditableByManager =
                    payload?.currentUserRole === "ADMIN" ||
                    (payload?.currentUserRole === "MANAGER" && entry.role !== "ADMIN");
                  const disabled = !canManageUsers || isSelf || !isEditableByManager;
                  const hasChanged =
                    draft.role !== entry.role ||
                    draft.readOnly !== entry.readOnly ||
                    draft.isActive !== entry.isActive;

                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        <Select
                          value={draft.role}
                          onValueChange={(value) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [entry.id]: {
                                ...(prev[entry.id] ?? {
                                  role: entry.role,
                                  readOnly: entry.readOnly,
                                  isActive: entry.isActive,
                                }),
                                role: value as Role,
                              },
                            }))
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-40">
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
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={draft.readOnly}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [entry.id]: {
                                  ...(prev[entry.id] ?? {
                                    role: entry.role,
                                    readOnly: entry.readOnly,
                                    isActive: entry.isActive,
                                  }),
                                  readOnly: checked,
                                },
                              }))
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {draft.readOnly ? "Read only" : "Editable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={draft.isActive}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [entry.id]: {
                                  ...(prev[entry.id] ?? {
                                    role: entry.role,
                                    readOnly: entry.readOnly,
                                    isActive: entry.isActive,
                                  }),
                                  isActive: checked,
                                },
                              }))
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {draft.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled || !hasChanged || savingUserId === entry.id}
                          onClick={() => void onSaveUser(entry.id)}
                        >
                          {savingUserId === entry.id ? "Saving..." : "Save"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
