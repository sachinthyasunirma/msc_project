"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useRef, useState } from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MEDIA_MAX_FILE_SIZE_BYTES,
  type MediaFormState,
} from "@/modules/media/lib/use-media-asset-manager";
import { MediaRightsForm } from "@/modules/media/ui/components/media-rights-form";
import type { MediaAssetRecord } from "@/modules/media/shared/media-types";
import { cn } from "@/lib/utils";

type MediaUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAsset: MediaAssetRecord | null;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  activeAssetCount: number;
  remainingSlots: number;
  form: MediaFormState;
  setForm: Dispatch<SetStateAction<MediaFormState>>;
  saving: boolean;
  attributionPreview: string;
  onSubmit: () => void;
};

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ASSET_COUNT = 5;

export function MediaUploadDialog({
  open,
  onOpenChange,
  editingAsset,
  selectedFiles,
  setSelectedFiles,
  activeAssetCount,
  remainingSlots,
  form,
  setForm,
  saving,
  attributionPreview,
  onSubmit,
}: MediaUploadDialogProps) {
  const isEditing = Boolean(editingAsset);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileLimitMessage = useMemo(() => {
    if (remainingSlots <= 0) {
      return `This record already has the maximum ${MAX_ASSET_COUNT} active images.`;
    }

    if (selectedFiles.length > remainingSlots) {
      return `Only ${remainingSlots} more image(s) can be uploaded for this record.`;
    }

    const invalidType = selectedFiles.find((file) => !ACCEPTED_FILE_TYPES.includes(file.type));
    if (invalidType) {
      return `${invalidType.name} is not a supported image format.`;
    }

    const oversizeFile = selectedFiles.find((file) => file.size > MEDIA_MAX_FILE_SIZE_BYTES);
    if (oversizeFile) {
      return `${oversizeFile.name} exceeds the 1MB limit.`;
    }

    return null;
  }, [remainingSlots, selectedFiles]);

  const fileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return `No files selected yet. You can upload up to ${remainingSlots} image(s).`;
    }

    return `${selectedFiles.length} file(s) selected. ${remainingSlots} slot(s) currently available for this record.`;
  }, [remainingSlots, selectedFiles.length]);

  const applyFiles = (files: FileList | File[] | null) => {
    if (isEditing || !files) {
      return;
    }

    const normalizedFiles = Array.from(files)
      .filter((file) => ACCEPTED_FILE_TYPES.includes(file.type))
      .slice(0, Math.max(0, remainingSlots));

    setSelectedFiles(normalizedFiles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader className="gap-1 border-b px-6 py-5">
          <DialogTitle>{isEditing ? "Edit Image Details" : "Upload Image"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update image metadata, licensing details, and review status."
              : "Upload private images for this record with rights metadata and review context."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Images</p>
                  <p className="mt-1 text-2xl font-semibold">{activeAssetCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available Slots</p>
                  <p className="mt-1 text-2xl font-semibold">{remainingSlots}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Upload Rule</p>
                  <p className="mt-1 text-sm font-medium">Up to {MAX_ASSET_COUNT} files, 1MB each</p>
                </div>
              </div>

              <div
                className={cn(
                  "flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
                  remainingSlots > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                  isDragging ? "border-primary bg-primary/8" : "border-border bg-muted/15"
                )}
                onClick={() => {
                  if (remainingSlots > 0) {
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  if (remainingSlots <= 0) {
                    return;
                  }
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (remainingSlots <= 0) {
                    return;
                  }
                  applyFiles(event.dataTransfer.files);
                }}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  multiple
                  onChange={(event) => applyFiles(event.target.files)}
                />
                <div className="mb-4 rounded-full border bg-background p-3">
                  <UploadCloud className="size-7 text-primary" />
                </div>
                <p className="text-base font-medium">
                  <span className="text-primary underline underline-offset-4">Click to upload</span>{" "}
                  or drag and drop
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  JPG, PNG, WEBP. Max 1MB per image. Up to {MAX_ASSET_COUNT} images per record.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">{fileSummary}</p>
              </div>

              {selectedFiles.length > 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ImagePlus className="size-4 text-primary" />
                    <p className="text-sm font-medium">Selected files</p>
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSelectedFiles(
                              selectedFiles.filter((_, selectedIndex) => selectedIndex !== index)
                            )
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {fileLimitMessage ? (
                <div className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {fileLimitMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {saving ? (
            <div className="flex min-h-20 items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Saving media asset...
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={String(form.altText ?? "")}
                onChange={(event) => setForm((prev) => ({ ...prev, altText: event.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Primary Image</Label>
              <Switch
                checked={Boolean(form.isPrimary)}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPrimary: checked }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Caption</Label>
              <Textarea
                value={String(form.caption ?? "")}
                onChange={(event) => setForm((prev) => ({ ...prev, caption: event.target.value }))}
              />
            </div>
          </div>

          <MediaRightsForm
            form={form}
            setForm={setForm}
            attributionPreview={attributionPreview}
          />
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              saving ||
              (!isEditing &&
                (selectedFiles.length === 0 || remainingSlots === 0 || Boolean(fileLimitMessage)))
            }
          >
            {isEditing ? "Save Changes" : "Upload Images"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
