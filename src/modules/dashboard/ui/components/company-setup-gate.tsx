"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useDashboardShell } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type {
  DashboardAccess,
  DashboardCompany,
} from "@/modules/dashboard/shared/dashboard-shell-types";

type AccessSyncState = {
  access: DashboardAccess | null;
  accessErrorCode: string | null;
  accessErrorMessage: string | null;
};

function toFormState(company: DashboardCompany | null, email: string) {
  return {
    joinExisting: false,
    companyCode: company?.code ?? "",
    secretCode: company?.joinSecretCode ?? "",
    privilegeCode: company?.managerPrivilegeCode ?? "",
    name: company?.name ?? "",
    email: company?.email ?? email,
    baseCurrencyCode: company?.baseCurrencyCode ?? "USD",
    helpEnabled: company?.helpEnabled ?? true,
    country: company?.country ?? "",
    image: company?.image ?? "",
  };
}

export function CompanySetupGate() {
  const router = useRouter();
  const { company, needsSetup, updateShellData, viewer } = useDashboardShell();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => toFormState(company, viewer?.email ?? ""));

  useEffect(() => {
    setForm(toFormState(company, viewer?.email ?? ""));
  }, [company, viewer?.email]);

  const isOpen = useMemo(
    () => Boolean(viewer) && needsSetup,
    [needsSetup, viewer]
  );

  const onPickLogo = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });
    setForm((prev) => ({ ...prev, image: dataUrl }));
  };

  const syncAccessState = async (): Promise<AccessSyncState> => {
    try {
      const accessResponse = await fetch("/api/companies/access-control", { cache: "no-store" });
      const accessBody = (await accessResponse.json()) as
        | DashboardAccess
        | { code?: string; message?: string };

      if (!accessResponse.ok) {
        return {
          access: null,
          accessErrorCode:
            ("code" in accessBody && accessBody.code) || "ACCESS_REFRESH_FAILED",
          accessErrorMessage:
            ("message" in accessBody && accessBody.message) ||
            "Failed to refresh access state.",
        };
      }

      return {
        access: accessBody as DashboardAccess,
        accessErrorCode: null,
        accessErrorMessage: null,
      };
    } catch (error) {
      return {
        access: null,
        accessErrorCode: "ACCESS_REFRESH_FAILED",
        accessErrorMessage:
          error instanceof Error ? error.message : "Failed to refresh access state.",
      };
    }
  };

  const onSave = async () => {
    setError(null);
    if (!form.secretCode.trim()) {
      setError("Secret code is required.");
      return;
    }
    if (
      !form.joinExisting &&
      (!form.companyCode.trim() || !form.name.trim() || !form.email.trim())
    ) {
      setError("Company code, name and email are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = form.joinExisting
        ? {
            joinExisting: true,
            secretCode: form.secretCode.toUpperCase().trim(),
            privilegeCode: form.privilegeCode.toUpperCase().trim() || null,
            country: form.country.trim() || null,
            helpEnabled: form.helpEnabled,
            baseCurrencyCode: form.baseCurrencyCode.trim().toUpperCase() || "USD",
            image: form.image.trim() || null,
          }
        : {
            joinExisting: false,
            code: form.companyCode.toUpperCase().trim(),
            secretCode: form.secretCode.toUpperCase().trim(),
            privilegeCode: form.privilegeCode.toUpperCase().trim() || null,
            name: form.name.trim(),
            email: form.email.trim(),
            baseCurrencyCode: form.baseCurrencyCode.trim().toUpperCase() || "USD",
            helpEnabled: form.helpEnabled,
            country: form.country.trim() || null,
            image: form.image.trim() || null,
          };

      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        message?: string;
        companyId?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Failed to save company settings.");
      }

      const nextAccessState = await syncAccessState();
      const nextCompany = form.joinExisting
        ? company
        : {
            id: body.companyId ?? nextAccessState.access?.companyId ?? "",
            code: form.companyCode.toUpperCase().trim(),
            joinSecretCode: form.secretCode.toUpperCase().trim(),
            managerPrivilegeCode: form.privilegeCode.toUpperCase().trim() || null,
            name: form.name.trim(),
            email: form.email.trim(),
            baseCurrencyCode: form.baseCurrencyCode.trim().toUpperCase() || "USD",
            transportRateBasis: "VEHICLE_TYPE" as const,
            helpEnabled: form.helpEnabled,
            subscriptionPlan: null,
            subscriptionStatus: "PENDING" as const,
            subscriptionStartsAt: null,
            subscriptionEndsAt: null,
            country: form.country.trim() || null,
            image: form.image.trim() || null,
          };

      updateShellData({
        company: nextCompany,
        access: nextAccessState.access,
        needsSetup: false,
        accessErrorCode: nextAccessState.accessErrorCode,
        accessErrorMessage: nextAccessState.accessErrorMessage,
      });

      if (form.joinExisting) {
        router.refresh();
        return;
      }

      router.replace("/billing/plans");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save company settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Complete Company Setup</DialogTitle>
          <DialogDescription>
            Company registration is required before using the system.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
            <Label>Join Existing Company</Label>
            <Switch
              checked={form.joinExisting}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  joinExisting: checked,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Secret Code</Label>
            <Input
              value={form.secretCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, secretCode: e.target.value.toUpperCase() }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Privilege Code (Optional)</Label>
            <Input
              value={form.privilegeCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, privilegeCode: e.target.value.toUpperCase() }))
              }
            />
          </div>
          {!form.joinExisting ? (
            <>
              <div className="space-y-2">
                <Label>Company Code</Label>
                <Input
                  value={form.companyCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, companyCode: e.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Company Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Base Currency Code</Label>
                <Input
                  value={form.baseCurrencyCode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      baseCurrencyCode: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label>Help Documentation</Label>
                <div className="flex h-10 items-center justify-between rounded-md border px-3">
                  <span className="text-sm text-muted-foreground">
                    {form.helpEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={form.helpEnabled}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, helpEnabled: checked }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Company Logo</Label>
                <Input type="file" accept="image/*" onChange={(e) => void onPickLogo(e.target.files?.[0] ?? null)} />
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Company logo preview" className="h-16 rounded border object-contain p-1" />
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-md border p-3 text-sm text-muted-foreground md:col-span-2">
              Enter secret code to join an existing company. If you have a manager privilege code,
              add it to get manager access; otherwise you will join as read-only user.
            </div>
          )}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button disabled={saving} onClick={() => void onSave()}>
            {saving ? "Saving..." : "Save Company Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
