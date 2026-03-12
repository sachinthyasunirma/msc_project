"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import {
  createMediaAsset,
  createMediaUploadSession,
  deactivateMediaAsset,
  listMediaAssets,
  updateMediaAsset,
  uploadFileToPresignedUrl,
} from "@/modules/media/lib/media-api";
import {
  CREATIVE_COMMONS_LICENSES,
  type MediaAssetRecord,
  type MediaEntityType,
} from "@/modules/media/shared/media-types";

export type MediaFormState = {
  altText: string;
  caption: string;
  isPrimary: boolean;
  sourceType: string;
  copyrightOwner: string;
  creatorName: string;
  sourceUrl: string;
  licenseCode: string;
  licenseUrl: string;
  attributionText: string;
  commercialUseAllowed: boolean;
  derivativesAllowed: boolean;
  reviewStatus: string;
  reviewNotes: string;
  isActive: boolean;
};

export const MEDIA_MAX_FILES_PER_ENTITY = 5;
export const MEDIA_MAX_FILE_SIZE_BYTES = 1024 * 1024;

function getInitialForm(asset?: MediaAssetRecord | null): MediaFormState {
  return {
    altText: asset?.altText ?? "",
    caption: asset?.caption ?? "",
    isPrimary: asset?.isPrimary ?? false,
    sourceType: asset?.sourceType ?? "OWNED",
    copyrightOwner: asset?.copyrightOwner ?? "",
    creatorName: asset?.creatorName ?? "",
    sourceUrl: asset?.sourceUrl ?? "",
    licenseCode: asset?.licenseCode ?? "",
    licenseUrl: asset?.licenseUrl ?? "",
    attributionText: asset?.attributionText ?? "",
    commercialUseAllowed: asset?.commercialUseAllowed ?? true,
    derivativesAllowed: asset?.derivativesAllowed ?? true,
    reviewStatus: asset?.reviewStatus ?? "PENDING",
    reviewNotes: asset?.reviewNotes ?? "",
    isActive: asset?.isActive ?? true,
  };
}

