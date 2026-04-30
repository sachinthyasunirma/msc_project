"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/notify";
import {
  deleteEmailAccount,
  deleteEmailIntakeProfile,
  listEmailAccounts,
  listEmailIntakeProfiles,
  saveEmailAccount,
  saveEmailIntakeProfile,
  testEmailAccount,
} from "@/modules/email-integration/lib/email-integration-api";
import type {
  EmailIntegrationAccount,
  EmailIntegrationAccountUpsert,
  EmailIntegrationIntakeProfile,
  EmailIntegrationIntakeProfileUpsert,
} from "@/modules/email-integration/shared/email-integration-schemas";

type Props = {
  initialData?: {
    accounts: { items: EmailIntegrationAccount[] };
    intakeProfiles: { items: EmailIntegrationIntakeProfile[] };
  } | null;
};

type AccountFormState = EmailIntegrationAccountUpsert;
type IntakeProfileFormState = {
  id: string | null;
  accountId: string;
  emailAddressesText: string;
  keywordsText: string;
  isActive: boolean;
};

const EMPTY_ACCOUNT_FORM: AccountFormState = {
  id: null,
  displayName: "",
  emailAddress: "",
  username: "",
  password: "",
  host: "",
  port: 993,
  secure: true,
  mailbox: "INBOX",
  isActive: true,
  isAvailableForPreTourAI: true,
  isDefaultForPreTourAI: false,
};

const EMPTY_INTAKE_PROFILE_FORM: IntakeProfileFormState = {
  id: null,
  accountId: "",
  emailAddressesText: "",
  keywordsText: "",
  isActive: true,
};

function buildAccountFormState(account?: EmailIntegrationAccount | null): AccountFormState {
  if (!account) return { ...EMPTY_ACCOUNT_FORM };
  return {
    id: account.id,
    displayName: account.displayName,
    emailAddress: account.emailAddress,
    username: account.username,
    password: "",
    host: account.host,
    port: account.port,
    secure: account.secure,
    mailbox: account.mailbox,
    isActive: account.isActive,
    isAvailableForPreTourAI: account.isAvailableForPreTourAI,
    isDefaultForPreTourAI: account.isDefaultForPreTourAI,
  };
}

function buildIntakeProfileFormState(
  profile?: EmailIntegrationIntakeProfile | null
): IntakeProfileFormState {
  if (!profile) return { ...EMPTY_INTAKE_PROFILE_FORM };
  return {
    id: profile.id,
    accountId: profile.accountId,
    emailAddressesText: profile.emailAddresses.join("\n"),
    keywordsText: profile.keywords.join("\n"),
    isActive: profile.isActive,
  };
}

function statusBadgeVariant(status: EmailIntegrationAccount["lastConnectionStatus"]) {
  if (status === "CONNECTED") return "default" as const;
  if (status === "FAILED") return "destructive" as const;
  return "secondary" as const;
}

function configSourceBadgeVariant(source: EmailIntegrationAccount["configSource"]) {
  return source === "ENV_COMMON" ? "outline" as const : "secondary" as const;
}

function parseListText(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderListPreview(items: string[], emptyText: string) {
  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyText}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 3).map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
      {items.length > 3 ? <Badge variant="secondary">+{items.length - 3} more</Badge> : null}
    </div>
  );
}

