"use client";

import { MediaGallery } from "@/modules/media/ui/components/media-gallery";
import { MediaUploadDialog } from "@/modules/media/ui/components/media-upload-dialog";
import { useMediaAssetManager } from "@/modules/media/lib/use-media-asset-manager";
import type { MediaEntityType } from "@/modules/media/shared/media-types";

type MediaAssetManagerPanelProps = {
  entityType: MediaEntityType;
  entityId: string;
  enabled?: boolean;
  isReadOnly?: boolean;
};

export function MediaAssetManagerPanel({
  entityType,
  entityId,
  enabled = true,
  isReadOnly = false,
}: MediaAssetManagerPanelProps) {
  const media = useMediaAssetManager({ entityType, entityId, open: enabled });

  return (
    <>
      <MediaGallery
        assets={media.assets}
        activeCount={media.activeAssets.length}
        maxFiles={5}
        remainingSlots={media.remainingSlots}
        loading={media.loading}
        onUpload={() => {
          if (isReadOnly) {
            return;
          }
          media.openCreateDialog();
        }}
        onEdit={(asset) => {
          if (isReadOnly) {
            return;
          }
          media.openEditDialog(asset);
        }}
        onSetPrimary={(asset) => {
          if (isReadOnly) {
            return;
          }
          void media.setPrimary(asset);
        }}
        onRemove={(asset) => {
          if (isReadOnly) {
            return;
          }
          void media.removeAsset(asset);
        }}
      />

      <MediaUploadDialog
        open={media.uploadOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            media.closeDialog();
          }
        }}
        editingAsset={media.editingAsset}
        selectedFiles={media.selectedFiles}
        setSelectedFiles={media.setSelectedFiles}
        activeAssetCount={media.activeAssets.length}
        remainingSlots={media.remainingSlots}
        form={media.form}
        setForm={media.setForm}
        saving={media.saving}
        attributionPreview={media.attributionPreview}
        onSubmit={() => void media.submit()}
      />
    </>
  );
}
