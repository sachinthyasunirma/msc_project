"use client";

import { Dispatch, SetStateAction } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CurrencyField } from "./currency-management-config";

type CurrencyDialogState = {
  open: boolean;
  mode: "create" | "edit";
  row: Record<string, unknown> | null;
};

type Props = {
  dialog: CurrencyDialogState;
  resourceTitle: string;
  visibleFields: CurrencyField[];
  form: Record<string, unknown>;
  saving: boolean;
  isReadOnly: boolean;
  setDialog: Dispatch<SetStateAction<CurrencyDialogState>>;
  setForm: Dispatch<SetStateAction<Record<string, unknown>>>;
  onSubmit: () => Promise<void>;
};

export function CurrencyRecordDialog({
  dialog,
  resourceTitle,
  visibleFields,
  form,
  saving,
  isReadOnly,
  setDialog,
  setForm,
  onSubmit,
}: Props) {
  return (
    <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {dialog.mode === "create" ? "Add" : "Edit"} {resourceTitle}
          </DialogTitle>
          <DialogDescription>Fill required fields and save.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
          {visibleFields.map((field) => (
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
          <RecordAuditMeta row={dialog.row} className="mr-auto" />
          <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit()} disabled={saving || (isReadOnly && dialog.mode === "create")}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
