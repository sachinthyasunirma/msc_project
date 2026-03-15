"use client";

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
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import type { SeasonFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import { AccommodationSeasonTable } from "@/modules/accommodation/ui/components/dialogs/accommodation-season-table";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";
import type { SeasonOption } from "@/modules/season/lib/season-api";

type AccommodationSeasonDialogProps = AccommodationDialogProps & {
  row: SeasonOption | null;
  form: SeasonFormState;
  setForm: (next: SeasonFormState) => void;
  seasons: SeasonOption[];
  onEditSeason: (season: SeasonOption) => void;
  onDeleteSeason: (season: SeasonOption) => void;
};

export function AccommodationSeasonDialog({
  open,
  mode,
  row,
  form,
  setForm,
  seasons,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
  onEditSeason,
  onDeleteSeason,
}: AccommodationSeasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Season" : "Edit Season"}</DialogTitle>
          <DialogDescription>These seasons are used in the Room Rate season dropdown.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={saving || (isReadOnly && mode === "create")} onClick={onSubmit}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        <div className="mt-4">
          <AccommodationSeasonTable
            seasons={seasons}
            onEditSeason={onEditSeason}
            onDeleteSeason={onDeleteSeason}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