export function useMediaAssetManager(options: {
  entityType: MediaEntityType;
  entityId: string;
  open: boolean;
}) {
  const { entityType, entityId, open } = options;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAssetRecord | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [form, setForm] = useState<MediaFormState>(getInitialForm());

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMediaAssets({ entityType, entityId, includeInactive: true });
      setAssets(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load media assets.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadAssets();
  }, [loadAssets, open]);

  useEffect(() => {
    if (form.sourceType !== "CREATIVE_COMMONS" || !form.licenseCode) {
      return;
    }
    const license =
      CREATIVE_COMMONS_LICENSES[form.licenseCode as keyof typeof CREATIVE_COMMONS_LICENSES];
    if (!license) {
      return;
    }
    setForm((previous) => ({
      ...previous,
      licenseUrl: license.url,
      commercialUseAllowed: license.commercialUseAllowed,
      derivativesAllowed: license.derivativesAllowed,
    }));
  }, [form.licenseCode, form.sourceType]);

  const primaryAsset = useMemo(
    () => assets.find((asset) => asset.isPrimary && asset.isActive) ?? null,
    [assets]
  );
  const activeAssets = useMemo(() => assets.filter((asset) => asset.isActive), [assets]);
  const remainingSlots = Math.max(0, MEDIA_MAX_FILES_PER_ENTITY - activeAssets.length);

  const attributionPreview = useMemo(() => {
    if (form.sourceType !== "CREATIVE_COMMONS") {
      return "";
    }
    const pieces = [form.creatorName, form.attributionText, form.licenseCode]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return pieces.join(" | ");
  }, [form.attributionText, form.creatorName, form.licenseCode, form.sourceType]);

  const openCreateDialog = useCallback(() => {
    setEditingAsset(null);
    setSelectedFiles([]);
    setForm(getInitialForm());
    setUploadOpen(true);
  }, []);

  const openEditDialog = useCallback((asset: MediaAssetRecord) => {
    setEditingAsset(asset);
    setSelectedFiles([]);
    setForm(getInitialForm(asset));
    setUploadOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setUploadOpen(false);
    setEditingAsset(null);
    setSelectedFiles([]);
    setForm(getInitialForm());
  }, []);

  const submit = useCallback(async () => {
    try {
      setSaving(true);

      if (editingAsset) {
        await updateMediaAsset(editingAsset.id, {
          altText: form.altText || null,
          caption: form.caption || null,
          isPrimary: form.isPrimary,
          sourceType: form.sourceType,
          copyrightOwner: form.copyrightOwner || null,
          creatorName: form.creatorName || null,
          sourceUrl: form.sourceUrl || null,
          licenseCode: form.licenseCode || null,
          licenseUrl: form.licenseUrl || null,
          attributionText: form.attributionText || null,
          commercialUseAllowed: form.commercialUseAllowed,
          derivativesAllowed: form.derivativesAllowed,
          reviewStatus: form.reviewStatus,
          reviewNotes: form.reviewNotes || null,
          isActive: form.isActive,
        });
        notify.success("Media asset updated.");
      } else {
        if (selectedFiles.length === 0) {
          throw new Error("Select at least one image file to upload.");
        }
        if (selectedFiles.length > remainingSlots) {
          throw new Error(`You can upload only ${remainingSlots} more image(s) for this record.`);
        }
        for (const [index, selectedFile] of selectedFiles.entries()) {
          if (selectedFile.size > MEDIA_MAX_FILE_SIZE_BYTES) {
            throw new Error(`${selectedFile.name} exceeds the 1MB limit.`);
          }
          const uploadSession = await createMediaUploadSession({
            entityType,
            entityId,
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            fileSize: selectedFile.size,
          });
          await uploadFileToPresignedUrl(uploadSession.uploadUrl, selectedFile);
          await createMediaAsset({
            entityType,
            entityId,
            storageKey: uploadSession.storageKey,
            originalFileName: selectedFile.name,
            mimeType: selectedFile.type,
            fileSize: selectedFile.size,
            altText: form.altText || null,
            caption: form.caption || null,
            isPrimary: form.isPrimary && index === 0,
            sourceType: form.sourceType,
            copyrightOwner: form.copyrightOwner || null,
            creatorName: form.creatorName || null,
            sourceUrl: form.sourceUrl || null,
            licenseCode: form.licenseCode || null,
            licenseUrl: form.licenseUrl || null,
            attributionText: form.attributionText || null,
            commercialUseAllowed: form.commercialUseAllowed,
            derivativesAllowed: form.derivativesAllowed,
            reviewStatus: form.reviewStatus,
            reviewNotes: form.reviewNotes || null,
            isActive: form.isActive,
          });
        }
        notify.success("Media assets uploaded.");
      }

      closeDialog();
      await loadAssets();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save media asset.");
    } finally {
      setSaving(false);
    }
  }, [closeDialog, editingAsset, entityId, entityType, form, loadAssets, remainingSlots, selectedFiles]);

  const setPrimary = useCallback(
    async (asset: MediaAssetRecord) => {
      try {
        setSaving(true);
        await updateMediaAsset(asset.id, { isPrimary: true });
        notify.success("Primary image updated.");
        await loadAssets();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to update primary image.");
      } finally {
        setSaving(false);
      }
    },
    [loadAssets]
  );

  const removeAsset = useCallback(
    async (asset: MediaAssetRecord) => {
      try {
        setSaving(true);
        await deactivateMediaAsset(asset.id);
        notify.success("Media asset deactivated.");
        await loadAssets();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to remove media asset.");
      } finally {
        setSaving(false);
      }
    },
    [loadAssets]
  );

  return {
    loading,
    saving,
    assets,
    activeAssets,
    primaryAsset,
    remainingSlots,
    uploadOpen,
    editingAsset,
    selectedFiles,
    form,
    attributionPreview,
    setUploadOpen,
    setSelectedFiles,
    setForm,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submit,
    setPrimary,
    removeAsset,
    reload: loadAssets,
  };
}
