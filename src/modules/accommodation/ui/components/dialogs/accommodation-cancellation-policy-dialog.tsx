"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

export type AccommodationCancellationPolicyFormState = {
  code: string;
  name: string;
  description: string;
  noShowPolicy: string;
  afterCheckInPolicy: string;
  isDefault: boolean;
  isActive: boolean;
};

type Props = AccommodationDialogProps & {
  form: AccommodationCancellationPolicyFormState;
  setForm: (
    value:
      | AccommodationCancellationPolicyFormState
      | ((current: AccommodationCancellationPolicyFormState) => AccommodationCancellationPolicyFormState)
  ) => void;
};

export function AccommodationCancellationPolicyDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  onOpenChange,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Cancellation Policy" : "Edit Cancellation Policy"}</DialogTitle>
          <DialogDescription>
            Define the policy header used by rate plans and then maintain its penalty windows below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Policy code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Policy name</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>No-show policy</Label>
            <Input
              value={form.noShowPolicy}
              onChange={(event) => setForm((current) => ({ ...current, noShowPolicy: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>After check-in policy</Label>
            <Input
              value={form.afterCheckInPolicy}
              onChange={(event) => setForm((current) => ({ ...current, afterCheckInPolicy: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isDefault: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Default policy for this hotel
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Active
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Policy" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
