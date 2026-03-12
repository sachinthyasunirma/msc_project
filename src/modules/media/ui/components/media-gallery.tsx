"use client";

import { Edit3, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { MediaReviewBadge } from "@/modules/media/ui/components/media-review-badge";
import type { MediaAssetRecord } from "@/modules/media/shared/media-types";

type MediaGalleryProps = {
  assets: MediaAssetRecord[];
  activeCount: number;
  maxFiles: number;
  remainingSlots: number;
  loading: boolean;
  onUpload: () => void;
  onEdit: (asset: MediaAssetRecord) => void;
  onSetPrimary: (asset: MediaAssetRecord) => void;
  onRemove: (asset: MediaAssetRecord) => void;
};

export function MediaGallery({
  assets,
  activeCount,
  maxFiles,
  remainingSlots,
  loading,
  onUpload,
  onEdit,
  onSetPrimary,
  onRemove,
}: MediaGalleryProps) {
  if (loading) {
    return (
      <LoadingState
        compact
        title="Preparing your media stop"
        description="Loading private image assets and review status."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Image library</p>
          <p className="text-xs text-muted-foreground">
            {activeCount} / {maxFiles} active images. Max 1MB per image.
          </p>
        </div>
        <Button onClick={onUpload} disabled={remainingSlots === 0}>
          <ImagePlus className="mr-2 size-4" />
          Upload Images
        </Button>
      </div>
      {assets.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No media assets uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="space-y-3 p-4">
                <div className="aspect-video overflow-hidden rounded-md border bg-muted">
                  {/* Signed private asset previews are served through a redirect endpoint, so next/image is not a good fit here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/assets/${asset.id}/file`}
                    alt={asset.altText || asset.originalFileName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{asset.originalFileName}</p>
                    <MediaReviewBadge status={asset.reviewStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground">{asset.caption || asset.altText || "No description"}</p>
                  <p className="text-xs text-muted-foreground">{asset.sourceType.replaceAll("_", " ")}</p>
                  {asset.attributionText ? (
                    <p className="text-xs text-muted-foreground">{asset.attributionText}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={asset.isPrimary ? "default" : "outline"} onClick={() => onSetPrimary(asset)}>
                    <Star className="mr-1 size-4" />
                    {asset.isPrimary ? "Primary" : "Set Primary"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
                    <Edit3 className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onRemove(asset)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
