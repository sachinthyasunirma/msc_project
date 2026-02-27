"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
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

type CompanyPayload = {
  id: string;
  code: string;
  joinSecretCode: string | null;
  managerPrivilegeCode: string | null;
  name: string;
  email: string;
  country: string | null;
  image: string | null;
};

export function CompanySetupGate() {
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    joinExisting: false,
    companyCode: "",
    secretCode: "",
    privilegeCode: "",
    name: "",
    email: "",
    country: "",
    image: "",
  });

  useEffect(() => {
    if (isPending || !session?.user) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/companies/me", { cache: "no-store" });
        const body = (await response.json()) as {
          company?: CompanyPayload | null;
          needsSetup?: boolean;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(body.message || "Failed to load company setup.");
        }
        if (!active) return;
        setNeedsSetup(Boolean(body.needsSetup));
        if (body.company) {
          setForm({
            joinExisting: false,
            companyCode: body.company.code ?? "",
            secretCode: body.company.joinSecretCode ?? "",
            privilegeCode: body.company.managerPrivilegeCode ?? "",
            name: body.company.name ?? "",
            email: body.company.email ?? "",
            country: body.company.country ?? "",
            image: body.company.image ?? "",
          });
        } else {
          setForm((prev) => ({
            ...prev,
            joinExisting: false,
            email: session.user.email || prev.email,
          }));
        }
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load company setup.");
        setNeedsSetup(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isPending, session?.user]);

  const isOpen = useMemo(
    () => Boolean(session?.user) && !isPending && !loading && needsSetup,
    [session?.user, isPending, loading, needsSetup]
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
            image: form.image.trim() || null,
          }
        : {
            joinExisting: false,
            code: form.companyCode.toUpperCase().trim(),
            secretCode: form.secretCode.toUpperCase().trim(),
            privilegeCode: form.privilegeCode.toUpperCase().trim() || null,
            name: form.name.trim(),
            email: form.email.trim(),
            country: form.country.trim() || null,
            image: form.image.trim() || null,
          };

      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to save company settings.");
      }
      setNeedsSetup(false);
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
