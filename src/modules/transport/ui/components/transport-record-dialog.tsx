"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { TRANSPORT_RESOURCE_META } from "@/modules/transport/shared/transport-management-constants";
import type { TransportFormField, TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

type TransportRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  resource: TransportResourceKey;
  row: Record<string, unknown> | null;
  fields: TransportFormField[];
  form: Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  saving: boolean;
  isReadOnly: boolean;
  onSubmit: () => void;
};

export function TransportRecordDialog({
  open,
  onOpenChange,
  mode,
  resource,
  row,
  fields,
  form,
  setForm,
  saving,
  isReadOnly,
  onSubmit,
}: TransportRecordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add" : "Edit"} {TRANSPORT_RESOURCE_META[resource].title}
          </DialogTitle>
          <DialogDescription>Fill required fields and save.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}>
              <Label>{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={String(form[field.key] ?? (field.nullable ? "__none__" : ""))}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, [field.key]: value === "__none__" ? "" : value }))
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "boolean" ? (
                <div className="flex h-9 items-center justify-between rounded-md border px-3">
                  <span className="text-muted-foreground text-xs">{Boolean(form[field.key]) ? "Active" : "Inactive"}</span>
                  <Switch checked={Boolean(form[field.key])} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [field.key]: checked }))} />
                </div>
              ) : field.type === "json" ? (
                <Textarea
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="pt-2">
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving || (isReadOnly && mode === "create")}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