export function EmailIntegrationView({ initialData = null }: Props) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<"accounts" | "filters">("accounts");
  const [accounts, setAccounts] = useState<EmailIntegrationAccount[]>(
    initialData?.accounts.items ?? []
  );
  const [intakeProfiles, setIntakeProfiles] = useState<EmailIntegrationIntakeProfile[]>(
    initialData?.intakeProfiles.items ?? []
  );
  const [loading, setLoading] = useState(!initialData);
  const [accountQuery, setAccountQuery] = useState("");
  const [profileQuery, setProfileQuery] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [intakeProfileDialogOpen, setIntakeProfileDialogOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingIntakeProfile, setSavingIntakeProfile] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [deletingIntakeProfileId, setDeletingIntakeProfileId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>({ ...EMPTY_ACCOUNT_FORM });
  const [intakeProfileForm, setIntakeProfileForm] = useState<IntakeProfileFormState>({
    ...EMPTY_INTAKE_PROFILE_FORM,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsResponse, intakeProfilesResponse] = await Promise.all([
        listEmailAccounts(),
        listEmailIntakeProfiles(),
      ]);
      setAccounts(accountsResponse.items);
      setIntakeProfiles(intakeProfilesResponse.items);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load AI email setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialData) return;
    void load();
  }, [initialData, load]);

  const filteredAccounts = useMemo(() => {
    const term = accountQuery.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) =>
      [account.displayName, account.emailAddress, account.host, account.username]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [accountQuery, accounts]);

  const filteredIntakeProfiles = useMemo(() => {
    const term = profileQuery.trim().toLowerCase();
    if (!term) return intakeProfiles;
    return intakeProfiles.filter((profile) =>
      [
        profile.accountDisplayName,
        profile.accountEmailAddress,
        profile.emailAddresses.join(" "),
        profile.keywords.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [intakeProfiles, profileQuery]);

  const accountOptions = useMemo(
    () =>
      [...accounts].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [accounts]
  );

  const selectedIntakeAccount =
    accountOptions.find((account) => account.id === intakeProfileForm.accountId) ?? null;

  const openCreateAccount = () => {
    setAccountForm({ ...EMPTY_ACCOUNT_FORM });
    setAccountDialogOpen(true);
  };

  const openEditAccount = (account: EmailIntegrationAccount) => {
    setAccountForm(buildAccountFormState(account));
    setAccountDialogOpen(true);
  };

  const openCreateIntakeProfile = () => {
    const firstAccount = accountOptions[0] ?? null;
    setIntakeProfileForm({
      ...EMPTY_INTAKE_PROFILE_FORM,
      accountId: firstAccount?.id ?? "",
    });
    setIntakeProfileDialogOpen(true);
  };

  const openEditIntakeProfile = (profile: EmailIntegrationIntakeProfile) => {
    setIntakeProfileForm(buildIntakeProfileFormState(profile));
    setIntakeProfileDialogOpen(true);
  };

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    try {
      await saveEmailAccount(accountForm);
      await load();
      setAccountDialogOpen(false);
      notify.success(accountForm.id ? "Email account updated." : "Email account created.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save email account.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleTestAccount = async (accountId: string) => {
    setTestingId(accountId);
    try {
      const updated = await testEmailAccount(accountId);
      setAccounts((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      notify.success("Mailbox connection verified.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to verify mailbox.");
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteAccount = async (account: EmailIntegrationAccount) => {
    const approved = await confirm({
      title: "Delete email account?",
      description: `Remove ${account.emailAddress} from the company IMAP setup. Its intake filter profile will also be removed.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!approved) return;

    setDeletingAccountId(account.id);
    try {
      await deleteEmailAccount(account.id);
      setAccounts((previous) => previous.filter((entry) => entry.id !== account.id));
      setIntakeProfiles((previous) =>
        previous.filter((entry) => entry.accountId !== account.id)
      );
      notify.success("Email account deleted.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete email account.");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleSaveIntakeProfile = async () => {
    setSavingIntakeProfile(true);
    try {
      const payload: EmailIntegrationIntakeProfileUpsert = {
        id: intakeProfileForm.id,
        accountId: intakeProfileForm.accountId,
        emailAddresses: parseListText(intakeProfileForm.emailAddressesText),
        keywords: parseListText(intakeProfileForm.keywordsText),
        isActive: intakeProfileForm.isActive,
      };
      await saveEmailIntakeProfile(payload);
      await load();
      setIntakeProfileDialogOpen(false);
      notify.success(
        intakeProfileForm.id ? "Intake filter updated." : "Intake filter created."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save intake filter.");
    } finally {
      setSavingIntakeProfile(false);
    }
  };

  const handleDeleteIntakeProfile = async (profile: EmailIntegrationIntakeProfile) => {
    const approved = await confirm({
      title: "Delete intake filter?",
      description: `Remove the email + keyword rules for ${profile.accountDisplayName}.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!approved) return;

    setDeletingIntakeProfileId(profile.id);
    try {
      await deleteEmailIntakeProfile(profile.id);
      setIntakeProfiles((previous) => previous.filter((entry) => entry.id !== profile.id));
      notify.success("Intake filter deleted.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete intake filter.");
    } finally {
      setDeletingIntakeProfileId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              AI Email Intake Setup
            </CardTitle>
            <CardDescription className="max-w-3xl">
              Configure the IMAP mailboxes used by Pre-Tour AI, then define the user email
              addresses and keywords that decide which inbox messages are allowed into the AI Draft
              email picker.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
              Refresh
            </Button>
            <Button onClick={() => (activeTab === "accounts" ? openCreateAccount() : openCreateIntakeProfile())}>
              <Plus className="mr-2 size-4" />
              {activeTab === "accounts" ? "Add Email Account" : "Add Intake Filter"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "accounts" | "filters")}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="accounts">Mailbox Accounts</TabsTrigger>
              <TabsTrigger value="filters">Intake Filters</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Planner Behavior</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Accounts with <span className="font-medium text-foreground">Use for Pre-Tour AI</span>{" "}
                      enabled can appear in the AI Draft dialog.
                    </p>
                    <p>
                      The default mailbox is preselected for the{" "}
                      <span className="font-medium text-foreground">Email</span> and{" "}
                      <span className="font-medium text-foreground">Email + Prompt</span> flows.
                    </p>
                    <p>
                      Credentials are stored in encrypted form. Use an IMAP app password whenever the
                      mail provider supports it.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Quick Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={accountQuery}
                      onChange={(event) => setAccountQuery(event.target.value)}
                      placeholder="Search by email, host, or display name"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email Account</TableHead>
                      <TableHead>Mailbox</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AI Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          Loading email accounts...
                        </TableCell>
                      </TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No email accounts configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{account.displayName}</p>
                              <p className="text-sm text-muted-foreground">{account.emailAddress}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.username} via {account.host}:{account.port}
                              </p>
                              {account.configSource === "ENV_COMMON" ? (
                                <p className="text-xs text-muted-foreground">
                                  Managed from <code>.env</code> common IMAP settings.
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{account.mailbox}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.secure ? "Secure IMAP" : "Standard IMAP"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant={statusBadgeVariant(account.lastConnectionStatus)}>
                                {account.lastConnectionStatus.replaceAll("_", " ")}
                              </Badge>
                              {account.lastConnectionError ? (
                                <p className="max-w-xs text-xs text-muted-foreground">
                                  {account.lastConnectionError}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={account.isActive ? "default" : "secondary"}>
                                {account.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant={configSourceBadgeVariant(account.configSource)}>
                                {account.configSource === "ENV_COMMON" ? "Environment" : "Database"}
                              </Badge>
                              {account.isAvailableForPreTourAI ? (
                                <Badge variant="outline">
                                  <Sparkles className="mr-1 size-3" />
                                  Use for AI
                                </Badge>
                              ) : null}
                              {account.isDefaultForPreTourAI ? (
                                <Badge variant="outline">
                                  <ShieldCheck className="mr-1 size-3" />
                                  Default
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {account.configSource === "DATABASE" ? (
                                <Button variant="outline" size="sm" onClick={() => openEditAccount(account)}>
                                  Edit
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" disabled>
                                  In .env
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleTestAccount(account.id)}
                                disabled={testingId === account.id}
                              >
                                {testingId === account.id ? "Testing..." : "Test"}
                              </Button>
                              {account.configSource === "DATABASE" ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void handleDeleteAccount(account)}
                                  disabled={deletingAccountId === account.id}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Filter Logic</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Each AI mailbox can have one intake filter profile with configured{" "}
                      <span className="font-medium text-foreground">user email addresses</span> and{" "}
                      <span className="font-medium text-foreground">keywords</span>.
                    </p>
                    <p>
                      The AI Draft dialog first filters the inbox by those configured user email
                      addresses, then checks for matching keywords in the email subject/body.
                    </p>
                    <p>
                      Only emails that satisfy the active filter are shown for{" "}
                      <span className="font-medium text-foreground">Email</span> and{" "}
                      <span className="font-medium text-foreground">Email + Prompt</span>.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Quick Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={profileQuery}
                      onChange={(event) => setProfileQuery(event.target.value)}
                      placeholder="Search by mailbox, user email, or keyword"
                    />
                  </CardContent>
                </Card>
              </div>

              {accountOptions.length === 0 ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">No AI mailbox available</CardTitle>
                    <CardDescription>
                      Enable at least one mailbox for Pre-Tour AI before configuring intake filters.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mailbox</TableHead>
                        <TableHead>User Emails</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                            Loading intake filters...
                          </TableCell>
                        </TableRow>
                      ) : filteredIntakeProfiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                            No intake filters configured yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredIntakeProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{profile.accountDisplayName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {profile.accountEmailAddress}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {renderListPreview(profile.emailAddresses, "No user emails configured")}
                            </TableCell>
                            <TableCell>
                              {renderListPreview(profile.keywords, "No keywords configured")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.isActive ? "default" : "secondary"}>
                                {profile.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditIntakeProfile(profile)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void handleDeleteIntakeProfile(profile)}
                                  disabled={deletingIntakeProfileId === profile.id}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden sm:w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{accountForm.id ? "Edit Email Account" : "Add Email Account"}</DialogTitle>
            <DialogDescription>
              This mailbox becomes eligible for the Pre-Tour AI workflow only when the AI switch is enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto px-1 py-1">
            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input
                value={accountForm.displayName}
                onChange={(event) =>
                  setAccountForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
                placeholder="Reservations Inbox"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Email Address</Label>
                <Input
                  value={accountForm.emailAddress}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, emailAddress: event.target.value }))
                  }
                  placeholder="common@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Login Username</Label>
                <Input
                  value={accountForm.username ?? ""}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="Optional. Defaults to the common email address."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{accountForm.id ? "App Password" : "Password / App Password"}</Label>
              <Input
                type="password"
                value={accountForm.password ?? ""}
                onChange={(event) =>
                  setAccountForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder={accountForm.id ? "Leave blank to keep the saved credential" : "Required"}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1.4fr_0.7fr_0.9fr]">
              <div className="grid gap-2">
                <Label>IMAP Host</Label>
                <Input
                  value={accountForm.host}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, host: event.target.value }))
                  }
                  placeholder="imap.gmail.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={accountForm.port}
                  onChange={(event) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      port: Number(event.target.value || 993),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Mailbox</Label>
                <Input
                  value={accountForm.mailbox}
                  onChange={(event) =>
                    setAccountForm((prev) => ({ ...prev, mailbox: event.target.value }))
                  }
                  placeholder="INBOX"
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Use secure IMAP</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable this for SSL/TLS mailboxes such as Gmail, Outlook, and hosted business mail.
                  </p>
                </div>
                <Switch
                  checked={accountForm.secure}
                  onCheckedChange={(checked) =>
                    setAccountForm((prev) => ({ ...prev, secure: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive accounts stay saved but cannot be used by the AI planner.
                  </p>
                </div>
                <Switch
                  checked={accountForm.isActive}
                  onCheckedChange={(checked) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      isActive: checked,
                      isDefaultForPreTourAI: checked ? prev.isDefaultForPreTourAI : false,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Use for Pre-Tour AI</Label>
                  <p className="text-xs text-muted-foreground">
                    Only enabled accounts appear in the AI Draft email picker.
                  </p>
                </div>
                <Switch
                  checked={accountForm.isAvailableForPreTourAI}
                  onCheckedChange={(checked) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      isAvailableForPreTourAI: checked,
                      isDefaultForPreTourAI: checked ? prev.isDefaultForPreTourAI : false,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Set as Default AI Email</Label>
                  <p className="text-xs text-muted-foreground">
                    The planner preselects this mailbox for email-driven AI intake.
                  </p>
                </div>
                <Switch
                  checked={accountForm.isDefaultForPreTourAI}
                  onCheckedChange={(checked) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      isDefaultForPreTourAI: checked,
                      isAvailableForPreTourAI: checked ? true : prev.isAvailableForPreTourAI,
                      isActive: checked ? true : prev.isActive,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)} disabled={savingAccount}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAccount()} disabled={savingAccount}>
              {savingAccount ? "Saving..." : accountForm.id ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={intakeProfileDialogOpen} onOpenChange={setIntakeProfileDialogOpen}>
        <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden sm:w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {intakeProfileForm.id ? "Edit Intake Filter" : "Add Intake Filter"}
            </DialogTitle>
            <DialogDescription>
              Configure the allowed user email addresses and keywords for a mailbox. The AI Draft email picker will only show messages that match this active filter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto px-1 py-1">
            <div className="grid gap-2">
              <Label>AI Mailbox</Label>
              <Select
                value={intakeProfileForm.accountId || undefined}
                onValueChange={(value) =>
                  setIntakeProfileForm((prev) => ({ ...prev, accountId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI mailbox" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.displayName} · {account.emailAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIntakeAccount ? (
                <p className="text-xs text-muted-foreground">
                  {selectedIntakeAccount.host}:{selectedIntakeAccount.port} · {selectedIntakeAccount.mailbox}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>User Email Addresses</Label>
              <Textarea
                value={intakeProfileForm.emailAddressesText}
                onChange={(event) =>
                  setIntakeProfileForm((prev) => ({
                    ...prev,
                    emailAddressesText: event.target.value,
                  }))
                }
                className="min-h-32"
                placeholder={"customer1@example.com\ncustomer2@example.com"}
              />
              <p className="text-xs text-muted-foreground">
                Add one email per line, or separate values with commas. The mailbox message sender must match one of these configured user emails.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Keywords</Label>
              <Textarea
                value={intakeProfileForm.keywordsText}
                onChange={(event) =>
                  setIntakeProfileForm((prev) => ({
                    ...prev,
                    keywordsText: event.target.value,
                  }))
                }
                className="min-h-32"
                placeholder={"pre-tour\nitinerary\narrival\nairport transfer"}
              />
              <p className="text-xs text-muted-foreground">
                Add one keyword per line, or separate values with commas. The email subject or message body must contain at least one of these keywords.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="space-y-1">
                <Label>Active Filter</Label>
                <p className="text-xs text-muted-foreground">
                  Only active intake filters are applied in the AI Draft email selection flow.
                </p>
              </div>
              <Switch
                checked={intakeProfileForm.isActive}
                onCheckedChange={(checked) =>
                  setIntakeProfileForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIntakeProfileDialogOpen(false)}
              disabled={savingIntakeProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveIntakeProfile()}
              disabled={savingIntakeProfile || !intakeProfileForm.accountId}
            >
              {savingIntakeProfile
                ? "Saving..."
                : intakeProfileForm.id
                  ? "Save Changes"
                  : "Create Filter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
