"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Building2, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

type CompanyProfile = {
  id: string;
  code: string;
  baseCurrencyCode: string;
  helpEnabled: boolean;
  joinSecretCode: string | null;
  managerPrivilegeCode: string | null;
  name: string;
  email: string;
  country: string | null;
  image: string | null;
};

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    code: "",
    baseCurrencyCode: "USD",
    helpEnabled: true,
    secretCode: "",
    privilegeCode: "",
    name: "",
    email: "",
    country: "",
    image: "",
  });

  const onLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
  };

  const loadCompany = async () => {
    if (!data?.user) return;
    try {
      const response = await fetch("/api/companies/me", { cache: "no-store" });
      const body = (await response.json()) as {
        company?: CompanyProfile | null;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Failed to load company details.");
      }
      const details = body.company ?? null;
      setCompany(details);
      if (details) {
        setCompanyForm({
          code: details.code || "",
          baseCurrencyCode: details.baseCurrencyCode || "USD",
          helpEnabled: details.helpEnabled ?? true,
          secretCode: details.joinSecretCode || "",
          privilegeCode: details.managerPrivilegeCode || "",
          name: details.name || "",
          email: details.email || "",
          country: details.country || "",
          image: details.image || "",
        });
      }
    } catch (error) {
      setCompanyError(
        error instanceof Error ? error.message : "Failed to load company details."
      );
    }
  };

  useEffect(() => {
    void loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.user?.id]);

  const onPickLogo = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });
    setCompanyForm((prev) => ({ ...prev, image: dataUrl }));
  };

  const onSaveCompany = async () => {
    setCompanyError(null);
    if (!companyForm.code.trim() || !companyForm.name.trim() || !companyForm.email.trim()) {
      setCompanyError("Code, name and email are required.");
      return;
    }

    setCompanySaving(true);
    try {
      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: companyForm.code.toUpperCase().trim(),
          baseCurrencyCode: companyForm.baseCurrencyCode.toUpperCase().trim() || "USD",
          helpEnabled: Boolean(companyForm.helpEnabled),
          secretCode: companyForm.secretCode.toUpperCase().trim(),
          privilegeCode: companyForm.privilegeCode.toUpperCase().trim() || null,
          name: companyForm.name.trim(),
          email: companyForm.email.trim(),
          country: companyForm.country.trim() || null,
          image: companyForm.image.trim() || null,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to save company details.");
      }
      await loadCompany();
      setCompanyOpen(false);
    } catch (error) {
      setCompanyError(
        error instanceof Error ? error.message : "Failed to save company details."
      );
    } finally {
      setCompanySaving(false);
    }
  };

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">...</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading user...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!data?.user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" onClick={() => router.push("/sign-in")}>
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">?</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Sign in</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const user = data.user;
  const accessUser = user as typeof user & { role?: string | null };
  const displayName = user.name || user.email?.split("@")[0] || "User";
  const isManager = accessUser.role === "ADMIN" || accessUser.role === "MANAGER";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {user.image ? (
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image} alt={displayName} />
                  <AvatarFallback className="rounded-lg">U</AvatarFallback>
                </Avatar>
              ) : (
                <GeneratedAvatar
                  seed={displayName}
                  className="size-8 rounded-lg"
                  variant="initials"
                />
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{company?.name || user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {user.image ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image} alt={displayName} />
                    <AvatarFallback className="rounded-lg">U</AvatarFallback>
                  </Avatar>
                ) : (
                  <GeneratedAvatar
                    seed={displayName}
                    className="size-8 rounded-lg"
                    variant="initials"
                  />
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {company ? `${company.code} - ${company.name}` : "No company configured"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCompanyOpen(true)}>
              <Building2 />
              {isManager ? "Edit Company" : "View Company"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/configuration/company")}>
              <ShieldCheck />
              Company Configuration
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onLogout()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Code</Label>
              <Input
                value={companyForm.code}
                disabled={!isManager}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Base Currency Code</Label>
              <Input
                value={companyForm.baseCurrencyCode}
                disabled={!isManager}
                onChange={(e) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    baseCurrencyCode: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Help Documentation</Label>
              <div className="flex h-10 items-center justify-between rounded-md border px-3">
                <span className="text-sm text-muted-foreground">
                  {companyForm.helpEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={companyForm.helpEnabled}
                  disabled={!isManager}
                  onCheckedChange={(checked) =>
                    setCompanyForm((prev) => ({ ...prev, helpEnabled: checked }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secret Code</Label>
              <Input
                value={companyForm.secretCode}
                disabled={!isManager}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, secretCode: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Manager Privilege Code</Label>
              <Input
                value={companyForm.privilegeCode}
                disabled={!isManager}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, privilegeCode: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyForm.name}
                disabled={!isManager}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Email</Label>
              <Input
                type="email"
                value={companyForm.email}
                disabled={!isManager}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={companyForm.country}
                disabled={!isManager}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, country: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Company Logo (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={!isManager}
                onChange={(e) => void onPickLogo(e.target.files?.[0] ?? null)}
              />
              {companyForm.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companyForm.image}
                  alt="Company logo preview"
                  className="h-16 rounded border object-contain p-1"
                />
              ) : null}
            </div>
          </div>
          {companyError ? <p className="text-sm text-destructive">{companyError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyOpen(false)}>
              Cancel
            </Button>
            <Button disabled={companySaving || !isManager} onClick={() => void onSaveCompany()}>
              {companySaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
