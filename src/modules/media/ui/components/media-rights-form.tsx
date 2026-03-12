"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { MediaFormState } from "@/modules/media/lib/use-media-asset-manager";
import { CREATIVE_COMMONS_LICENSES } from "@/modules/media/shared/media-types";

type MediaRightsFormProps = {
  form: MediaFormState;
  setForm: React.Dispatch<React.SetStateAction<MediaFormState>>;
  attributionPreview: string;
};

export function MediaRightsForm({ form, setForm, attributionPreview }: MediaRightsFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Source Type</Label>
        <Select value={form.sourceType} onValueChange={(value) => setForm((prev) => ({ ...prev, sourceType: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OWNED">Owned</SelectItem>
            <SelectItem value="SUPPLIER">Supplier</SelectItem>
            <SelectItem value="CREATIVE_COMMONS">Creative Commons</SelectItem>
            <SelectItem value="PUBLIC_DOMAIN">Public Domain</SelectItem>
            <SelectItem value="LICENSED_STOCK">Licensed Stock</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Copyright Owner</Label>
        <Input value={form.copyrightOwner} onChange={(event) => setForm((prev) => ({ ...prev, copyrightOwner: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Creator Name</Label>
        <Input value={form.creatorName} onChange={(event) => setForm((prev) => ({ ...prev, creatorName: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Source URL</Label>
        <Input value={form.sourceUrl} onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>License</Label>
        <Select value={form.licenseCode || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, licenseCode: value === "__none__" ? "" : value }))}>
          <SelectTrigger><SelectValue placeholder="Select license" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {Object.entries(CREATIVE_COMMONS_LICENSES).map(([code, meta]) => (
              <SelectItem key={code} value={code}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>License URL</Label>
        <Input value={form.licenseUrl} onChange={(event) => setForm((prev) => ({ ...prev, licenseUrl: event.target.value }))} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Attribution Text</Label>
        <Textarea value={form.attributionText} onChange={(event) => setForm((prev) => ({ ...prev, attributionText: event.target.value }))} />
        {attributionPreview ? <p className="text-xs text-muted-foreground">{attributionPreview}</p> : null}
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <Label>Commercial Use Allowed</Label>
        <Switch checked={form.commercialUseAllowed} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, commercialUseAllowed: checked }))} />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <Label>Derivatives Allowed</Label>
        <Switch checked={form.derivativesAllowed} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, derivativesAllowed: checked }))} />
      </div>
      <div className="space-y-2">
        <Label>Review Status</Label>
        <Select value={form.reviewStatus} onValueChange={(value) => setForm((prev) => ({ ...prev, reviewStatus: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="NEEDS_CHANGES">Needs Changes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Review Notes</Label>
        <Textarea value={form.reviewNotes} onChange={(event) => setForm((prev) => ({ ...prev, reviewNotes: event.target.value }))} />
      </div>
    </div>
  );
}
